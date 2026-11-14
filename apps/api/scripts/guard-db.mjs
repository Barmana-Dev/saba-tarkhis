/**
 * Guard for destructive/seed database commands.
 *
 * `db:reset` drops every table and `db:seed` writes demo accounts with a shared
 * password. Both refuse to run against production and only accept a local (or
 * explicitly allowed) database host, so a stray command cannot wipe real data.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(apiRoot, ".env");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "db", "postgres", "host.docker.internal"]);

function readFromEnvFile(key) {
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => new RegExp(`^\\s*${key}\\s*=`).test(entry));
  if (!line) return undefined;
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

function fail(message) {
  console.error(`\n[دستور متوقف شد] ${message}\n`);
  process.exit(1);
}

const command = process.argv[2] ?? "database command";
const databaseUrl = process.env.DATABASE_URL ?? readFromEnvFile("DATABASE_URL");
const nodeEnv = process.env.NODE_ENV ?? readFromEnvFile("NODE_ENV") ?? "development";

if (!databaseUrl) {
  fail("DATABASE_URL تنظیم نشده است. فایل apps/api/.env را بسازید (نمونه: .env.example).");
}

if (nodeEnv === "production") {
  fail(
    `اجرای «${command}» در محیط production مجاز نیست، چون داده واقعی را پاک می‌کند یا حساب دمو می‌سازد. برای ساخت مدیر از «npm run user:create» استفاده کنید.`,
  );
}

let host;
let database;
try {
  const parsed = new URL(databaseUrl);
  host = parsed.hostname;
  database = parsed.pathname.replace(/^\//, "");
} catch {
  fail("DATABASE_URL قابل تفسیر نیست.");
}

const allowRemote = process.env.ALLOW_REMOTE_DB === "true";
if (!LOCAL_HOSTS.has(host) && !allowRemote) {
  fail(
    `هاست دیتابیس «${host}» محلی نیست. اگر واقعاً می‌خواهید روی یک دیتابیس توسعه‌ای راه‌دور اجرا شود، ALLOW_REMOTE_DB=true را موقتاً تنظیم کنید.`,
  );
}

if (!database) {
  fail("نام دیتابیس در DATABASE_URL مشخص نیست.");
}

console.log(`[guard] «${command}» روی دیتابیس محلی «${database}» (${host}) مجاز است.`);
