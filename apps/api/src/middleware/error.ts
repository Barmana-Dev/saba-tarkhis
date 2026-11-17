import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { fail } from "../lib/http";

export function notFoundHandler(_req: Request, res: Response) {
  return fail(res, 404, "NOT_FOUND", "مسیر درخواستی یافت نشد.");
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return fail(res, error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      "اطلاعات واردشده معتبر نیست.",
      error.issues.map((issue) => ({
        field: issue.path.map(String).join(".") || "form",
        message: issue.message,
      })),
    );
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return fail(
        res,
        400,
        "FILE_TOO_LARGE",
        `حجم هر فایل نباید بیشتر از ${env.maxUploadBytes / (1024 * 1024)} مگابایت باشد.`,
      );
    }
    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return fail(res, 400, "FILE_COUNT_EXCEEDED", "تعداد فایل‌های ارسالی بیش از حد مجاز است.");
    }
    if (
      error.code === "LIMIT_FIELD_VALUE" ||
      error.code === "LIMIT_FIELD_COUNT" ||
      error.code === "LIMIT_PART_COUNT"
    ) {
      return fail(
        res,
        413,
        "PAYLOAD_TOO_LARGE",
        "حجم یا تعداد فیلدهای ارسالی بیش از حد مجاز است.",
      );
    }
    return fail(res, 400, "UPLOAD_ERROR", "بارگذاری فایل انجام نشد.");
  }

  // Body-parser failures (malformed JSON, oversized body) carry no AppError and
  // must not surface as a 500: they are client errors with a usable message.
  const bodyError = error as { type?: string; status?: number; statusCode?: number } | null;
  const bodyStatus = bodyError?.status ?? bodyError?.statusCode;
  if (bodyError?.type === "entity.parse.failed") {
    return fail(res, 400, "INVALID_JSON", "ساختار JSON ارسالی معتبر نیست.");
  }
  if (bodyError?.type === "entity.too.large" || bodyStatus === 413) {
    return fail(res, 413, "PAYLOAD_TOO_LARGE", "حجم درخواست بیش از حد مجاز است.");
  }
  if (bodyError?.type === "encoding.unsupported" || bodyError?.type === "charset.unsupported") {
    return fail(res, 400, "UNSUPPORTED_ENCODING", "کدگذاری درخواست پشتیبانی نمی‌شود.");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return fail(res, 409, "CONFLICT", "موردی با این مشخصات از قبل وجود دارد.");
    }
    if (error.code === "P2025") {
      return fail(res, 404, "NOT_FOUND", "موردی با این مشخصات یافت نشد.");
    }
    if (error.code === "P2003") {
      return fail(res, 400, "INVALID_REFERENCE", "مورد مرتبط انتخاب‌شده وجود ندارد.");
    }
    if (error.code === "P2023") {
      return fail(res, 400, "INVALID_ID", "شناسه ارسالی معتبر نیست.");
    }
  }

  // Never leak stack traces or database details to clients.
  console.error("[api] unhandled error:", error);
  return fail(res, 500, "INTERNAL_ERROR", "خطای غیرمنتظره‌ای رخ داد. لطفاً بعداً دوباره تلاش کنید.");
}

/** Wraps async handlers so rejected promises reach the error middleware. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  handler: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
