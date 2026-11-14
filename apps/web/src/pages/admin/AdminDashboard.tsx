import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Inbox, Search, Users } from "lucide-react";
import { api, queryString } from "../../lib/api";
import type { AdminStats, Paginated, RequestStatus, RequestSummary } from "../../lib/types";
import {
  formatDate,
  procedureLabels,
  requestStatuses,
  statusMeta,
  toPersianDigits,
} from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { PanelLayout } from "../../components/Layout";
import { RequestStatusBadge } from "../../components/RequestStatusBadge";
import { PersianDatePicker } from "../../components/PersianDatePicker";
import { Seo } from "../../components/Seo";
import { Alert, Button, EmptyState, Input, Select, Skeleton } from "../../components/ui";

export function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as RequestStatus | "";
  const page = Number(params.get("page") ?? 1);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const queryParam = params.get("q") ?? "";
  const [term, setTerm] = useState(queryParam);

  useEffect(() => setTerm(queryParam), [queryParam]);

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

  const stats = useQuery({
    queryKey: ["admin-stats", { from, to }],
    queryFn: () => api.get<AdminStats>(`/admin/stats${queryString({ from, to })}`),
    enabled: isAdmin,
  });

  const list = useQuery({
    queryKey: ["admin-requests", { status, page, q: queryParam, from, to }],
    queryFn: () =>
      api.get<Paginated<RequestSummary>>(
        `/admin/requests${queryString({ status, page, q: queryParam, from, to })}`,
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

  const summary = list.data?.meta.summary;

  return (
    <PanelLayout
      title="داشبورد پرونده‌ها"
      description={
        isAdmin
          ? "مدیریت درخواست‌های ترخیص، تخصیص کارشناس و پیگیری وضعیت رسیدگی داخلی."
          : "پرونده‌های تخصیص‌یافته به شما. برای مشاهده پرونده جدید، با مدیر هماهنگ کنید."
      }
    >
      <Seo title="داشبورد مدیریت پرونده‌ها" description="پنل مدیریت درخواست‌های ترخیص." noindex />

      {isAdmin ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.isPending ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)
          ) : null}
          {stats.data ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Inbox className="size-3.5" aria-hidden />
                  کل پرونده‌ها
                </p>
                <p className="num mt-2 text-2xl font-bold text-brand-900">
                  {toPersianDigits(stats.data.totals.requests)}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  در بازه انتخابی: {toPersianDigits(stats.data.totals.requestsInRange)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateParam("status", "SUBMITTED")}
                className="flex flex-col justify-start rounded-xl border border-slate-200 bg-white p-4 shadow-card text-start hover:border-amber-300"
              >
                <p className="text-xs text-slate-500">در انتظار بررسی</p>
                <p className="num mt-2 text-2xl font-bold text-amber-700">
                  {toPersianDigits(stats.data.byStatus.SUBMITTED)}
                </p>
              </button>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="size-3.5" aria-hidden />
                  کاربران جدید بازه
                </p>
                <p className="num mt-2 text-2xl font-bold text-brand-900">
                  {toPersianDigits(stats.data.totals.newUsersInRange)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="text-xs text-slate-500">پیام‌های تماس</p>
                <p className="num mt-2 text-2xl font-bold text-brand-900">
                  {toPersianDigits(stats.data.totals.contactMessages)}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  جدید: {toPersianDigits(stats.data.totals.contactByStatus.NEW ?? 0)}
                </p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {stats.isError ? (
        <Alert tone="error" className="mt-4">دریافت آمار انجام نشد.</Alert>
      ) : null}

      <div className="mt-5 grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute end-3 top-3.5 size-4 text-slate-600" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجو در شناسه، شرح کالا، نام یا موبایل مشتری…"
            aria-label="جست‌وجو در پرونده‌ها"
            className="pe-9"
          />
        </div>
        <Select value={status} onChange={(event) => updateParam("status", event.target.value)} aria-label="فیلتر وضعیت">
          <option value="">همه وضعیت‌ها</option>
          {requestStatuses.map((item) => (
            <option key={item} value={item}>{statusMeta[item].label}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-slate-500" htmlFor="admin-filter-from">
              از تاریخ
            </label>
            <PersianDatePicker
              id="admin-filter-from"
              value={from}
              onChange={(value) => updateParam("from", value)}
              ariaLabel="از تاریخ (تقویم شمسی)"
              className="mt-1 px-2 py-1.5 text-[11px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500" htmlFor="admin-filter-to">
              تا تاریخ
            </label>
            <PersianDatePicker
              id="admin-filter-to"
              value={to}
              onChange={(value) => updateParam("to", value)}
              ariaLabel="تا تاریخ (تقویم شمسی)"
              className="mt-1 px-2 py-1.5 text-[11px]"
            />
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {requestStatuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => updateParam("status", status === item ? "" : item)}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                status === item ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-600"
              }`}
              aria-pressed={status === item}
            >
              {statusMeta[item].label} ({toPersianDigits(summary[item] ?? 0)})
            </button>
          ))}
        </div>
      ) : null}

      {list.isError ? (
        <Alert tone="error" className="mt-4">دریافت فهرست پرونده‌ها انجام نشد.</Alert>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">شناسه پیگیری</th>
                <th className="px-4 py-3 text-start font-medium">مشتری</th>
                <th className="px-4 py-3 text-start font-medium">کالا / رویه</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">کارشناس</th>
                <th className="px-4 py-3 text-start font-medium">ثبت</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.isPending
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className="px-4 py-4">
                        <Skeleton className="h-5" />
                      </td>
                    </tr>
                  ))
                : null}
              {list.data?.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="num px-4 py-3 text-slate-700">{item.trackingCode}</td>
                  <td className="px-4 py-3">
                    <span className="block text-slate-800">{item.user?.fullName}</span>
                    <span className="num mt-0.5 block text-[11px] text-slate-600">{item.user?.mobile}</span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <span className="block truncate text-slate-800">{item.goodsDescription}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-600">
                      {procedureLabels[item.procedureType] ?? item.procedureType}
                    </span>
                  </td>
                  <td className="px-4 py-3"><RequestStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.assignedExpert?.fullName ?? <span className="text-slate-600">تخصیص‌نیافته</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-end">
                    <Link to={`/admin/requests/${item.id}`} className="font-medium text-brand-700 hover:underline">
                      بررسی
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!list.isPending && list.data?.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="پرونده‌ای با این فیلتر پیدا نشد."
              description="فیلترها یا بازه تاریخ را تغییر دهید."
            />
          </div>
        ) : null}
      </div>

      {list.data && list.data.meta.totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="صفحه‌بندی پرونده‌ها">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))}>
            صفحه قبل
          </Button>
          <span className="text-xs text-slate-600">
            صفحه {toPersianDigits(page)} از {toPersianDigits(list.data.meta.totalPages)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= list.data.meta.totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            صفحه بعد
          </Button>
        </nav>
      ) : null}
    </PanelLayout>
  );
}
