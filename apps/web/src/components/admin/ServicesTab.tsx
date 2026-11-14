import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Service } from "../../lib/types";
import { Alert, Button, Card, Field, Input, Textarea } from "../ui";

type ServiceRow = Service & { isPublished: boolean; sortOrder: number; updatedAt: string };

const emptyForm = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  isPublished: false,
  sortOrder: 0,
};

export function ServicesTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<ServiceRow[]>("/admin/services"),
  });

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.patch<ServiceRow>(`/admin/services/${editingId}`, form)
        : api.post<ServiceRow>("/admin/services", form),
    onSuccess: () => {
      setNotice(editingId ? "خدمت به‌روزرسانی شد." : "خدمت جدید ایجاد شد.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => {
      setNotice("خدمت حذف شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  function startEdit(service: ServiceRow) {
    setEditingId(service.id);
    setForm({
      slug: service.slug,
      title: service.title,
      excerpt: service.excerpt,
      body: service.body ?? "",
      isPublished: service.isPublished,
      sortOrder: service.sortOrder,
    });
    setNotice(null);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-3">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {save.isError || remove.isError ? (
          <Alert tone="error">
            {save.error instanceof ApiError
              ? save.error.message
              : remove.error instanceof ApiError
                ? remove.error.message
                : "عملیات انجام نشد."}
          </Alert>
        ) : null}

        {list.data?.map((service) => (
          <div key={service.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-900">{service.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      service.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {service.isPublished ? "منتشرشده" : "منتشرنشده"}
                  </span>
                </div>
                <p className="num mt-0.5 text-[11px] text-slate-600">{service.slug}</p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-slate-600">{service.excerpt}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(service)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                  aria-label={`ویرایش ${service.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`خدمت «${service.title}» حذف شود؟`)) remove.mutate(service.id);
                  }}
                  className="rounded-md p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`حذف ${service.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.isPending ? <p className="text-xs text-slate-500">در حال بارگذاری…</p> : null}
        {list.data?.length === 0 ? <p className="text-xs text-slate-500">خدمتی ثبت نشده است.</p> : null}
      </div>

      <Card className="h-fit">
        <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
          <Plus className="size-4 text-accent-600" aria-hidden />
          {editingId ? "ویرایش خدمت" : "خدمت جدید"}
        </h3>
        <div className="mt-4 space-y-3">
          <Field label="نامک (slug)" htmlFor="service-slug" required hint="فقط حروف کوچک انگلیسی، عدد و خط تیره.">
            <Input
              id="service-slug"
              className="num"
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="clearance-from-customs"
            />
          </Field>
          <Field label="عنوان" htmlFor="service-title" required>
            <Input id="service-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="توضیح کوتاه" htmlFor="service-excerpt" required>
            <Textarea
              id="service-excerpt"
              rows={2}
              value={form.excerpt}
              onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
            />
          </Field>
          <Field label="متن کامل" htmlFor="service-body" required hint="هر پاراگراف را با یک خط خالی جدا کنید.">
            <Textarea
              id="service-body"
              rows={6}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ترتیب نمایش" htmlFor="service-order">
              <Input
                id="service-order"
                type="number"
                min={0}
                max={999}
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
              />
            </Field>
            <label className="flex items-end gap-2 pb-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
                className="size-4 accent-brand-700"
              />
              انتشار در سایت
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              {editingId ? "ذخیره تغییرات" : "ایجاد خدمت"}
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
    </div>
  );
}
