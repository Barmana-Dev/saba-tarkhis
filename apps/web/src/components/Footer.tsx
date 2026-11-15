import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";
import { api } from "../lib/api";
import { scrollToTop } from "../lib/scroll";

type PublicSettings = Record<string, string>;

export function Footer() {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.get<PublicSettings>("/settings/public"),
    staleTime: 10 * 60 * 1000,
  });

  const phone = data?.["contact.phone"] ?? "نیازمند تأیید کارفرما";
  const email = data?.["contact.email"] ?? "نیازمند تأیید کارفرما";
  const address = data?.["contact.address"] ?? "نیازمند تأیید کارفرما";
  const notice = data?.["site.notice"];

  return (
    <footer className="mt-20 border-t border-slate-800 bg-brand-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <button
            type="button"
            onClick={scrollToTop}
            className="block text-start"
            aria-label="بازگشت به بالای صفحه — صبا ترخیص"
          >
            <span className="block text-lg font-bold leading-5 text-white transition-colors hover:text-accent-400">
              صبا ترخیص
            </span>
          </button>
          <p className="text-xs leading-7 text-slate-400">
            همراه شما در بررسی اسناد، مشاوره امور گمرکی و پیشبرد پرونده‌های ترخیص کالا. این سامانه،
            وضعیت رسیدگی داخلی شرکت را نمایش می‌دهد و سامانه رسمی گمرک نیست.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-white">دسترسی سریع</h3>
          <ul className="space-y-2.5 text-xs">
            {[
              { to: "/services", label: "خدمات ترخیص" },
              { to: "/clearance-process", label: "مراحل ترخیص کالا" },
              { to: "/documents-guide", label: "راهنمای مدارک" },
              { to: "/articles", label: "مقالات آموزشی" },
              { to: "/faq", label: "سؤالات متداول" },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-slate-400 transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-white">اطلاعیه مهم</h3>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
            <p className="text-[11px] leading-6 text-amber-100/90">
              {notice ??
                "وضعیت‌های نمایش‌داده‌شده، وضعیت رسیدگی داخلی شرکت صبا ترخیص هستند و به معنی رویداد رسمی گمرکی یا اتصال به سامانه‌های دولتی نیستند."}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-white">ارتباط با ما</h3>
          <ul className="space-y-3 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <Phone className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
              <span className="num">{phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
              <span className="break-all">{email}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
              <span>{address}</span>
            </li>
          </ul>
          <p className="mt-4 text-[11px] text-slate-300">
            اطلاعات تماس پس از تأیید کارفرما در این بخش منتشر می‌شود.
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center text-[11px] text-slate-300">
        تمامی حقوق برای مجموعه «صبا ترخیص» محفوظ است. · این سامانه به سامانه‌های رسمی گمرکی متصل نیست.
      </div>
    </footer>
  );
}
