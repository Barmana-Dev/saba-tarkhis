import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import type { z } from "zod";
import { registerSchema } from "../lib/schemas";
import { homePathForRole, safeNextPath, useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Seo } from "../components/Seo";
import { Alert, Button, Field, Input } from "../components/ui";

type RegisterValues = z.infer<typeof registerSchema>;

export function Register() {
  const { register: registerUser, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", mobile: "", email: "", password: "", confirmPassword: "" },
  });

  if (!isLoading && user) {
    return <Navigate to={safeNextPath(user.role, next) ?? homePathForRole(user.role)} replace />;
  }

  async function onSubmit(values: RegisterValues) {
    try {
      await registerUser({
        fullName: values.fullName,
        mobile: values.mobile,
        email: values.email || undefined,
        password: values.password,
      });
      navigate(safeNextPath("CUSTOMER", next) ?? homePathForRole("CUSTOMER"), { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors.length > 0) {
          for (const fieldError of error.fieldErrors) {
            if (["fullName", "mobile", "email", "password"].includes(fieldError.field)) {
              setError(fieldError.field as keyof RegisterValues, { message: fieldError.message });
            }
          }
        } else {
          setError("root", { message: error.message });
        }
      } else {
        setError("root", { message: "ثبت‌نام انجام نشد. دوباره تلاش کنید." });
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 lg:px-8">
      <Seo title="ثبت‌نام مشتری" description="ایجاد حساب کاربری مشتری در سامانه صبا ترخیص." noindex />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-10">
        <h1 className="text-2xl font-bold text-brand-900">ثبت‌نام مشتری</h1>
        <p className="mt-2 text-sm text-slate-600">
          پس از ثبت‌نام می‌توانید درخواست ترخیص ثبت کنید، مدارک بارگذاری کنید و وضعیت پرونده را
          پیگیری کنید.
        </p>

        {errors.root?.message ? (
          <Alert tone="error" className="mt-5">
            {errors.root.message}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی" htmlFor="fullName" required error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" invalid={Boolean(errors.fullName)} {...register("fullName")} />
            </Field>
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
          </div>

          <Field
            label="ایمیل (اختیاری)"
            htmlFor="email"
            error={errors.email?.message}
            hint="برای ارتباطات تکمیلی؛ در صورت نیاز می‌توانید بعداً ثبت کنید."
          >
            <Input id="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} {...register("email")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="رمز عبور"
              htmlFor="password"
              required
              error={errors.password?.message}
              hint="حداقل ۸ کاراکتر، شامل حرف و عدد."
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </Field>
            <Field label="تکرار رمز عبور" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
                {...register("confirmPassword")}
              />
            </Field>
          </div>

          <p className="text-[11px] leading-6 text-slate-500">
            با ثبت‌نام، اطلاعات هویتی و پرونده‌های شما تنها برای رسیدگی به درخواست‌ها نگهداری
            می‌شود و برای مشتریان دیگر قابل مشاهده نیست.
          </p>

          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            <UserPlus className="size-4" aria-hidden />
            ایجاد حساب
          </Button>
        </form>

        <p className="mt-5 text-xs text-slate-500">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}
