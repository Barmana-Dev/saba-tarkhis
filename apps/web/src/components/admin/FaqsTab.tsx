import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Faq } from "../../lib/types";
import { Alert, Button, Card, Field, Input, Textarea } from "../ui";

type FaqRow = Faq & { sortOrder: number; isPublished: boolean };

const emptyForm = { question: "", answer: "", sortOrder: 0, isPublished: true };

export function FaqsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: () => api.get<FaqRow[]>("/admin/faqs"),
  });

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.patch<FaqRow>(`/admin/faqs/${editingId}`, form)
        : api.post<FaqRow>("/admin/faqs", form),
    onSuccess: () => {
      setNotice(editingId ? "پرسش به‌روزرسانی شد." : "پرسش جدید ایجاد شد.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/faqs/${id}`),
    onSuccess: () => {
      setNotice("پرسش حذف شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });

  const error = [save.error, remove.error].find((item) => item instanceof ApiError) as
    | ApiError
    | undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-3">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert tone="error">{error.message}</Alert> : null}

        {list.data?.map((faq) => (
          <div key={faq.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-900">{faq.question}</h3>
                  {!faq.isPublished ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      منتشرنشده
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs leading-6 text-slate-600">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(faq.id);
                    setForm({
                      question: faq.question,
                      answer: faq.answer,
                      sortOrder: faq.sortOrder,
                      isPublished: faq.isPublished,
                    });
                    setNotice(null);
                  }}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                  aria-label={`ویرایش ${faq.question}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("این پرسش حذف شود؟")) remove.mutate(faq.id);
                  }}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`حذف ${faq.question}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.isPending ? <p className="text-xs text-slate-500">در حال بارگذاری…</p> : null}
      </div>

      <Card className="h-fit">
        <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
          <Plus className="size-4 text-accent-600" aria-hidden />
          {editingId ? "ویرایش پرسش" : "پرسش جدید"}
        </h3>
        <div className="mt-4 space-y-3">
          <Field label="پرسش" htmlFor="faq-question" required>
            <Input
              id="faq-question"
              value={form.question}
              onChange={(event) => setForm({ ...form, question: event.target.value })}
            />
          </Field>
          <Field label="پاسخ" htmlFor="faq-answer" required>
            <Textarea
              id="faq-answer"
              rows={5}
              value={form.answer}
              onChange={(event) => setForm({ ...form, answer: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ترتیب" htmlFor="faq-order">
              <Input
                id="faq-order"
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
              نمایش عمومی
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              {editingId ? "ذخیره" : "ایجاد"}
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
