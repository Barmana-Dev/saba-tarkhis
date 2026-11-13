import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Article, ArticleCategory } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { PersianDatePicker } from "../PersianDatePicker";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "../ui";

type ArticleRow = Article & { category?: { id: string; name: string; slug: string } | null };

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  categoryId: "",
  status: "DRAFT" as "DRAFT" | "PUBLISHED",
  sourceName: "",
  sourceUrl: "",
  reviewedAt: "",
};

export function ArticlesTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "" });

  const articles = useQuery({
    queryKey: ["admin-articles"],
    queryFn: () => api.get<ArticleRow[]>("/admin/articles"),
  });
  const categories = useQuery({
    queryKey: ["admin-article-categories"],
    queryFn: () => api.get<ArticleCategory[]>("/admin/article-categories"),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        body: form.body,
        categoryId: form.categoryId || null,
        status: form.status,
        sourceName: form.sourceName || null,
        sourceUrl: form.sourceUrl || null,
        reviewedAt: form.reviewedAt || null,
      };
      return editingId
        ? api.patch<ArticleRow>(`/admin/articles/${editingId}`, payload)
        : api.post<ArticleRow>("/admin/articles", payload);
    },
    onSuccess: () => {
      setNotice(editingId ? "مقاله به‌روزرسانی شد." : "مقاله ایجاد شد.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/articles/${id}`),
    onSuccess: () => {
      setNotice("مقاله حذف شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const createCategory = useMutation({
    mutationFn: () => api.post("/admin/article-categories", categoryForm),
    onSuccess: () => {
      setCategoryForm({ name: "", slug: "" });
      setNotice("دسته‌بندی ایجاد شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-article-categories"] });
    },
  });

  function startEdit(article: ArticleRow) {
    setEditingId(article.id);
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body: article.body,
      categoryId: article.categoryId ?? article.category?.id ?? "",
      status: article.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      sourceName: article.sourceName ?? "",
      sourceUrl: article.sourceUrl ?? "",
      reviewedAt: article.reviewedAt ? article.reviewedAt.slice(0, 10) : "",
    });
    setNotice(null);
  }

  const error = [save.error, remove.error, createCategory.error].find(
    (item) => item instanceof ApiError,
  ) as ApiError | undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-3">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert tone="error">{error.message}</Alert> : null}

        {articles.data?.map((article) => (
          <div key={article.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-900">{article.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      article.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {article.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}
                  </span>
                </div>
                <p className="num mt-0.5 text-[11px] text-slate-400">{article.slug}</p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-slate-600">{article.excerpt}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {article.category?.name ?? "بدون دسته"} · بازبینی: {formatDate(article.reviewedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(article)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                  aria-label={`ویرایش ${article.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`مقاله «${article.title}» حذف شود؟`)) remove.mutate(article.id);
                  }}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`حذف ${article.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
        {articles.isPending ? <p className="text-xs text-slate-500">در حال بارگذاری…</p> : null}
      </div>

      <div className="space-y-5">
        <Card>
          <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <Plus className="size-4 text-accent-600" aria-hidden />
            {editingId ? "ویرایش مقاله" : "مقاله جدید"}
          </h3>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="عنوان" htmlFor="article-title" required>
                <Input
                  id="article-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </Field>
              <Field label="نامک" htmlFor="article-slug" required>
                <Input
                  id="article-slug"
                  className="num"
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </Field>
            </div>
            <Field label="خلاصه" htmlFor="article-excerpt" required>
              <Textarea
                id="article-excerpt"
                rows={2}
                value={form.excerpt}
                onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
              />
            </Field>
            <Field label="متن مقاله" htmlFor="article-body" required>
              <Textarea
                id="article-body"
                rows={7}
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="دسته‌بندی" htmlFor="article-category">
                <Select
                  id="article-category"
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="">بدون دسته</option>
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="وضعیت" htmlFor="article-status">
                <Select
                  id="article-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as "DRAFT" | "PUBLISHED" })
                  }
                >
                  <option value="DRAFT">پیش‌نویس</option>
                  <option value="PUBLISHED">منتشرشده</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام منبع" htmlFor="article-source">
                <Input
                  id="article-source"
                  value={form.sourceName}
                  onChange={(event) => setForm({ ...form, sourceName: event.target.value })}
                />
              </Field>
              <Field label="تاریخ بازبینی" htmlFor="article-review">
                <PersianDatePicker
                  id="article-review"
                  value={form.reviewedAt}
                  onChange={(value) => setForm({ ...form, reviewedAt: value })}
                  ariaLabel="تاریخ بازبینی مقاله (تقویم شمسی)"
                />
              </Field>
            </div>
            <Field label="نشانی منبع" htmlFor="article-source-url">
              <Input
                id="article-source-url"
                className="num"
                dir="ltr"
                value={form.sourceUrl}
                onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                placeholder="https://www.irica.ir/"
              />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
                {editingId ? "ذخیره تغییرات" : "ایجاد مقاله"}
              </Button>
              {editingId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  انصراف
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-brand-900">دسته‌بندی جدید</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input
              placeholder="نام دسته"
              aria-label="نام دسته"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
            />
            <Input
              placeholder="slug"
              aria-label="نامک دسته"
              className="num"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            loading={createCategory.isPending}
            disabled={!categoryForm.name || !categoryForm.slug}
            onClick={() => createCategory.mutate()}
          >
            افزودن دسته
          </Button>
        </Card>
      </div>
    </div>
  );
}
