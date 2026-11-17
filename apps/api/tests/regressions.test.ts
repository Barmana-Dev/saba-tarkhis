import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { passwordSchema } from "../src/lib/validators";
import { app, createUser, loginAgent, resetDb, validPayload } from "./helpers";

const pdf = buildSamplePdf("Regression sample");

async function submitRequest(agent: Awaited<ReturnType<typeof loginAgent>>, override = {}) {
  return agent.agent
    .post("/api/v1/requests")
    .set("x-csrf-token", agent.csrf)
    .field("payload", JSON.stringify({ ...validPayload, ...override }))
    .attach("files", pdf, "proforma.pdf");
}

describe("regression fixes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps publication state and ordering on a partial CMS PATCH", async () => {
    await createUser("ADMIN", "09127770001", "مدیر محتوا");
    const admin = await loginAgent("09127770001");

    const service = await admin.agent
      .post("/api/v1/admin/services")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "customs-consult",
        title: "مشاوره گمرکی",
        excerpt: "توضیح کوتاه درباره خدمت مشاوره گمرکی.",
        body: "متن کامل خدمت مشاوره گمرکی برای تست رگرسیون.",
        isPublished: true,
        sortOrder: 42,
      });
    expect(service.status).toBe(201);

    const patchedService = await admin.agent
      .patch(`/api/v1/admin/services/${service.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ title: "مشاوره گمرکی تخصصی" });
    expect(patchedService.status).toBe(200);
    expect(patchedService.body.data.isPublished).toBe(true);
    expect(patchedService.body.data.sortOrder).toBe(42);

    const article = await admin.agent
      .post("/api/v1/admin/articles")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "import-guide",
        title: "راهنمای واردات",
        excerpt: "خلاصه مقاله راهنمای واردات کالا.",
        body: "متن کامل مقاله راهنمای واردات برای تست رگرسیون.",
        status: "PUBLISHED",
      });
    expect(article.status).toBe(201);

    const patchedArticle = await admin.agent
      .patch(`/api/v1/admin/articles/${article.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ title: "راهنمای واردات کالا" });
    expect(patchedArticle.status).toBe(200);
    expect(patchedArticle.body.data.status).toBe("PUBLISHED");

    const faq = await admin.agent
      .post("/api/v1/admin/faqs")
      .set("x-csrf-token", admin.csrf)
      .send({
        question: "ترخیص کالا چقدر زمان می‌برد؟",
        answer: "مدت زمان به نوع کالا و مدارک بستگی دارد.",
        isPublished: false,
        sortOrder: 37,
      });
    expect(faq.status).toBe(201);

    const patchedFaq = await admin.agent
      .patch(`/api/v1/admin/faqs/${faq.body.data.id}`)
      .set("x-csrf-token", admin.csrf)
      .send({ question: "ترخیص کالا معمولاً چقدر زمان می‌برد؟" });
    expect(patchedFaq.status).toBe(200);
    expect(patchedFaq.body.data.isPublished).toBe(false);
    expect(patchedFaq.body.data.sortOrder).toBe(37);
  });

  it("leaves the stored email untouched when a profile PATCH omits it", async () => {
    await createUser("CUSTOMER", "09127770002", "مشتری پروفایل");
    const customer = await loginAgent("09127770002");

    const withEmail = await customer.agent
      .patch("/api/v1/users/me")
      .set("x-csrf-token", customer.csrf)
      .send({ fullName: "مشتری پروفایل", email: "profile@example.test" });
    expect(withEmail.status).toBe(200);
    expect(withEmail.body.data.email).toBe("profile@example.test");

    const nameOnly = await customer.agent
      .patch("/api/v1/users/me")
      .set("x-csrf-token", customer.csrf)
      .send({ fullName: "مشتری پروفایل دوم" });
    expect(nameOnly.status).toBe(200);
    expect(nameOnly.body.data.email).toBe("profile@example.test");

    const cleared = await customer.agent
      .patch("/api/v1/users/me")
      .set("x-csrf-token", customer.csrf)
      .send({ email: "" });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.email).toBeNull();
  });

  it("answers client input errors with 4xx instead of 500", async () => {
    await createUser("ADMIN", "09127770003", "مدیر خطا");
    const admin = await loginAgent("09127770003");

    const malformed = await request(app)
      .post("/api/v1/contact")
      .set("Content-Type", "application/json")
      .send('{"name": "broken"');
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe("INVALID_JSON");

    const oversized = await request(app)
      .post("/api/v1/contact")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ name: "x".repeat(1_100_000) }));
    expect(oversized.status).toBe(413);
    expect(oversized.body.code).toBe("PAYLOAD_TOO_LARGE");

    const badDate = await admin.agent
      .post("/api/v1/admin/articles")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "bad-date",
        title: "مقاله با تاریخ نامعتبر",
        excerpt: "خلاصه مقاله با تاریخ بازبینی نامعتبر.",
        body: "متن کامل مقاله برای بررسی تاریخ بازبینی نامعتبر.",
        reviewedAt: "not-a-date",
      });
    expect(badDate.status).toBe(400);
    expect(badDate.body.code).toBe("VALIDATION_ERROR");

    const missingCategory = await admin.agent
      .post("/api/v1/admin/articles")
      .set("x-csrf-token", admin.csrf)
      .send({
        slug: "missing-category",
        title: "مقاله با دسته ناموجود",
        excerpt: "خلاصه مقاله با دسته‌بندی ناموجود.",
        body: "متن کامل مقاله برای بررسی دسته‌بندی ناموجود.",
        categoryId: "missing-category-id",
      });
    expect(missingCategory.status).toBe(400);
    expect(missingCategory.body.message).toContain("دسته‌بندی");
  });

  it("lets staff quote a case that is waiting for more information", async () => {
    await createUser("CUSTOMER", "09127770004", "مشتری پیشنهاد");
    await createUser("ADMIN", "09127770005", "مدیر پیشنهاد");
    const customer = await loginAgent("09127770004");
    const admin = await loginAgent("09127770005");

    const created = await submitRequest(customer);
    expect(created.status).toBe(201);
    const requestId = created.body.data.id as string;

    const moved = await admin.agent
      .patch(`/api/v1/admin/requests/${requestId}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "NEED_MORE_INFO", reason: "نیاز به بارنامه" });
    expect(moved.status).toBe(200);

    const quote = await admin.agent
      .patch(`/api/v1/admin/requests/${requestId}/quote`)
      .set("x-csrf-token", admin.csrf)
      .send({ quoteNote: "برآورد اولیه خدمات پس از دریافت بارنامه.", markAsQuoted: true });
    expect(quote.status).toBe(200);
    expect(quote.body.data.status).toBe("QUOTED");
  });

  it("counts only visible messages for the customer and bumps the case timestamp", async () => {
    await createUser("CUSTOMER", "09127770006", "مشتری شمارش");
    await createUser("ADMIN", "09127770007", "مدیر شمارش");
    const customer = await loginAgent("09127770006");
    const admin = await loginAgent("09127770007");

    const created = await submitRequest(customer);
    const requestId = created.body.data.id as string;
    const before = await prisma.clearanceRequest.findUniqueOrThrow({ where: { id: requestId } });

    await new Promise((resolve) => setTimeout(resolve, 5));
    await admin.agent
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("x-csrf-token", admin.csrf)
      .send({ body: "یادداشت داخلی برای همکاران.", visibility: "INTERNAL" });

    const afterInternal = await prisma.clearanceRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(afterInternal.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());

    const publicComment = await admin.agent
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("x-csrf-token", admin.csrf)
      .send({ body: "بارنامه را بارگذاری کنید.", visibility: "PUBLIC" });
    expect(publicComment.status).toBe(201);

    const list = await customer.agent.get("/api/v1/requests");
    expect(list.status).toBe(200);
    expect(list.body.data.items[0]._count.comments).toBe(1);

    const detail = await customer.agent.get(`/api/v1/requests/${requestId}`);
    expect(detail.body.data.comments).toHaveLength(1);
  });

  it("keeps old unread notifications inside the returned feed", async () => {
    const customer = await createUser("CUSTOMER", "09127770008", "مشتری اعلان کهنه");
    const agent = await loginAgent("09127770008");

    const base = Date.now() - 60 * 60 * 1000;
    await prisma.notification.createMany({
      data: Array.from({ length: 25 }, (_, index) => ({
        userId: customer.id,
        type: "STATUS_CHANGE" as const,
        title: `اعلان ${index}`,
        createdAt: new Date(base + index * 1000),
        // The five oldest stay unread, newer ones were already read.
        readAt: index < 20 ? new Date(base + index * 1000 + 500) : null,
      })),
    });

    const feed = await agent.agent.get("/api/v1/notifications");
    expect(feed.status).toBe(200);
    expect(feed.body.data.unreadCount).toBe(5);
    expect(feed.body.data.items.filter((item: { readAt: string | null }) => !item.readAt)).toHaveLength(
      5,
    );
  });

  it("stores the account name when the applicant name is left empty", async () => {
    await createUser("CUSTOMER", "09127770009", "مشتری بی‌نام");
    const customer = await loginAgent("09127770009");

    const withoutName: Record<string, unknown> = { ...validPayload };
    delete withoutName.applicantName;
    const created = await customer.agent
      .post("/api/v1/requests")
      .set("x-csrf-token", customer.csrf)
      .field("payload", JSON.stringify(withoutName))
      .attach("files", pdf, "proforma.pdf");

    expect(created.status).toBe(201);
    expect(created.body.data.applicantName).toBe("مشتری بی‌نام");
  });

  it("rejects passwords whose bcrypt slice would drop their tail", () => {
    const longPersian = `A1${"ژ".repeat(35)}X`;
    expect(Buffer.byteLength(longPersian, "utf8")).toBeGreaterThan(72);
    expect(passwordSchema.safeParse(longPersian).success).toBe(false);
    expect(passwordSchema.safeParse("Strong123").success).toBe(true);
  });

  it("caps oversized multipart text fields", async () => {
    await createUser("CUSTOMER", "09127770010", "مشتری فیلد بزرگ");
    const customer = await loginAgent("09127770010");

    const response = await customer.agent
      .post("/api/v1/requests")
      .set("x-csrf-token", customer.csrf)
      .field("payload", JSON.stringify(validPayload))
      .field("padding", "x".repeat(40 * 1024))
      .attach("files", pdf, "proforma.pdf");

    expect(response.status).toBe(413);
    expect(await prisma.clearanceRequest.count()).toBe(0);
  });

  it("issues a fresh CSRF token for the current session", async () => {
    await createUser("CUSTOMER", "09127770011", "مشتری توکن");
    const customer = await loginAgent("09127770011");

    const fresh = await customer.agent.get("/api/v1/auth/csrf");
    expect(fresh.status).toBe(200);
    expect(typeof fresh.body.data.csrfToken).toBe("string");

    const used = await customer.agent
      .post("/api/v1/notifications/read-all")
      .set("x-csrf-token", fresh.body.data.csrfToken)
      .send({});
    expect(used.status).toBe(200);

    const stale = await customer.agent
      .post("/api/v1/notifications/read-all")
      .set("x-csrf-token", customer.csrf)
      .send({});
    expect(stale.status).toBe(403);
  });

  it("keeps the CSRF-protected admin endpoints rejecting anonymous calls", async () => {
    const response = await request(app).post("/api/v1/notifications/read-all").send({});
    expect(response.status).toBe(401);
  });
});
