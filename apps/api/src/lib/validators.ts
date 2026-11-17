import { z } from "zod";

const persianDigits = /[۰-۹٠-٩]/g;

export function normalizeMobile(input: string): string {
  const converted = input
    .replace(persianDigits, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10))
    .replace(/[\s\-()]/g, "");

  if (converted.startsWith("+98")) return `0${converted.slice(3)}`;
  if (converted.startsWith("0098")) return `0${converted.slice(4)}`;
  if (converted.startsWith("98") && converted.length === 12) return `0${converted.slice(2)}`;
  if (converted.startsWith("9") && converted.length === 10) return `0${converted}`;
  return converted;
}

export const mobileSchema = z
  .string()
  .trim()
  .transform(normalizeMobile)
  .refine((value) => /^09\d{9}$/.test(value), {
    message: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.",
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160, "ایمیل بیش از حد طولانی است.")
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "ایمیل واردشده معتبر نیست.");

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
  .max(72, "رمز عبور بیش از حد طولانی است.")
  // bcrypt only uses the first 72 bytes, so a longer UTF-8 password (Persian
  // letters take two bytes each) would silently accept a different tail.
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "رمز عبور بیش از حد طولانی است (حداکثر ۷۲ بایت؛ هر حرف فارسی ۲ بایت است).",
  })
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "رمز عبور باید شامل حرف و عدد باشد.",
  });

export const optionalText = (max: number, message = "متن واردشده بیش از حد طولانی است.") =>
  z.string().trim().max(max, message).optional();

/** Drops empty strings so optional fields are stored as NULL. */
export function stripEmpty<T extends Record<string, unknown>>(input: T): T {
  const entries = Object.entries(input).filter(
    ([, value]) => !(typeof value === "string" && value.trim() === ""),
  );
  return Object.fromEntries(entries) as T;
}
