export type RequestDocumentHint = {
  name: string;
  note: string;
};

type Procedure = "IMPORT" | "EXPORT" | "TRANSIT" | "UNKNOWN";

/**
 * Which documents usually help a case, per procedure. Deliberately phrased as
 * guidance: what is actually required depends on the goods and the current
 * customs rules, so nothing here claims to be mandatory for every case.
 */
const hintsByProcedure: Record<Procedure, RequestDocumentHint[]> = {
  IMPORT: [
    { name: "پیش‌فاکتور", note: "مشخصات کالا، مقدار و ارزش اولیه" },
    { name: "فاکتور تجاری", note: "صورت‌حساب نهایی فروشنده" },
    { name: "بارنامه (B/L یا AWB)", note: "سند حمل و مشخصات محموله" },
    { name: "فهرست عدل‌بندی", note: "تطبیق بسته‌بندی با بارنامه" },
    { name: "ثبت سفارش یا مجوز", note: "در صورت نیاز کالا به مجوز" },
  ],
  EXPORT: [
    { name: "فاکتور تجاری", note: "ارزش و شرح کالای صادراتی" },
    { name: "بارنامه یا CMR", note: "سند حمل و مسیر" },
    { name: "گواهی مبدأ", note: "در صورت درخواست مقصد" },
    { name: "فهرست عدل‌بندی", note: "تعداد و بسته‌بندی" },
  ],
  TRANSIT: [
    { name: "بارنامه ترانزیت", note: "مبدأ، مقصد و مسیر عبور" },
    { name: "فاکتور تجاری", note: "ارزش و شرح کالا" },
    { name: "گواهی مبدأ", note: "در صورت نیاز مقصد" },
    { name: "مجوزهای مسیر", note: "در صورت نیاز رویه ترانزیت" },
  ],
  UNKNOWN: [
    { name: "پیش‌فاکتور یا فاکتور", note: "برای شروع بررسی کالا" },
    { name: "بارنامه", note: "اگر کالا در حال حمل است" },
    { name: "سایر مدارک مرتبط", note: "مجوز، گواهی یا مکاتبات" },
  ],
};

export function documentsForProcedure(procedure: string): RequestDocumentHint[] {
  return hintsByProcedure[(procedure as Procedure) ?? "UNKNOWN"] ?? hintsByProcedure.UNKNOWN;
}

export const uploadRules = {
  formats: "PDF، JPG یا PNG",
  maxSizePerFile: "۵ مگابایت",
  maxFiles: 4,
};
