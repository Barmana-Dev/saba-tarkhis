import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the main user journeys.
 *
 * Prerequisites (see docs/manual-qa.md):
 *   - PostgreSQL running and seeded with `SEED_DEMO_PASSWORD=... npm run db:reset`
 *   - a Chromium build: either `npx playwright install chromium`, or a system
 *     browser via `E2E_CHANNEL=chrome` (or `msedge`)
 *
 * The API and the Vite dev server are started automatically; an already running
 * server is reused.
 */
const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4000";
const channel = process.env.E2E_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
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
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "npm run dev",
          url: webUrl,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
