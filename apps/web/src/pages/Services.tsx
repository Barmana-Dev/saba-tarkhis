import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Service } from "../lib/types";
import { Seo } from "../components/Seo";
import { ServiceCard } from "../components/ServiceCard";
import { Alert, EmptyState, Skeleton } from "../components/ui";

export function Services() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<Service[]>("/services"),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <Seo
        title="خدمات ترخیص و مشاوره گمرکی"
        description="خدمات صبا ترخیص شامل ترخیص کالا از گمرک، بررسی اسناد، راهنمای ثبت سفارش، واردات و صادرات و بررسی اولیه ردیف تعرفه."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">خدمات</span>
      </nav>

      <header className="max-w-2xl">
        <p className="text-xs font-semibold text-accent-700">خدمات صبا ترخیص</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">
          خدمات ترخیص کالا و مشاوره گمرکی
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          هر خدمت با بررسی اولیه پرونده آغاز می‌شود. خدمات نمایش‌داده‌شده، مواردی هستند که توسط
          کارفرما برای انتشار تأیید شده‌اند.
        </p>
      </header>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isPending
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-2xl" />)
          : null}
        {data?.map((service) => <ServiceCard key={service.id} service={service} />)}
      </div>

      {isError ? (
        <Alert tone="error" className="mt-6">
          دریافت فهرست خدمات انجام نشد. لطفاً اتصال خود را بررسی کرده و صفحه را دوباره بارگذاری کنید.
        </Alert>
      ) : null}

      {!isPending && !isError && data?.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="در حال حاضر خدمتی برای نمایش وجود ندارد."
            description="فهرست خدمات از پنل مدیریت به‌روزرسانی می‌شود."
          />
        </div>
      ) : null}

      <div className="mt-12 rounded-2xl border border-brand-100 bg-brand-50/60 p-6 md:p-8">
        <h2 className="text-lg font-bold text-brand-900">خدمت موردنظر خود را پیدا نکردید؟</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          اطلاعات محموله خود را ثبت کنید تا کارشناس ما مسیر مناسب و مدارک موردنیاز را بررسی کند.
        </p>
        <Link
          to="/requests/new"
          className="mt-5 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          ثبت درخواست مشاوره
        </Link>
      </div>
    </div>
  );
}
