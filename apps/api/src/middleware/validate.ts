import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors";

const persianFallbacks: Record<string, string> = {
  invalid_type: "مقدار واردشده معتبر نیست.",
  too_small: "مقدار واردشده کوتاه‌تر از حد مجاز است.",
  too_big: "مقدار واردشده بیش از حد مجاز است.",
  invalid_format: "قالب مقدار واردشده معتبر نیست.",
  invalid_value: "مقدار انتخاب‌شده معتبر نیست.",
  unrecognized_keys: "برخی فیلدهای ارسالی مجاز نیستند.",
  invalid_union: "مقدار واردشده معتبر نیست.",
};

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string; code: string }[] }) {
  return error.issues.map((issue) => ({
    field: issue.path.map(String).join(".") || "form",
    message: issue.message || persianFallbacks[issue.code] || "مقدار واردشده معتبر نیست.",
  }));
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(400, "VALIDATION_ERROR", "اطلاعات واردشده معتبر نیست.", toFieldErrors(result.error)),
      );
    }
    req.body = result.data;
    return next();
  };
}

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown, message = "اطلاعات واردشده معتبر نیست."): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", message, toFieldErrors(result.error));
  }
  return result.data;
}
