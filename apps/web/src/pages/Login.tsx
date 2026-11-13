import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ShieldCheck } from "lucide-react";
import type { z } from "zod";
import { loginSchema } from "../lib/schemas";
import { homePathForRole, safeNextPath, useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Seo } from "../components/Seo";
import { Alert, Button, Field, Input } from "../components/ui";

type LoginValues = z.infer<typeof loginSchema>;

export function Login() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  if (!isLoading && user) {
    return <Navigate to={safeNextPath(user.role, next) ?? homePathForRole(user.role)} replace />;
  }

  async function onSubmit(values: LoginValues) {
    try {
      const loggedIn = await login(values.mobile, values.password);
      const target = safeNextPath(loggedIn.role, next) ?? homePathForRole(loggedIn.role);
      navigate(target, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setError("root", { message: error.message });
      } else {
        setError("root", { message: "ورود انجام نشد. دوباره تلاش کنید." });
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 lg:px-8">
      <Seo title="ورود به حساب" description="ورود به حساب کاربری صبا ترخیص برای پیگیری پرونده‌ها." noindex />

      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card lg:grid-cols-[1fr_0.85fr]">
        <div className="p-6 md:p-10">
          <h1 className="text-2xl font-bold text-brand-900">ورود به حساب</h1>
          <p className="mt-2 text-sm text-slate-600">
            برای ثبت درخواست و مشاهده پرونده‌ها وارد حساب خود شوید.
          </p>

          {errors.root?.message ? (
            <Alert tone="error" className="mt-5">
              {errors.root.message}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
            <Field label="شماره موبایل" htmlFor="mobile" required error={errors.mobile?.message}>
              <Input
                id="mobile"
                className="num"
                inputMode="tel"
                autoComplete="username"
                placeholder="09120000000"
                invalid={Boolean(errors.mobile)}
                {...register("mobile")}
              />
            </Field>

            <Field label="رمز عبور" htmlFor="password" required error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </Field>

            <Button type="submit" loading={isSubmitting} className="w-full">
              <LogIn className="size-4" aria-hidden />
              ورود
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            حساب ندارید؟{" "}
            <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline">
              ثبت‌نام کنید
            </Link>
          </p>

          {import.meta.env.DEV ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">
              <p className="font-medium text-slate-700">حساب‌های نمونه محیط توسعه</p>
              <p className="num">ADMIN 09120000001 · EXPERT 09120000002 · CUSTOMER 09120000003</p>
              <p className="num">Password: Demo@12345</p>
            </div>
          ) : null}
        </div>

        <div className="hidden bg-brand-900 p-8 text-white lg:block">
          <ShieldCheck className="size-8 text-accent-500" aria-hidden />
          <h2 className="mt-5 text-xl font-bold">پرونده شما، در یک نگاه</h2>
          <ul className="mt-5 space-y-4 text-xs leading-6 text-slate-300">
            <li>• مشاهده وضعیت رسیدگی داخلی و تاریخچه تغییرات</li>
            <li>• دریافت پیام کارشناس و درخواست مدارک تکمیلی</li>
            <li>• بارگذاری و دریافت امن مدارک پرونده</li>
          </ul>
          <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-slate-400">
            وضعیت‌های این سامانه، وضعیت داخلی شرکت صبا ترخیص هستند و به معنی وضعیت رسمی گمرکی
            نیستند.
          </p>
        </div>
      </div>
    </div>
  );
}
