const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "/api/v1";

export type FieldError = { field: string; message: string };

/**
 * API responses return server-relative paths (e.g. a document download link).
 * When the SPA talks to a separate API origin those paths must be resolved
 * against that origin instead of the frontend host.
 */
export function apiUrl(path: string): string {
  if (!path.startsWith("/api/")) return path;
  const apiRoot = API_BASE.replace(/\/api\/v1$/, "");
  return `${apiRoot}${path}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(message: string, status: number, code = "UNKNOWN", fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The CSRF cookie is readable only on the API host. When the SPA runs on another
// host the token comes from the login response (or /auth/csrf) and is kept here.
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/csrf`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: { csrfToken?: string } };
    const token = payload.data?.csrfToken ?? null;
    if (token) csrfToken = token;
    return token;
  } catch {
    return null;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

async function request<T>(path: string, options: RequestOptions = {}, retryCsrf = true): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  const mutating = !["GET", "HEAD"].includes(method);

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (mutating) {
    const csrf = readCookie("st_csrf") ?? csrfToken;
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(
      "ارتباط با سرور برقرار نشد. اتصال اینترنت یا اجرای سرویس API را بررسی کنید.",
      0,
      "NETWORK_ERROR",
    );
  }

  const text = await response.text();
  let payload: {
    success?: boolean;
    data?: T;
    message?: string;
    code?: string;
    errors?: FieldError[];
  } | null = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (response.status === 403 && payload?.code === "CSRF_FAILED" && mutating && retryCsrf) {
    // Token rotated or unreadable (separate API host): fetch a fresh one once.
    if (await fetchCsrfToken()) {
      return request<T>(path, options, false);
    }
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ?? "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.",
      response.status,
      payload?.code ?? "UNKNOWN",
      payload?.errors ?? [],
    );
  }

  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
};

export function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export function fieldErrorsToMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.fieldErrors.map((item) => [item.field, item.message]));
}
