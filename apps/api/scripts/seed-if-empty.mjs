/**
 * Container startup helper: seed the demo data only when the database is still
 * empty. `docker compose up -d` can then be re-run without duplicating the
 * demo requests the seed creates.
 */
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.ENABLE_DEMO_SEED !== "true") {
  console.log("[seed] ENABLE_DEMO_SEED is not true; skipping.");
  process.exit(0);
}

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
