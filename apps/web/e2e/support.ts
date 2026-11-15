import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "BrowserTest123";

/** A mobile number that is valid but unlikely to collide between runs. */
export function uniqueMobile(): string {
  const digits = Date.now().toString().slice(-7);
  return `0912${digits}`;
}

export async function registerCustomer(page: Page, mobile: string, fullName = "مشتری تست مرورگر") {
  await page.goto("/register");
  await page.locator("#fullName").fill(fullName);
  await page.locator("#mobile").fill(mobile);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.locator("#confirmPassword").fill(TEST_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

export async function login(page: Page, mobile: string, password: string) {
  await page.goto("/login");
  await page.locator("#mobile").fill(mobile);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
}
