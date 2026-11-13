/**
 * Creates a real account (no demo data) — normally the first ADMIN after a
 * production deployment, since the seed script is demo-only and must not be run
 * there. Usage:
 *
 *   npm run user:create -- --mobile 09121234567 --name "نام و نام خانوادگی" \
 *     --role ADMIN [--password "..."]
 *
 * When --password is omitted, USE_ME_PASSWORD (or ADMIN_PASSWORD) is read from
 * the environment so the secret does not land in shell history.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const ROLES = ["ADMIN", "EXPERT", "CUSTOMER"];
const SALT_ROUNDS = 12;

function arg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];
  return undefined;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const mobile = arg("mobile")?.trim();
const fullName = arg("name")?.trim();
const role = (arg("role") ?? "ADMIN").trim().toUpperCase();
const password =
  arg("password") ?? process.env.USE_ME_PASSWORD ?? process.env.ADMIN_PASSWORD;
const email = arg("email")?.trim();

if (!mobile || !/^09\d{9}$/.test(mobile)) {
  fail("شماره موبایل معتبر بدهید: --mobile 09xxxxxxxxx");
}
if (!fullName || fullName.length < 3) {
  fail("نام کامل را بدهید: --name \"نام و نام خانوادگی\"");
}
if (!ROLES.includes(role)) {
  fail(`نقش باید یکی از ${ROLES.join(" / ")} باشد.`);
}
if (!password || password.length < 10) {
  fail(
    "رمز عبور حداقل ۱۰ کاراکتر است: --password \"...\" یا متغیر USE_ME_PASSWORD را تنظیم کنید.",
  );
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findUnique({ where: { mobile } });
  if (existing) {
    fail(`کاربری با موبایل ${mobile} از قبل وجود دارد (نقش: ${existing.role}).`);
  }

  const user = await prisma.user.create({
    data: {
      mobile,
      fullName,
      email: email || null,
      role,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    },
    select: { id: true, mobile: true, fullName: true, role: true },
  });

  console.log(`✔ کاربر ساخته شد: ${user.fullName} — ${user.mobile} — نقش ${user.role}`);
} catch (error) {
  console.error("✖ ساخت کاربر ناموفق بود:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
