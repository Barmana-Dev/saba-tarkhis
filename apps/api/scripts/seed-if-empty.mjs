/**
 * Container startup helper: seed the demo data only when the database is still
 * empty, so `docker compose up -d` can be re-run without duplicating the demo
 * requests the seed creates.
 */
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();
  if (users > 0) {
    console.log(`[seed] database already has ${users} user(s); skipping.`);
  } else {
    console.log("[seed] empty database, running the demo seed...");
    execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
  }
} finally {
  await prisma.$disconnect();
}
