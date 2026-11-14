import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileSearch,
  Layers,
  LockKeyhole,
  MessageSquareText,
  PackageSearch,
} from "lucide-react";
import { Seo } from "../components/Seo";
import { Skeleton } from "../components/ui";
import { LazySection } from "../components/Reveal";

const ServicesSection = lazy(() => import("../components/home/ServicesSection"));
const ProcessSection = lazy(() => import("../components/home/ProcessSection"));
const GuideSection = lazy(() => import("../components/home/GuideSection"));
const FaqArticlesSection = lazy(() => import("../components/home/FaqArticlesSection"));
const CtaSection = lazy(() => import("../components/home/CtaSection"));

function SectionFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}

export function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "صبا ترخیص",
    description:
      "ارائه خدمات ترخیص کالا، مشاوره و بررسی اسناد گمرکی. این سامانه، وضعیت رسیدگی داخلی شرکت را نمایش می‌دهد.",
    url: window.location.origin,
  };

  return (
    <>
      <Seo
        title="صبا ترخیص"
        description="صبا ترخیص؛ خدمات تخصصی ترخیص کالا، مشاوره گمرکی و سامانه پیگیری درخواست مشتری. ثبت درخواست، بارگذاری مدارک و مشاهده وضعیت رسیدگی داخلی پرونده."
        jsonLd={jsonLd}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-linear-to-b from-brand-950 via-brand-900 to-brand-800 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,0.22),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_40%)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8">
          <div>
            <h1 className="text-3xl font-bold leading-[1.35] md:text-[2.75rem] md:leading-[1.3]">
              ترخیص کالای شما، با راهنمایی تخصصی و
              <span className="text-accent-500"> پیگیری شفاف</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-slate-200 md:text-base">
              از بررسی اسناد تجاری و شناسایی مدارک موردنیاز تا ثبت درخواست و مشاهده وضعیت رسیدگی
              داخلی پرونده؛ مسیر کار را روشن و قابل پیگیری نگه می‌داریم.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/requests/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-sm font-semibold text-brand-950 shadow-lg shadow-accent-500/20 transition duration-300 hover:bg-accent-400 hover:shadow-xl"
              >
                ثبت درخواست ترخیص
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
              <Link
                to="/clearance-process"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-medium text-white transition duration-300 hover:bg-white/10"
              >
                مشاهده مراحل ترخیص کالا
              </Link>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 text-[11px] text-slate-300">
              <li className="flex items-start gap-2">
                <FileSearch className="lead-icon size-4 text-accent-500" aria-hidden />
                بررسی اولیه اسناد
              </li>
              <li className="flex items-start gap-2">
                <Layers className="lead-icon size-4 text-accent-500" aria-hidden />
                پیگیری داخلی پرونده
              </li>
              <li className="flex items-start gap-2">
                <LockKeyhole className="lead-icon size-4 text-accent-500" aria-hidden />
                دسترسی امن به مدارک
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="rounded-2xl bg-white p-5 text-slate-800 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-[11px] text-slate-500">نمونه پرونده (داده آزمایشی)</p>
                    <p className="num mt-1 text-sm font-bold text-brand-900">ST-2026-000123</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                    در حال بررسی
                  </span>
                </div>
                <ol className="mt-4 space-y-3 text-[11px]">
                  {[
                    { label: "ثبت درخواست توسط مشتری", done: true },
                    { label: "بررسی اسناد و اطلاعات محموله", done: true },
                    { label: "درخواست مدرک تکمیلی", active: true },
                    { label: "ثبت پیشنهاد خدمات", done: false },
                  ].map((step) => (
                    <li key={step.label} className="flex items-center gap-2.5">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          step.done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : step.active
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {step.done ? "✓" : "•"}
                      </span>
                      <span className={step.done || step.active ? "text-slate-700" : "text-slate-600"}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                  این نمایش نمونه است؛ وضعیت‌ها صرفاً رسیدگی داخلی شرکت را نشان می‌دهند.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-200">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition duration-300 hover:bg-white/10">
                <PackageSearch className="size-4 text-accent-500" aria-hidden />
                پیگیری مدارک و پیام‌ها
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition duration-300 hover:bg-white/10">
                <MessageSquareText className="size-4 text-accent-500" aria-hidden />
                ارتباط با کارشناس
              </div>
            </div>
          </div>
        </div>
      </section>

      <LazySection minHeight={420}>
        <Suspense fallback={<SectionFallback />}>
          <ServicesSection />
        </Suspense>
      </LazySection>

      <LazySection minHeight={480}>
        <Suspense fallback={<SectionFallback />}>
          <ProcessSection />
        </Suspense>
      </LazySection>

      <LazySection minHeight={360}>
        <Suspense fallback={<SectionFallback />}>
          <GuideSection />
        </Suspense>
      </LazySection>

      <LazySection minHeight={420}>
        <Suspense fallback={<SectionFallback />}>
          <FaqArticlesSection />
        </Suspense>
      </LazySection>

      <LazySection minHeight={320}>
        <Suspense fallback={<SectionFallback />}>
          <CtaSection />
        </Suspense>
      </LazySection>
    </>
  );
}
