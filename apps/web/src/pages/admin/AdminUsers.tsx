import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, ApiError, queryString } from "../../lib/api";
import type { AdminUser, Paginated, Role } from "../../lib/types";
import { formatDate, roleLabels, toPersianDigits } from "../../lib/format";
import { useAuth } from "../../lib/auth-context";
import { PanelLayout } from "../../components/Layout";
import { Seo } from "../../components/Seo";
import { Alert, Button, EmptyState, Input, Select, Skeleton } from "../../components/ui";

const roles: Role[] = ["CUSTOMER", "EXPERT", "ADMIN"];

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<"" | Role>("");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [queryParam, setQueryParam] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryParam(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  const list = useQuery({
    queryKey: ["admin-users", { role, page, q: queryParam }],
    queryFn: () =>
      api.get<Paginated<AdminUser>>(`/admin/users${queryString({ role, page, q: queryParam })}`),
  });

  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { role?: Role; isActive?: boolean } }) =>
      api.patch(`/admin/users/${id}`, changes),
    onSuccess: () => {
      setNotice("اطلاعات کاربر به‌روزرسانی شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <PanelLayout title="کاربران و نقش‌ها" description="مدیریت نقش مشتری، کارشناس و مدیر و فعال/غیرفعال کردن حساب‌ها.">
      <Seo title="مدیریت کاربران" description="پنل مدیریت کاربران." noindex />

      {notice ? <Alert tone="success" className="mb-4">{notice}</Alert> : null}
      {update.isError ? (
        <Alert tone="error" className="mb-4">
          {update.error instanceof ApiError ? update.error.message : "به‌روزرسانی انجام نشد."}
        </Alert>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-3.5 size-4 text-slate-600" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجو در نام، موبایل یا ایمیل…"
            className="pe-9"
            aria-label="جست‌وجو در کاربران"
          />
        </div>
        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as "" | Role);
            setPage(1);
          }}
          aria-label="فیلتر نقش"
        >
          <option value="">همه نقش‌ها</option>
          {roles.map((item) => (
            <option key={item} value={item}>{roleLabels[item]}</option>
          ))}
        </Select>
      </div>

      {list.isPending ? <Skeleton className="mt-4 h-40 rounded-2xl" /> : null}
      {list.isError ? <Alert tone="error" className="mt-4">دریافت کاربران انجام نشد.</Alert> : null}

      {list.data ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">کاربر</th>
                  <th className="px-4 py-3 text-start font-medium">تماس</th>
                  <th className="px-4 py-3 text-start font-medium">پرونده‌ها</th>
                  <th className="px-4 py-3 text-start font-medium">نقش</th>
                  <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-start font-medium">عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-800">{item.fullName}</span>
                      <span className="num mt-0.5 block text-[11px] text-slate-600">{item.mobile}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">{item.email ?? "—"}</td>
                    <td className="num px-4 py-3 text-slate-600">
                      {toPersianDigits(item._count?.requests ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.role}
                        disabled={item.id === currentUser?.id}
                        onChange={(event) =>
                          update.mutate({ id: item.id, changes: { role: event.target.value as Role } })
                        }
                        className="w-auto py-1 text-[11px]"
                        aria-label={`نقش ${item.fullName}`}
                      >
                        {roles.map((roleItem) => (
                          <option key={roleItem} value={roleItem}>{roleLabels[roleItem]}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={item.id === currentUser?.id}
                        onClick={() => update.mutate({ id: item.id, changes: { isActive: !item.isActive } })}
                        className={`rounded-full px-2.5 py-1 text-[11px] disabled:opacity-50 ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.isActive ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.items.length === 0 ? (
            <div className="p-4">
              <EmptyState title="کاربری با این مشخصات پیدا نشد." />
            </div>
          ) : null}
          {list.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 p-3">
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
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-[11px] leading-5 text-slate-600">
        تغییر نقش و وضعیت کاربران در گزارش ممیزی ثبت می‌شود. امکان غیرفعال‌سازی یا تغییر نقش حساب
        خودتان وجود ندارد.
      </p>
    </PanelLayout>
  );
}
