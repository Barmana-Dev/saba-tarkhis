# پاسخ به بازخورد بررسی پروژه

مرجع: «بازخورد بررسی پروژه صبا ترخیص». هر مورد با محل تغییر و شاهد اجرا آمده است.

## اولویت اول

### ۱) آپلود فایل در داکر — انجام شد

- [x] هر دو پوشه روی یک volume: `docker-compose.prod.yml` → `saba_tarkhis_files:/var/lib/saba-tarkhis`
      (`UPLOAD_DIR=/var/lib/saba-tarkhis/storage`، `QUARANTINE_DIR=/var/lib/saba-tarkhis/quarantine`).
- [x] انتقال امن بین فایل‌سیستم‌ها: `apps/api/src/lib/files.ts` → `moveIntoStorage()`؛ در صورت `EXDEV`
      فایل کپی و نسخه قرنطینه حذف می‌شود.
- [x] اجرای واقعی: با استک Docker، درخواست با PDF سالم `201` شد، فایل در
      `/var/lib/saba-tarkhis/storage/requests/<id>/<uuid>.pdf` نوشته شد، پوشه قرنطینه خالی ماند،
      دانلود `200 application/pdf` با همان بایت‌ها برگشت. فایل بدون امضای معتبر (`400`) و
      اسکنر قطع (`503 SCAN_UNAVAILABLE`) در تست‌های `tests/scan.test.ts` پوشش دارند.

### ۲) محافظت از دیتابیس — انجام شد

- [x] `apps/api/scripts/guard-db.mjs` پیش از `db:reset` و `db:seed` اجرا می‌شود؛ در `NODE_ENV=production`
      و روی هاست غیرمحلی (بدون `ALLOW_REMOTE_DB=true`) متوقف می‌شود. اجرای آزمایشی با
      `NODE_ENV=production npm run db:reset` → پیام خطا و `exit 1`.
- [x] `apps/api/prisma/seed.ts` هیچ رمز پیش‌فرضی ندارد: بدون `SEED_DEMO_PASSWORD` (حداقل ۱۰ کاراکتر)
      یا با `NODE_ENV=production` اجرا نمی‌شود.
- [x] `apps/api/tests/global-setup.ts` نام دیتابیس را بررسی می‌کند و فقط دیتابیسی که به `_test`
      ختم شود می‌پذیرد؛ در غیر این صورت اجرای تست‌ها با پیام مشخص متوقف می‌شود.

### ۳) حداقل یک مدیر فعال — انجام شد

- [x] `apps/api/src/routes/admin.ts`: تغییر نقش/فعال‌بودن مدیر در یک تراکنش با قفل ردیف‌های ADMIN
      انجام می‌شود و اگر نتیجه، صفر مدیر فعال باقی بگذارد `409` برمی‌گرداند.
- [x] تست: «never lets two admins deactivate each other at the same time» → هر دو درخواست هم‌زمان،
      دقیقاً یکی `200` و دیگری `409`، و حداقل یک مدیر فعال باقی می‌ماند.

### ۴) پاک‌کردن کوکی نشست نامعتبر — انجام شد

- [x] `apps/api/src/middleware/auth.ts`: وقتی نشست منقضی/باطل یا کاربر غیرفعال است، کوکی‌ها پاک
      و ردیف نشست حذف می‌شوند؛ `csrfProtection` هم کوکی مرده را پاک می‌کند.
- [x] تست: «clears the dead session cookie so public forms work again» → درخواست اول `401` با
      `st_session=;` در `Set-Cookie`، درخواست بعدی فرم تماس `201`.

## اولویت دوم

### ۵) درخواست‌های هم‌زمان — انجام شد

- [x] تغییر وضعیت: به‌روزرسانی شرطی (`updateMany where status = from`) و `409` برای تغییر کهنه
      (`routes/admin.ts`، همچنین مسیر ثبت پیشنهاد).
- [x] سهمیه بارگذاری: `persistDocument()` با `SELECT … FOR UPDATE` روی رکورد کاربر و بررسی سقف
      پرونده/حساب داخل همان تراکنش (`routes/requests.ts`).
- [x] تست‌ها: «rejects the second of two concurrent status changes» و «enforces the per-case quota
      when two uploads arrive at once» (نتیجه: `[200, 409]` و `[201, 400]`).

### ۶) فیلتر تاریخ شمسی — انجام شد

- [x] `apps/api/src/lib/dates.ts`: بازه روز با آفست ثابت ایران (`+03:30`) ساخته می‌شود؛ تاریخ
      نامعتبر (`2026-02-31`) و بازه معکوس با `400` رد می‌شود؛ گزارش روزانه هم با روز ایران
      گروه‌بندی می‌شود.
- [x] تست: «filters lists by whole Iran days and rejects impossible dates» — رکورد
      `2026-03-20T21:30Z` در بازه `2026-03-21` دیده می‌شود و در `2026-03-20` نه.

### ۷) ایمیج و اسکنر فایل — انجام شد

- [x] `Dockerfile`: مرحله `api-deps` با `npm ci --omit=dev`؛ ابزار توسعه در ایمیج نیست و
      `prisma` برای `migrate deploy` در dependencies است.
- [x] به‌روزرسانی دوره‌ای امضا: `apps/api/scripts/docker-entrypoint.sh` هر
      `CLAMAV_UPDATE_INTERVAL_SECONDS` (پیش‌فرض ۶ ساعت) `freshclam` را اجرا می‌کند؛
      `ca-certificates` هم به ایمیج اضافه شد (بدون آن `freshclam` خطای SSL می‌داد).
- [x] بررسی واقعی: `npm run scan:verify` (اسکریپت `scripts/verify-clamav.mjs`) داخل کانتینر
      اجرا شد → `[OK] clamscan detected the EICAR test file`.

### ۸) مستندات تست و انتشار — انجام شد

- [x] `docs/traceability.md`: نسخه Node یکسان (۲۴ LTS)، تعداد تست واقعی (۳۹ تست در ۶ فایل)، حذف
      ادعای Playwright و artifactهای ناموجود.
- [x] `docs/manual-qa.md`: چک‌لیست تکرارپذیر بررسی مرورگر (ریسپانسیو، صفحه‌کلید، حالت خطا).
- [x] `docs/go-live-checklist.md`: کارهای حقوقی/عملیاتی پیش از استفاده واقعی.

### ۹) نوع‌ها و فرم‌های وب — انجام شد

- [x] `apps/web/tsconfig.app.json`: `strict: true` فعال شد؛ `tsc -b` بدون خطا.
- [x] `apps/web/src/components/ui.tsx`: `Field` مقدار `aria-describedby` و `aria-invalid` را به
      ورودی وصل می‌کند (و `Checkbox` هم همین‌طور) تا صفحه‌خوان بداند خطا برای کدام فیلد است.
- [x] کنتراست: متن‌های ریز `text-slate-400` روی پس‌زمینه روشن به `text-slate-600` و
      placeholder به `text-slate-500` ارتقا یافت (متن روی پس‌زمینه تیره دست‌نخورده ماند).
- [x] صفحه‌کلید: قاعده سراسری `:focus-visible` با outline مشخص؛ روش بررسی در `docs/manual-qa.md`.

### ۱۰) دانلود در حالت API جداگانه — انجام شد

- [x] `apps/web/src/lib/api.ts`: تابع `apiUrl()` مسیرهای `/api/...` را با مبدأ API ترکیب می‌کند و
      هر دو صفحه جزئیات پرونده (مشتری/مدیر) از آن استفاده می‌کنند.

## پیش از استفاده با مشتری واقعی — مستند شد

- [x] متن حریم خصوصی/شرایط استفاده، سیاست نگهداری و حذف مدارک، تمرین بازیابی بکاپ، و فهرست
      قابلیت‌های احراز هویت پیاده‌نشده (بازیابی رمز، OTP، ایمیل/پیامک) در
      `docs/go-live-checklist.md` به‌صورت چک‌لیست اقدام‌محور آمده است.

## دور دوم بازخورد — «گزارش اجرای پروژه»

### ۱) آسیب‌پذیری‌های زنجیره تست — انجام شد

- [x] `vitest` از `^3.2.4` به `^4.1.12` ارتقا یافت (`apps/api/package.json` + lock به‌روز شد).
      advisory برای `vitest 0.0.95–4.1.10`، `@vitest/mocker <=4.1.11` و `tinypool <=2.1.1` بود؛ در
      4.1.12 نسخه `@vitest/mocker` هم 4.1.12 است و `tinypool` از درخت حذف شده.
- [x] `npm audit` در `apps/api` و `apps/web`: **0 vulnerabilities** (شامل dev).
- [x] سازگاری با اجرای واقعی بررسی شد، نه فقط ارتقا: `npx vitest run` → **۳۹/۳۹ تست سبز**
      (پس از افزودن یک تست رگرسیون) و `tsc --noEmit` بدون خطا.

### ۲) کنتراست متن ریز فوتر — انجام شد

- [x] `apps/web/src/components/Footer.tsx`: دو نقطه `text-slate-500` روی پس‌زمینه `bg-brand-950`
      (`#0c1e2f`) به `text-slate-300` تغییر کرد؛ نسبت کنتراست از ۳٫۵۴:۱ به حدود ۷٫۵:۱ رسید.
      `text-slate-400` (حدود ۵٫۹:۱) دست‌نخورده ماند.

### ۳) هشدارهای `npm run lint` — انجام شد

- [x] `npm run lint` (oxlint، ۶۴ فایل): **۰ خطا، ۰ هشدار**.
- [x] توابع غیرکامپوننتی از فایل‌های کامپوننت جدا شدند تا هشدار fast-refresh برطرف شود:
      `lib/cn.ts`، `lib/useInView.ts`، `lib/auth-context.ts` (context + `useAuth` +
      `homePathForRole` + `safeNextPath`)؛ `lib/auth.tsx` فقط `AuthProvider` را export می‌کند و
      `ui.tsx` دیگر `cn` را export نمی‌کند.
- [x] همگام‌سازی state با URL/پاسخ API در `Header.tsx`، `Dashboard.tsx`، `AdminDashboard.tsx`،
      `Articles.tsx` و `SettingsTab.tsx` با الگوی «تنظیم state در render» انجام شد؛ قاعده
      `set-state-in-effect` غیرفعال نشد.
- [x] `RequestNew.tsx`: `watch()` با `useWatch({ control })` جایگزین شد (هشدار
      `incompatible-library`).

### ۴) تست مرورگر مسیرهای اصلی — انجام شد

- [x] Playwright در `apps/web/e2e` با ۵ سناریو: ثبت‌نام/خروج/ورود مجدد، رد رمز نادرست،
      ثبت درخواست ۴ مرحله‌ای با آپلود PDF و دریافت `ST-YYYY-NNNNNN`، الزامی بودن رضایت‌نامه،
      و تغییر وضعیت پرونده توسط کارشناس.
- [x] `apps/web/playwright.config.ts` خودش API و وب را بالا می‌آورد؛ دستور: `npm run test:e2e`
      (پیش‌نیازها در `docs/manual-qa.md` بخش ۰).
- [x] **باگ واقعی کشف و رفع شد**: هنگام اجرای همین تست معلوم شد ارسال فرم با فیلدهای عددی
      خالی (کد تعرفه/مقدار/ارزش) با `400 VALIDATION_ERROR` رد می‌شد و مشتری ایرانی که این فیلدها
      را پر نمی‌کند هرگز نمی‌توانست درخواست ثبت کند. در `apps/api/src/routes/requests.ts` مقدار
      رشته خالی برای این فیلدها و `currency` با `blankToUndefined` نرمال می‌شود و تست رگرسیون
      «accepts the blank optional fields the web form submits» اضافه شد.
- [x] اجرا: `5 passed (21.1s)` — اجرا روی Chrome سیستمی با `E2E_CHANNEL=chrome` (دانلود مرورگر
      Playwright در شبکه این محیط مسدود بود).

### ۵) پیشنهادهایی که انجام نشد (نیازمند کارفرما)

- [x] **تصاویر صفحات عمومی**: یک عکس Unsplash برای هر شش خدمت در `apps/web/public/images/photos`
      و فهرست عکاس/مجوز در `photos/CREDITS.md`. هدر صفحه اول به درخواست کارفرما از تصویرسازی
      برداری خودمان استفاده می‌کند و صفحه «درباره ما» بدون عکس است.
- [ ] **اطلاعات واقعی شرکت** (تلفن، ایمیل، آدرس، ساعات کاری): در دسترس نیست؛ محل ورود آن
      پنل مدیریت → تنظیمات است و در چک‌لیست پیش از انتشار باقی مانده است.

### ۶) یادداشت‌های پیش از استقرار — ثبت شد

- [x] Node.js: بیلد/تست با Node 24 LTS انجام شده است؛ `engines.node` روی `>=24`. روی سرور،
      `node -v` و یک `npm test` ثبت شود (`docs/go-live-checklist.md` بخش ۵).
- [x] ClamAV: در کانتینر ساخته‌شده `npm run scan:verify` با امضاهای به‌روز (`freshclam`،
      ClamAV 1.4.6/28183) فایل EICAR را با `Eicar-Signature FOUND` تشخیص داد. این بررسی روی
      محیط production هم باید تکرار شود (`docs/go-live-checklist.md` بخش ۵).

## روش تحویل

- [x] تمام تغییرات (دور اول و دور دوم) روی `main` کامیت شده‌اند؛ شاخه جداگانه‌ای وجود ندارد.
- [x] شرح تغییرات و تست‌های اجراشده در همین سند و در PR آمده است.
