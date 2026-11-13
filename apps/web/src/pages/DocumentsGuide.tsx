import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Seo } from "../components/Seo";
import { Alert, EmptyState, Input } from "../components/ui";
import { documentsGuide } from "../data/documentsGuide";

const categories = ["همه", "تجاری", "حمل", "قانونی", "انبار"] as const;

export function DocumentsGuide() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("همه");

  const filtered = useMemo(() => {
    const term = query.trim();
    return documentsGuide.filter((document) => {
      const matchesCategory = category === "همه" || document.category === category;
      const matchesTerm =
        !term ||
        document.title.includes(term) ||
        document.latin.toLowerCase().includes(term.toLowerCase()) ||
        document.what.includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <Seo
        title="راهنمای مدارک ترخیص کالا"
        description="راهنمای آموزشی مدارک رایج ترخیص کالا: پیش‌فاکتور، فاکتور تجاری، عدل‌بندی، بارنامه، گواهی مبدأ، قبض انبار و مجوزها. الزام هر مدرک به پرونده و رویه بستگی دارد."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">راهنمای مدارک</span>
      </nav>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold text-accent-700">راهنمای آموزشی</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">مدارک رایج ترخیص کالا</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          این فهرست برای آشنایی با اسناد رایج است. برای هر مدرک توضیح داده‌ایم چیست، چه کاربردی
          دارد و آیا برای همه پرونده‌ها الزامی است.
        </p>
      </header>

      <Alert tone="warning" className="mt-6">
        «الزامی بودن» هر مدرک به نوع کالا، رویه و مقررات روز بستگی دارد. فهرست نهایی مدارک باید
        پس از بررسی پرونده و از منابع رسمی تعیین شود.
      </Alert>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <div className="relative grow">
          <Search className="pointer-events-none absolute end-3 top-3.5 size-4 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو در نام مدرک…"
            aria-label="جست‌وجو در مدارک"
            className="pe-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                category === item
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-200 text-slate-600 hover:border-brand-300"
              }`}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500" role="status">
        {filtered.length.toLocaleString("fa-IR")} مدرک نمایش داده می‌شود.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filtered.map((document) => (
          <article key={document.latin} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-brand-900">{document.title}</h2>
                <p className="num mt-0.5 text-[11px] text-slate-400">{document.latin}</p>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-700">
                {document.category}
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-xs leading-6">
              <div>
                <dt className="font-medium text-slate-700">چیست؟</dt>
                <dd className="text-slate-600">{document.what}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">چه کاربردی دارد؟</dt>
                <dd className="text-slate-600">{document.use}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">برای همه پرونده‌ها الزامی است؟</dt>
                <dd className="text-slate-600">{document.required}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="مدرکی با این مشخصات پیدا نشد."
            description="عبارت جست‌وجو را کوتاه‌تر کنید یا دسته‌بندی «همه» را انتخاب کنید."
          />
        </div>
      ) : null}

      <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
        <h2 className="text-base font-bold text-brand-900">مطمئن نیستید چه مدارکی لازم دارید؟</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          اطلاعات محموله را ثبت کنید تا فهرست مدارک موردنیاز پرونده شما بررسی شود.
        </p>
        <Link
          to="/requests/new"
          className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          ثبت درخواست
        </Link>
      </div>
    </div>
  );
}
