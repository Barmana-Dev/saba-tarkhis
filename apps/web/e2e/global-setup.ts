import { execSync } from "node:child_process";

/**
 * The browser tests create accounts and requests, so they run against the
 * disposable `saba_tarkhis_test` database. It is pushed to the current schema
 * and seeded here, which keeps `apps/api/.env`'s development database untouched.
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED) return;

  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public";
  const password = process.env.E2E_STAFF_PASSWORD ?? "Demo@12345";

  const env = { ...process.env, DATABASE_URL: databaseUrl, SEED_DEMO_PASSWORD: password };

  execSync("npx prisma db push --skip-generate", { cwd: "../api", env, stdio: "inherit" });
  execSync("npm run db:seed", { cwd: "../api", env, stdio: "inherit" });
}
