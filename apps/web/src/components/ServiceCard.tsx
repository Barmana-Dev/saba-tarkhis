import { Link } from "react-router-dom";
import {
  ClipboardList,
  Container,
  FileCheck2,
  SearchCheck,
  Ship,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Service } from "../lib/types";

const iconBySlug: Record<string, LucideIcon> = {
  "clearance-from-customs": Container,
  "customs-document-review": FileCheck2,
  "order-registration-guidance": ClipboardList,
  "import-export-guidance": Ship,
  "hs-code-review": SearchCheck,
  "transit-process-guidance": Truck,
};

export function ServiceCard({ service }: { service: Service }) {
  const Icon = iconBySlug[service.slug] ?? Container;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition duration-300 hover:border-brand-300 hover:shadow-xl">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-brand-900">{service.title}</h3>
      <p className="mt-2 grow text-sm leading-7 text-slate-600">{service.excerpt}</p>
      <Link
        to={`/services/${service.slug}`}
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent-700 after:absolute after:inset-0 after:content-[''] hover:text-accent-600"
      >
        جزئیات خدمت
        <span aria-hidden>←</span>
      </Link>
    </article>
  );
}
