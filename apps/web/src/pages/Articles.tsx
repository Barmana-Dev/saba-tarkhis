import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, queryString } from "../lib/api";
import type { ArticleCategory, ArticleSummary, Paginated } from "../lib/types";
import { formatDate } from "../lib/format";
import { Seo } from "../components/Seo";
import { Alert, Button, EmptyState, Input, Select, Skeleton } from "../components/ui";

export function Articles() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const category = params.get("category") ?? "";
  const queryParam = params.get("q") ?? "";
  const [term, setTerm] = useState(queryParam);

  useEffect(() => {
    setTerm(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (term !== queryParam) {
        setParams((current) => {
          const next = new URLSearchParams(current);
          if (term.trim()) next.set("q", term.trim());
          else next.delete("q");
          next.delete("page");
          return next;
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [term, queryParam, setParams]);

  const categories = useQuery({
    queryKey: ["article-categories"],
    queryFn: () => api.get<ArticleCategory[]>("/article-categories"),
    staleTime: 10 * 60 * 1000,
  });

  const articles = useQuery({
    queryKey: ["articles", { page, category, q: queryParam }],
    queryFn: () =>
      api.get<Paginated<ArticleSummary>>(
        `/articles${queryString({ page, category, q: queryParam })}`,
      ),
    placeholderData: keepPreviousData,
  });

  function updateParam(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Seo
        title="مقالات و آموزش‌های گمرکی"
        description="مقالات آموزشی صبا ترخیص درباره ترخیص کالا، مدارک، اصطلاحات گمرکی و نکات کاربردی واردات و صادرات، همراه با منبع و تاریخ بازبینی."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">مقالات</span>
      </nav>

      <header className="max-w-2xl">
        <p className="text-xs font-semibold text-accent-700">دانش گمرکی</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">مقالات و آموزش‌ها</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          مطالب آموزشی با منبع و تاریخ آخرین بازبینی منتشر می‌شوند. این محتوا جای مشاوره تخصصی
          پرونده را نمی‌گیرد.
        </p>
      </header>

      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-3.5 size-4 text-slate-600" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجو در عنوان و متن مقالات…"
            aria-label="جست‌وجو در مقالات"
            className="pe-9"
          />
        </div>
        <Select
          value={category}
          onChange={(event) => updateParam("category", event.target.value)}
          aria-label="دسته‌بندی مقالات"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.data?.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      {articles.isError ? (
        <Alert tone="error" className="mt-6">
          دریافت مقالات انجام نشد. لطفاً دوباره تلاش کنید.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.isPending
          ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56 rounded-2xl" />)
          : null}
        {articles.data?.items.map((article) => (
          <article key={article.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-[11px] font-medium text-accent-700">
              {article.category?.name ?? "مقاله آموزشی"}
            </p>
            <h2 className="mt-2 text-base font-bold leading-7 text-brand-900">
              <Link to={`/articles/${article.slug}`} className="hover:text-brand-700">
                {article.title}
              </Link>
            </h2>
            <p className="mt-2 grow text-xs leading-6 text-slate-600">{article.excerpt}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
              انتشار: {formatDate(article.publishedAt)}
            </p>
          </article>
        ))}
      </div>

      {!articles.isPending && articles.data?.items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="مقاله‌ای با این مشخصات پیدا نشد."
            description="عبارت جست‌وجو یا دسته‌بندی را تغییر دهید."
          />
        </div>
      ) : null}

      {articles.data && articles.data.meta.totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="صفحه‌بندی مقالات">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            صفحه قبل
          </Button>
          <span className="px-3 text-xs text-slate-600">
            صفحه {page.toLocaleString("fa-IR")} از {articles.data.meta.totalPages.toLocaleString("fa-IR")}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= articles.data.meta.totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            صفحه بعد
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
