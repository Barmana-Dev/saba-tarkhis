import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { app, createUser, loginAgent, resetDb, validPayload } from "./helpers";
import request from "supertest";

async function createRequest(customerMobile: string) {
  const customer = await loginAgent(customerMobile);
  const response = await customer.agent
    .post("/api/v1/requests")
    .set("x-csrf-token", customer.csrf)
    .field("payload", JSON.stringify(validPayload))
    .attach("files", buildSamplePdf("Admin flow"), "doc.pdf");
  return response.body.data as { id: string; trackingCode: string };
}

describe("admin and expert workflows", () => {
  let adminMobile = "09120000001";
  let expertMobile = "09120000002";
  let customerMobile = "09121112233";

  beforeEach(async () => {
    await resetDb();
    await createUser("ADMIN", adminMobile, "مدیر تست");
    await createUser("EXPERT", expertMobile, "کارشناس تست");
    await createUser("CUSTOMER", customerMobile, "مشتری تست");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists, filters and paginates requests on the server", async () => {
    const created = await createRequest(customerMobile);
    const admin = await loginAgent(adminMobile);

    const list = await admin.agent.get("/api/v1/admin/requests?pageSize=1");
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.meta.total).toBe(1);
    expect(list.body.data.meta.summary.SUBMITTED).toBe(1);

    const search = await admin.agent.get(
      `/api/v1/admin/requests?q=${encodeURIComponent(created.trackingCode)}`,
    );
    expect(search.body.data.items).toHaveLength(1);

    const empty = await admin.agent.get("/api/v1/admin/requests?status=COMPLETED");
    expect(empty.body.data.items).toHaveLength(0);
  });

  it("assigns an expert and restricts other experts to their own cases", async () => {
    const created = await createRequest(customerMobile);
    await createUser("EXPERT", "09120000003", "کارشناس دوم");
    const admin = await loginAgent(adminMobile);
    const expert = await loginAgent(expertMobile);
    const otherExpert = await loginAgent("09120000003");

    const expertRow = await prisma.user.findUniqueOrThrow({ where: { mobile: expertMobile } });

    // Unassigned cases are invisible to experts.
    expect((await expert.agent.get(`/api/v1/admin/requests/${created.id}`)).status).toBe(404);
    expect((await otherExpert.agent.get(`/api/v1/admin/requests/${created.id}`)).status).toBe(404);

    const assign = await admin.agent
      .patch(`/api/v1/admin/requests/${created.id}/assign`)
      .set("x-csrf-token", admin.csrf)
      .send({ expertId: expertRow.id });
    expect(assign.status).toBe(200);

    expect((await expert.agent.get(`/api/v1/admin/requests/${created.id}`)).status).toBe(200);
    expect((await otherExpert.agent.get(`/api/v1/admin/requests/${created.id}`)).status).toBe(404);

    // Experts cannot reassign cases.
    const reassign = await expert.agent
      .patch(`/api/v1/admin/requests/${created.id}/assign`)
      .set("x-csrf-token", expert.csrf)
      .send({ expertId: null });
    expect(reassign.status).toBe(403);

    const note = await expert.agent
      .patch(`/api/v1/admin/requests/${created.id}/status`)
      .set("x-csrf-token", expert.csrf)
      .send({ status: "UNDER_REVIEW" });
    expect(note.status).toBe(200);
  });

  it("records an unofficial quote and moves the case to QUOTED", async () => {
    const created = await createRequest(customerMobile);
    const admin = await loginAgent(adminMobile);

    const quote = await admin.agent
      .patch(`/api/v1/admin/requests/${created.id}/quote`)
      .set("x-csrf-token", admin.csrf)
      .send({ quoteNote: "برآورد اولیه خدمات، غیررسمی و برای هماهنگی است." });

    expect(quote.status).toBe(200);
    expect(quote.body.data.status).toBe("QUOTED");

    const history = await prisma.requestStatusHistory.findMany({
      where: { requestId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((h) => h.toStatus)).toEqual(["SUBMITTED", "QUOTED"]);
  });

  it("returns real database statistics for the requested range", async () => {
    await createRequest(customerMobile);
    const admin = await loginAgent(adminMobile);

    const stats = await admin.agent.get("/api/v1/admin/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.totals.requests).toBe(1);
    expect(stats.body.data.byStatus.SUBMITTED).toBe(1);
    expect(stats.body.data.byProcedure.IMPORT).toBe(1);
    expect(stats.body.data.daily).toHaveLength(1);
  });

  it("hides draft articles from the public API until published", async () => {
    const admin = await loginAgent(adminMobile);

    const created = await admin.agent
      .post("/api/v1/admin/articles")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "test-article",
        title: "مقاله آزمایشی",
        excerpt: "خلاصه مقاله آزمایشی برای تست",
        body: "متن کامل مقاله آزمایشی برای بررسی انتشار در سایت عمومی.",
        status: "DRAFT",
      });
    expect(created.status).toBe(201);

    const publicBefore = await request(app).get("/api/v1/articles");
    expect(publicBefore.body.data.items).toHaveLength(0);
    expect((await request(app).get("/api/v1/articles/test-article")).status).toBe(404);

    const publish = await admin.agent
      .patch(`/api/v1/admin/articles/${created.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "PUBLISHED" });
    expect(publish.status).toBe(200);

    const publicAfter = await request(app).get("/api/v1/articles");
    expect(publicAfter.body.data.items).toHaveLength(1);
    expect((await request(app).get("/api/v1/articles/test-article")).status).toBe(200);
  });

  it("validates CMS input and supports FAQ CRUD", async () => {
    const admin = await loginAgent(adminMobile);

    const badSlug = await admin.agent
      .post("/api/v1/admin/services")
      .set("x-csrf-token", admin.csrf)
      .send({ slug: "Slug نامعتبر", title: "خدمت", excerpt: "توضیح کوتاه کافی", body: "متن کافی برای این خدمت" });
    expect(badSlug.status).toBe(400);

    const faq = await admin.agent
      .post("/api/v1/admin/faqs")
      .set("x-csrf-token", admin.csrf)
      .send({ question: "پرسش آزمایشی چیست؟", answer: "پاسخ آزمایشی برای این پرسش.", isPublished: true });
    expect(faq.status).toBe(201);

    const publicFaqs = await request(app).get("/api/v1/faqs");
    expect(publicFaqs.body.data).toHaveLength(1);

    const update = await admin.agent
      .patch(`/api/v1/admin/faqs/${faq.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ isPublished: false });
    expect(update.status).toBe(200);
    expect((await request(app).get("/api/v1/faqs")).body.data).toHaveLength(0);
  });

  it("stores contact messages and lets admin manage their status", async () => {
    const message = await request(app).post("/api/v1/contact").send({
      name: "فرم تماس تست",
      mobile: "09127778899",
      subject: "موضوع تست",
      message: "این یک پیام آزمایشی با متن کافی است.",
      privacyAccepted: true,
    });
    expect(message.status).toBe(201);

    const admin = await loginAgent(adminMobile);
    const list = await admin.agent.get("/api/v1/admin/contact-messages?status=NEW");
    expect(list.body.data.meta.total).toBe(1);

    const updated = await admin.agent
      .patch(`/api/v1/admin/contact-messages/${list.body.data.items[0].id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "RESOLVED" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("RESOLVED");
  });

  it("updates public settings and keeps role self-demotion blocked", async () => {
    const admin = await loginAgent(adminMobile);

    const settings = await admin.agent
      .patch("/api/v1/admin/settings")
      .set("x-csrf-token", admin.csrf)
      .send({ settings: { "contact.phone": "۰۲۱-۰۰۰۰۰۰۰۰" } });
    expect(settings.status).toBe(200);
    expect((await request(app).get("/api/v1/settings/public")).body.data["contact.phone"]).toBe(
      "۰۲۱-۰۰۰۰۰۰۰۰",
    );

    const selfDemote = await admin.agent
      .patch(`/api/v1/admin/users/${admin.user.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ role: "CUSTOMER" });
    expect(selfDemote.status).toBe(400);

    const customer = await prisma.user.findUniqueOrThrow({ where: { mobile: customerMobile } });
    const promote = await admin.agent
      .patch(`/api/v1/admin/users/${customer.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ role: "EXPERT" });
    expect(promote.status).toBe(200);
    expect(promote.body.data.role).toBe("EXPERT");

    const auditCount = await prisma.auditLog.count({ where: { action: "USER_UPDATED" } });
    expect(auditCount).toBe(1);
  });
});
