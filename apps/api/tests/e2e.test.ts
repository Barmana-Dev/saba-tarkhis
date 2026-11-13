import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { app, createUser, loginAgent, resetDb, validPayload } from "./helpers";

const pdf = buildSamplePdf("E2E proforma");

/**
 * Full release scenario: public registration → request + documents → isolation
 * from another customer → expert handling → internal/public notes → status
 * history → CMS draft/publish → contact inbox. Runs against the real test DB.
 */
describe("end-to-end release scenarios", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runs the complete customer, expert and admin journey", async () => {
    await createUser("CUSTOMER", "09125550000", "مشتری دوم");
    await createUser("EXPERT", "09125550001", "کارشناس تست");
    await createUser("ADMIN", "09125550002", "مدیر تست");

    // --- customer registers through the public API -------------------------
    const customer = request.agent(app);
    const registered = await customer.post("/api/v1/auth/register").send({
      fullName: "مشتری نهایی",
      mobile: "۰۹۱۲۵۵۵۱۲۳۴",
      email: "Final@Example.com",
      password: "Strong123",
    });
    expect(registered.status).toBe(201);
    expect(registered.body.data.user.role).toBe("CUSTOMER");
    const csrf = registered.body.data.csrfToken as string;

    // --- creates a real request with a PDF --------------------------------
    const created = await customer
      .post("/api/v1/requests")
      .set("x-csrf-token", csrf)
      .field("payload", JSON.stringify(validPayload))
      .attach("files", pdf, "proforma.pdf");
    expect(created.status).toBe(201);
    expect(created.body.data.trackingCode).toMatch(/^ST-\d{4}-\d{6}$/);
    const requestId = created.body.data.id as string;
    const documentId = created.body.data.documents[0].id as string;
    expect(created.body.data.documents[0].fileName).toBe("proforma.pdf");

    // --- downloads its own document byte-for-byte -------------------------
    const download = await customer.get(
      `/api/v1/requests/${requestId}/documents/${documentId}/download`,
    );
    expect(download.status).toBe(200);
    expect(Buffer.compare(download.body as Buffer, pdf)).toBe(0);
    expect(download.headers["cache-control"]).toContain("no-store");

    // --- another customer is fully isolated -------------------------------
    const stranger = await loginAgent("09125550000");
    expect((await stranger.agent.get(`/api/v1/requests/${requestId}`)).status).toBe(404);
    expect(
      (await stranger.agent.get(`/api/v1/requests/${requestId}/documents/${documentId}/download`))
        .status,
    ).toBe(404);
    expect((await stranger.agent.get("/api/v1/requests")).body.data.items).toHaveLength(0);

    // --- expert is scoped to assigned cases only --------------------------
    const expert = await loginAgent("09125550001");
    const admin = await loginAgent("09125550002");
    expect((await expert.agent.get(`/api/v1/admin/requests/${requestId}`)).status).toBe(404);

    const assign = await admin.agent
      .patch(`/api/v1/admin/requests/${requestId}/assign`)
      .set("x-csrf-token", admin.csrf)
      .send({ expertId: expert.user.id });
    expect(assign.status).toBe(200);

    // --- expert reviews, comments publicly and internally -----------------
    const toReview = await expert.agent
      .patch(`/api/v1/admin/requests/${requestId}/status`)
      .set("x-csrf-token", expert.csrf)
      .send({ status: "UNDER_REVIEW", reason: "شروع بررسی مدارک" });
    expect(toReview.status).toBe(200);

    expect(
      (
        await expert.agent
          .post(`/api/v1/requests/${requestId}/comments`)
          .set("x-csrf-token", expert.csrf)
          .send({ body: "لطفاً بارنامه را بارگذاری کنید.", visibility: "PUBLIC" })
      ).status,
    ).toBe(201);
    expect(
      (
        await expert.agent
          .post(`/api/v1/requests/${requestId}/comments`)
          .set("x-csrf-token", expert.csrf)
          .send({ body: "یادداشت داخلی تیم", visibility: "INTERNAL" })
      ).status,
    ).toBe(201);

    // --- customer sees public note, never the internal one ----------------
    const customerView = await customer.get(`/api/v1/requests/${requestId}`);
    const bodies = customerView.body.data.comments.map((c: { body: string }) => c.body);
    expect(bodies).toContain("لطفاً بارنامه را بارگذاری کنید.");
    expect(bodies).not.toContain("یادداشت داخلی تیم");

    // --- customer replies and uploads the requested document --------------
    const reply = await customer
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("x-csrf-token", csrf)
      .send({ body: "بارنامه پیوست شد.", visibility: "INTERNAL" });
    expect(reply.status).toBe(201);
    expect(reply.body.data.visibility).toBe("PUBLIC");

    const extra = await customer
      .post(`/api/v1/requests/${requestId}/documents`)
      .set("x-csrf-token", csrf)
      .attach("file", buildSamplePdf("Bill of lading"), "bill-of-lading.pdf");
    expect(extra.status).toBe(201);
    expect(extra.body.data.fileName).toBe("bill-of-lading.pdf");

    // --- expert moves the case forward; history is complete ---------------
    const needInfo = await expert.agent
      .patch(`/api/v1/admin/requests/${requestId}/status`)
      .set("x-csrf-token", expert.csrf)
      .send({ status: "NEED_MORE_INFO", reason: "نیاز به بارنامه" });
    expect(needInfo.status).toBe(200);

    const finalView = await customer.get(`/api/v1/requests/${requestId}`);
    expect(finalView.body.data.status).toBe("NEED_MORE_INFO");
    const history = finalView.body.data.statusHistory.map((h: { toStatus: string }) => h.toStatus);
    expect(history).toEqual(["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFO"]);
    expect(finalView.body.data.documents).toHaveLength(2);
    expect(finalView.body.data.assignedExpert).toBeUndefined();
    expect(finalView.body.data.customer).toBeUndefined();
    // Two public messages are visible; the expert's INTERNAL note is filtered out.
    expect(finalView.body.data.comments).toHaveLength(2);
    expect(
      finalView.body.data.comments.every(
        (comment: { visibility: string }) => comment.visibility === "PUBLIC",
      ),
    ).toBe(true);

    // --- CMS: publish an article, keep the draft hidden -------------------
    const article = await admin.agent
      .post("/api/v1/admin/articles")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "e2e-article",
        title: "مقاله آزمون پایانی",
        excerpt: "خلاصه مقاله آزمون پایانی برای بررسی",
        body: "متن کامل مقاله برای بررسی انتشار در سایت عمومی و پایان آزمون.",
        status: "DRAFT",
        sourceName: "منبع آزمایشی",
      });
    expect(article.status).toBe(201);
    expect((await request(app).get("/api/v1/articles/e2e-article")).status).toBe(404);

    const publish = await admin.agent
      .patch(`/api/v1/admin/articles/${article.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "PUBLISHED" });
    expect(publish.status).toBe(200);
    const publicArticle = await request(app).get("/api/v1/articles/e2e-article");
    expect(publicArticle.status).toBe(200);
    expect(publicArticle.body.data.title).toBe("مقاله آزمون پایانی");

    // --- CMS: service CRUD and public visibility --------------------------
    const service = await admin.agent
      .post("/api/v1/admin/services")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "e2e-service",
        title: "خدمت آزمون",
        excerpt: "توضیح کوتاه خدمت آزمون برای انتشار",
        body: "متن کامل خدمت آزمون برای بررسی چرخه ایجاد و انتشار در سایت.",
        isPublished: true,
      });
    expect(service.status).toBe(201);
    expect((await request(app).get("/api/v1/services/e2e-service")).status).toBe(200);
    expect(
      (
        await admin.agent
          .delete(`/api/v1/admin/services/${service.body.data.id}`)
          .set("x-csrf-token", admin.csrf)
      ).status,
    ).toBe(200);
    expect((await request(app).get("/api/v1/services/e2e-service")).status).toBe(404);

    // --- contact form reaches the admin inbox -----------------------------
    const message = await request(app).post("/api/v1/contact").send({
      name: "کاربر تماس",
      mobile: "09125559876",
      subject: "پرسش آزمون",
      message: "متن پیام آزمون برای بررسی صندوق ورودی مدیر.",
      privacyAccepted: true,
    });
    expect(message.status).toBe(201);
    const inbox = await admin.agent.get("/api/v1/admin/contact-messages?status=NEW");
    expect(inbox.body.data.items.some((m: { subject: string }) => m.subject === "پرسش آزمون")).toBe(
      true,
    );

    // --- logout invalidates the session ----------------------------------
    expect(
      (await customer.post("/api/v1/auth/logout").set("x-csrf-token", csrf)).status,
    ).toBe(200);
    expect((await customer.get("/api/v1/auth/me")).status).toBe(401);

    // --- audit trail captured privileged operations -----------------------
    const actions = await prisma.auditLog.findMany({ select: { action: true } });
    const uniqueActions = new Set(actions.map((a) => a.action));
    expect(uniqueActions.has("REQUEST_ASSIGNED")).toBe(true);
    expect(uniqueActions.has("REQUEST_STATUS_CHANGED")).toBe(true);
    expect(uniqueActions.has("ARTICLE_UPDATED")).toBe(true);
  });
});
