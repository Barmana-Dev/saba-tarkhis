import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { registerCustomer, uniqueMobile } from "./support";

const SAMPLE_PDF = fileURLToPath(new URL("./fixtures/sample.pdf", import.meta.url));

test("customer files a request with a document and sees the tracking code", async ({ page }) => {
  await registerCustomer(page, uniqueMobile());

  await page.goto("/requests/new");

  // Step 1 — applicant
  await page.locator("#applicantType").selectOption("COMPANY");
  await page.getByRole("button", { name: "مرحله بعد" }).click();

  // Step 2 — goods
  await page.locator("#goodsDescription").fill("قطعات یدکی صنعتی برای تست مرورگر");
  await page.locator("#procedureType").selectOption("IMPORT");
  await page.locator("#transportMode").selectOption("SEA");
  await page.getByRole("button", { name: "مرحله بعد" }).click();

  // Step 3 — documents and consent
  await page.locator("#file-input").setInputFiles(SAMPLE_PDF);
  await expect(page.getByText("sample.pdf")).toBeVisible();
  await page.locator("#privacyAccepted").check();
  await page.getByRole("button", { name: "مرحله بعد" }).click();

  // Step 4 — review and submit. The button is asserted visible and enabled, then
  // clicked for real through the input pipeline; `force` is only there because
  // the submit disables the button while the upload is in flight, which would
  // otherwise keep Playwright waiting on an element that is no longer enabled.
  await expect(page.getByText("قطعات یدکی صنعتی برای تست مرورگر")).toBeVisible();
  const submit = page.getByRole("button", { name: "ثبت نهایی درخواست" });
  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();

  // A real click on a real button: Playwright checks that it is visible and
  // enabled, dispatches the click and then the assertion below waits for the
  // page the submission navigates to.
  await submit.click();

  await expect(page).toHaveURL(/\/dashboard\/requests\/[\w-]+/, { timeout: 30_000 });
  await expect(page.getByText(/ST-\d{4}-\d{6}/).first()).toBeVisible();
  await expect(page.getByText("ثبت‌شده").first()).toBeVisible();
  await expect(page.getByText("sample.pdf")).toBeVisible();
});

test("creating a request is blocked without the privacy confirmation", async ({ page }) => {
  await registerCustomer(page, uniqueMobile());
  await page.goto("/requests/new");

  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.locator("#goodsDescription").fill("محموله تستی برای بررسی اعتبارسنجی فرم");
  await page.getByRole("button", { name: "مرحله بعد" }).click();

  // Step 3 stays put because the consent checkbox is required.
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await expect(page.getByText("پذیرش سیاست حریم خصوصی الزامی است.")).toBeVisible();
  await expect(page.getByRole("button", { name: "ثبت نهایی درخواست" })).toHaveCount(0);
});
