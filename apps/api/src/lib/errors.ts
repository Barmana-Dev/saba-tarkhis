export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "برای دسترسی به این بخش باید وارد حساب خود شوید.") =>
  new AppError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "شما اجازه انجام این عملیات را ندارید.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "موردی با این مشخصات یافت نشد.") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "CONFLICT", message, details);
