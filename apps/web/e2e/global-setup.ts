import { execSync } from "node:child_process";

/**
 * The browser tests create accounts and requests, so they run against the
 * disposable `saba_tarkhis_test` database. It is pushed to the current schema
 * and seeded here, which keeps the development database in `apps/api/.env`
 * untouched. Anything whose database name does not end in `_test` is refused
 * before a single write happens.
 */
function assertTestDatabase(databaseUrl: string) {
  let database: string;
  try {
    database = new URL(databaseUrl).pathname.replace(/^\//, "");
  } catch {
    throw new Error(
      `E2E_DATABASE_URL / DATABASE_URL قابل تفسیر نیست: «${databaseUrl}». یک رشتهٔ اتصال معتبر بدهید.`,
    );
  }
  if (!database.endsWith("_test")) {
    throw new Error(
      `دیتابیس «${database}» برای تست مناسب نیست: نام دیتابیس باید به «_test» ختم شود تا دادهٔ توسعه پاک یا آلوده نشود. ` +
        "مثلاً saba_tarkhis_test را ست کنید (E2E_DATABASE_URL).",
    );
  }
}

export default function globalSetup() {
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public";

  assertTestDatabase(databaseUrl);
  if (process.env.E2E_SKIP_SEED) return;

  const password = process.env.E2E_STAFF_PASSWORD ?? "Demo@12345";
  const env = { ...process.env, DATABASE_URL: databaseUrl, SEED_DEMO_PASSWORD: password };

  execSync("npx prisma db push --skip-generate", { cwd: "../api", env, stdio: "inherit" });
  execSync("npm run db:seed", { cwd: "../api", env, stdio: "inherit" });
}
