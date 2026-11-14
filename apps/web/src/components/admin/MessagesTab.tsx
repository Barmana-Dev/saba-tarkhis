import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, queryString } from "../../lib/api";
import type { ContactMessage, Paginated } from "../../lib/types";
import { contactStatusLabels, formatDateTime, toPersianDigits } from "../../lib/format";
import { Alert, Button, Select } from "../ui";

const statuses = ["NEW", "IN_PROGRESS", "RESOLVED"] as const;

export function MessagesTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"" | (typeof statuses)[number]>("NEW");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-messages", { status, page }],
    queryFn: () =>
      api.get<Paginated<ContactMessage>>(
        `/admin/contact-messages${queryString({ status, page, pageSize: 10 })}`,
      ),
  });

  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: (typeof statuses)[number] }) =>
      api.patch(`/admin/contact-messages/${id}`, { status: next }),
    onSuccess: () => {
      setNotice("وضعیت پیام به‌روزرسانی شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as "" | (typeof statuses)[number]);
            setPage(1);
          }}
          className="w-auto py-2 text-xs"
          aria-label="فیلتر وضعیت پیام"
        >
          <option value="">همه پیام‌ها</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{contactStatusLabels[item]}</option>
          ))}
        </Select>
        <p className="text-xs text-slate-500">
          مجموع: {toPersianDigits(list.data?.meta.total ?? 0)}
        </p>
      </div>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {update.isError ? (
        <Alert tone="error">
          {update.error instanceof ApiError ? update.error.message : "به‌روزرسانی انجام نشد."}
        </Alert>
      ) : null}

      <div className="space-y-3">
        {list.data?.items.map((message) => (
          <article key={message.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-brand-900">{message.subject}</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {message.name} · <span className="num">{message.mobile}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600">{formatDateTime(message.createdAt)}</span>
                <Select
                  value={message.status}
                  onChange={(event) =>
                    update.mutate({ id: message.id, next: event.target.value as (typeof statuses)[number] })
                  }
                  className="w-auto py-1 text-[11px]"
                  aria-label="وضعیت پیام"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>{contactStatusLabels[item]}</option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line text-xs leading-7 text-slate-600">{message.message}</p>
          </article>
        ))}
        {list.isPending ? <p className="text-xs text-slate-500">در حال بارگذاری…</p> : null}
        {list.data?.items.length === 0 ? <p className="text-xs text-slate-500">پیامی در این وضعیت نیست.</p> : null}
      </div>

      {list.data && list.data.meta.totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-3" aria-label="صفحه‌بندی پیام‌ها">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            صفحه قبل
          </Button>
          <span className="text-xs text-slate-600">
            {toPersianDigits(page)} از {toPersianDigits(list.data.meta.totalPages)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= list.data.meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            صفحه بعد
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
