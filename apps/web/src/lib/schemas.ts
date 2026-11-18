import { z } from "zod";

/**
 * Same rule as the API parser: Persian and Arabic digits, separators and the
 * +98 / 0098 / 98 prefixes all describe one number. Normalising before the
 * regex keeps the form from rejecting what the server would accept.
 */
const digitGroups = /[۰-۹٠-٩]/g;
const allDigits = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";

export function normalizeMobile(input: string): string {
  const converted = input
    .replace(digitGroups, (digit) => String(allDigits.indexOf(digit) % 10))
    .replace(/[\s\-()]/g, "");

  if (converted.startsWith("+98")) return `0${converted.slice(3)}`;
  if (converted.startsWith("0098")) return `0${converted.slice(4)}`;
  if (converted.startsWith("98") && converted.length === 12) return `0${converted.slice(2)}`;
  if (converted.startsWith("9") && converted.length === 10) return `0${converted}`;
  return converted;
}

export const mobileField = z
  .string()
  .trim()
  .min(1, "شماره موبایل را وارد کنید.")
  .transform(normalizeMobile)
  .refine((value) => /^09\d{9}$/.test(value), {
    message: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.",
  });

export const passwordField = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
  .max(72, "رمز عبور بیش از حد طولانی است.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "رمز عبور باید شامل حرف و عدد باشد.",
  });

export const loginSchema = z.object({
  mobile: mobileField,
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید.").max(120),
    mobile: mobileField,
    email: z
      .string()
      .trim()
      .refine((value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
        message: "ایمیل واردشده معتبر نیست.",
      }),
    password: passwordField,
    confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "رمز عبور و تکرار آن یکسان نیستند.",
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "نام خود را وارد کنید.").max(120),
  mobile: mobileField,
  subject: z.string().trim().min(2, "موضوع پیام را وارد کنید.").max(160),
  message: z.string().trim().min(10, "متن پیام حداقل ۱۰ کاراکتر باشد.").max(2000),
  privacyAccepted: z.boolean().refine((value) => value === true, {
    message: "پذیرش سیاست حریم خصوصی الزامی است.",
  }),
});

export const requestFormSchema = z.object({
  applicantType: z.enum(["INDIVIDUAL", "COMPANY"]),
  applicantName: z.string().trim().max(160),
  preferredContact: z.enum(["MOBILE", "EMAIL"]),
  goodsDescription: z.string().trim().min(3, "شرح کالا را وارد کنید.").max(2000),
  category: z.string().trim().max(120),
  hsCode: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9۰-۹]{4,10}$/.test(value), {
      message: "کد تعرفه باید بین ۴ تا ۱۰ رقم باشد.",
    }),
  procedureType: z.enum(["IMPORT", "EXPORT", "TRANSIT", "OTHER", "UNKNOWN"]),
  originCountry: z.string().trim().max(80),
  destinationCountry: z.string().trim().max(80),
  customsLocation: z.string().trim().max(120),
  transportMode: z.enum(["SEA", "ROAD", "AIR", "RAIL", "UNKNOWN"]),
  quantity: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9۰-۹]+([.,][0-9۰-۹]{1,3})?$/.test(value), {
      message: "مقدار باید عددی باشد.",
    }),
  quantityUnit: z.string().trim().max(30),
  estimatedValue: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9۰-۹]+([.,][0-9۰-۹]{1,3})?$/.test(value), {
      message: "ارزش تقریبی باید عددی باشد.",
    }),
  currency: z.enum(["IRR", "USD", "EUR", "AED", "CNY", "OTHER"]),
  cargoStatus: z.string().trim().max(1000),
  notes: z.string().trim().max(4000),
  privacyAccepted: z.boolean().refine((value) => value === true, {
    message: "تأیید صحت اطلاعات و پذیرش سیاست حریم خصوصی الزامی است.",
  }),
});

export type RequestFormValues = z.infer<typeof requestFormSchema>;
