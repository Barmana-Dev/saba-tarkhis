import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { contactSchema } from "../lib/schemas";
import type { z } from "zod";
import { Seo } from "../components/Seo";
import { Alert, Button, Checkbox, Field, Input, Textarea } from "../components/ui";

type ContactValues = z.infer<typeof contactSchema>;

export function Contact() {
  const [success, setSuccess] = useState(false);
  const settings = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.get<Record<string, string>>("/settings/public"),
    staleTime: 10 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", mobile: "", subject: "", message: "", privacyAccepted: false },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactValues) => api.post("/contact", values),
    onSuccess: () => {
      setSuccess(true);
      reset();
    },
  });

  const contactItems = [
    { icon: Phone, label: "تلفن", value: settings.data?.["contact.phone"] },
    { icon: Mail, label: "ایمیل", value: settings.data?.["contact.email"] },
    { icon: MapPin, label: "نشانی", value: settings.data?.["contact.address"] },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Seo
        title="تماس با صبا ترخیص"
        description="ارسال پیام و درخواست مشاوره به صبا ترخیص. اطلاعات تماس منتشرشده پس از تأیید کارفرما در این صفحه نمایش داده می‌شود."
      />

      <nav className="mb-6 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-brand-700">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">تماس با ما</span>
      </nav>

      <header className="max-w-2xl">
        <p className="text-xs font-semibold text-accent-700">ارتباط با ما</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">تماس با صبا ترخیص</h1>
        <p className="mt-3 text-balance text-sm leading-7 text-slate-600">
          پرسش، پیشنهاد یا درخواست مشاوره خود را از این فرم ثبت کنید. پیام شما در سامانه ذخیره
          می‌شود و توسط تیم بررسی خواهد شد.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          {success ? (
            <Alert tone="success" className="mb-5">
              پیام شما ثبت شد. کارشناسان در اولین فرصت پاسخ می‌دهند.
            </Alert>
          ) : null}

          {mutation.isError ? (
            <Alert tone="error" className="mb-5">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید."}
            </Alert>
          ) : null}

          <form
            noValidate
            onSubmit={handleSubmit((values) => {
              setSuccess(false);
              mutation.mutate(values);
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام و نام خانوادگی" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" invalid={Boolean(errors.name)} {...register("name")} autoComplete="name" />
              </Field>
              <Field label="شماره موبایل" htmlFor="mobile" required error={errors.mobile?.message}>
                <Input
                  id="mobile"
                  className="num"
                  inputMode="tel"
                  placeholder="09120000000"
                  invalid={Boolean(errors.mobile)}
                  {...register("mobile")}
                  autoComplete="tel"
                />
              </Field>
            </div>

            <Field label="موضوع" htmlFor="subject" required error={errors.subject?.message}>
              <Input id="subject" invalid={Boolean(errors.subject)} {...register("subject")} />
            </Field>

            <Field label="متن پیام" htmlFor="message" required error={errors.message?.message}>
              <Textarea
                id="message"
                rows={6}
                invalid={Boolean(errors.message)}
                {...register("message")}
                placeholder="پرسش یا توضیح خود را بنویسید…"
              />
            </Field>

            <Checkbox
              id="privacyAccepted"
              label={
                <>
                  <Link to="/privacy" target="_blank" rel="noreferrer" className="text-accent-700 underline underline-offset-2">
                    سیاست حریم خصوصی
                  </Link>{" "}
                  را مطالعه کرده‌ام و با ثبت و نگهداری این اطلاعات برای رسیدگی به درخواست موافقم.
                </>
              }
              error={errors.privacyAccepted?.message}
              {...register("privacyAccepted")}
            />

            <Button type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
              <Send className="size-4" aria-hidden />
              ارسال پیام
            </Button>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-brand-900">اطلاعات تماس</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {contactItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-start gap-2.5">
                    <Icon className="lead-icon size-4 shrink-0 text-accent-600" aria-hidden />
                    <div>
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p
                        className={`mt-0.5 text-sm text-slate-700 ${
                          item.label === "ایمیل" ? "break-all" : "break-words"
                        }`}
                      >
                        {item.value ?? "نیازمند تأیید کارفرما"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
              شماره تماس، نشانی دفتر و ساعات پاسخگویی فقط پس از تأیید کارفرما منتشر می‌شود؛ بنابراین
              هیچ اطلاعات تماسی حدس زده نشده است.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <h2 className="text-sm font-bold text-brand-900">بهتر است درخواست ترخیص ثبت کنید</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              اگر درباره محموله مشخصی سؤال دارید، ثبت درخواست مسیر سریع‌تری برای بررسی است.
            </p>
            <Link
              to="/requests/new"
              className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
            >
              ثبت درخواست ترخیص ←
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
