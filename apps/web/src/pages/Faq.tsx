import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Faq as FaqType } from "../lib/types";
import { Seo } from "../components/Seo";
import { Alert, Skeleton } from "../components/ui";

export function Faq() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => api.get<FaqType[]>("/faqs"),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <Seo
        title="سؤالات متداول ترخیص کالا"
        description="پاسخ پرسش‌های متداول درباره ترخیص کالا، مدارک لازم، مدت فرایند، برآورد هزینه و تفاوت پیگیری داخلی صبا ترخیص با سامانه‌های رسمی گمرکی."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">سؤالات متداول</span>
      </nav>

      <header className="max-w-2xl">
        <p className="text-xs font-semibold text-accent-700">پرسش و پاسخ</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">سؤالات متداول</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          پاسخ پرتکرارترین پرسش‌ها درباره خدمات و سامانه صبا ترخیص. اگر پاسخ پرسش خود را پیدا
          نکردید، از فرم تماس استفاده کنید.
        </p>
      </header>

      <div className="mt-8 space-y-3">
        {isPending
          ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)
          : null}

        {data?.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-xl border border-slate-200 bg-white px-5 py-4 open:border-brand-200 open:bg-brand-50/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-brand-900">
              {faq.question}
              <span className="text-lg font-normal text-slate-400 transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-8 text-slate-600">{faq.answer}</p>
          </details>
        ))}
      </div>

      {isError ? (
        <Alert tone="error" className="mt-6">
          دریافت پرسش‌های متداول انجام نشد. لطفاً دوباره تلاش کنید.
        </Alert>
      ) : null}

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
        <h2 className="text-base font-bold text-brand-900">پاسخ پرسش خود را پیدا نکردید؟</h2>
        <p className="mt-2 text-sm text-slate-600">پرسش خود را برای ما بفرستید یا درخواست مشاوره ثبت کنید.</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/contact" className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-brand-800 hover:bg-brand-50">
            تماس با ما
          </Link>
          <Link to="/requests/new" className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            ثبت درخواست مشاوره
          </Link>
        </div>
      </div>
    </div>
  );
}
