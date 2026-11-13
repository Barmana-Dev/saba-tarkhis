import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileCheck2, HelpCircle, ListChecks, UsersRound } from "lucide-react";
import { api } from "../lib/api";
import type { Service } from "../lib/types";
import { Seo } from "../components/Seo";
import { Alert, Skeleton } from "../components/ui";

export function ServiceDetail() {
  const { slug = "" } = useParams();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["service", slug],
    queryFn: () => api.get<Service>(`/services/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Seo title="خدمت یافت نشد" description="این خدمت در سایت موجود نیست." noindex />
        <Alert tone="error">
          {error instanceof Error ? error.message : "خدمت موردنظر یافت نشد یا منتشر نشده است."}
        </Alert>
        <Link to="/services" className="mt-5 inline-flex items-center gap-1.5 text-sm text-brand-700">
          <ArrowLeft className="size-4" aria-hidden />
          بازگشت به فهرست خدمات
        </Link>
      </div>
    );
  }

  const paragraphs = data.body?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Seo
        title={data.title}
        description={data.excerpt}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: data.title,
          description: data.excerpt,
          provider: { "@type": "Organization", name: "صبا ترخیص" },
        }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="shrink-0 hover:text-brand-700">خانه</Link>
        <span aria-hidden>/</span>
        <Link to="/services" className="shrink-0 hover:text-brand-700">خدمات</Link>
        <span aria-hidden>/</span>
        <span className="min-w-0 max-w-full truncate text-slate-700">{data.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <p className="text-xs font-semibold text-accent-700">خدمت</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-900">{data.title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{data.excerpt}</p>

          <div className="prose-fa mt-7 text-sm leading-8 text-slate-700">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              { icon: UsersRound, title: "مناسب چه کسانی است؟", text: "واردکنندگان و صادرکنندگانی که به بررسی اولیه اسناد و مسیر قانونی نیاز دارند." },
              { icon: ListChecks, title: "مراحل کلی", text: "ثبت درخواست، بررسی اطلاعات، اعلام مدارک موردنیاز، پیگیری و انجام خدمات." },
              { icon: FileCheck2, title: "مدارک معمول", text: "پیش‌فاکتور، فاکتور، عدل‌بندی و بارنامه؛ فهرست نهایی به پرونده بستگی دارد." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                  <Icon className="size-5 text-accent-600" aria-hidden />
                  <h2 className="mt-2 text-sm font-bold text-brand-900">{item.title}</h2>
                  <p className="mt-1.5 text-xs leading-6 text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <h2 className="text-base font-bold text-brand-900">نکات مهم</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              ترتیب و جزئیات قانونی مراحل بر اساس نوع کالا و مقررات روز تغییر می‌کند. این صفحه
              راهنمای عمومی است و جای بررسی تخصصی پرونده را نمی‌گیرد. برای فهرست کامل‌تر مدارک،{" "}
              <Link to="/documents-guide" className="text-brand-700 underline">
                راهنمای مدارک
              </Link>{" "}
              را ببینید.
            </p>
          </div>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <h2 className="text-base font-bold text-brand-900">همین حالا درخواست ثبت کنید</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              اطلاعات اولیه محموله را وارد کنید؛ نیازی به داشتن همه مدارک در ابتدا نیست.
            </p>
            <Link
              to="/requests/new"
              className="mt-4 block rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
            >
              ثبت درخواست ترخیص
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
              <HelpCircle className="size-4 text-accent-600" aria-hidden />
              سؤال دارید؟
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              پیش از ثبت درخواست، می‌توانید پرسش‌های متداول را ببینید یا از فرم تماس استفاده کنید.
            </p>
            <Link to="/faq" className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline">
              مشاهده سؤالات متداول ←
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
