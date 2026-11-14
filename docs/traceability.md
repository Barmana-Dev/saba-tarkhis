# ماتریس ردیابی و تأیید انتشار (Release Verification)

آخرین اجرا: ۲۰۲۶-۱۱-۱۴ — محیط: Node.js 24 LTS، PostgreSQL 16 (کانتینر Docker)، Windows + Linux،
بدون هیچ Deployment واقعی.

وضعیت کلی: **CONDITIONALLY READY** (آماده انتشار مشروط). همه الزام‌های قطعی MVP پیاده‌سازی و
تست شده‌اند؛ شرط‌های باقی‌مانده در بخش ۵ آمده‌اند.

## ۱) ماتریس الزام‌های قطعی MVP (سند اولیه، بخش ۱۵)

| # | الزام | وضعیت | شواهد |
| --- | --- | --- | --- |
| ۱ | سایت عمومی فارسی RTL و ریسپانسیو | PASS (بررسی دستی) | `apps/web/src/pages/*`، `index.css`؛ چک‌لیست تکرارپذیر در `docs/manual-qa.md` (۳ عرض ۳۶۰/۷۶۸/۱۴۴۰، بدون تست خودکار مرورگر) |
| ۲ | بک‌اند Node + PostgreSQL + migration | PASS | `apps/api/src/app.ts`، `prisma/schema.prisma`، `prisma/migrations/20261111072801_init` |
| ۳ | ثبت‌نام/ورود/خروج امن | PASS | `routes/auth.ts`، `tests/auth.test.ts`؛ شامل پاک‌شدن کوکی نشست منقضی |
| ۴ | ثبت و ذخیره واقعی درخواست | PASS | `routes/requests.ts`، `tests/requests.test.ts`، `tests/e2e.test.ts` |
| ۵ | آپلود/دانلود امن مدارک | PASS | `lib/files.ts`، `lib/scan.ts`؛ قرنطینه + اسکن Fail Closed، تست فایل جعلی/۶MB/آلوده/اسکنر قطع، تطابق بایت‌به‌بایت |
| ۶ | پنل مشتری (فهرست/جزئیات/پیام/مدارک) | PASS | `pages/Dashboard.tsx`، `pages/RequestDetail.tsx`؛ E2E |
| ۷ | پنل مدیر/کارشناس + تغییر وضعیت | PASS | `pages/admin/*`، `routes/admin.ts`، `tests/admin.test.ts`؛ تغییر هم‌زمان وضعیت → `409`، حفاظت از آخرین مدیر فعال |
| ۸ | پیام/یادداشت + تاریخچه وضعیت | PASS | `lib/status.ts`؛ تست مخفی‌ماندن INTERNAL و تاریخچه سه‌مرحله‌ای |
| ۹ | CRUD خدمات/مقالات/FAQ | PASS | `routes/admin.ts`؛ E2E ایجاد/انتشار/حذف خدمت و مقاله |
| ۱۰ | فرم تماس متصل به بک‌اند | PASS | `routes/content.ts`، `pages/Contact.tsx`، تست صندوق مدیر |
| ۱۱ | کنترل نقش و مالکیت در همه endpointهای خصوصی | PASS | `middleware/auth.ts`؛ ۴۰۴ برای پرونده/مدرک دیگری، ۴۰۳ برای نقش غیرمجاز |
| ۱۲ | اعتبارسنجی، مدیریت خطا، حالت‌های UI | PASS | `middleware/validate.ts`، `middleware/error.ts`، `components/ui.tsx`، `lib/api.ts` |
| ۱۲.۱ | محدودیت نرخ ثبت/بارگذاری و سقف حجم هر پرونده/حساب | PASS | `routes/requests.ts`، `tests/limits.test.ts` (۴۲۹ و ۴۰۰) |
| ۱۲.۲ | اسکن بدافزار (قرنطینه/Fail Closed) | PARTIAL | `lib/scan.ts`، `tests/scan.test.ts`؛ موتور واقعی ClamAV در این محیط نصب نیست — تأیید نهایی با `npm run scan:verify` (EICAR) روی staging |
| ۱۳ | مستندات نصب/API، seed، تست | PASS | `README.md`، `docs/api-spec.md`، `docs/deployment.md`، `docs/manual-qa.md`، `docs/go-live-checklist.md`، `prisma/seed.ts` (بدون رمز پیش‌فرض، غیرفعال در production)

## ۲) ماتریس تست‌های الزامی (سند اولیه، بخش ۱۶)

| تست | وضعیت | محل |
| --- | --- | --- |
| ثبت‌نام/ورود موفق، رمز اشتباه، خروج | PASS | `tests/auth.test.ts` |
| اعتبارسنجی فیلدها و حجم فایل | PASS | `tests/requests.test.ts`، `tests/e2e.test.ts` |
| ثبت درخواست + شناسه یکتا | PASS | `tests/requests.test.ts` |
| فهرست پرونده‌های شخصی | PASS | `tests/requests.test.ts` |
| جلوگیری از مشاهده/دانلود پرونده دیگری | PASS | `tests/requests.test.ts`، `tests/e2e.test.ts` |
| جلوگیری از دسترسی مشتری به پنل مدیر | PASS | `tests/auth.test.ts` |
| تاریخچه تغییر وضعیت | PASS | `tests/admin.test.ts`، E2E |
| مخفی‌ماندن یادداشت INTERNAL | PASS | `tests/requests.test.ts`، E2E |
| مقاله پیش‌نویس/منتشرشده | PASS | `tests/admin.test.ts`، E2E |
| فیلتر/صفحه‌بندی پنل مدیریت | PASS | `tests/admin.test.ts` (شامل بازه تاریخ به وقت ایران و رد تاریخ نامعتبر) |
| هم‌زمانی: تغییر وضعیت و سقف حجم بارگذاری | PASS | `tests/admin.test.ts`، `tests/requests.test.ts` (Promise.all → یکی ۲۰۰/۲۰۱ و دیگری ۴۰۹/۴۰۰) |
| قطع اتصال/خطای API | PASS (کد) | `apps/web/src/lib/api.ts` (NETWORK_ERROR و پیام فارسی) |
| آزمون موبایل ۳۶۰px و دسکتاپ | PASS (بررسی دستی مستندشده) | `docs/manual-qa.md` — بخش ریسپانسیو و اندازه‌گیری `scrollWidth` |

## ۳) CVE-2026-40345 / GHSA-ggr8-5vv4-36mx — تحلیل و رفع

| مورد | نتیجه |
| --- | --- |
| شناسه | CVE-2026-40345 / GHSA-ggr8-5vv4-36mx، شدت High (CVSS 4.0 = 8.2)، CWE-674 |
| نسخه آسیب‌پذیر | `deepmerge-ts < 8.0.0` (نصب‌شده: 7.1.5، pin دقیق در `@prisma/config@6.19.3`) |
| ماهیت | Stack exhaustion هنگام merge دو گراف شیء خودارجاع (JSON ساده کافی نیست) |
| مسیر استفاده | فقط `node_modules/@prisma/config/dist/index.js` → `merger` در `loadConfigTsOrJs`؛ ورودی همان `prisma.config.ts` توسعه‌دهنده است که c12 از قبل آن را با jiti اجرا می‌کند |
| مسیر runtime API | `prisma` فقط devDependency زنجیره CLI است؛ خروجی کامپایل‌شده API هیچ importی از `deepmerge-ts` ندارد (`grep -rl deepmerge dist` خالی) |
| رفع | `overrides: { "deepmerge-ts": "^8.0.2" }` در `apps/api/package.json`؛ نسخه نصب‌شده 8.0.2 |
| شواهد سازگاری | `prisma validate` / `generate` / `migrate status` موفق؛ تست مستقیم `c12` با `merger: deepmerge` و گراف خودارجاع بدون crash |
| نتیجه audit | `npm audit --omit=dev` → **0 vulnerabilities** |

## ۴) نتایج اجرای واقعی

- Node.js: `24.22.3` (LTS) — `npm ci` تمیز، typecheck/build/test هر دو اپ با همین نسخه
- `npm run typecheck` و `npm run build` (API): موفق
- `npx vitest run`: **۳۸/۳۸ تست در ۶ فایل** (E2E، محدودیت نرخ/حجم، اسکن، هم‌زمانی، تاریخ ایران،
  حفاظت از آخرین مدیر، پاک‌شدن کوکی نشست منقضی)
- تست‌ها روی Windows و Linux یکسان اجرا می‌شوند (stub اسکنر یک اسکریپت Node است، نه `/bin/sh`)
- `npm run build` (وب): موفق؛ `npm run lint`: ۰ خطا، ۸ هشدار قبلی
- Backup/Restore: `pg_dump -Fc` → `pg_restore` به دیتابیس جداگانه؛ تعداد ردیف‌های ۱۳ جدول مطابق
  (User 4، ClearanceRequest 3، RequestDocument 1، …) و نمونه داده‌های بازیابی‌شده یکسان
- فایل‌ها: کپی و بازیابی ۵۱ فایل با هش SHA-256 یکسان
- بررسی مرورگر: طبق `docs/manual-qa.md` به‌صورت دستی و تکرارپذیر انجام می‌شود (بدون تست خودکار
  مرورگر و بدون artifact در مخزن)

## ۵) موارد باقی‌مانده و شرط‌های انتشار

1. **تشخیص واقعی بدافزار: PENDING.** جریان قرنطینه/اسکن/Fail Closed پیاده و با stub تست شده،
   اما ClamAV در این محیط نصب نیست؛ در staging/کانتینر `npm run scan:verify` را اجرا کنید تا
   `clamscan` فایل EICAR را تشخیص دهد (اسکریپت آماده است: `apps/api/scripts/verify-clamav.mjs`).
2. **آسیب‌پذیری‌های dev-only:** `npm audit` کامل ۳ مورد (۱ moderate، ۲ critical) در
   `vitest/tinypool` نشان می‌دهد که فقط ابزار تست است و در بسته production نیست؛ رفع نیازمند
   ارتقای major ویتست است و انجام نشد.
3. **زیرساخت production:** ذخیره‌سازی محلی به‌جای Object Storage، نبود اجرای خودکار بکاپ، و
   تنظیم دامنه/HTTPS طبق `docs/deployment.md` وظیفه محیط استقرار است.
4. **محدودیت‌های شناخته‌شده محصول:** SPA بدون prerender (SEO)، نبود بازیابی رمز/OTP، و نبود
   ارسال ایمیل/پیامک.
