import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, PlusCircle, Search } from "lucide-react";
import { api, queryString } from "../lib/api";
import type { Paginated, RequestStatus, RequestSummary } from "../lib/types";
import { formatDate, requestStatuses, statusMeta, toPersianDigits } from "../lib/format";
import { useAuth } from "../lib/auth-context";
import { PanelLayout } from "../components/Layout";
import { RequestStatusBadge } from "../components/RequestStatusBadge";
import { Seo } from "../components/Seo";
import { Alert, Button, EmptyState, Input, Select, Skeleton } from "../components/ui";

const highlightStatuses: RequestStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEED_MORE_INFO",
  "IN_PROGRESS",
  "COMPLETED",
];

export function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as RequestStatus | "";
  const page = Number(params.get("page") ?? 1);
  const queryParam = params.get("q") ?? "";
  const [term, setTerm] = useState(queryParam);
  const [syncedQuery, setSyncedQuery] = useState(queryParam);

  // Adjusting state during render (React's recommended replacement for a
  // syncing effect): the input follows the URL, including back/forward.
  if (queryParam !== syncedQuery) {
    setSyncedQuery(queryParam);
    setTerm(queryParam);
  }

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

  const { data, isPending, isError } = useQuery({
    queryKey: ["my-requests", { status, page, q: queryParam }],
    queryFn: () =>
      api.get<Paginated<RequestSummary> & { items: RequestSummary[] }>(
        `/requests${queryString({ status, page, q: queryParam })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const summary = data?.meta.summary;
  const total = summary ? Object.values(summary).reduce((sum, value) => sum + value, 0) : 0;

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
    <PanelLayout
      title={`سلام ${user?.fullName ?? ""}`}
      description="خلاصه پرونده‌ها و وضعیت رسیدگی داخلی درخواست‌های شما."
    >
      <Seo title="پرونده‌های من" description="داشبورد مشتری برای پیگیری درخواست‌های ترخیص." noindex />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => updateParam("status", "")}
          className={`flex flex-col justify-start rounded-xl border p-4 text-start transition ${
            status === "" ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-200"
          }`}
        >
          <p className="text-xs text-slate-500">همه پرونده‌ها</p>
          <p className="num mt-2 text-2xl font-bold text-brand-900">{toPersianDigits(total)}</p>
        </button>
        {highlightStatuses.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => updateParam("status", item)}
            className={`flex flex-col justify-start rounded-xl border p-4 text-start transition ${
              status === item ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-200"
            }`}
          >
            <p className="text-xs text-slate-500">{statusMeta[item].label}</p>
            <p className="num mt-2 text-2xl font-bold text-brand-900">
              {toPersianDigits(summary?.[item] ?? 0)}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <div className="relative grow">
          <Search className="pointer-events-none absolute end-3 top-3.5 size-4 text-slate-600" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجو در شناسه پیگیری یا شرح کالا…"
            aria-label="جست‌وجو در پرونده‌ها"
            className="pe-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => updateParam("status", event.target.value)}
          aria-label="فیلتر وضعیت"
          className="md:w-52"
        >
          <option value="">همه وضعیت‌ها</option>
          {requestStatuses.map((item) => (
            <option key={item} value={item}>{statusMeta[item].label}</option>
          ))}
        </Select>
        <Link to="/requests/new" className="shrink-0">
          <Button className="w-full md:w-auto">
            <PlusCircle className="size-4" aria-hidden />
            درخواست جدید
          </Button>
        </Link>
      </div>

      {isError ? (
        <Alert tone="error" className="mt-5">
          دریافت پرونده‌ها انجام نشد. اتصال به سرور را بررسی کنید.
        </Alert>
      ) : null}

      <div className="mt-5 space-y-3">
        {isPending
          ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)
          : null}

        {data?.items.map((request) => (
          <Link
            key={request.id}
            to={`/dashboard/requests/${request.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:border-brand-300 md:p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {request.trackingCode}
                  </span>
                  <RequestStatusBadge status={request.status} />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-brand-900">{request.goodsDescription}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span>ثبت: {formatDate(request.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" aria-hidden />
                    {toPersianDigits(request._count?.documents ?? 0)} مدرک
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3.5" aria-hidden />
                    {toPersianDigits(request._count?.comments ?? 0)} پیام
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-brand-700">مشاهده جزئیات ←</span>
            </div>
          </Link>
        ))}
      </div>

      {!isPending && !isError && data?.items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={<FileText className="size-12" aria-hidden />}
            title={status || queryParam ? "پرونده‌ای با این فیلتر پیدا نشد." : "هنوز درخواستی ثبت نکرده‌اید."}
            description={
              status || queryParam
                ? "فیلتر یا عبارت جست‌وجو را تغییر دهید."
                : "برای شروع، اطلاعات محموله خود را در فرم ثبت درخواست وارد کنید."
            }
            action={
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
              >
                <PlusCircle className="size-4" aria-hidden />
                ثبت اولین درخواست
              </Link>
            }
          />
        </div>
      ) : null}

      {data && data.meta.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="صفحه‌بندی پرونده‌ها">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))}>
            صفحه قبل
          </Button>
          <span className="text-xs text-slate-600">
            صفحه {toPersianDigits(page)} از {toPersianDigits(data.meta.totalPages)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            صفحه بعد
          </Button>
        </nav>
      ) : null}
    </PanelLayout>
  );
}
