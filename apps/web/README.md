# وب — صبا ترخیص

فرانت‌اند React 19 + TypeScript + Vite + Tailwind CSS 4.

## اجرا

```bash
npm ci
npm run dev     # http://localhost:3000
```

در توسعه، Vite مسیر `/api` را به `http://127.0.0.1:4000` پروکسی می‌کند (تنظیم در
`vite.config.ts`). برای هدف دیگر، `API_PROXY_TARGET` یا `VITE_API_URL` را تنظیم کنید.

## ساختار

```text
src/
├── components/       # UI مشترک، Layout، Header/Footer، محافظ مسیر، تب‌های مدیریت
├── data/             # محتوای آموزشی ثابت (مراحل ترخیص و راهنمای مدارک)
├── lib/              # api client، auth، فرم‌ها، قالب‌بندی فارسی، نوع‌ها، گردش‌کار
├── pages/            # صفحات عمومی، پنل مشتری و پنل مدیریت
├── routes/AppRoutes.tsx
└── index.css         # توکن‌های طراحی، فونت وزیرمتن، RTL
```

## نکات

- احراز هویت با کوکی `HttpOnly` است؛ هیچ توکنی در `localStorage` نگهداری نمی‌شود.
- هدر `X-CSRF-Token` در `src/lib/api.ts` از کوکی `st_csrf` خوانده و برای درخواست‌های
  تغییردهنده ارسال می‌شود.
- فونت وزیرمتن (OFL) در `src/assets/fonts` قرار دارد.
- برای مشاهده باگ‌های دسترسی، نقش‌ها هم در UI و هم در بک‌اند بررسی می‌شوند؛ اما مرجع نهایی
  کنترل دسترسی، سرور است.
