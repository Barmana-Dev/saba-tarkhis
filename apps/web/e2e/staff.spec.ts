import { expect, test } from "@playwright/test";
import { login } from "./support";

/**
 * Needs a seeded staff account:
 *   SEED_DEMO_PASSWORD=... npm run db:reset
 *   E2E_STAFF_MOBILE=09120000001 E2E_STAFF_PASSWORD=... npm run test:e2e
 * Skipped automatically when the credentials are not provided.
 */
const staffMobile = process.env.E2E_STAFF_MOBILE ?? "09120000001";
const staffPassword = process.env.E2E_STAFF_PASSWORD;

test.skip(!staffPassword, "E2E_STAFF_PASSWORD is not set (see docs/manual-qa.md)");

test("staff opens a case and moves it to the next status", async ({ page }) => {
  await login(page, staffMobile, staffPassword!);
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  const firstCase = page.locator('a[href^="/admin/requests/"]').first();
  await expect(firstCase).toBeVisible({ timeout: 20_000 });
  await firstCase.click();

  const statusSection = page.locator("section", { hasText: "تغییر وضعیت" }).first();
  await expect(statusSection).toBeVisible();

  const statusSelect = statusSection.getByRole("combobox").first();
  const options = await statusSelect.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLOptionElement).value),
  );
  const nextStatus = options.at(-1);
  expect(nextStatus, "the case should offer at least one next status").toBeTruthy();

  await statusSelect.selectOption(nextStatus!);
  await statusSection.getByRole("button", { name: "ثبت تغییر وضعیت" }).click();

  await expect(page.getByText("وضعیت پرونده تغییر کرد و در تاریخچه ثبت شد.")).toBeVisible({
    timeout: 20_000,
  });
});
