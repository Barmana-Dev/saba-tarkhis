import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { NotificationsMenu } from "./NotificationsMenu";
import { scrollToTop } from "../lib/scroll";
import { cn } from "../lib/cn";

const navItems = [
  { to: "/services", label: "خدمات" },
  { to: "/clearance-process", label: "مراحل ترخیص" },
  { to: "/documents-guide", label: "راهنمای مدارک" },
  { to: "/articles", label: "مقالات" },
  { to: "/faq", label: "سؤالات متداول" },
  { to: "/about", label: "درباره ما" },
  { to: "/contact", label: "تماس" },
];

export function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.get<Record<string, string>>("/settings/public"),
    staleTime: 10 * 60 * 1000,
  });
  const tagline = settings.data?.["company.tagline"] || "خدمات تخصصی ترخیص کالا";
  const location = useLocation();
  const navigate = useNavigate();
  // Panel pages render their own notification bell next to the page title.
  const inPanel = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/admin");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    setLogoutError(null);
    // Leave the panel before the local user is cleared, otherwise ProtectedRoute
    // redirects to /login?next=/dashboard and hijacks the next login. The user is
    // only cleared when the server confirms, so a failed request leaves a valid
    // session intact and reports the failure instead of hiding it.
    setOpen(false);
    navigate("/", { replace: true });
    try {
      await logout();
    } catch {
      setLogoutError("خروج از حساب انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.");
    }
  }

  const panelLink = user?.role === "CUSTOMER" ? "/dashboard" : user ? "/admin" : "/login";

  // Clicking the link of the page you are already on re-navigates to the same
  // route, which does nothing; glide back to the top of that page instead.
  function handleNavClick(to: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      setOpen(false);
      if (location.pathname === to) {
        event.preventDefault();
        scrollToTop();
      }
    };
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-slate-200/80 backdrop-blur transition-shadow duration-300",
        scrolled ? "bg-white/90 shadow-[0_12px_32px_-20px_rgba(15,40,60,0.55)]" : "bg-white/95",
      )}
    >
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 lg:px-8">
        <Link
          to="/"
          onClick={(event) => {
            // Already on the homepage: re-navigating does nothing, so glide to the top.
            if (location.pathname === "/") {
              event.preventDefault();
              scrollToTop();
            }
          }}
          className="flex min-w-0 items-center gap-3 xl:shrink-0"
          aria-label="صبا ترخیص — صفحه اصلی"
        >
          <img
            src="/brand/logo.svg"
            alt=""
            width={56}
            height={40}
            className="h-10 w-auto shrink-0"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold leading-tight text-brand-900">صبا ترخیص</span>
            {/* The tagline is editable from settings, so it must wrap instead of
                pushing the mobile menu button past the viewport. */}
            <span className="block text-[11px] leading-tight text-slate-600 wrap-anywhere">{tagline}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="ناوبری اصلی">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick(item.to)}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                  isActive ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-brand-800",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {user ? (
            <>
              {user.role === "CUSTOMER" && !inPanel ? <NotificationsMenu /> : null}
              <Link
                to={panelLink}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-brand-800 hover:bg-brand-50"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                {user.role === "CUSTOMER" ? "پنل من" : "پنل مدیریت"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-slate-500 hover:bg-slate-50 hover:text-rose-600"
              >
                <LogOut className="size-4" aria-hidden />
                خروج
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <User className="size-4" aria-hidden />
              ورود / ثبت‌نام
            </Link>
          )}
          <Link
            to="/requests/new"
            className="whitespace-nowrap rounded-lg bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
          >
            ثبت درخواست ترخیص
          </Link>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-700 xl:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-5 pt-2 xl:hidden">
          <nav className="grid gap-1" aria-label="ناوبری موبایل">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick(item.to)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
            <Link
              to="/requests/new"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              ثبت درخواست ترخیص
            </Link>
            {user ? (
              <>
                <Link
                  to={panelLink}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm"
                >
                  {user.role === "CUSTOMER" ? "پنل من" : "پنل مدیریت"}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-4 py-2.5 text-center text-sm text-rose-600"
                >
                  خروج از حساب
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm"
              >
                ورود / ثبت‌نام
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {logoutError ? (
        <div className="mx-auto max-w-7xl px-4 pb-3 lg:px-8">
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {logoutError}
          </p>
        </div>
      ) : null}
    </header>
  );
}
