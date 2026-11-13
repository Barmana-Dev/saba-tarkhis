import type { Response } from "express";

export function ok<T>(res: Response, data: T, message?: string, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  errors?: unknown,
) {
  return res.status(status).json({
    success: false,
    code,
    message,
    ...(errors ? { errors } : {}),
  });
}

export function parsePage(query: unknown, defaultPageSize = 10, maxPageSize = 50) {
  const q = (query ?? {}) as Record<string, unknown>;
  const page = Math.max(1, Number.parseInt(String(q.page ?? "1"), 10) || 1);
  const rawSize = Number.parseInt(String(q.pageSize ?? defaultPageSize), 10) || defaultPageSize;
  const pageSize = Math.min(maxPageSize, Math.max(1, rawSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
