import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck2, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import type { Article } from "../lib/types";
import { formatDate } from "../lib/format";
import { Seo } from "../components/Seo";
import { Alert, Skeleton } from "../components/ui";

export function ArticleDetail() {
  const { slug = "" } = useParams();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => api.get<Article>(`/articles/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Seo title="مقاله یافت نشد" description="این مقاله در سایت موجود نیست." noindex />
        <Alert tone="error">
          {error instanceof Error ? error.message : "مقاله موردنظر یافت نشد."}
        </Alert>
        <Link to="/articles" className="mt-5 inline-flex items-center gap-1.5 text-sm text-brand-700">
          <ArrowLeft className="size-4" aria-hidden />
          بازگشت به مقالات
        </Link>
      </div>
    );
  }

  const paragraphs = data.body.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <Seo
        title={data.title}
        description={data.excerpt}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: data.title,
          description: data.excerpt,
          datePublished: data.publishedAt,
          dateModified: data.reviewedAt ?? data.publishedAt,
          author: { "@type": "Organization", name: "صبا ترخیص" },
        }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="shrink-0 hover:text-brand-700">خانه</Link>
        <span aria-hidden>/</span>
        <Link to="/articles" className="shrink-0 hover:text-brand-700">مقالات</Link>
        <span aria-hidden>/</span>
        <span className="min-w-0 max-w-full truncate text-slate-700">{data.title}</span>
      </nav>

      <p className="text-xs font-semibold text-accent-700">{data.category?.name ?? "مقاله آموزشی"}</p>
      <h1 className="mt-2 text-3xl font-bold leading-normal text-brand-900">{data.title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{data.excerpt}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200 py-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <CalendarCheck2 className="size-3.5" aria-hidden />
          انتشار: {formatDate(data.publishedAt)}
        </span>
        {data.reviewedAt ? <span>آخرین بازبینی: {formatDate(data.reviewedAt)}</span> : null}
      </div>

      <div className="prose-fa mt-7 text-sm leading-8 text-slate-700">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {data.sourceName ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          <p className="font-medium text-slate-700">منبع بررسی</p>
          <p className="mt-1">
            {data.sourceUrl ? (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-700 hover:underline"
              >
                {data.sourceName}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : (
              data.sourceName
            )}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            مقررات و رویه‌های گمرکی تغییرپذیرند؛ پیش از تصمیم‌گیری، آخرین اطلاعات را از منابع رسمی
            بررسی کنید.
          </p>
        </div>
      ) : null}

      <Alert tone="warning" className="mt-6">
        این محتوا آموزشی است و جای مشاوره تخصصی پرونده یا استعلام رسمی از مراجع گمرکی را نمی‌گیرد.
      </Alert>

      <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <h2 className="text-base font-bold text-brand-900">سؤال یا پرونده مشخصی دارید؟</h2>
        <p className="mt-1.5 text-xs leading-6 text-slate-600">
          اطلاعات محموله خود را ثبت کنید تا مسیر و مدارک موردنیاز بررسی شود.
        </p>
        <Link
          to="/requests/new"
          className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          ثبت درخواست ترخیص
        </Link>
      </div>
    </article>
  );
}
