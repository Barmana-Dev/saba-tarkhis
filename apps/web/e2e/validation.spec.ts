import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { registerCustomer, uniqueMobile } from "./support";

const NOT_A_DOCUMENT = fileURLToPath(new URL("./fixtures/notes.txt", import.meta.url));

test("rejects a file type the uploader does not accept", async ({ page }) => {
  await registerCustomer(page, uniqueMobile());

  await page.goto("/requests/new");
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.locator("#goodsDescription").fill("بارگذاری فایل نامعتبر برای تست مرورگر");
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await expect(page.locator("#file-input")).toBeVisible();

  await page.locator("#file-input").setInputFiles(NOT_A_DOCUMENT);
  await expect(page.getByText("فقط فایل‌های PDF، JPG و PNG قابل بارگذاری هستند.")).toBeVisible();

  // The rejected file is not queued, so nothing is sent and no case is created.
  await expect(page.getByText("notes.txt")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/dashboard\/requests\//);
});

test("keeps the goods step open while the description is missing", async ({ page }) => {
  await registerCustomer(page, uniqueMobile());

  await page.goto("/requests/new");
  await page.getByRole("button", { name: "مرحله بعد" }).click();
  await page.getByRole("button", { name: "مرحله بعد" }).click();

  await expect(page.getByText("شرح کالا را وارد کنید.")).toBeVisible();
  // Still on the goods step: the documents step is not reachable yet.
  await expect(page.locator("#file-input")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/dashboard\/requests\//);
});
