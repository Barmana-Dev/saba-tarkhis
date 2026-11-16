import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the main user journeys.
 *
 * Prerequisites (see docs/manual-qa.md):
 *   - PostgreSQL running (the tests create and seed their own `_test` database)
 *   - a Chromium build: either `npx playwright install chromium`, or a system
 *     browser via `E2E_CHANNEL=chrome` (or `msedge`)
 *
 * The API and the Vite dev server are always started by Playwright, on their own
 * ports (3100/4100 by default) with the API pointed at `saba_tarkhis_test`.
 * Servers are never reused: a running `npm run dev` would keep its own
 * DATABASE_URL from apps/api/.env and write test accounts into development data.
 */
const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3100";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4100";
const apiPort = new URL(apiUrl).port || "4100";
const webPort = new URL(webUrl).port || "3100";
const channel = process.env.E2E_CHANNEL;

export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public";

export const e2eStaffPassword = process.env.E2E_STAFF_PASSWORD ?? "Demo@12345";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: webUrl,
    locale: "fa-IR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(channel ? { channel: channel as "chrome" | "msedge" } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "npm --prefix ../api run dev",
          url: `${apiUrl}/api/v1/health`,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            DATABASE_URL: e2eDatabaseUrl,
            PORT: apiPort,
            NODE_ENV: "test",
            APP_ORIGIN: webUrl,
          },
        },
        {
          command: `npm run dev -- --port ${webPort} --strictPort`,
          url: webUrl,
          reuseExistingServer: false,
          timeout: 120_000,
          env: { API_PROXY_TARGET: apiUrl, APP_ORIGIN: webUrl },
        },
      ],
});
