# راهنمای استقرار Production

این سند فقط مراحل انتشار واقعی را مستند می‌کند؛ هیچ Migration مخرب یا اسکریپت خودکاری در آن
اجرا نمی‌شود. مقادیر نمونه (رمز، دامنه، مسیر) باید پیش از استفاده با مقادیر واقعی جایگزین شوند.

## ۱) پیش‌نیازهای سرور

- **Node.js 24 LTS** (نسخه آزمایش‌شده: `24.22.3`؛ `engines` هر دو اپ `>=24` است). نسخه ۲۴ LTS
  تا آوریل ۲۰۲۸ پشتیبانی می‌شود. نسخه‌های ۲۰/۲۲ روی این پروژه تست نشده‌اند.
- PostgreSQL 14+ (ترجیحاً همان هاست یا شبکه خصوصی؛ پورت 5432 نباید عمومی باشد)
- nginx (یا reverse proxy معادل) برای HTTPS، فایل‌های استاتیک و پروکسی `/api`
- **ClamAV** برای اسکن بدافزار (بخش ۶) — در production الزامی است
- مسیر پایدار و بکاپ‌گیرنده برای `UPLOAD_DIR` (مدارک خصوصی؛ هرگز داخل web root نباشد)

پورت‌های لازم: `443` عمومی و `4000` فقط روی loopback. پورت `3000` (Vite) و `5432` در production
باز نمی‌شوند.

## ۲) متغیرهای محیطی API

در `apps/api/.env` (فقط برای کاربر سرویس، `chmod 600`):

```dotenv
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://saba_app:REPLACE_ME@127.0.0.1:5432/saba_tarkhis?schema=public
APP_ORIGIN=https://example.com
SESSION_TTL_DAYS=7
UPLOAD_DIR=/var/lib/saba-tarkhis/storage
QUARANTINE_DIR=/var/lib/saba-tarkhis/quarantine
MAX_UPLOAD_MB=5
MAX_DOCUMENTS_PER_REQUEST=20
MAX_CASE_UPLOAD_MB=50
MAX_USER_STORAGE_MB=200
REQUEST_CREATE_LIMIT_PER_HOUR=10
UPLOAD_LIMIT_PER_HOUR=20
COOKIE_SECURE=true
TRUST_PROXY=true
ENABLE_API_DOCS=false
CLAMAV_ENABLED=true
CLAMSCAN_PATH=/usr/bin/clamscan
CLAMSCAN_TIMEOUT_MS=20000
```

- `APP_ORIGIN` باید **دقیقاً** دامنه‌ای باشد که کاربران در مرورگر می‌بینند (با `https://` و بدون
  `/` انتهایی). CORS، بررسی Origin و CSRF به همین مقدار وابسته‌اند.
- `TRUST_PROXY=true` فقط وقتی درست است که API پشت reverse proxy معتبر باشد؛ بدون آن، محدودیت
  نرخ همه کاربران را با IP پروکسی می‌بیند.
- `ENABLE_API_DOCS` پیش‌فرض در production خاموش است.
- `VITE_API_URL` را خالی بگذارید تا فرانت‌اند مسیر same-origin `/api/v1` را صدا بزند.
- **بدون `CLAMAV_ENABLED=true` فرآیند API در production بالا نمی‌آید** (رفتار Fail Closed).
  در توسعه/تست می‌توان آن را تنظیم نکرد؛ در این حالت آپلودها بدون اسکن ذخیره می‌شوند و این
  وضعیت فقط برای محیط محلی قابل قبول است.

## ۳) ساخت و اجرا

پیش از هر دستور Prisma، فایل `apps/api/.env` باید وجود داشته باشد. آرشیو پروژه عمداً فایل
`.env` واقعی ندارد؛ از نمونه بسازید و مقدارها را ویرایش کنید:

```bash
# Linux/macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
# Windows CMD
copy .env.example .env
```

اگر `DATABASE_URL` تنظیم نشده باشد، `npm run db:deploy` / `db:migrate` / `db:reset` پیش از
Prisma با پیام فارسی و دستورهای رفع خطا متوقف می‌شوند (به‌جای خطای P1012).

```bash
# API
cd apps/api
npm ci
npx prisma generate
npm run build
npm run db:deploy             # فقط migrationهای موجود؛ خروجی را قبل از اجرا بخوانید
node dist/index.js             # یا systemd

# Web
cd ../web
npm ci
npm run build                  # خروجی: apps/web/dist
```

`npm ci` باید با همان lockfile انجام شود. `npm run db:seed` فقط برای دمو است و در production
اجرا نمی‌شود.

### حالت تک‌سرویسی (پیشنهادی): خود Express هم SPA را سرو می‌کند

اگر `apps/web/dist` وجود داشته باشد، همان فرآیند API فایل‌های استاتیک و مسیرهای کلاینتی را هم
سرو می‌کند (`WEB_DIST_DIR`، پیش‌فرض `../web/dist` نسبت به پوشه `apps/api`). مزیت: کوکی نشست
first-party می‌ماند، CORS و بررسی Origin ساده است و nginx فقط برای TLS/پروکسی لازم است، نه سرو
فایل.

- `/assets/*` با `Cache-Control: public, max-age=31536000, immutable`، `index.html` با
  `no-cache` و بقیه فایل‌ها (فونت‌ها، `brand/`، `robots.txt`) هفت‌روزه سرو می‌شوند.
- مسیرهای ناشناختهٔ غیر `/api` به `index.html` برمی‌گردند تا رفرش روی مسیرهای کلاینتی کار کند؛
  `/api/*` همان پاسخ JSON 404 را می‌دهد.
- `APP_ORIGIN` باید دقیقاً همان دامنه‌ای باشد که SPA از آن سرو می‌شود.
- بدون بیلد وب، API مثل قبل فقط به `/api` پاسخ می‌دهد (استقرار جدا با nginx).

### ساخت حساب مدیر در Production

`db:seed` فقط داده دمو می‌سازد و در production نباید اجرا شود. حساب واقعی را بسازید:

```bash
cd apps/api
USE_ME_PASSWORD="رمز-قوی-حداقل-۱۰-کاراکتر" npm run user:create -- \
  --mobile 09121234567 --name "نام و نام خانوادگی" --role ADMIN
```

نقش‌های مجاز: `ADMIN`، `EXPERT`، `CUSTOMER`. رمز از `--password` یا متغیر محیطی خوانده می‌شود،
هیچ‌وقت چاپ نمی‌شود و کاربر تکراری ساخته نمی‌شود.

### استقرار با Docker (یک ایمیج)

```bash
cp .env.production.example .env.production   # مقادیر CHANGE_ME را پر کنید
docker compose -f docker-compose.prod.yml up -d --build
```

- `Dockerfile` چهار مرحله دارد: بیلد API، نصب فقط وابستگی‌های اجرایی (`npm ci --omit=dev`)،
  بیلد وب و ایمیج نهایی. ابزارهای توسعه (tsc، vitest، tsx، supertest، @types) در ایمیج نیستند.
  `prisma` برای `migrate deploy` در runtime به‌صورت dependency نصب می‌شود.
- ایمیج نهایی `clamscan` و امضاها را دارد. نبود امضا در بیلد مشکلی ایجاد نمی‌کند:
  `scripts/docker-entrypoint.sh` هنگام اجرا هر ۶ ساعت (`CLAMAV_UPDATE_INTERVAL_SECONDS`)
  `freshclam` را اجرا می‌کند و سپس migrations و سرور را بالا می‌آورد.
- اگر روی همان ماشین دیتابیس توسعه (`docker compose up -d db`) را هم دارید، برای پروژهٔ production
  نام جدا بدهید (`docker compose -p saba-prod -f docker-compose.prod.yml …`) تا سرویس `db` و
  پورت ۵۴۳۲ محلی دست‌نخورده بمانند.
- موتور Prisma با `binaryTargets = ["native", "debian-openssl-3.0.x"]` ساخته می‌شود؛ اگر ایمیج
  پایه‌ای با OpenSSL دیگر استفاده کنید، این فهرست را هم‌راستا کنید (در غیر این صورت خطای
  "could not locate the Query Engine" هنگام اجرا دیده می‌شود).
- **تأیید تشخیص واقعی بدافزار (اجباری پیش از انتشار):**
  `docker compose -f docker-compose.prod.yml exec app npm run scan:verify` — باید فایل تست
  EICAR را تشخیص دهد؛ اگر «CLEAN» برگشت، امضاها کهنه/ناقص هستند.
- اجرای `npx prisma migrate deploy` در `CMD` ایمیج انجام می‌شود؛ بار دوم بی‌اثر است.
- پورت فقط روی `127.0.0.1:4000` باز می‌شود؛ TLS را با nginx/Caddy جلوی آن بگذارید (بخش ۵) تا
  `COOKIE_SECURE=true` کار کند.
- `UPLOAD_DIR` (`/var/lib/saba-tarkhis/storage`) و `QUARANTINE_DIR`
  (`/var/lib/saba-tarkhis/quarantine`) هر دو روی یک volume به نام `saba_tarkhis_files` هستند تا
  انتقال فایل اسکن‌شده از قرنطینه به انبار در همان فایل‌سیستم انجام شود (rename اتمیک). این
  volume باید در بکاپ باشد.
- حساب مدیر را داخل کانتینر بسازید:
  `docker compose -f docker-compose.prod.yml exec app npm run user:create -- --mobile 09xxxxxxxxx --name "نام مدیر" --role ADMIN`

### systemd (نمونه)

```ini
[Unit]
Description=Saba Tarkhis API
After=network.target postgresql.service clamav-daemon.service

[Service]
Type=simple
User=saba
WorkingDirectory=/srv/saba-tarkhis/apps/api
EnvironmentFile=/srv/saba-tarkhis/apps/api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/saba-tarkhis/storage /var/lib/saba-tarkhis/quarantine
UMask=0077

[Install]
WantedBy=multi-user.target
```

## ۴) نقش‌های دیتابیس (اصل حداقل دسترسی)

دو نقش جدا بسازید:

- **`saba_owner`** — مالک دیتابیس؛ فقط برای migration، بکاپ و بازیابی.
- **`saba_app`** — نقش Runtime با دسترسی DML؛ بدون `CREATE/DROP/ALTER`.

```sql
CREATE ROLE saba_owner LOGIN PASSWORD 'REPLACE_OWNER_PASSWORD';
CREATE DATABASE saba_tarkhis OWNER saba_owner;

CREATE ROLE saba_app LOGIN PASSWORD 'REPLACE_APP_PASSWORD';
GRANT CONNECT ON DATABASE saba_tarkhis TO saba_app;
GRANT USAGE ON SCHEMA public TO saba_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO saba_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO saba_app;
ALTER DEFAULT PRIVILEGES FOR ROLE saba_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saba_app;
```

Migration و بکاپ با `saba_owner` اجرا می‌شوند:

```bash
cd apps/api
# Linux/macOS
DATABASE_URL="postgresql://saba_owner:...@127.0.0.1:5432/saba_tarkhis?schema=public" \
  npm run db:deploy
```

```powershell
# Windows PowerShell
cd apps\api
$env:DATABASE_URL="postgresql://saba_owner:...@127.0.0.1:5432/saba_tarkhis?schema=public"
npm run db:deploy
```

`DATABASE_URL` سرویس API همیشه `saba_app` است. نقش Runtime را برای `pg_restore --clean` یا
`DROP` بالا نبرید.

## ۵) nginx (نمونه)

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /srv/saba-tarkhis/apps/web/dist;
    index index.html;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" always;

    # The form accepts up to 4 files of MAX_UPLOAD_MB (5 MB) each plus the JSON
    # payload, so the body cap covers the whole allowed request (25 MB).
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://example.com$request_uri;
}
```

`client_max_body_size` باید کل حجم مجاز یک درخواست (۴ فایل × `MAX_UPLOAD_MB` + فیلدهای متنی) را
پوشش دهد، نه فقط یک فایل؛ در غیر این صورت ترکیب فایل‌های مجاز در لایهٔ پروکسی رد می‌شود. اگر
`MAX_UPLOAD_MB` یا `MAX_CASE_UPLOAD_MB` را تغییر دادید، این مقدار را هم به‌روز کنید. CSP را ابتدا در staging بررسی کنید.

## ۶) اسکن بدافزار (ClamAV) — Fail Closed

نصب و به‌روزرسانی امضاها:

```bash
apt install clamav clamav-daemon
systemctl stop clamav-freshclam
freshclam
systemctl enable --now clamav-freshclam clamav-daemon
clamscan --version
```

- API فایل را ابتدا در `QUARANTINE_DIR` (پیش‌فرض `./storage-quarantine`) با مجوز `0600` می‌نویسد،
  سپس `clamscan --no-summary --infected -- <file>` را اجرا می‌کند.
- خروجی `0` = پاک → فایل به `UPLOAD_DIR` منتقل و رکورد با `scanStatus=CLEAN` ذخیره می‌شود.
- خروجی `1` = آلوده → فایل قرنطینه حذف و درخواست با `400` رد می‌شود؛ رکورد یا فایل ذخیره نمی‌شود.
- خطا/تایم‌اوت/نبودن باینری → فایل حذف و پاسخ `503 SCAN_UNAVAILABLE` (بدون ذخیره رکورد).
- دانلود فقط برای `scanStatus=CLEAN` مجاز است؛ رکوردهای `PENDING/INFECTED/ERROR` با `404`
  پاسخ می‌دهند.
- **Fail Closed در سطح بوت:** بدون `CLAMAV_ENABLED=true` فرآیند در production بالا نمی‌آید.
- کاربر `saba` باید فقط به `QUARANTINE_DIR` و `UPLOAD_DIR` دسترسی نوشتن داشته باشد؛ ClamAV فقط
  نیاز به خواندن فایل قرنطینه دارد.
- رکوردهای قدیمی (`PENDING`) پس از استقرار تا اسکن مجدد قابل دانلود نیستند. برای اسکن دسته‌ای،
  فایل‌ها را با `clamscan -r` بررسی و سپس وضعیت را با ابزار مدیریتی خودتان به‌روز کنید.
- در محیط فعلی توسعه ClamAV نصب نبود؛ صحت اتصال و رفتار Fail Closed با یک اسکنر قراردادی
  (stub) تست شده است، اما **تشخیص واقعی بدافزار در این محیط تأیید نشده است**.

## ۷) مدارک و فایل‌ها

```bash
install -d -m 700 -o saba -g saba /var/lib/saba-tarkhis/storage
install -d -m 700 -o saba -g saba /var/lib/saba-tarkhis/quarantine
```

فایل‌ها با نام تصادفی و مجوز `0600` ذخیره می‌شوند و فقط از مسیر احراز هویت‌شده
`/api/v1/requests/:id/documents/:documentId/download` قابل دریافت‌اند. این پوشه‌ها باید در بکاپ
روزانه باشند و هرگز داخل `dist` یا web root قرار نگیرند. فایل‌های آپلودی هرگز اجرا نمی‌شوند؛
دانلود با `Content-Disposition: attachment` و `X-Content-Type-Options: nosniff` انجام می‌شود.

## ۸) بکاپ تاریخ‌دار و امن

از `rsync --delete` استفاده نکنید؛ حذف ناخواسته مبدأ به بکاپ منتقل می‌شود. هر اجرا یک نسخه
مستقل می‌سازد و نسخه‌های قبلی دست‌نخورده می‌مانند.

```bash
BACKUP_ROOT=/var/backups/saba-tarkhis
STAMP=$(date +%Y%m%dT%H%M%S)
mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/files/$STAMP"
chmod 700 "$BACKUP_ROOT"

# دیتابیس با نقش مالک (نه saba_app)
PGPASSWORD=... pg_dump --format=custom --no-owner \
  -h 127.0.0.1 -U saba_owner saba_tarkhis \
  > "$BACKUP_ROOT/db/saba-$STAMP.dump"
chmod 600 "$BACKUP_ROOT/db/saba-$STAMP.dump"

# فایل‌ها: snapshot تاریخ‌دار با hardlink (بدون --delete)
PREV=$(readlink -f "$BACKUP_ROOT/files/latest" 2>/dev/null || true)
LINK_OPT=""
[ -n "$PREV" ] && [ -d "$PREV/storage" ] && LINK_OPT="--link-dest=$PREV/storage"
# storage و quarantine زیر یک مسیر هستند و با هم بکاپ می‌شوند
rsync -a $LINK_OPT /var/lib/saba-tarkhis/ "$BACKUP_ROOT/files/$STAMP/files/"
ln -sfn "$BACKUP_ROOT/files/$STAMP" "$BACKUP_ROOT/files/latest"
```

- **سیاست نگهداری:** ۷ نسخه روزانه، ۴ نسخه هفتگی و ۶ نسخه ماهانه؛ حذف فقط پس از تأیید وجود
  نسخه‌های جدیدتر و کامل.
- **خارج از سرور:** همین snapshotها را با `restic`/Borg به مقصد جداگانه (S3/سرور بکاپ) بفرستید؛
  `restic backup` نسخه‌ها را افزایشی و رمزنگاری‌شده نگه می‌دارد و prune فقط طبق سیاست انجام شود.
- **Immutable:** اگر مقصد S3 است، Object Lock در حالت Compliance فعال کنید تا نسخه‌ها تا پایان
  دوره نگهداری قابل حذف/بازنویسی نباشند. کلید بکاپ باید فقط اجازه نوشتن داشته باشد.
- مجوز پوشه بکاپ `0700` و فایل‌ها `0600`؛ دسترسی فقط برای کاربر بکاپ.

### بازیابی دیتابیس در یک دیتابیس جداگانه (بدون آسیب به Production)

هرگز `pg_restore --clean` را روی دیتابیس Production اجرا نکنید. ابتدا بازیابی و اعتبارسنجی در
دیتابیس جدید:

```bash
RESTORE_DB=saba_tarkhis_restore_$(date +%Y%m%d)

# با نقش مدیریتی/مالک، نه saba_app
createdb -h 127.0.0.1 -U saba_owner "$RESTORE_DB"
pg_restore --no-owner -h 127.0.0.1 -U saba_owner -d "$RESTORE_DB" \
  "$BACKUP_ROOT/db/saba-20260101T020000.dump"

psql -h 127.0.0.1 -U saba_owner -d "$RESTORE_DB" -c '\dt'
psql -h 127.0.0.1 -U saba_owner -d "$RESTORE_DB" \
  -c 'select count(*) from "ClearanceRequest";'
```

پس از تأیید، فقط در پنجره قطعی برنامه:

```sql
ALTER DATABASE saba_tarkhis RENAME TO saba_tarkhis_old;
ALTER DATABASE saba_tarkhis_restore_20260101 RENAME TO saba_tarkhis;
```

سپس سرویس را با همان `DATABASE_URL` (نام دیتابیس اصلی) ری‌استارت کنید. دیتابیس قدیمی را تا
تأیید نهایی حذف نکنید. دیتابیس بازیابی‌شده باید همان مالک/مجوزهای `saba_app` را داشته باشد.

### بازیابی فایل‌ها

```bash
rsync -a "$BACKUP_ROOT/files/20260101T020000/files/" /var/lib/saba-tarkhis/
```

نسخه دیتابیس و snapshot فایل باید از یک زمان/نقطه باشند تا رکورد بدون فایل یا فایل بدون رکورد
نماند. بازیابی را حداقل یک‌بار روی staging تمرین کنید؛ مراحل تمرین در
[docs/go-live-checklist.md](./go-live-checklist.md) آمده است.

## ۹) محدودیت نرخ (Backend)

| محدودیت | پیش‌فرض | متغیر |
| --- | --- | --- |
| ثبت درخواست هر کاربر در ساعت | ۱۰ | `REQUEST_CREATE_LIMIT_PER_HOUR` |
| بارگذاری فایل هر کاربر در ساعت | ۲۰ | `UPLOAD_LIMIT_PER_HOUR` |
| تعداد مدارک هر پرونده | ۲۰ | `MAX_DOCUMENTS_PER_REQUEST` |
| حجم مجموع مدارک هر پرونده | ۵۰MB | `MAX_CASE_UPLOAD_MB` |
| حجم کل مدارک هر حساب | ۲۰۰MB | `MAX_USER_STORAGE_MB` |

همه سمت سرور و با کلید کاربر اعمال می‌شوند؛ عبور از محدودیت نرخ `429` و عبور از سهمیه حجم/تعداد
`400` برمی‌گرداند. مخزن محدودیت نرخ در حافظه است؛ در چند نمونه (multi-instance) باید Redis
مشترک اضافه شود.

## ۱۰) پایش و بهره‌برداری

- سلامت: `GET /api/v1/health` باید `200` برگرداند.
- لاگ‌ها روی stdout/systemd-journal؛ `errorHandler` جزئیات فنی را فقط در سرور ثبت می‌کند.
- هشدار برای 5xx، 429 غیرعادی، خطای `SCAN_UNAVAILABLE`، حجم دیسک و شکست بکاپ.
- نشست‌های منقضی روزانه پاک می‌شوند؛ نیازی به Cron جداگانه نیست.

## ۱۱) چک‌لیست پیش از انتشار

- [ ] Node.js 24 LTS (`node -v` = 24.x) و `npm ci` موفق با lockfile
- [ ] `NODE_ENV=production`، `COOKIE_SECURE=true`، `APP_ORIGIN` دقیقاً دامنه HTTPS
- [ ] `TRUST_PROXY=true` و هدرهای `X-Forwarded-*` تنظیم شده
- [ ] Swagger خاموش (`ENABLE_API_DOCS=false`)
- [ ] `CLAMAV_ENABLED=true`، `clamscan --version` سالم و امضاها به‌روز
- [ ] `QUARANTINE_DIR` و `UPLOAD_DIR` خصوصی (`0700`)، در بکاپ
- [ ] `DATABASE_URL` با `saba_app` محدود؛ migration با `saba_owner`
- [ ] `prisma migrate deploy` اجرا شده و بکاپ قبل از آن گرفته شده
- [ ] بکاپ تاریخ‌دار + offsite + (در صورت امکان) Object Lock، و یک بازیابی تمرینی موفق
- [ ] حساب مدیر واقعی با `npm run user:create` ساخته شده (یا حساب‌های دمو حذف/غیرفعال شده‌اند)
  و رمز `Demo@12345` در هیچ‌جا فعال نیست
- [ ] `apps/web/dist` قبل از استارت API ساخته شده (حالت تک‌سرویسی) یا nginx فایل‌ها را سرو می‌کند
- [ ] `robots.txt`/`sitemap.xml` با دامنه واقعی
- [ ] متن‌های حقوقی/تماس/مجوزها تأیید کارفرما
- [ ] پایش 5xx/429/دیسک/بکاپ فعال
