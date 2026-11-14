import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { ArticleSummary, Faq } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Skeleton } from "../ui";
import { Reveal } from "../Reveal";

export default function FaqArticlesSection() {
  const faqs = useQuery({
    queryKey: ["faqs"],
    queryFn: () => api.get<Faq[]>("/faqs"),
  });
  const articles = useQuery({
    queryKey: ["articles", "home"],
    queryFn: () => api.get<{ items: ArticleSummary[] }>("/articles?pageSize=3"),
  });

  return (
    <section className="border-y border-slate-200 bg-white py-16" aria-label="سؤالات متداول و مقالات منتخب">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-900">سؤالات متداول</h2>
            <Link to="/faq" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              همه سؤالات ←
            </Link>
          </div>
          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {(faqs.data ?? []).slice(0, 4).map((faq) => (
              <details key={faq.id} className="group px-4 py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
                  <span className="flex items-start gap-2">
                    <HelpCircle className="lead-icon size-4 shrink-0 text-accent-600" aria-hidden />
                    {faq.question}
                  </span>
                  <span className="text-slate-600 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2.5 ps-6 text-xs leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
            {faqs.isPending ? <Skeleton className="m-4 h-16" /> : null}
            {faqs.isError ? <p className="p-4 text-xs text-rose-600">دریافت پرسش‌ها انجام نشد.</p> : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-900">مقالات منتخب</h2>
            <Link to="/articles" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              همه مقالات ←
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {(articles.data?.items ?? []).map((article) => (
              <Link
                key={article.id}
                to={`/articles/${article.slug}`}
                className="block rounded-2xl border border-slate-200 p-4 transition duration-300 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-md"
              >
                <p className="text-[11px] text-accent-700">{article.category?.name ?? "مقاله"}</p>
                <h3 className="mt-1 text-sm font-bold text-brand-900">{article.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-slate-600">{article.excerpt}</p>
                <p className="mt-2 text-[11px] text-slate-600">{formatDate(article.publishedAt)}</p>
              </Link>
            ))}
            {articles.isPending ? <Skeleton className="h-24 rounded-2xl" /> : null}
            {articles.isError ? <p className="text-xs text-rose-600">دریافت مقالات انجام نشد.</p> : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
