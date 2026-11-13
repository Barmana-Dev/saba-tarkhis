import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { Seo } from "../components/Seo";
import { Alert } from "../components/ui";
import { processSteps } from "../data/processSteps";

export function ClearanceProcess() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <Seo
        title="مراحل ترخیص کالا؛ راهنمای گام‌به‌گام"
        description="راهنمای آموزشی مراحل عمومی ترخیص کالا از گمرک: بررسی کالا و رویه، مدارک، اظهار، ارزیابی و تشریفات خروج، همراه با هشدارهای کاربردی."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">مراحل ترخیص</span>
      </nav>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold text-accent-700">راهنمای آموزشی</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">مراحل ترخیص کالا از گمرک</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          در این صفحه، مسیر عمومی ترخیص کالا را مرحله‌به‌مرحله می‌بینید. این راهنما برای آشنایی
          اولیه است و ترتیب دقیق مراحل بر اساس نوع کالا، رویه و مقررات روز تغییر می‌کند.
        </p>
      </header>

      <Alert tone="warning" className="mt-6">
        این مراحل صرفاً راهنمای عمومی هستند. صبا ترخیص سامانه رسمی گمرک نیست و هیچ اظهارنامه رسمی،
        استعلام زنده یا محاسبه قطعی حقوق گمرکی از این سایت انجام نمی‌شود.
      </Alert>

      <ol className="mt-10 space-y-4">
        {processSteps.map((step, index) => (
          <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
            <div className="flex gap-4">
              <span className="num flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-brand-900">{step.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>

                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-700">مدارک رایج این مرحله</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {step.documents.map((document) => (
                      <li
                        key={document}
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                      >
                        <FileText className="size-3" aria-hidden />
                        {document}
                      </li>
                    ))}
                  </ul>
                </div>

                {step.warning ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-6 text-amber-900">
                    <AlertTriangle className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
                    {step.warning}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-brand-900">برای شروع چه چیزی لازم دارید؟</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          لازم نیست همه مدارک را از ابتدا داشته باشید؛ توضیح کالا، رویه موردنظر و اطلاعات مبدأ و
          مقصد برای شروع بررسی کافی است. مدارک تکمیلی را می‌توانید بعداً در پرونده بارگذاری کنید.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/requests/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            ثبت درخواست ترخیص
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <Link
            to="/documents-guide"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-brand-800 hover:bg-brand-50"
          >
            راهنمای مدارک
          </Link>
        </div>
      </section>
    </div>
  );
}
