import type { RequestStatus } from "./types";

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(0))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export const statusMeta: Record<RequestStatus, { label: string; className: string }> = {
  SUBMITTED: { label: "ثبت‌شده", className: "bg-slate-100 text-slate-700 border-slate-200" },
  UNDER_REVIEW: { label: "در حال بررسی", className: "bg-amber-50 text-amber-800 border-amber-200" },
  NEED_MORE_INFO: { label: "نیازمند تکمیل اطلاعات", className: "bg-orange-50 text-orange-800 border-orange-200" },
  QUOTED: { label: "پیشنهاد ارائه‌شده", className: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  IN_PROGRESS: { label: "در حال انجام خدمات", className: "bg-sky-50 text-sky-800 border-sky-200" },
  COMPLETED: { label: "تکمیل‌شده", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "لغوشده", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const requestStatuses = Object.keys(statusMeta) as RequestStatus[];

export const procedureLabels: Record<string, string> = {
  IMPORT: "واردات",
  EXPORT: "صادرات",
  TRANSIT: "ترانزیت",
  OTHER: "سایر",
  UNKNOWN: "نامشخص",
};

export const transportLabels: Record<string, string> = {
  SEA: "دریایی",
  ROAD: "زمینی",
  AIR: "هوایی",
  RAIL: "ریلی",
  UNKNOWN: "نامشخص",
};

export const currencyLabels: Record<string, string> = {
  IRR: "ریال",
  USD: "دلار آمریکا",
  EUR: "یورو",
  AED: "درهم امارات",
  CNY: "یوان چین",
  OTHER: "سایر",
};

export const roleLabels: Record<string, string> = {
  CUSTOMER: "مشتری",
  EXPERT: "کارشناس",
  ADMIN: "مدیر",
};

export const contactStatusLabels: Record<string, string> = {
  NEW: "جدید",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "رسیدگی‌شده",
};
