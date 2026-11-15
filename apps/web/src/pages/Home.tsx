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
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:px-8">
          <div className="lg:flex lg:flex-col lg:justify-center">
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

          <div className="flex flex-col justify-center gap-4">
            <div className="mx-auto aspect-[16/10] max-h-[240px] w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/10 bg-brand-950/60 shadow-2xl sm:max-h-[270px] lg:mx-0 lg:max-h-none lg:max-w-none">
              <img
                src="/images/photos/hero-port.jpg"
                alt="بندر کانتینری در غروب، جرثقیل‌های در حال بارگیری کشتی"
                width={1200}
                height={675}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-200">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition duration-300 hover:bg-white/10">
                <PackageSearch className="size-4 shrink-0 text-accent-500" aria-hidden />
                پیگیری مدارک و پیام‌ها
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition duration-300 hover:bg-white/10">
                <MessageSquareText className="size-4 shrink-0 text-accent-500" aria-hidden />
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
