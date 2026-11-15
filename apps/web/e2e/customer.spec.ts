import { expect, test } from "@playwright/test";
import { login, registerCustomer, TEST_PASSWORD, uniqueMobile } from "./support";

test("customer registers, logs out and signs in again", async ({ page }) => {
  const mobile = uniqueMobile();

  await registerCustomer(page, mobile);
  await expect(page.getByRole("link", { name: "پنل من" })).toBeVisible();

  await page.getByRole("button", { name: "خروج" }).first().click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: "ورود / ثبت‌نام" })).toBeVisible();

  await login(page, mobile, TEST_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
});

test("wrong password shows a Persian error instead of signing in", async ({ page }) => {
  const mobile = uniqueMobile();
  await registerCustomer(page, mobile);
  await page.getByRole("button", { name: "خروج" }).first().click();

  await login(page, mobile, "WrongPassword123");
  await expect(page.getByText("شماره موبایل یا رمز عبور نادرست است.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
