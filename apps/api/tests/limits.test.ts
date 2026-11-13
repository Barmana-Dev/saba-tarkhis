import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { createUser, loginAgent, resetDb, validPayload } from "./helpers";

const pdf = buildSamplePdf("limits sample");

async function submit(
  agent: Awaited<ReturnType<typeof loginAgent>>["agent"],
  csrf: string,
) {
  return agent
    .post("/api/v1/requests")
    .set("x-csrf-token", csrf)
    .field("payload", JSON.stringify(validPayload))
    .attach("files", pdf, "doc.pdf");
}

async function seedDocuments(
  requestId: string,
  uploadedById: string,
  items: { fileSize: number; scanStatus?: "CLEAN" | "PENDING" }[],
) {
  await prisma.requestDocument.createMany({
    data: items.map((item, index) => ({
      requestId,
      uploadedById,
      fileName: `seed-${index}.pdf`,
      storageKey: `seed/${requestId}/${index}-${Date.now()}.pdf`,
      mimeType: "application/pdf",
      fileSize: item.fileSize,
      scanStatus: item.scanStatus ?? "CLEAN",
    })),
  });
}

describe("request and upload limits", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 429 after the per-user hourly request limit", async () => {
    await createUser("CUSTOMER", "09126660001", "مشتری محدودیت");
    const customer = await loginAgent("09126660001");

    for (let index = 0; index < 6; index += 1) {
      const response = await submit(customer.agent, customer.csrf);
      expect(response.status).toBe(201);
    }

    const blocked = await submit(customer.agent, customer.csrf);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
    expect(await prisma.clearanceRequest.count()).toBe(6);
  }, 60_000);

  it("returns 429 after the per-user hourly upload limit", async () => {
    await createUser("CUSTOMER", "09126660002", "مشتری آپلود");
    const customer = await loginAgent("09126660002");

    const created = await submit(customer.agent, customer.csrf);
    const requestId = created.body.data.id as string;

    for (let index = 0; index < 10; index += 1) {
      const upload = await customer.agent
        .post(`/api/v1/requests/${requestId}/documents`)
        .set("x-csrf-token", customer.csrf)
        .attach("file", pdf, `extra-${index}.pdf`);
      expect(upload.status).toBe(201);
    }

    const blocked = await customer.agent
      .post(`/api/v1/requests/${requestId}/documents`)
      .set("x-csrf-token", customer.csrf)
      .attach("file", pdf, "blocked.pdf");
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  }, 60_000);

  it("enforces the per-case document count on the backend", async () => {
    await createUser("CUSTOMER", "09126660003", "مشتری سقف تعداد");
    const customer = await loginAgent("09126660003");
    const created = await submit(customer.agent, customer.csrf);
    const requestId = created.body.data.id as string;

    // One document exists; fill the case to the configured maximum of 20.
    await seedDocuments(requestId, customer.user.id, Array.from({ length: 19 }, () => ({ fileSize: 100 })));

    const blocked = await customer.agent
      .post(`/api/v1/requests/${requestId}/documents`)
      .set("x-csrf-token", customer.csrf)
      .attach("file", pdf, "over-count.pdf");
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toContain("سقف مجاز");
  });

  it("enforces the per-case total size on the backend", async () => {
    await createUser("CUSTOMER", "09126660004", "مشتری سقف حجم");
    const customer = await loginAgent("09126660004");
    const created = await submit(customer.agent, customer.csrf);
    const requestId = created.body.data.id as string;

    await seedDocuments(requestId, customer.user.id, [{ fileSize: 5 * 1024 * 1024 }]);

    const blocked = await customer.agent
      .post(`/api/v1/requests/${requestId}/documents`)
      .set("x-csrf-token", customer.csrf)
      .attach("file", pdf, "over-size.pdf");
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toContain("حجم مجموع مدارک");
  });

  it("enforces the per-user storage cap across cases", async () => {
    await createUser("CUSTOMER", "09126660005", "مشتری سقف حساب");
    const customer = await loginAgent("09126660005");
    const first = await submit(customer.agent, customer.csrf);
    const second = await submit(customer.agent, customer.csrf);
    const secondRequestId = second.body.data.id as string;

    // Consume the account quota in the first case so the second case is still
    // within its own per-case budget when the user-level cap is evaluated.
    await seedDocuments(first.body.data.id as string, customer.user.id, [
      { fileSize: 200 * 1024 * 1024 },
    ]);

    const blocked = await customer.agent
      .post(`/api/v1/requests/${secondRequestId}/documents`)
      .set("x-csrf-token", customer.csrf)
      .attach("file", pdf, "over-account.pdf");
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toContain("حجم کل مدارک حساب");
  });
});
