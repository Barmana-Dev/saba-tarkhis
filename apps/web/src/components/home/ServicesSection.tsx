import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Service } from "../../lib/types";
import { ServiceCard } from "../ServiceCard";
import { Alert, Skeleton } from "../ui";
import { Reveal } from "../Reveal";

export default function ServicesSection() {
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<Service[]>("/services"),
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8" aria-labelledby="services-heading">
      <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-accent-700">خدمات صبا ترخیص</p>
          <h2 id="services-heading" className="mt-2 text-2xl font-bold text-brand-900">
            در چه زمینه‌ای می‌توانیم همراه شما باشیم؟
          </h2>
        </div>
        <Link to="/services" className="text-sm font-medium text-brand-700 hover:text-brand-800">
          مشاهده همه خدمات ←
        </Link>
      </Reveal>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.isPending
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-2xl" />
            ))
          : null}
        {services.isError ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <Alert tone="error">
              دریافت فهرست خدمات انجام نشد. اتصال به سرور را بررسی کنید یا صفحه را دوباره بارگذاری
              کنید.
            </Alert>
          </div>
        ) : null}
        {services.data?.map((service, index) => (
          <Reveal key={service.id} delay={Math.min(index, 5) * 70} className="h-full">
            <ServiceCard service={service} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
