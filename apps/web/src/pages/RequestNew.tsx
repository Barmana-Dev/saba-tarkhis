import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { api, ApiError, fieldErrorsToMap } from "../lib/api";
import { requestFormSchema, type RequestFormValues } from "../lib/schemas";
import { currencyLabels, procedureLabels, transportLabels } from "../lib/format";
import type { ClearanceRequest } from "../lib/types";
import { PanelLayout } from "../components/Layout";
import { Seo } from "../components/Seo";
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from "../components/ui";

const steps = [
  { title: "اطلاعات متقاضی", description: "نوع متقاضی و راه ارتباطی" },
  { title: "اطلاعات کالا", description: "شرح، رویه و مشخصات محموله" },
  { title: "مدارک و توضیحات", description: "بارگذاری اختیاری مدارک" },
  { title: "بازبینی و ثبت", description: "کنترل نهایی اطلاعات" },
];

const fieldsByStep: (keyof RequestFormValues)[][] = [
  ["applicantType", "applicantName", "preferredContact"],
  [
    "goodsDescription",
    "category",
    "hsCode",
    "procedureType",
    "originCountry",
    "destinationCountry",
    "customsLocation",
    "transportMode",
    "quantity",
    "quantityUnit",
    "estimatedValue",
    "currency",
    "cargoStatus",
  ],
  ["notes", "privacyAccepted"],
  ["privacyAccepted"],
];

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 4;

export function RequestNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setError,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: "onTouched",
    defaultValues: {
      applicantType: "COMPANY",
      applicantName: "",
      preferredContact: "MOBILE",
      goodsDescription: "",
      category: "",
      hsCode: "",
      procedureType: "IMPORT",
      originCountry: "",
      destinationCountry: "",
      customsLocation: "",
      transportMode: "UNKNOWN",
      quantity: "",
      quantityUnit: "",
      estimatedValue: "",
      currency: "EUR",
      cargoStatus: "",
      notes: "",
      privacyAccepted: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RequestFormValues) => {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(values));
      for (const file of files) formData.append("files", file);
      return api.upload<ClearanceRequest>("/requests", formData);
    },
    onSuccess: (created) => {
      navigate(`/dashboard/requests/${created.id}`, {
        state: { created: true, trackingCode: created.trackingCode },
        replace: true,
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const mapped = fieldErrorsToMap(error);
        for (const [field, message] of Object.entries(mapped)) {
          if (field in requestFormSchema.shape) {
            setError(field as keyof RequestFormValues, { message });
          }
        }
      }
    },
  });

  // `useWatch` gives the same live values without `watch()` (which React
  // Compiler cannot memoise safely).
  const values = useWatch({ control });

  async function goNext() {
    const valid = await trigger(fieldsByStep[step]);
    if (valid) setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files];
    for (const file of Array.from(selected)) {
      if (next.length >= MAX_FILES) {
        setFileError(`حداکثر ${MAX_FILES} فایل قابل بارگذاری است.`);
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError("فقط فایل‌های PDF، JPG و PNG قابل بارگذاری هستند.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError("حجم هر فایل نباید بیشتر از ۵ مگابایت باشد.");
        continue;
      }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) {
        next.push(file);
        setFileError(null);
      }
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  }

  const submitError =
    mutation.isError && mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <PanelLayout
      title="ثبت درخواست ترخیص"
      description="اطلاعات محموله را در چهار مرحله وارد کنید. پس از ثبت، شناسه پیگیری داخلی دریافت می‌کنید."
    >
      <Seo title="ثبت درخواست ترخیص" description="فرم چندمرحله‌ای ثبت درخواست ترخیص کالا." noindex />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-7">
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="مراحل فرم">
          {steps.map((item, index) => {
            const state = index === step ? "current" : index < step ? "done" : "todo";
            return (
              <li key={item.title} className="flex items-start gap-2">
                <span
                  className={`num flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    state === "done"
                      ? "bg-emerald-600 text-white"
                      : state === "current"
                        ? "bg-brand-700 text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {state === "done" ? <Check className="size-3.5" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-xs font-semibold ${state === "todo" ? "text-slate-500" : "text-brand-900"}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] leading-5 text-slate-600 md:block">
                    {item.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="my-6 h-px bg-slate-100" />

        {submitError ? (
          <Alert tone="error" className="mb-5">
            {submitError}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit((formValues) => mutation.mutate(formValues))} noValidate>
          {step === 0 ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نوع متقاضی" htmlFor="applicantType" required error={errors.applicantType?.message}>
                  <Select id="applicantType" {...register("applicantType")}>
                    <option value="INDIVIDUAL">شخص حقیقی</option>
                    <option value="COMPANY">شخص حقوقی / شرکت</option>
                  </Select>
                </Field>
                <Field
                  label={values.applicantType === "COMPANY" ? "نام شرکت" : "نام و نام خانوادگی"}
                  htmlFor="applicantName"
                  error={errors.applicantName?.message}
                  hint="اختیاری؛ در صورت خالی بودن، نام حساب کاربری استفاده می‌شود."
                >
                  <Input id="applicantName" {...register("applicantName")} />
                </Field>
              </div>

              <Field label="راه ارتباطی ترجیحی" htmlFor="preferredContact" required error={errors.preferredContact?.message}>
                <Select id="preferredContact" {...register("preferredContact")}>
                  <option value="MOBILE">تماس تلفنی / پیامک</option>
                  <option value="EMAIL">ایمیل</option>
                </Select>
              </Field>

              <Alert tone="info">
                شماره موبایل و ایمیل شما از حساب کاربری خوانده می‌شود. برای تغییر آن‌ها به{" "}
                <a href="/dashboard/profile" className="underline">مشخصات حساب</a> بروید.
              </Alert>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <Field label="شرح کالا" htmlFor="goodsDescription" required error={errors.goodsDescription?.message}>
                <Textarea
                  id="goodsDescription"
                  rows={3}
                  placeholder="مثلاً: قطعات یدکی صنعتی، دستگاه آزمایشگاهی…"
                  invalid={Boolean(errors.goodsDescription)}
                  {...register("goodsDescription")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="دسته کالا (اختیاری)" htmlFor="category" error={errors.category?.message}>
                  <Input id="category" {...register("category")} />
                </Field>
                <Field
                  label="کد تعرفه HS (در صورت اطلاع)"
                  htmlFor="hsCode"
                  error={errors.hsCode?.message}
                  hint="وارد کردن کد به معنی تأیید کارشناسی آن نیست."
                >
                  <Input id="hsCode" className="num" inputMode="numeric" placeholder="84839000" {...register("hsCode")} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="رویه موردنظر" htmlFor="procedureType" required error={errors.procedureType?.message}>
                  <Select id="procedureType" {...register("procedureType")}>
                    <option value="IMPORT">واردات</option>
                    <option value="EXPORT">صادرات</option>
                    <option value="TRANSIT">ترانزیت</option>
                    <option value="OTHER">سایر</option>
                    <option value="UNKNOWN">نامشخص</option>
                  </Select>
                </Field>
                <Field label="کشور مبدأ" htmlFor="originCountry" error={errors.originCountry?.message}>
                  <Input id="originCountry" {...register("originCountry")} />
                </Field>
                <Field label="کشور مقصد" htmlFor="destinationCountry" error={errors.destinationCountry?.message}>
                  <Input id="destinationCountry" {...register("destinationCountry")} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="گمرک یا بندر پیشنهادی"
                  htmlFor="customsLocation"
                  error={errors.customsLocation?.message}
                  hint="در صورت اطلاع؛ مثلاً گمرک تهران یا بندرعباس."
                >
                  <Input id="customsLocation" {...register("customsLocation")} />
                </Field>
                <Field label="روش حمل" htmlFor="transportMode" required error={errors.transportMode?.message}>
                  <Select id="transportMode" {...register("transportMode")}>
                    <option value="SEA">دریایی</option>
                    <option value="ROAD">زمینی</option>
                    <option value="AIR">هوایی</option>
                    <option value="RAIL">ریلی</option>
                    <option value="UNKNOWN">نامشخص</option>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="مقدار" htmlFor="quantity" error={errors.quantity?.message}>
                  <Input id="quantity" className="num" inputMode="decimal" placeholder="120" {...register("quantity")} />
                </Field>
                <Field label="واحد" htmlFor="quantityUnit" error={errors.quantityUnit?.message}>
                  <Input id="quantityUnit" placeholder="کارتن / تن" {...register("quantityUnit")} />
                </Field>
                <Field label="واحد پول" htmlFor="currency" error={errors.currency?.message}>
                  <Select id="currency" {...register("currency")}>
                    {Object.entries(currencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="ارزش تقریبی" htmlFor="estimatedValue" error={errors.estimatedValue?.message}>
                <Input id="estimatedValue" className="num" inputMode="decimal" placeholder="25000" {...register("estimatedValue")} />
              </Field>

              <Field label="شرح وضعیت فعلی کالا" htmlFor="cargoStatus" error={errors.cargoStatus?.message}>
                <Textarea
                  id="cargoStatus"
                  rows={2}
                  placeholder="مثلاً: کالا در انبار مبدأ است / در بندر تخلیه شده / منتظر مجوز…"
                  {...register("cargoStatus")}
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700">بارگذاری مدارک (اختیاری)</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  فایل‌های PDF، JPG یا PNG تا حداکثر ۵ مگابایت برای هر فایل. حداکثر ۴ فایل. مدارک
                  تکمیلی را می‌توانید بعداً هم در پرونده بارگذاری کنید.
                </p>

                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                    id="file-input"
                    onChange={(event) => addFiles(event.target.files)}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                    <Upload className="size-4" aria-hidden />
                    انتخاب فایل
                  </Button>

                  {fileError ? <p className="mt-2 text-xs text-rose-600">{fileError}</p> : null}

                  {files.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {files.map((file) => (
                        <li
                          key={`${file.name}-${file.size}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-slate-600" aria-hidden />
                            <span className="truncate">{file.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                            className="text-slate-600 hover:text-rose-600"
                            aria-label={`حذف ${file.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <Field
                label="توضیحات و سؤال شما"
                htmlFor="notes"
                error={errors.notes?.message}
                hint="هر نکته‌ای که به بررسی پرونده کمک می‌کند بنویسید."
              >
                <Textarea id="notes" rows={5} invalid={Boolean(errors.notes)} {...register("notes")} />
              </Field>

              <Checkbox
                id="privacyAccepted"
                label="صحت اطلاعات واردشده را تأیید می‌کنم و سیاست حریم خصوصی و شرایط استفاده از سامانه را می‌پذیرم."
                error={errors.privacyAccepted?.message}
                {...register("privacyAccepted")}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <Alert tone="info">
                اطلاعات زیر را کنترل کنید. پس از ثبت، شناسه پیگیری داخلی صادر می‌شود؛ این شناسه کد
                رسمی گمرکی یا شماره کوتاژ نیست.
              </Alert>

              <dl className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm sm:grid-cols-2">
                {[
                  ["نوع متقاضی", values.applicantType === "COMPANY" ? "شخص حقوقی / شرکت" : "شخص حقیقی"],
                  ["نام متقاضی", values.applicantName || "—"],
                  ["شرح کالا", values.goodsDescription],
                  ["دسته کالا", values.category || "—"],
                  ["کد تعرفه", values.hsCode || "—"],
                  [
                    "رویه",
                    values.procedureType
                      ? (procedureLabels[values.procedureType] ?? values.procedureType)
                      : "—",
                  ],
                  ["مبدأ", values.originCountry || "—"],
                  ["مقصد", values.destinationCountry || "—"],
                  ["گمرک / بندر", values.customsLocation || "—"],
                  [
                    "روش حمل",
                    values.transportMode
                      ? (transportLabels[values.transportMode] ?? values.transportMode)
                      : "—",
                  ],
                  ["مقدار", [values.quantity, values.quantityUnit].filter(Boolean).join(" ") || "—"],
                  [
                    "ارزش تقریبی",
                    values.estimatedValue
                      ? `${values.estimatedValue} ${values.currency ? (currencyLabels[values.currency] ?? "") : ""}`.trim()
                      : "—",
                  ],
                  ["مدارک", files.length > 0 ? files.map((file) => file.name).join("، ") : "بدون مدرک"],
                  ["توضیحات", values.notes || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-0.5 break-words text-[13px] text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="flex items-start gap-2 text-xs leading-6 text-slate-500">
                <Paperclip className="lead-icon-sm size-3.5 shrink-0" aria-hidden />
                وضعیت‌هایی که بعد از ثبت می‌بینید، وضعیت رسیدگی داخلی شرکت صبا ترخیص هستند، نه
                وضعیت رسمی در سامانه‌های گمرکی.
              </p>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
              <ArrowRight className="size-4" aria-hidden />
              مرحله قبل
            </Button>

            {step < steps.length - 1 ? (
              <Button type="button" onClick={goNext}>
                مرحله بعد
                <ArrowLeft className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" loading={mutation.isPending}>
                <Check className="size-4" aria-hidden />
                ثبت نهایی درخواست
              </Button>
            )}
          </div>
        </form>
      </div>
    </PanelLayout>
  );
}
