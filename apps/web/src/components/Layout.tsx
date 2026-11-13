import { type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { FileText, LayoutDashboard, PlusCircle, UserRound, Users } from "lucide-react";
import { useAuth } from "../lib/auth";
import { cn } from "./ui";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        رفتن به محتوای اصلی
      </a>
      <Header />
      <main id="main" className="grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

const customerNav = [
  { to: "/dashboard", label: "پرونده‌های من", icon: LayoutDashboard, end: true },
  { to: "/requests/new", label: "ثبت درخواست جدید", icon: PlusCircle },
  { to: "/dashboard/profile", label: "مشخصات حساب", icon: UserRound },
];

const staffNav = [
  { to: "/admin", label: "داشبورد پرونده‌ها", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "کاربران و نقش‌ها", icon: Users, adminOnly: true },
  { to: "/admin/content", label: "مدیریت محتوا", icon: FileText, adminOnly: true },
];

export function PanelLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  const { user } = useAuth();
  const items = user?.role === "CUSTOMER" ? customerNav : staffNav;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
              <div className="border-b border-slate-100 px-3 pb-3">
                <p className="text-xs text-slate-500">حساب کاربری</p>
                <p className="mt-1 truncate text-sm font-semibold text-brand-900">{user?.fullName}</p>
                <p className="num mt-0.5 text-[11px] text-slate-500">{user?.mobile}</p>
              </div>
              <nav className="mt-2 grid gap-1" aria-label="ناوبری پنل">
                {items
                  .filter((item) => !("adminOnly" in item && item.adminOnly) || user?.role === "ADMIN")
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={"end" in item ? item.end : false}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-800"
                              : "text-slate-600 hover:bg-slate-50 hover:text-brand-800",
                          )
                        }
                      >
                        <Icon className="size-4" aria-hidden />
                        {item.label}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-brand-900">{title}</h1>
              {description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              ) : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function StaffOnlyNotice() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
      این بخش فقط برای مدیران سامانه در دسترس است.{" "}
      <Link to="/admin" className="text-brand-700 underline">
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
