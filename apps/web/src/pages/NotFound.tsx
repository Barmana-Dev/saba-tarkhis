import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Seo } from "../components/Seo";
import { EmptyState } from "../components/ui";

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <Seo title="صفحه یافت نشد" description="این صفحه در سایت وجود ندارد." noindex />
      <EmptyState
        icon={<Compass className="size-14" aria-hidden />}
        title="صفحه موردنظر پیدا نشد."
        description="ممکن است نشانی تغییر کرده باشد یا صفحه حذف شده باشد."
        action={
          <Link to="/" className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white">
            بازگشت به صفحه اصلی
          </Link>
        }
      />
    </div>
  );
}
