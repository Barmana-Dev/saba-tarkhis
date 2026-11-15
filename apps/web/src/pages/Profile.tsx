import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { CurrentUser } from "../lib/types";
import { PanelLayout } from "../components/Layout";
import { Seo } from "../components/Seo";
import { Alert, Button, Field, Input } from "../components/ui";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید.").max(120),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
      message: "ایمیل واردشده معتبر نیست.",
    }),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function Profile() {
  const { user, updateUser } = useAuth();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? "", email: user?.email ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => api.patch<CurrentUser>("/users/me", values),
    onSuccess: (updated) => {
      updateUser(updated);
      setSuccess(true);
      setServerError(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const fieldError of error.fieldErrors) {
          if (fieldError.field === "fullName" || fieldError.field === "email") {
            setError(fieldError.field, { message: fieldError.message });
          }
        }
        setServerError(error.message);
      } else {
        setServerError("به‌روزرسانی انجام نشد.");
      }
    },
  });

  return (
    <PanelLayout title="مشخصات حساب" description="نام نمایشی و ایمیل خود را به‌روزرسانی کنید.">
      <Seo title="مشخصات حساب" description="ویرایش اطلاعات حساب کاربری." noindex />

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
        {success ? <Alert tone="success" className="mb-4">اطلاعات حساب شما به‌روزرسانی شد.</Alert> : null}
        {serverError ? <Alert tone="error" className="mb-4">{serverError}</Alert> : null}

        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => {
            setSuccess(false);
            setServerError(null);
            mutation.mutate(values);
          })}
        >
          <Field label="شماره موبایل" htmlFor="mobile" hint="تغییر شماره موبایل نیازمند تأیید پیامکی است و فعلاً از این صفحه امکان‌پذیر نیست.">
            <Input id="mobile" value={user?.mobile ?? ""} readOnly disabled className="num" />
          </Field>

          <Field label="نام و نام خانوادگی" htmlFor="fullName" required error={errors.fullName?.message}>
            <Input id="fullName" invalid={Boolean(errors.fullName)} {...register("fullName")} />
          </Field>

          <Field label="ایمیل (اختیاری)" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" invalid={Boolean(errors.email)} {...register("email")} />
          </Field>

          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            ذخیره تغییرات
          </Button>
        </form>
      </div>
    </PanelLayout>
  );
}
