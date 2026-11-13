import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(apiRoot, ".env");

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

const databaseUrl = process.env.DATABASE_URL ?? readFromEnvFile("DATABASE_URL");

if (!databaseUrl) {
  console.error(`
[خطا] متغیر DATABASE_URL تنظیم نشده است.

Prisma برای اجرای migration به این متغیر نیاز دارد. یکی از دو راه را انجام دهید:

  ۱) ساخت فایل .env در پوشه apps/api:
     Windows (CMD):        copy .env.example .env
     Windows (PowerShell): Copy-Item .env.example .env
     سپس مقدار DATABASE_URL را در آن ویرایش کنید.

  ۲) تنظیم موقت در همان ترمینال:
     PowerShell:  $env:DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/saba_tarkhis?schema=public"
     CMD:         set DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/saba_tarkhis?schema=public

راهنما: docs/deployment.md — بخش «Migration و Backup»
`);
  process.exit(1);
}
