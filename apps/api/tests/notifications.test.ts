import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { createUser, loginAgent, resetDb, validPayload } from "./helpers";

const pdf = buildSamplePdf("Notification sample");

async function submitRequest(agent: Awaited<ReturnType<typeof loginAgent>>) {
  return agent.agent
    .post("/api/v1/requests")
    .set("x-csrf-token", agent.csrf)
    .field("payload", JSON.stringify(validPayload))
    .attach("files", pdf, "proforma.pdf");
}

describe("in-panel notifications", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("notifies the case owner about staff replies and status changes only", async () => {
    await createUser("CUSTOMER", "09121110001", "مشتری اعلان");
    await createUser("ADMIN", "09121110003", "مدیر اعلان");
    await createUser("CUSTOMER", "09121110004", "مشتری دیگر");

    const customer = await loginAgent("09121110001");
    const admin = await loginAgent("09121110003");
    const otherCustomer = await loginAgent("09121110004");

    const created = await submitRequest(customer);
    expect(created.status).toBe(201);
    const requestId = created.body.data.id as string;

    // Creating a case does not notify its own owner.
    let feed = await customer.agent.get("/api/v1/notifications");
    expect(feed.status).toBe(200);
    expect(feed.body.data.unreadCount).toBe(0);

    // A public staff reply reaches the owner.
    const comment = await admin.agent
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("x-csrf-token", admin.csrf)
      .send({ body: "بارنامه را هم بارگذاری کنید." });
    expect(comment.status).toBe(201);

    feed = await customer.agent.get("/api/v1/notifications");
    expect(feed.body.data.unreadCount).toBe(1);
    expect(feed.body.data.items[0].type).toBe("REPLY");
    expect(feed.body.data.items[0].requestId).toBe(requestId);

    // A status change reaches the owner too.
    const status = await admin.agent
      .patch(`/api/v1/admin/requests/${requestId}/status`)
      .set("x-csrf-token", admin.csrf)
      .send({ status: "UNDER_REVIEW", reason: "شروع بررسی اسناد" });
    expect(status.status).toBe(200);

    feed = await customer.agent.get("/api/v1/notifications");
    expect(feed.body.data.unreadCount).toBe(2);
    expect(feed.body.data.items[0].type).toBe("STATUS_CHANGE");

    // Someone else's notifications stay private.
    const otherFeed = await otherCustomer.agent.get("/api/v1/notifications");
    expect(otherFeed.body.data.items).toHaveLength(0);
    expect(otherFeed.body.data.unreadCount).toBe(0);

    // Marking one as read leaves the other unread; the endpoint is owner-only.
    const newest = feed.body.data.items[0];
    const read = await customer.agent
      .post(`/api/v1/notifications/${newest.id}/read`)
      .set("x-csrf-token", customer.csrf)
      .send({});
    expect(read.status).toBe(200);

    const foreignRead = await otherCustomer.agent
      .post(`/api/v1/notifications/${newest.id}/read`)
      .set("x-csrf-token", otherCustomer.csrf)
      .send({});
    expect(foreignRead.status).toBe(404);

    feed = await customer.agent.get("/api/v1/notifications");
    expect(feed.body.data.unreadCount).toBe(1);

    const readAll = await customer.agent
      .post("/api/v1/notifications/read-all")
      .set("x-csrf-token", customer.csrf)
      .send({});
    expect(readAll.status).toBe(200);

    feed = await customer.agent.get("/api/v1/notifications");
    expect(feed.body.data.unreadCount).toBe(0);
  });
});
