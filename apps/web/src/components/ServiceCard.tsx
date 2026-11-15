import { Link } from "react-router-dom";
import { serviceImage } from "../lib/serviceImages";
import type { Service } from "../lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:border-brand-300 hover:shadow-xl">
      <div className="border-b border-slate-100 bg-brand-50/60">
        <img
          src={serviceImage(service.slug)}
          alt=""
          aria-hidden
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex grow flex-col p-6">
        <h3 className="text-base font-bold text-brand-900">{service.title}</h3>
        <p className="mt-2 grow text-sm leading-7 text-slate-600">{service.excerpt}</p>
        <Link
          to={`/services/${service.slug}`}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent-700 after:absolute after:inset-0 after:content-[''] hover:text-accent-600"
        >
          جزئیات خدمت
          <span aria-hidden>←</span>
        </Link>
      </div>
    </article>
  );
}
