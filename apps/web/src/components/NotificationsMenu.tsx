import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { NotificationFeed, NotificationItem } from "../lib/types";

/**
 * In-panel messages for the signed-in customer. This is the in-app half of the
 * "notify on status change" requirement; no SMS/email provider is connected, so
 * the case page and this menu are the delivery channel.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationFeed>("/notifications"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  async function markAllRead() {
    await api.post("/notifications/read-all", {});
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.readAt) {
      await api.post(`/notifications/${item.id}/read`, {}).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (item.requestId) navigate(`/dashboard/requests/${item.requestId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-800"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `اعلان‌ها، ${unread} خوانده‌نشده` : "اعلان‌ها"}
      >
        <Bell className="size-4" aria-hidden />
        اعلان‌ها
        {unread > 0 ? (
          <span className="num -me-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-brand-900">اعلان‌های من</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                خواندن همه
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-500">هنوز اعلانی ندارید.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openItem(item)}
                    className="flex w-full flex-col gap-1 px-3 py-3 text-start hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      {item.readAt ? null : (
                        <span className="size-1.5 shrink-0 rounded-full bg-rose-600" aria-hidden />
                      )}
                      <span className="text-xs font-semibold text-slate-800">{item.title}</span>
                    </span>
                    {item.body ? (
                      <span className="line-clamp-2 text-[11px] leading-5 text-slate-600">{item.body}</span>
                    ) : null}
                    <span className="text-[10px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
