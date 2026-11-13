import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { createUser, loginAgent, resetDb, validPayload } from "./helpers";

const pdf = buildSamplePdf("Test sample");

async function submitRequest(agent: Awaited<ReturnType<typeof loginAgent>>, override = {}) {
  return agent.agent
    .post("/api/v1/requests")
    .set("x-csrf-token", agent.csrf)
    .field("payload", JSON.stringify({ ...validPayload, ...override }))
    .attach("files", pdf, "proforma.pdf");
}

describe("clearance requests", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores a request with a tracking code, history and uploaded document", async () => {
    await createUser("CUSTOMER", "09121112233");
    const customer = await loginAgent("09121112233");

    const response = await submitRequest(customer);

    expect(response.status).toBe(201);
    expect(response.body.data.trackingCode).toMatch(/^ST-\d{4}-\d{6}$/);
    expect(response.body.data.status).toBe("SUBMITTED");
    expect(response.body.data.documents).toHaveLength(1);
    expect(response.body.data.documents[0].mimeType).toBe("application/pdf");
    expect(response.body.data.statusHistory).toHaveLength(1);

    const stored = await prisma.clearanceRequest.findUnique({
      where: { id: response.body.data.id },
      include: { documents: true },
    });
    expect(stored?.documents).toHaveLength(1);
  });

  it("rejects invalid payloads and unsafe files without creating a request", async () => {
    await createUser("CUSTOMER", "09121112233");
    const customer = await loginAgent("09121112233");

    const invalid = await submitRequest(customer, { goodsDescription: "" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("VALIDATION_ERROR");
    expect(invalid.body.errors.some((e: { field: string }) => e.field === "goodsDescription")).toBe(true);

    const badFile = await customer.agent
      .post("/api/v1/requests")
      .set("x-csrf-token", customer.csrf)
      .field("payload", JSON.stringify(validPayload))
      .attach("files", Buffer.from("plain text, not allowed"), "notes.txt");
    expect(badFile.status).toBe(400);

    expect(await prisma.clearanceRequest.count()).toBe(0);
    expect(await prisma.requestDocument.count()).toBe(0);
  });

  it("keeps requests and documents private to their owner", async () => {
    await createUser("CUSTOMER", "09121112233");
    await createUser("CUSTOMER", "09124445566", "مشتری دیگر");
    const owner = await loginAgent("09121112233");
    const other = await loginAgent("09124445566");

    const created = await submitRequest(owner);
    const { id } = created.body.data;
    const documentId = created.body.data.documents[0].id;

    expect((await other.agent.get(`/api/v1/requests/${id}`)).status).toBe(404);
    expect((await other.agent.get(`/api/v1/requests/${id}/documents/${documentId}/download`)).status).toBe(404);

    const otherList = await other.agent.get("/api/v1/requests");
    expect(otherList.status).toBe(200);
    expect(otherList.body.data.items).toHaveLength(0);

    const download = await owner.agent.get(`/api/v1/requests/${id}/documents/${documentId}/download`);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.headers["content-disposition"]).toContain("attachment");
  });

  it("records status changes and history, and hides internal notes from customers", async () => {
    await createUser("CUSTOMER", "09121112233");
    await createUser("ADMIN", "09120000001", "مدیر");
    const customer = await loginAgent("09121112233");
    const admin = await loginAgent("09120000001");

    const created = await submitRequest(customer);
    const { id } = created.body.data;

    const statusChange = await admin.agent
      .patch(`/api/v1/admin/requests/${id}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "NEED_MORE_INFO", reason: "نیاز به بارنامه" });
    expect(statusChange.status).toBe(200);

    const publicComment = await admin.agent
      .post(`/api/v1/requests/${id}/comments`)
      .set("x-csrf-token", admin.csrf)
      .send({ body: "لطفاً بارنامه را بارگذاری کنید.", visibility: "PUBLIC" });
    expect(publicComment.status).toBe(201);
    const internalComment = await admin.agent
      .post(`/api/v1/requests/${id}/comments`)
      .set("x-csrf-token", admin.csrf)
      .send({ body: "یادداشت داخلی محرمانه", visibility: "INTERNAL" });
    expect(internalComment.status).toBe(201);

    const customerView = await customer.agent.get(`/api/v1/requests/${id}`);
    expect(customerView.status).toBe(200);
    expect(customerView.body.data.status).toBe("NEED_MORE_INFO");
    expect(customerView.body.data.statusHistory).toHaveLength(2);
    const bodies = customerView.body.data.comments.map((c: { body: string }) => c.body);
    expect(bodies).toContain("لطفاً بارنامه را بارگذاری کنید.");
    expect(bodies).not.toContain("یادداشت داخلی محرمانه");

    const adminView = await admin.agent.get(`/api/v1/admin/requests/${id}`);
    expect(adminView.body.data.comments).toHaveLength(2);

    // A customer cannot force an internal note through the API.
    const customerComment = await customer.agent
      .post(`/api/v1/requests/${id}/comments`)
      .set("x-csrf-token", customer.csrf)
      .send({ body: "پاسخ مشتری", visibility: "INTERNAL" });
    expect(customerComment.body.data.visibility).toBe("PUBLIC");
  });

  it("adds a supplementary document and rejects workflow changes by customers", async () => {
    await createUser("CUSTOMER", "09121112233");
    const customer = await loginAgent("09121112233");
    const created = await submitRequest(customer);
    const { id } = created.body.data;

    const upload = await customer.agent
      .post(`/api/v1/requests/${id}/documents`)
      .set("x-csrf-token", customer.csrf)
      .attach("file", buildSamplePdf("Supplementary"), "packing-list.pdf");
    expect(upload.status).toBe(201);
    expect(upload.body.data.fileName).toBe("packing-list.pdf");

    const forbidden = await customer.agent
      .patch(`/api/v1/admin/requests/${id}/status`)
      .set("x-csrf-token", customer.csrf)
      .send({ status: "COMPLETED" });
    expect(forbidden.status).toBe(403);

    const invalidTransition = await loginAgent("09121112233");
    expect(invalidTransition.user.role).toBe("CUSTOMER");
  });

  it("rejects oversized uploads and a document id from another case", async () => {
    await createUser("CUSTOMER", "09121112233");
    const customer = await loginAgent("09121112233");

    const oversized = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(6 * 1024 * 1024, 0x20)]);
    const tooBig = await customer.agent
      .post("/api/v1/requests")
      .set("x-csrf-token", customer.csrf)
      .field("payload", JSON.stringify(validPayload))
      .attach("files", oversized, "huge.pdf");
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.code).toBe("FILE_TOO_LARGE");
    expect(await prisma.clearanceRequest.count()).toBe(0);

    const first = await submitRequest(customer);
    const second = await submitRequest(customer);
    const documentOfOtherCase = second.body.data.documents[0].id;

    const swapped = await customer.agent.get(
      `/api/v1/requests/${first.body.data.id}/documents/${documentOfOtherCase}/download`,
    );
    expect(swapped.status).toBe(404);
  });
});
