import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { processSteps } from "../../data/processSteps";
import { Reveal } from "../Reveal";

export default function ProcessSection() {
  return (
    <section className="border-y border-slate-200 bg-white py-16" aria-labelledby="process-heading">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold text-accent-700">فرایند همکاری</p>
          <h2 id="process-heading" className="mt-2 text-2xl font-bold text-brand-900">
            مسیر کار از درخواست تا تحویل، شفاف و مرحله‌به‌مرحله
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            مراحل دقیق ترخیص به نوع کالا و مقررات روز بستگی دارد. آنچه در ادامه می‌بینید، نمای کلی
            همکاری با صبا ترخیص است.
          </p>
        </Reveal>
        <ol className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.slice(0, 4).map((step, index) => (
            <li key={step.title} className="h-full">
              <Reveal delay={index * 80} className="h-full">
                <div className="relative h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition duration-300 hover:border-brand-200 hover:bg-white hover:shadow-lg">
                  <span className="num flex size-8 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-brand-900">{step.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <Link
          to="/clearance-process"
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          مشاهده راهنمای کامل مراحل
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
