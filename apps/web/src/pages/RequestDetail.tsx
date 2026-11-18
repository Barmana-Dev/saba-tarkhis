import { useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  MessageSquarePlus,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { api, ApiError, apiUrl } from "../lib/api";
import type { ClearanceRequest } from "../lib/types";
import {
  currencyLabels,
  documentScanNotice,
  formatBytes,
  formatDate,
  formatDateTime,
  procedureLabels,
  transportLabels,
} from "../lib/format";
import { PanelLayout } from "../components/Layout";
import { caseTimeline, nextStep } from "../lib/caseFlow";
import { RequestStatusBadge } from "../components/RequestStatusBadge";
import { Seo } from "../components/Seo";
import { Alert, Button, Skeleton, Textarea } from "../components/ui";

export function RequestDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const createdState = location.state as { created?: boolean; trackingCode?: string } | null;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["request", id],
    queryFn: () => api.get<ClearanceRequest>(`/requests/${id}`),
    enabled: Boolean(id),
    retry: false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload(`/requests/${id}/documents`, formData);
    },
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    },
    onError: (mutationError) => {
      setUploadError(
        mutationError instanceof ApiError ? mutationError.message : "بارگذاری مدرک انجام نشد.",
      );
    },
  });

  const addComment = useMutation({
    mutationFn: (body: string) => api.post(`/requests/${id}/comments`, { body }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setUploadError("فقط فایل‌های PDF، JPG و PNG مجاز هستند.");
      return;
    }
    upload.mutate(file);
    if (fileInput.current) fileInput.current.value = "";
  }

  if (isPending) {
    return (
      <PanelLayout title="جزئیات پرونده">
        <Skeleton className="h-40 rounded-2xl" />
      </PanelLayout>
    );
  }

  if (isError || !data) {
    return (
      <PanelLayout title="جزئیات پرونده">
        <Alert tone="error">
          {error instanceof ApiError ? error.message : "دریافت پرونده انجام نشد."}
        </Alert>
        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-700">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به پرونده‌ها
        </Link>
      </PanelLayout>
    );
  }

  const facts: [string, string][] = [
    ["نوع متقاضی", data.applicantType === "COMPANY" ? "شخص حقوقی / شرکت" : "شخص حقیقی"],
    ["نام متقاضی", data.applicantName || data.customer?.fullName || "—"],
    ["رویه", procedureLabels[data.procedureType] ?? data.procedureType],
    ["روش حمل", transportLabels[data.transportMode] ?? data.transportMode],
    ["کشور مبدأ", data.originCountry || "—"],
    ["کشور مقصد", data.destinationCountry || "—"],
    ["گمرک / بندر", data.customsLocation || "—"],
    ["دسته کالا", data.category || "—"],
    ["کد تعرفه", data.hsCode || "—"],
    ["مقدار", [data.quantity, data.quantityUnit].filter(Boolean).join(" ") || "—"],
    [
      "ارزش تقریبی",
      data.estimatedValue ? `${data.estimatedValue} ${currencyLabels[data.currency ?? ""] ?? ""}` : "—",
    ],
    ["شناسه پیگیری", data.trackingCode],
  ];

  return (
    <PanelLayout title="جزئیات پرونده" description="اطلاعات، مدارک، پیام‌ها و تاریخچه رسیدگی داخلی.">
      <Seo title={`پرونده ${data.trackingCode}`} description="جزئیات درخواست ترخیص." noindex />

      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
        <ArrowRight className="size-4" aria-hidden />
        بازگشت به پرونده‌های من
      </Link>

      {createdState?.created ? (
        <Alert tone="success" className="mb-5">
          <span className="flex flex-col gap-1">
            <span className="font-semibold">درخواست شما با موفقیت ثبت شد.</span>
            <span>
              شناسه پیگیری داخلی: <span className="num font-bold">{data.trackingCode}</span>
            </span>
            <span className="text-xs">
              این شناسه، شماره رسمی گمرکی یا کوتاژ نیست و فقط برای پیگیری در صبا ترخیص استفاده می‌شود.
            </span>
          </span>
        </Alert>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="num text-xs text-slate-500">{data.trackingCode}</p>
            <h2 className="mt-1 text-lg font-bold text-brand-900 [overflow-wrap:anywhere]">{data.goodsDescription}</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              ثبت: {formatDateTime(data.createdAt)} · آخرین بروزرسانی: {formatDateTime(data.updatedAt)}
            </p>
          </div>
          <RequestStatusBadge status={data.status} />
        </div>

        {data.quoteNote ? (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-xs font-semibold text-indigo-900">پیشنهاد خدمات (غیررسمی)</p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-7 text-indigo-900/90 [overflow-wrap:anywhere]">{data.quoteNote}</p>
            <p className="mt-2 text-[11px] text-indigo-700/80">
              این متن برآورد هماهنگی است و مبنای رسمی محاسبه حقوق گمرکی نیست.
            </p>
          </div>
        ) : null}

        <dl className="mt-5 grid gap-4 text-sm [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-[13px] text-slate-800 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>

        {data.cargoStatus || data.notes ? (
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-600 [&>*]:min-w-0 sm:grid-cols-2">
            {data.cargoStatus ? (
              <div>
                <p className="font-medium text-slate-700">وضعیت فعلی کالا</p>
                <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{data.cargoStatus}</p>
              </div>
            ) : null}
            {data.notes ? (
              <div>
                <p className="font-medium text-slate-700">توضیحات شما</p>
                <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{data.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {(() => {
        const step = nextStep(data.status, { hasDocuments: data.documents.length > 0 });
        const timeline = caseTimeline(
          data.status,
          data.statusHistory.map((entry) => entry.toStatus),
        );
        return (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
              <CheckCircle2 className="size-4 text-accent-600" aria-hidden />
              مسیر پرونده
            </h2>

            <ol className="mt-4 grid gap-2 sm:grid-cols-5" aria-label="مراحل رسیدگی">
              {timeline.map((item) => (
                <li
                  key={item.status}
                  className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                    item.state === "current"
                      ? "border-brand-300 bg-brand-50 text-brand-900 font-semibold"
                      : item.state === "done"
                        ? "border-emerald-100 bg-emerald-50/60 text-emerald-900"
                        : "border-slate-200 bg-slate-50/60 text-slate-500"
                  }`}
                >
                  {item.label}
                </li>
              ))}
            </ol>

            <div
              className={`mt-4 rounded-xl border p-4 ${
                step.needsYourAction
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-brand-100 bg-brand-50/50"
              }`}
            >
              <p className="text-xs font-semibold text-brand-900">قدم بعدی: {step.title}</p>
              <p className="mt-1 text-[12px] leading-6 text-slate-700">{step.detail}</p>
              <p className="mt-2 text-[11px] text-slate-600">
                منتظر اقدام: <span className="font-semibold">{step.waitingOn}</span>
              </p>
            </div>
          </section>
        );
      })()}

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <CheckCircle2 className="size-4 text-accent-600" aria-hidden />
            تاریخچه رسیدگی
          </h2>
          <ol className="mt-4 space-y-4">
            {data.statusHistory.map((entry) => (
              <li key={entry.id} className="relative border-s-2 border-brand-100 ps-4">
                <span className="absolute -start-[5px] top-1.5 size-2 rounded-full bg-brand-500" aria-hidden />
                <p className="text-xs font-semibold text-brand-900">{entry.toStatusLabel}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{formatDateTime(entry.createdAt)}</p>
                {entry.reason ? <p className="mt-1 text-[11px] leading-5 text-slate-600 [overflow-wrap:anywhere]">{entry.reason}</p> : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
            این تاریخچه، روند رسیدگی داخلی شرکت است و رویداد رسمی گمرکی محسوب نمی‌شود.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <FileText className="size-4 text-accent-600" aria-hidden />
            مدارک پرونده
          </h2>
          {data.documents.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">هنوز مدرکی برای این پرونده بارگذاری نشده است.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-slate-700">{document.fileName}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-600">
                      {formatBytes(document.fileSize)} · {formatDate(document.createdAt)}
                    </span>
                  </span>
                  {document.canDownload && document.downloadUrl ? (
                    <a
                      href={apiUrl(document.downloadUrl)}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-brand-700 hover:bg-brand-50"
                    >
                      <Download className="size-3.5" aria-hidden />
                      دریافت
                    </a>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                      <ShieldAlert className="size-3.5" aria-hidden />
                      {documentScanNotice(document.scanStatus)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="sr-only"
              id="supplementary-file"
              aria-label="انتخاب فایل مدرک تکمیلی"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              بارگذاری مدرک تکمیلی
            </Button>
            <p className="mt-2 text-[11px] text-slate-600">PDF، JPG یا PNG تا ۵ مگابایت.</p>
            {uploadError ? <p className="mt-1 text-xs text-rose-600">{uploadError}</p> : null}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
          <MessageSquarePlus className="size-4 text-accent-600" aria-hidden />
          پیام‌ها
        </h2>

        {data.comments.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">هنوز پیامی ثبت نشده است.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.comments.map((item) => {
              const fromStaff = item.author.role !== "CUSTOMER";
              return (
                <li
                  key={item.id}
                  className={`rounded-xl border p-3.5 ${
                    fromStaff ? "border-brand-100 bg-brand-50/40" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 [overflow-wrap:anywhere]">
                      {item.author.fullName}
                      <span className="ms-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-normal text-slate-500">
                        {fromStaff ? "کارشناس صبا ترخیص" : "شما"}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-xs leading-7 text-slate-700 [overflow-wrap:anywhere]">{item.body}</p>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-4 border-t border-slate-100 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (comment.trim().length >= 2) addComment.mutate(comment.trim());
          }}
        >
          <label htmlFor="comment" className="text-xs font-medium text-slate-700">
            ارسال توضیح یا پاسخ
          </label>
          <Textarea
            id="comment"
            className="mt-1.5"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="پاسخ یا توضیح خود را بنویسید…"
          />
          {addComment.isError ? (
            <p className="mt-1 text-xs text-rose-600">
              {addComment.error instanceof ApiError ? addComment.error.message : "ارسال پیام انجام نشد."}
            </p>
          ) : null}
          <Button type="submit" size="sm" className="mt-3" loading={addComment.isPending} disabled={comment.trim().length < 2}>
            ارسال پیام
          </Button>
        </form>
      </section>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-5 text-slate-500">
        <ShieldAlert className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
        وضعیت این پرونده، وضعیت رسیدگی داخلی صبا ترخیص است و معادل وضعیت رسمی در سامانه‌های گمرکی
        نیست. مدارک شما فقط برای همان پرونده و حساب کاربری شما قابل دسترسی است.
      </div>
    </PanelLayout>
  );
}
