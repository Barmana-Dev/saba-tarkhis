# مستندات API صبا ترخیص

نسخه: `v1` · پایه: `/api/v1` · مستندات تعاملی: `/api/docs`

## قالب پاسخ

موفق:

```json
{ "success": true, "data": {}, "message": "پیام اختیاری فارسی" }
```

خطا:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "اطلاعات واردشده معتبر نیست.",
  "errors": [{ "field": "goodsDescription", "message": "شرح کالا را وارد کنید." }]
}
```

کدهای رایج: `VALIDATION_ERROR` (400)، `UNAUTHENTICATED` (401)، `CSRF_FAILED` (403)،
`FORBIDDEN` (403)، `NOT_FOUND` (404)، `CONFLICT` (409)، `RATE_LIMITED` (429)،
`INTERNAL_ERROR` (500).

## احراز هویت و CSRF

- نشست سمت سرور با کوکی `st_session` (`HttpOnly`, `SameSite=Lax`, در production `Secure`).
- فقط هش SHA-256 توکن نشست در جدول `Session` ذخیره می‌شود؛ خروج، نشست را حذف می‌کند.
- کوکی خواندنی `st_csrf` + هدر `X-CSRF-Token` برای همه درخواست‌های تغییردهنده الزامی است.
  توکن با هش ذخیره‌شده در همان نشست تطبیق داده می‌شود.
- درخواست‌های تغییردهنده با `Origin` غیرمجاز (غیر از `APP_ORIGIN`) رد می‌شوند.
- رمز عبور با bcrypt (cost 12) هش می‌شود. ثبت‌نام عمومی همیشه نقش `CUSTOMER` می‌سازد.

## احراز هویت و کاربر

| Method | Endpoint | دسترسی | توضیح |
| --- | --- | --- | --- |
| POST | `/auth/register` | عمومی | ثبت‌نام مشتری + ایجاد نشست |
| POST | `/auth/login` | عمومی | ورود با موبایل/رمز |
| POST | `/auth/logout` | واردشده | حذف نشست و کوکی‌ها |
| GET | `/auth/session` | عمومی | وضعیت نشست برای SPA (کاربر یا `null` با پاسخ ۲۰۰) |
| GET | `/auth/me` | واردشده | اطلاعات حساب جاری |
| GET | `/auth/csrf` | واردشده | صدور توکن CSRF تازه برای همین نشست (برای SPA روی میزبان جدا) |
| GET | `/users/me` | واردشده | پروفایل |
| PATCH | `/users/me` | واردشده | ویرایش جزئی: هر فیلد فقط وقتی تغییر می‌کند که فرستاده شود (`email: ""` پاک می‌کند) |

موبایل با ارقام فارسی/عربی نرمال می‌شود و باید با `09` و ۱۱ رقم باشد. رمز عبور باید ۸ تا ۷۲
کاراکتر و حداکثر ۷۲ بایت UTF-8 باشد (سقف مؤثر bcrypt).

پاسخ `login`/`register` و `/auth/csrf` توکن `csrfToken` را هم برمی‌گرداند؛ SPA روی میزبان جدا از
API نمی‌تواند کوکی `st_csrf` را بخواند و از این مقدار استفاده می‌کند. اگر درخواستی با
`403/CSRF_FAILED` برگردد، کلاینت یک‌بار توکن تازه می‌گیرد و درخواست را تکرار می‌کند.

## محتوای عمومی

| Method | Endpoint | توضیح |
| --- | --- | --- |
| GET | `/services` | خدمات `isPublished` |
| GET | `/services/:slug` | جزئیات خدمت منتشرشده |
| GET | `/articles?q=&category=&page=&pageSize=` | مقالات منتشرشده با صفحه‌بندی |
| GET | `/articles/:slug` | مقاله منتشرشده |
| GET | `/article-categories` | دسته‌بندی‌ها |
| GET | `/faqs` | پرسش‌های منتشرشده |
| GET | `/settings/public` | تنظیمات عمومی غیرحساس |
| POST | `/contact` | ثبت پیام تماس (rate limit) |

## پرونده‌های مشتری

| Method | Endpoint | دسترسی | توضیح |
| --- | --- | --- | --- |
| POST | `/requests` | `CUSTOMER` | JSON یا `multipart/form-data` با فیلد `payload` (JSON) و `files` |
| GET | `/requests?status=&q=&page=` | `CUSTOMER` | فقط پرونده‌های خود + خلاصه وضعیت‌ها |
| GET | `/requests/:id` | مالک/کارشناس تخصیص‌یافته/مدیر | جزئیات مجاز؛ در غیر این صورت 404 |
| POST | `/requests/:id/documents` | مجاز | بارگذاری مدرک (`file`) |
| GET | `/requests/:id/documents/:documentId/download` | مجاز | دریافت فایل با بررسی مالکیت |
| POST | `/requests/:id/comments` | مجاز | پیام؛ مشتری همیشه `PUBLIC` |

**آپلود:** فقط PDF/PNG/JPEG با بررسی امضای واقعی فایل، حداکثر ۵ مگابایت، حداکثر ۴ فایل در ثبت
اولیه و ۲۰ مدرک در هر پرونده. فایل‌ها خارج از مسیر public و با نام تصادفی ذخیره می‌شوند.

**شناسه پیگیری:** قالب `ST-YYYY-NNNNNN`؛ یکتا، داخلی و **نه** کد کوتاژ/شماره رسمی گمرکی.

## اعلان‌های درون‌پنلی

| Method | Endpoint | دسترسی | توضیح |
| --- | --- | --- | --- |
| GET | `/notifications` | واردشده | ۲۰ مورد اخیر + همه خوانده‌نشده‌ها (حداکثر ۵۰) و `unreadCount` |
| POST | `/notifications/:id/read` | صاحب اعلان | خواندن یک اعلان؛ برای دیگران 404 |
| POST | `/notifications/read-all` | واردشده | خواندن همه اعلان‌های خود |

اعلان‌ها از نوع `STATUS_CHANGE`، `QUOTE` و `REPLY` برای مالک پرونده ساخته می‌شوند؛ اعلان فقط
درون پنل است و کانال پیامک/ایمیل ندارد. هر اعلان به پروندهٔ مربوطه (`requestId`) وصل است.

## پنل مدیریت و کارشناسی

| Method | Endpoint | دسترسی | توضیح |
| --- | --- | --- | --- |
| GET | `/admin/requests` | مدیر/کارشناس | فیلتر وضعیت، جست‌وجو، بازه تاریخ، صفحه‌بندی |
| GET | `/admin/requests/:id` | مدیر/کارشناس مجاز | جزئیات کامل |
| PATCH | `/admin/requests/:id/status` | مدیر/کارشناس مجاز | تغییر وضعیت + تاریخچه + ممیزی |
| PATCH | `/admin/requests/:id/assign` | مدیر | تخصیص/حذف کارشناس |
| PATCH | `/admin/requests/:id/quote` | مدیر/کارشناس مجاز | ثبت پیشنهاد غیررسمی |
| GET | `/admin/experts` | مدیر/کارشناس | فهرست کارشناسان فعال |
| GET | `/admin/stats?from=&to=` | مدیر | آمار واقعی از دیتابیس |
| GET/PATCH | `/admin/users...` | مدیر | فهرست، نقش و فعال/غیرفعال |
| CRUD | `/admin/services...` | مدیر | خدمات |
| CRUD | `/admin/articles...` | مدیر | مقالات |
| POST/GET | `/admin/article-categories` | مدیر | دسته‌بندی |
| CRUD | `/admin/faqs...` | مدیر | پرسش‌ها |
| GET/PATCH | `/admin/contact-messages...` | مدیر | پیام‌ها و وضعیت |
| GET/PATCH | `/admin/settings` | مدیر | تنظیمات عمومی |
| GET | `/admin/audit-logs` | مدیر | ۵۰ رویداد اخیر ممیزی |

PATCH در این مسیرها جزئی است: فقط فیلدهای ارسالی تغییر می‌کنند و وضعیت انتشار/ترتیب محتوا و
ایمیل پروفایل با نبودن فیلد در بدنه دست‌نخورده می‌مانند. ثبت پیشنهاد از وضعیت‌های `SUBMITTED`،
`UNDER_REVIEW`، `NEED_MORE_INFO` و `QUOTED` مجاز است؛ خطاهای ورودی کلاینت (JSON بدشکل، بدنهٔ بزرگ،
تاریخ نامعتبر، مرجع ناموجود) با ۴xx و پیام فارسی برمی‌گردند.

## گردش‌کار وضعیت (داخلی شرکت)

```text
SUBMITTED ─→ UNDER_REVIEW ─→ NEED_MORE_INFO
    │              │  ↑            │
    │              ↓  └────────────┘
    │           QUOTED ─→ IN_PROGRESS ─→ COMPLETED
    └──────────────┴──────────┴──────────→ CANCELLED
```

- وضعیت‌های پایانی: `COMPLETED` و `CANCELLED`.
- هر تغییر در `RequestStatusHistory` و `AuditLog` ثبت می‌شود.
- این وضعیت‌ها **رویداد رسمی گمرکی نیستند**.

## محدودیت نرخ

| مسیر | محدودیت پیش‌فرض |
| --- | --- |
| `/auth/login`, `/auth/register` | ۲۰ درخواست در ۱۵ دقیقه به ازای IP |
| `/contact` | ۶ درخواست در ساعت به ازای IP |

در محیط تست با `DISABLE_RATE_LIMIT=true` غیرفعال می‌شود.
