import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { scrollToTop } from "../lib/scroll";
import { cn } from "./ui";

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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    // Leave the protected area first: clearing `user` while still on a panel
    // makes ProtectedRoute redirect to /login?next=/dashboard, which then
    // hijacks the next (admin) login.
    navigate("/", { replace: true });
    try {
      await logout();
    } catch {
      // The local session is cleared by the provider even if the request fails.
    }
  }

  const panelLink = user?.role === "CUSTOMER" ? "/dashboard" : user ? "/admin" : "/login";

  // Clicking the link of the page you are already on re-navigates to the same
  // route, which does nothing; glide back to the top of that page instead.
  function handleNavClick(to: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (location.pathname === to) {
        event.preventDefault();
        setOpen(false);
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
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link
          to="/"
          onClick={(event) => {
            // Already on the homepage: re-navigating does nothing, so glide to the top.
            if (location.pathname === "/") {
              event.preventDefault();
              scrollToTop();
            }
          }}
          className="flex shrink-0 items-center gap-3"
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
          <span className="whitespace-nowrap">
            <span className="block text-lg font-bold leading-tight text-brand-900">صبا ترخیص</span>
            <span className="block text-[11px] text-slate-500">خدمات تخصصی ترخیص کالا</span>
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
          className="rounded-lg border border-slate-200 p-2 text-slate-700 xl:hidden"
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
              className="rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              ثبت درخواست ترخیص
            </Link>
            {user ? (
              <>
                <Link to={panelLink} className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm">
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
              <Link to="/login" className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm">
                ورود / ثبت‌نام
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
