# صبا ترخیص — سامانه درخواست ترخیص کالا

پروژه فول‌استک فارسی و RTL برای مجموعه **صبا ترخیص**: وب‌سایت شرکتی + سامانه ثبت و پیگیری
درخواست ترخیص + پنل کارشناس/مدیر.

> **مرز مهم:** این سامانه رسمی گمرک نیست. وضعیت‌های پرونده، وضعیت **رسیدگی داخلی شرکت** هستند و
> به سامانه‌های EPL، جامع تجارت یا گمرک متصل نیستند. هیچ استعلام زنده، اظهارنامه رسمی یا محاسبه
> قطعی حقوق گمرکی در این محصول وجود ندارد.

## استک فنی

| بخش | فناوری |
| --- | --- |
| فرانت‌اند | React 19، TypeScript، Vite، Tailwind CSS 4، React Router، TanStack Query، React Hook Form + Zod |
| بک‌اند | Node.js، Express، TypeScript، Prisma ORM، Zod |
| دیتابیس | PostgreSQL |
| مستندات API | OpenAPI 3 + Swagger UI |
| تست | Vitest + Supertest |

## ساختار مخزن

```text
.
├── apps/
│   ├── api/                    # Express + Prisma
│   │   ├── prisma/             # schema، migration، seed، PDF نمونه
│   │   ├── src/                # config، middleware، routes، lib
│   │   └── tests/              # تست‌های auth / requests / admin
│   └── web/                    # React + Vite
│       └── src/                # pages، components، lib، data
├── docs/
│   ├── current-site-audit.md   # بررسی سایت مرجع
│   ├── sitemap.md              # نقشه صفحات و دسترسی‌ها
│   ├── api-spec.md             # قرارداد API
│   ├── decisions.md            # تصمیم‌ها، محدودیت‌ها و موارد نیازمند تأیید
│   ├── deployment.md           # راهنمای استقرار Production، nginx، بکاپ
│   ├── manual-qa.md            # چک‌لیست تکرارپذیر بررسی مرورگر (دسترس‌پذیری/ریسپانسیو)
│   ├── go-live-checklist.md    # کارهای حقوقی و عملیاتی پیش از تحویل به مشتری واقعی
│   └── traceability.md         # ماتریس نیازمندی‌ها، تست‌ها و تأیید انتشار
├── docker-compose.yml          # PostgreSQL محلی (توسعه)
├── docker-compose.prod.yml     # استقرار: Postgres + ایمیج API/SPA
├── Dockerfile                  # بیلد تک‌ایمیجی API + web
├── .env.example                # نمونه محیط توسعه
├── .env.production.example     # نمونه محیط production
└── README.md
```

## پیش‌نیازها

- **Node.js 24 LTS** (نسخه آزمایش‌شده: `24.22.3`؛ `engines` هر دو اپ `>=24`)
- PostgreSQL **14+** (یا Docker)
- پورت‌های آزاد `3000` (وب) و `4000` (API)

## راه‌اندازی گام‌به‌گام

### ۱) دیتابیس

```bash
# Node.js 24 LTS لازم است: node -v
docker compose up -d --wait   # تا آماده‌شدن Postgres صبر می‌کند
# یا استفاده از PostgreSQL نصب‌شده روی سیستم و ساخت دیتابیس saba_tarkhis
# اگر پورت 5432 اشغال است، ابتدا سرویس Postgres محلی را متوقف کنید.
```

### ۲) بک‌اند

```bash
cd apps/api
npm ci                         # Prisma Client هم generate می‌شود
# Windows (PowerShell): Copy-Item .env.example .env
# Windows (CMD):        copy .env.example .env
cp .env.example .env           # سپس مقدارها را بررسی کنید
npm run db:deploy              # یا npx prisma migrate deploy
# اگر DATABASE_URL تنظیم نشده باشد، پیام راهنما با دستورهای Windows نمایش داده می‌شود.
npm run db:seed                # داده نمونه + حساب‌های دمو
npm run dev                    # http://localhost:4000
```

در محیط توسعه، به‌جای `migrate deploy` می‌توانید `npx prisma migrate dev` را اجرا کنید.
مستندات API: <http://localhost:4000/api/docs>

### ۳) فرانت‌اند

```bash
cd apps/web
npm ci
npm run dev                    # http://localhost:3000
```

Vite مسیر `/api` را به `http://127.0.0.1:4000` پروکسی می‌کند تا کوکی نشست first-party بماند.
برای اتصال به API روی دامنه دیگر، `VITE_API_URL` را تنظیم کنید (CORS و `APP_ORIGIN` سمت API هم
باید هم‌خوان باشند).

## حساب‌های دمو

فقط در محیط دمو و پس از اجرای seed. **در production استفاده نکنید.**

| نقش | موبایل | رمز عبور |
| --- | --- | --- |
| مدیر | `09120000001` | `Demo@12345` |
| کارشناس | `09120000002` | `Demo@12345` |
| مشتری | `09120000003` | `Demo@12345` |
| مشتری دوم | `09120000004` | `Demo@12345` |

این حساب‌ها فقط با `SEED_DEMO_PASSWORD` ساخته می‌شوند؛ هیچ رمز پیش‌فرضی در کد نیست و `db:seed`
بدون آن (یا با `NODE_ENV=production`) اجرا نمی‌شود. برای production، حساب مدیر را با رمز قوی و
غیرعمومی از طریق `npm run user:create` بسازید.

## اسکریپت‌ها

### API (`apps/api`)

| فرمان | کار |
| --- | --- |
| `npm run dev` | اجرای API با watch |
| `npm run build` / `npm start` | ساخت و اجرای نسخه کامپایل‌شده |
| `npm run typecheck` | بررسی نوع‌ها |
| `npm test` | تست‌های Vitest + Supertest |
| `npm run db:migrate` | ساخت/اعمال migration در توسعه |
| `npm run db:deploy` | اعمال migrationهای موجود |
| `npm run db:seed` | داده نمونه |
| `npm run db:reset` | بازنشانی کامل دیتابیس + seed |
| `npm run db:studio` | Prisma Studio |
| `npm run user:create` | ساخت حساب واقعی (مثلاً اولین مدیر) بدون seed دمو |
| `npm run scan:verify` | بررسی واقعی ClamAV با فایل تست EICAR (پس از `npm run build`) |

### وب (`apps/web`)

| فرمان | کار |
| --- | --- |
| `npm run dev` | Vite روی پورت ۳۰۰۰ |
| `npm run build` | typecheck + بیلد production |
| `npm run lint` | Oxlint |
| `npm run preview` | پیش‌نمایش بیلد |

## استقرار

دو حالت پشتیبانی می‌شود (جزئیات کامل در [docs/deployment.md](./docs/deployment.md)):

1. **تک‌سرویسی (پیشنهادی):** پس از `npm run build` در `apps/web`، همان فرآیند API با
   `WEB_DIST_DIR` (پیش‌فرض `../web/dist`) فایل‌های SPA را هم سرو می‌کند؛ کل محصول روی یک دامنه
   بالا می‌آید و کوکی‌ها first-party می‌مانند. nginx فقط برای TLS/پروکسی لازم است.
2. **جدا:** nginx فایل‌های `apps/web/dist` را سرو می‌کند و `/api` را به Express پروکسی می‌کند.

با Docker هم یک ایمیج آماده است:

```bash
cp .env.production.example .env.production   # مقادیر CHANGE_ME را پر کنید
docker compose -f docker-compose.prod.yml up -d --build
```

`UPLOAD_DIR` و `QUARANTINE_DIR` داخل تصویر هر دو زیر یک volume (`saba_tarkhis_files`) هستند؛
انتقال فایل اسکن‌شده از قرنطینه به انبار روی همان فایل‌سیستم انجام می‌شود (و اگر ایمیج را خودتان
با دو volume جدا اجرا کنید، کد در صورت `EXDEV` با کپی امن فایل را منتقل می‌کند).

حساب مدیر در محیط واقعی (بدون داده دمو):

```bash
cd apps/api
USE_ME_PASSWORD="رمز-قوی" npm run user:create -- --mobile 09121234567 --name "نام مدیر" --role ADMIN
```

## متغیرهای محیطی

همه در [`.env.example`](./.env.example) مستند شده‌اند. مهم‌ترین‌ها:

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | رشته اتصال PostgreSQL (الزامی) |
| `APP_ORIGIN` | مبدأ دقیق فرانت‌اند برای CORS و بررسی Origin |
| `SESSION_TTL_DAYS` | عمر نشست (پیش‌فرض ۷ روز) |
| `UPLOAD_DIR` | مسیر خصوصی مدارک (خارج از public) |
| `MAX_UPLOAD_MB` | سقف هر فایل (پیش‌فرض ۵) |
| `COOKIE_SECURE` | اجبار پرچم Secure کوکی |
| `TRUST_PROXY` | فقط پشت reverse proxy معتبر `true` شود |
| `ENABLE_API_DOCS` | Swagger؛ پیش‌فرض در production خاموش |
| `QUARANTINE_DIR` | مسیر قرنطینه فایل تا پایان اسکن |
| `CLAMAV_ENABLED` | اسکن بدافزار؛ در production الزامی (`true`) |
| `REQUEST_CREATE_LIMIT_PER_HOUR` | سقف ثبت درخواست هر کاربر در ساعت |
| `UPLOAD_LIMIT_PER_HOUR` | سقف بارگذاری فایل هر کاربر در ساعت |
| `MAX_CASE_UPLOAD_MB` / `MAX_USER_STORAGE_MB` | سقف حجم پرونده / حساب |
| `VITE_API_URL` | آدرس API برای فرانت (اختیاری) |

هیچ secret یا رمز واقعی نباید commit شود. `.env` در `.gitignore` است.

## تست‌ها

```bash
# یک دیتابیس تست جدا بسازید:
docker exec -it saba-tarkhis-db createdb -U postgres saba_tarkhis_test

cd apps/api
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saba_tarkhis_test?schema=public" npm test
```

`globalSetup` تست‌ها schema را با `prisma db push` روی دیتابیس تست اعمال می‌کند. تست‌ها به‌صورت
متوالی اجرا می‌شوند و داده‌های هر فایل را پاک می‌کنند.

> **ایمنی:** نام دیتابیس باید به `_test` ختم شود، وگرنه `globalSetup` اجرای تست‌ها را متوقف می‌کند؛
> این‌طوری یک `DATABASE_URL` اشتباه نمی‌تواند داده واقعی را پاک کند.

> **پلتفرم:** stub اسکنر یک اسکریپت Node است و از طریق خودِ `node` اجرا می‌شود، بنابراین تست‌ها
> روی Windows، Linux و macOS (و در کانتینر `node:24`) یکسان کار می‌کنند.

پوشش تست‌ها: ثبت‌نام/ورود/خروج، CSRF، RBAC، ثبت درخواست و شناسه پیگیری، اعتبارسنجی و رد فایل
نامعتبر، جداسازی داده مشتریان، عدم نمایش یادداشت داخلی، تاریخچه وضعیت، تخصیص کارشناس، پیشنهاد
غیررسمی، آمار واقعی، انتشار/پیش‌نویس مقاله، FAQ، پیام تماس، قرنطینه/اسکن فایل (پاک، آلوده، اسکنر قطع)، محدودیت نرخ و حجم، و ممیزی نقش.

## گردش‌کارهای قابل نمایش

1. **مشتری جدید:** مرور خدمات → ثبت‌نام → فرم ۴ مرحله‌ای + بارگذاری PDF → دریافت `ST-YYYY-NNNNNN`
   → مشاهده پرونده در داشبورد.
2. **مدیر/کارشناس:** مشاهده پرونده → تغییر وضعیت با توضیح → ارسال پیام عمومی و یادداشت داخلی →
   مشاهده تاریخچه.
3. **بازگشت مشتری:** مشاهده پیام کارشناس → بارگذاری مدرک تکمیلی → ارسال پاسخ → مشاهده بروزرسانی.
4. **محتوا:** ایجاد مقاله پیش‌نویس → عدم نمایش عمومی → انتشار → نمایش در فهرست و صفحه مقاله.

## امنیت (خلاصه)

- نشست سمت سرور، کوکی `HttpOnly` + `SameSite=Lax` + `Secure` در production.
- CSRF با double-submit مقید به نشست و بررسی Origin.
- bcrypt با cost 12؛ پیام خطای ورود یکسان برای جلوگیری از شناسایی حساب.
- کنترل مالکیت/نقش در همه endpointهای پرونده، فایل و پیام (IDOR).
- آپلود با allowlist امضای واقعی فایل، سقف حجم، نام تصادفی، مسیر خصوصی و **قرنطینه + اسکن
  بدافزار Fail Closed** (بدون اسکن موفق، فایل ذخیره/قابل دانلود نمی‌شود).
- Helmet، CORS محدود، rate limit روی ورود/ثبت‌نام/تماس و **ثبت درخواست/بارگذاری** (Per-User،
  سمت سرور) و ممیزی عملیات حساس.
- محتوا به‌صورت متن ساده رندر می‌شود؛ HTML ناامن استفاده نشده است.

جزئیات بیشتر: [docs/api-spec.md](./docs/api-spec.md)، [docs/decisions.md](./docs/decisions.md)،
[docs/deployment.md](./docs/deployment.md) (استقرار Production، nginx، بکاپ)
[docs/traceability.md](./docs/traceability.md) (ماتریس نیازمندی/تست)،
[docs/manual-qa.md](./docs/manual-qa.md) (چک‌لیست بررسی مرورگر) و
[docs/go-live-checklist.md](./docs/go-live-checklist.md) (کارهای حقوقی/عملیاتی پیش از تحویل).

## محدودیت‌ها و کارهای باقی‌مانده

- SPA است؛ prerender/SSR واقعی برای SEO پیاده‌سازی نشده (meta سمت کلاینت + sitemap/robots موجود است).
- بازیابی رمز، OTP/تأیید پیامکی و اطلاع‌رسانی ایمیل/پیامک نیازمند زیرساخت بیرونی است.
- ذخیره‌سازی مدارک روی دیسک محلی است؛ برای production باید Object Storage خصوصی استفاده شود.
- اسکن بدافزار با ClamAV پیاده‌سازی شده (قرنطینه، رد فایل آلوده و Fail Closed). موتور واقعی
  ClamAV در محیط توسعه نصب نیست؛ پیش از انتشار، `npm run scan:verify` را در staging/کانتینر
  اجرا کنید تا تشخیص واقعی فایل EICAR تأیید شود.
- بازیابی رمز عبور و تأیید پیامکی پیاده‌سازی نشده است (نیازمند سرویس پیامک/ایمیل).
- خروجی PDF، محاسبه‌گر هزینه، نمودار مدیریتی و جست‌وجوی پیشرفته در محدوده MVP نبوده‌اند.
- متن نهایی حریم خصوصی/شرایط استفاده و اطلاعات تماس، مجوزها و آمار باید توسط کارفرما تأیید شود.
- دامنه نهایی `sitemap.xml`/`canonical` باید پس از تأیید جایگزین شود.

فهرست کامل تصمیم‌ها و موارد «نیازمند تأیید کارفرما» در [docs/decisions.md](./docs/decisions.md)
و [docs/current-site-audit.md](./docs/current-site-audit.md) آمده است.
