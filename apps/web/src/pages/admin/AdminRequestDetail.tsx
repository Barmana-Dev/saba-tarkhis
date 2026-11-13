import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, FileText, MessageSquare, ShieldAlert, UserCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { ClearanceRequest, RequestStatus } from "../../lib/types";
import {
  currencyLabels,
  formatBytes,
  formatDate,
  formatDateTime,
  procedureLabels,
  roleLabels,
  statusMeta,
  transportLabels,
} from "../../lib/format";
import { statusTransitions } from "../../lib/workflow";
import { useAuth } from "../../lib/auth";
import { PanelLayout } from "../../components/Layout";
import { RequestStatusBadge } from "../../components/RequestStatusBadge";
import { Seo } from "../../components/Seo";
import { Alert, Button, Field, Select, Skeleton, Textarea } from "../../components/ui";

export function AdminRequestDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [nextStatus, setNextStatus] = useState<RequestStatus | "">("");
  const [reason, setReason] = useState("");
  const [expertId, setExpertId] = useState<string>("");
  const [quoteNote, setQuoteNote] = useState("");
  const [markAsQuoted, setMarkAsQuoted] = useState(true);
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["admin-request", id],
    queryFn: () => api.get<ClearanceRequest>(`/admin/requests/${id}`),
    enabled: Boolean(id),
    retry: false,
  });

  const experts = useQuery({
    queryKey: ["experts"],
    queryFn: () => api.get<{ id: string; fullName: string }[]>("/admin/experts"),
    enabled: isAdmin,
  });

  function refresh(message: string) {
    setActionMessage(message);
    queryClient.invalidateQueries({ queryKey: ["admin-request", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
  }

  const changeStatus = useMutation({
    mutationFn: () =>
      api.patch(`/admin/requests/${id}/status`, {
        status: nextStatus,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      setNextStatus("");
      setReason("");
      refresh("وضعیت پرونده تغییر کرد و در تاریخچه ثبت شد.");
    },
  });

  const assign = useMutation({
    mutationFn: () => api.patch(`/admin/requests/${id}/assign`, { expertId: expertId || null }),
    onSuccess: () => refresh("تخصیص کارشناس به‌روزرسانی شد."),
  });

  const quote = useMutation({
    mutationFn: () =>
      api.patch(`/admin/requests/${id}/quote`, { quoteNote, markAsQuoted }),
    onSuccess: () => {
      setQuoteNote("");
      refresh("پیشنهاد خدمات ثبت شد.");
    },
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/requests/${id}/comments`, { body: comment, visibility }),
    onSuccess: () => {
      setComment("");
      refresh("پیام ثبت شد.");
    },
  });

  if (detail.isPending) {
    return (
      <PanelLayout title="بررسی پرونده">
        <Skeleton className="h-64 rounded-2xl" />
      </PanelLayout>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <PanelLayout title="بررسی پرونده">
        <Alert tone="error">
          {detail.error instanceof ApiError ? detail.error.message : "دریافت پرونده انجام نشد."}
        </Alert>
        <Link to="/admin" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-700">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به فهرست پرونده‌ها
        </Link>
      </PanelLayout>
    );
  }

  const data = detail.data;
  const allowed = statusTransitions[data.status];
  const mutationError = [changeStatus.error, assign.error, quote.error, addComment.error].find(
    (error) => error instanceof ApiError,
  ) as ApiError | undefined;

  return (
    <PanelLayout title={`پرونده ${data.trackingCode}`} description="بررسی اطلاعات، مدارک، پیام‌ها و تغییر وضعیت.">
      <Seo title={`مدیریت پرونده ${data.trackingCode}`} description="پنل بررسی پرونده." noindex />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به فهرست
        </Link>
        <RequestStatusBadge status={data.status} />
      </div>

      {actionMessage ? <Alert tone="success" className="mb-4">{actionMessage}</Alert> : null}
      {mutationError ? <Alert tone="error" className="mb-4">{mutationError.message}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-brand-900">{data.goodsDescription}</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["مشتری", data.customer?.fullName ?? "—"],
                ["موبایل مشتری", data.customer?.mobile ?? "—"],
                ["ایمیل مشتری", data.customer?.email ?? "—"],
                ["نوع متقاضی", data.applicantType === "COMPANY" ? "شخص حقوقی" : "شخص حقیقی"],
                ["نام متقاضی", data.applicantName || "—"],
                ["رویه", procedureLabels[data.procedureType] ?? data.procedureType],
                ["روش حمل", transportLabels[data.transportMode] ?? data.transportMode],
                ["کشور مبدأ / مقصد", `${data.originCountry || "—"} / ${data.destinationCountry || "—"}`],
                ["گمرک / بندر", data.customsLocation || "—"],
                ["دسته کالا", data.category || "—"],
                ["کد تعرفه", data.hsCode || "—"],
                ["مقدار", [data.quantity, data.quantityUnit].filter(Boolean).join(" ") || "—"],
                [
                  "ارزش تقریبی",
                  data.estimatedValue
                    ? `${data.estimatedValue} ${currencyLabels[data.currency ?? ""] ?? ""}`
                    : "—",
                ],
                ["تاریخ ثبت", formatDateTime(data.createdAt)],
                ["کارشناس", data.assignedExpert?.fullName ?? "تخصیص‌نیافته"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-[13px] text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>

            {data.cargoStatus || data.notes ? (
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-600 sm:grid-cols-2">
                {data.cargoStatus ? (
                  <div>
                    <p className="font-medium text-slate-700">وضعیت فعلی کالا</p>
                    <p className="mt-1 whitespace-pre-line">{data.cargoStatus}</p>
                  </div>
                ) : null}
                {data.notes ? (
                  <div>
                    <p className="font-medium text-slate-700">توضیحات مشتری</p>
                    <p className="mt-1 whitespace-pre-line">{data.notes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
              <FileText className="size-4 text-accent-600" aria-hidden />
              مدارک
            </h2>
            {data.documents.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">مدرکی بارگذاری نشده است.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.documents.map((document) => (
                  <li key={document.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-slate-700">{document.fileName}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {formatBytes(document.fileSize)} · {formatDate(document.createdAt)}
                      </span>
                    </span>
                    <a
                      href={document.downloadUrl}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-brand-700 hover:bg-brand-50"
                    >
                      <Download className="size-3.5" aria-hidden />
                      دریافت
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
              <MessageSquare className="size-4 text-accent-600" aria-hidden />
              پیام‌ها و یادداشت‌ها
            </h2>
            <ul className="mt-4 space-y-3">
              {data.comments.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-xl border p-3.5 ${
                    item.visibility === "INTERNAL" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      {item.author.fullName}
                      <span className="ms-2 text-[11px] font-normal text-slate-500">
                        {roleLabels[item.author.role]}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          item.visibility === "INTERNAL"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.visibility === "INTERNAL" ? "یادداشت داخلی" : "قابل مشاهده مشتری"}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-xs leading-7 text-slate-700">{item.body}</p>
                </li>
              ))}
              {data.comments.length === 0 ? (
                <li className="text-xs text-slate-500">هنوز پیامی ثبت نشده است.</li>
              ) : null}
            </ul>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <label htmlFor="staff-comment" className="text-xs font-medium text-slate-700">افزودن پیام</label>
              <Textarea
                id="staff-comment"
                className="mt-1.5"
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="پیام قابل مشاهده مشتری یا یادداشت داخلی…"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as "PUBLIC" | "INTERNAL")}
                  className="w-auto py-1.5 text-xs"
                  aria-label="سطح دسترسی پیام"
                >
                  <option value="PUBLIC">قابل مشاهده برای مشتری</option>
                  <option value="INTERNAL">یادداشت داخلی</option>
                </Select>
                <Button
                  size="sm"
                  disabled={comment.trim().length < 2}
                  loading={addComment.isPending}
                  onClick={() => addComment.mutate()}
                >
                  ثبت پیام
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-brand-900">تاریخچه وضعیت</h2>
            <ol className="mt-3 space-y-3">
              {data.statusHistory.map((entry) => (
                <li key={entry.id} className="relative border-s-2 border-brand-100 ps-4 text-xs">
                  <span className="absolute -start-[5px] top-1.5 size-2 rounded-full bg-brand-500" aria-hidden />
                  <p className="font-semibold text-brand-900">{entry.toStatusLabel}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {entry.changedBy.fullName} · {formatDateTime(entry.createdAt)}
                  </p>
                  {entry.reason ? <p className="mt-1 leading-5 text-slate-600">{entry.reason}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-brand-900">تغییر وضعیت</h2>
            {allowed.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">این پرونده در وضعیت پایانی است و تغییر وضعیت ندارد.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <Field label="وضعیت جدید" htmlFor="next-status" required>
                  <Select
                    id="next-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as RequestStatus)}
                  >
                    <option value="">انتخاب کنید…</option>
                    {allowed.map((item) => (
                      <option key={item} value={item}>{statusMeta[item].label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="توضیح تغییر (اختیاری)" htmlFor="status-reason">
                  <Textarea
                    id="status-reason"
                    rows={2}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="دلیل یا توضیح برای مشتری…"
                  />
                </Field>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!nextStatus}
                  loading={changeStatus.isPending}
                  onClick={() => changeStatus.mutate()}
                >
                  ثبت تغییر وضعیت
                </Button>
              </div>
            )}
          </section>

          {isAdmin ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
                <UserCheck className="size-4 text-accent-600" aria-hidden />
                تخصیص کارشناس
              </h2>
              <Select
                className="mt-3"
                value={expertId || data.assignedExpertId || ""}
                onChange={(event) => setExpertId(event.target.value)}
                aria-label="انتخاب کارشناس"
              >
                <option value="">بدون کارشناس</option>
                {experts.data?.map((expert) => (
                  <option key={expert.id} value={expert.id}>{expert.fullName}</option>
                ))}
              </Select>
              <Button size="sm" className="mt-3 w-full" loading={assign.isPending} onClick={() => assign.mutate()}>
                ذخیره تخصیص
              </Button>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-brand-900">ثبت پیشنهاد خدمات</h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              این متن غیررسمی است و مبنای محاسبه حقوق گمرکی نیست.
            </p>
            <Textarea
              className="mt-3"
              rows={4}
              value={quoteNote}
              onChange={(event) => setQuoteNote(event.target.value)}
              placeholder="برآورد اولیه خدمات، مدارک لازم، شرایط هماهنگی…"
              aria-label="متن پیشنهاد خدمات"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={markAsQuoted}
                onChange={(event) => setMarkAsQuoted(event.target.checked)}
                className="size-4 accent-brand-700"
              />
              وضعیت به «پیشنهاد ارائه‌شده» تغییر کند
            </label>
            <Button
              size="sm"
              className="mt-3 w-full"
              loading={quote.isPending}
              disabled={quoteNote.trim().length < 3}
              onClick={() => quote.mutate()}
            >
              ثبت پیشنهاد
            </Button>
            {data.quoteNote ? (
              <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-[11px] leading-6 text-indigo-900">
                <p className="font-medium">پیشنهاد فعلی:</p>
                <p className="mt-1 whitespace-pre-line">{data.quoteNote}</p>
              </div>
            ) : null}
          </section>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-5 text-slate-500">
            <ShieldAlert className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
            تمام تغییرهای وضعیت، تخصیص و نقش‌ها در گزارش ممیزی ثبت می‌شود.
          </div>
        </aside>
      </div>
    </PanelLayout>
  );
}
