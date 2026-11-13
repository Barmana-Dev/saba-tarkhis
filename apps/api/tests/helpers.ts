import request from "supertest";
import type { Role } from "@prisma/client";
import { createApp } from "../src/app";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

export const app = createApp();
export const DEMO_PASSWORD = "Demo@12345";

export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.requestStatusHistory.deleteMany();
  await prisma.requestComment.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.clearanceRequest.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.article.deleteMany();
  await prisma.articleCategory.deleteMany();
  await prisma.service.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.setting.deleteMany();
}

export async function createUser(role: Role, mobile: string, fullName = "کاربر تست") {
  return prisma.user.create({
    data: {
      fullName,
      mobile,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role,
    },
  });
}

export async function loginAgent(mobile: string) {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/v1/auth/login")
    .send({ mobile, password: DEMO_PASSWORD });

  if (response.status !== 200) {
    throw new Error(`Login failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  return {
    agent,
    csrf: response.body.data.csrfToken as string,
    user: response.body.data.user as { id: string; role: Role; fullName: string },
  };
}

export const validPayload = {
  applicantType: "COMPANY",
  applicantName: "شرکت تست",
  preferredContact: "MOBILE",
  goodsDescription: "قطعات یدکی صنعتی تست",
  procedureType: "IMPORT",
  originCountry: "آلمان",
  destinationCountry: "ایران",
  transportMode: "SEA",
  quantity: "10",
  quantityUnit: "کارتن",
  estimatedValue: "1500",
  currency: "EUR",
  notes: "توضیحات تست",
  privacyAccepted: true,
};
