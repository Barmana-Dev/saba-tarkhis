import { execSync } from "node:child_process";
import { chmodSync, rmSync, writeFileSync } from "node:fs";
import { fakeClamavSource, INFECTED_MARKER, STUB_PATH } from "./fake-clamav";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public";

/**
 * The suite truncates tables between tests. Refuse to run unless the target
 * database name ends in `_test`, so a copy-pasted DATABASE_URL can never wipe a
 * real development or production database.
 */
export function assertTestDatabase(url: string) {
  let database: string;
  try {
    database = new URL(url).pathname.replace(/^\//, "");
  } catch {
    throw new Error("TEST_DATABASE_URL / DATABASE_URL is not a valid connection string.");
  }
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to run the test suite against "${database}": the database name must end with "_test".`,
    );
  }
}

export default function globalSetup() {
  assertTestDatabase(TEST_DATABASE_URL);

  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  writeFileSync(STUB_PATH, fakeClamavSource(), { mode: 0o755 });
  chmodSync(STUB_PATH, 0o755);
  rmSync(INFECTED_MARKER, { force: true });
}
