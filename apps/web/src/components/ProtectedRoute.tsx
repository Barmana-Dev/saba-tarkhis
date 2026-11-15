import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import type { Role } from "../lib/types";
import { EmptyState, Spinner } from "./ui";
import { Seo } from "./Seo";

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <Spinner label="در حال بررسی وضعیت ورود…" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Seo title="دسترسی غیرمجاز" description="این صفحه برای نقش حساب شما در دسترس نیست." noindex />
        <EmptyState
          icon={<ShieldAlert className="size-12" aria-hidden />}
          title="این صفحه برای حساب شما در دسترس نیست."
          description="برای مشاهده این بخش باید با نقش مناسب وارد شوید. اگر فکر می‌کنید اشتباهی رخ داده، با مدیر سامانه تماس بگیرید."
          action={
            <Link to="/" className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white">
              بازگشت به صفحه اصلی
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
