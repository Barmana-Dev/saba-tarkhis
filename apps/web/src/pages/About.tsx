import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, FileCheck2, Handshake } from "lucide-react";
import { api } from "../lib/api";
import { Seo } from "../components/Seo";
import { Alert } from "../components/ui";

export function About() {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.get<Record<string, string>>("/settings/public"),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <Seo
        title="درباره صبا ترخیص"
        description="معرفی مجموعه صبا ترخیص، حوزه فعالیت در خدمات ترخیص کالا و مشاوره امور گمرکی، و شیوه همکاری با مشتریان."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">درباره ما</span>
      </nav>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold text-accent-700">درباره ما</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">صبا ترخیص؛ همراه پرونده‌های گمرکی شما</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">
          {data?.["company.intro"] ??
            "صبا ترخیص در حوزه ارائه خدمات ترخیص کالا و مشاوره امور گمرکی فعالیت می‌کند. تمرکز ما بر بررسی شفاف اسناد، روشن‌کردن مدارک موردنیاز و پیگیری قابل‌مشاهده پرونده است."}
        </p>
      </header>

      <section className="mt-9 grid gap-5 md:grid-cols-3" aria-labelledby="values">
        <h2 id="values" className="sr-only">شیوه همکاری</h2>
        {[
          {
            icon: FileCheck2,
            title: "بررسی اسناد پیش از شروع",
            text: "هم‌خوانی اسناد تجاری و حمل را پیش از تشریفات بررسی می‌کنیم تا مغایرت‌ها زودتر مشخص شود.",
          },
          {
            icon: Handshake,
            title: "مسیر روشن همکاری",
            text: "مدارک موردنیاز، وضعیت رسیدگی و پیام‌های کارشناس در یک پنل مشخص در اختیار شماست.",
          },
          {
            icon: BadgeCheck,
            title: "پرهیز از وعده‌های غیرواقعی",
            text: "مدت قطعی، هزینه نهایی یا نتیجه رسمی گمرکی را بدون مستندات و مراجع رسمی اعلام نمی‌کنیم.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <Icon className="size-6 text-accent-600" aria-hidden />
              <h3 className="mt-3 text-sm font-bold text-brand-900">{item.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-600">{item.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-brand-900">حوزه فعالیت</h2>
        <p className="mt-2 text-sm leading-8 text-slate-600">
          خدمات ما در صفحه «خدمات» فهرست شده و شامل ترخیص کالا، بررسی اسناد گمرکی، راهنمای ثبت سفارش
          و مجوزها، راهنمای واردات و صادرات و بررسی اولیه ردیف تعرفه است. هر خدمتی که شرایط آن هنوز
          تأیید نشده باشد، در سایت عمومی منتشر نمی‌شود.
        </p>
      </section>

      <Alert tone="warning" className="mt-8">
        اطلاعاتی مانند مجوزها، نشان‌های اعتماد، آمار پرونده‌ها، سابقه سال‌ها فعالیت، لوگوی مشتریان،
        نشانی دفترها و شماره تماس، تنها پس از دریافت و تأیید رسمی کارفرما منتشر می‌شود. در نسخه
        فعلی، هیچ‌یک از این موارد به‌عنوان واقعیت نمایش داده نشده است.
      </Alert>

      <div className="mt-8 rounded-2xl bg-brand-900 p-6 text-center text-white md:p-8">
        <h2 className="text-lg font-bold">برای شروع، اطلاعات محموله خود را ثبت کنید</h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-7 text-slate-300">
          کارشناس ما پس از بررسی اولیه، مدارک موردنیاز و مسیر پیشنهادی را اعلام می‌کند.
        </p>
        <Link
          to="/requests/new"
          className="mt-5 inline-block rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-brand-950 hover:bg-accent-400"
        >
          ثبت درخواست ترخیص
        </Link>
      </div>
    </div>
  );
}
