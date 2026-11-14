import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createUser, loginAgent, resetDb } from "./helpers";
import { prisma } from "../src/lib/prisma";

describe("authentication", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a customer and never accepts a role from the client", async () => {
    const agent = request.agent(app);
    const response = await agent.post("/api/v1/auth/register").send({
      fullName: "مشتری جدید",
      mobile: "۰۹۱۲۱۱۱۲۲۳۳",
      email: "New@Example.com",
      password: "Strong123",
      role: "ADMIN",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe("CUSTOMER");
    expect(response.body.data.user.mobile).toBe("09121112233");
    expect(response.headers["set-cookie"]?.some((c: string) => c.startsWith("st_session="))).toBe(true);

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("new@example.com");
  });

  it("rejects a duplicate mobile number", async () => {
    await createUser("CUSTOMER", "09121112233");
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "تکراری",
      mobile: "09121112233",
      password: "Strong123",
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("rejects a wrong password with a generic message", async () => {
    await createUser("CUSTOMER", "09121112233");

    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ mobile: "09121112233", password: "WrongPass1" });
    const unknownMobile = await request(app)
      .post("/api/v1/auth/login")
      .send({ mobile: "09121112299", password: "WrongPass1" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownMobile.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownMobile.body.message);
  });

  it("logs out and invalidates the server-side session", async () => {
    await createUser("CUSTOMER", "09121112233");
    const { agent, csrf } = await loginAgent("09121112233");

    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
    expect((await agent.post("/api/v1/auth/logout").set("x-csrf-token", csrf)).status).toBe(200);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("blocks state-changing requests without a valid CSRF token", async () => {
    await createUser("CUSTOMER", "09121112233");
    const { agent, csrf } = await loginAgent("09121112233");

    const withoutToken = await agent
      .patch("/api/v1/users/me")
      .send({ fullName: "نام تازه" });
    expect(withoutToken.status).toBe(403);
    expect(withoutToken.body.code).toBe("CSRF_FAILED");

    const withWrongToken = await agent
      .patch("/api/v1/users/me")
      .set("x-csrf-token", "not-the-real-token")
      .send({ fullName: "نام تازه" });
    expect(withWrongToken.status).toBe(403);

    const withToken = await agent
      .patch("/api/v1/users/me")
      .set("x-csrf-token", csrf)
      .send({ fullName: "نام تازه" });
    expect(withToken.status).toBe(200);
  });

  it("prevents a customer from using admin endpoints", async () => {
    await createUser("CUSTOMER", "09121112233");
    const { agent } = await loginAgent("09121112233");

    const response = await agent.get("/api/v1/admin/stats");
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("rejects requests from a foreign browser origin", async () => {
    const response = await request(app)
      .post("/api/v1/contact")
      .set("origin", "https://evil.example")
      .send({
        name: "تست",
        mobile: "09121112233",
        subject: "موضوع",
        message: "متن پیام تستی برای بررسی",
        privacyAccepted: true,
      });

    expect(response.status).toBe(403);
  });

  it("rejects an expired server-side session", async () => {
    await createUser("CUSTOMER", "09121112233");
    const { agent } = await loginAgent("09121112233");

    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) } });

    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
  });

  it("clears the dead session cookie so public forms work again", async () => {
    await createUser("CUSTOMER", "09121112233");
    const { agent, csrf } = await loginAgent("09121112233");
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) } });

    const message = {
      name: "کاربر تست",
      mobile: "09121112233",
      subject: "پرسش پس از انقضای نشست",
      message: "متن پیام تستی برای بررسی رفتار کوکی منقضی‌شده",
      privacyAccepted: true,
    };

    // The stale cookie makes this request fail closed…
    const stale = await agent.post("/api/v1/contact").set("x-csrf-token", csrf).send(message);
    expect(stale.status).toBe(401);
    expect(String(stale.headers["set-cookie"] ?? "")).toContain("st_session=;");
    expect(await prisma.session.count()).toBe(0);

    // …but the browser has been told to drop it, so the retry succeeds anonymously.
    const retry = await agent.post("/api/v1/contact").send(message);
    expect(retry.status).toBe(201);
  });
});
