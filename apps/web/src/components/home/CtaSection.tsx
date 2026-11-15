import { Link } from "react-router-dom";
import { Reveal } from "../Reveal";

export default function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <Reveal className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-10 text-center text-white shadow-xl shadow-brand-900/20 md:px-12">
        <img
          src="/images/hero-port.svg"
          alt=""
          aria-hidden
          width={1200}
          height={800}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -bottom-10 start-0 hidden w-[38%] max-w-md opacity-25 mix-blend-luminosity md:block"
        />
        <h2 className="relative text-2xl font-bold">پرونده‌تان را با اطلاعات درست شروع کنید</h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          ثبت درخواست چند دقیقه وقت می‌گیرد. پس از ثبت، شناسه پیگیری داخلی دریافت می‌کنید و
          می‌توانید وضعیت رسیدگی، پیام‌ها و مدارک را در پنل خود ببینید.
        </p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/requests/new"
            className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition duration-300 hover:bg-accent-400 hover:shadow-lg"
          >
            ثبت درخواست ترخیص
          </Link>
          <Link
            to="/documents-guide"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium transition duration-300 hover:bg-white/10"
          >
            راهنمای مدارک
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
