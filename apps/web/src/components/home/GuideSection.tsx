import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, FileSearch, PackageSearch } from "lucide-react";
import { Reveal } from "../Reveal";

const groups = [
  { icon: PackageSearch, title: "اطلاعات کالا", items: ["شرح کالا", "رویه موردنظر", "مبدأ و مقصد"] },
  { icon: FileSearch, title: "اسناد موجود", items: ["پیش‌فاکتور", "بارنامه", "فهرست عدل‌بندی"] },
  { icon: Clock3, title: "وضعیت فعلی", items: ["محل نگهداری کالا", "مهلت‌های احتمالی", "توضیحات پرونده"] },
];

export default function GuideSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <Reveal className="rounded-3xl border border-brand-100 bg-brand-50/60 p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-brand-900">برای شروع چه اطلاعاتی لازم است؟</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              هرچه اطلاعات اولیه دقیق‌تر باشد، بررسی پرونده سریع‌تر و دقیق‌تر انجام می‌شود. نیازی نیست
              همه موارد را از ابتدا در اختیار داشته باشید.
            </p>
            <Link
              to="/requests/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-brand-800 hover:shadow-lg"
            >
              شروع ثبت درخواست
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {groups.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.title}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm transition duration-300 hover:shadow-lg"
                >
                  <Icon className="size-5 text-accent-600" aria-hidden />
                  <h3 className="mt-2 text-sm font-bold text-brand-900">{group.title}</h3>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                    {group.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
