import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // 0 lets the OS pick a free port (some CI runners export PORT=0).
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(30).default(7),
  UPLOAD_DIR: z.string().min(1).default("./storage"),
  // Built SPA directory. When it exists the API also serves the frontend, so the
  // whole app runs on one origin (no nginx rewrite needed).
  WEB_DIST_DIR: z.string().min(1).default("../web/dist"),
  QUARANTINE_DIR: z.string().min(1).default("./storage-quarantine"),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(5),
  MAX_DOCUMENTS_PER_REQUEST: z.coerce.number().int().positive().max(100).default(20),
  MAX_CASE_UPLOAD_MB: z.coerce.number().positive().max(500).default(50),
  MAX_USER_STORAGE_MB: z.coerce.number().positive().max(5000).default(200),
  REQUEST_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(1000).default(10),
  UPLOAD_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(5000).default(20),
  CLAMAV_ENABLED: z.enum(["true", "false"]).optional(),
  CLAMSCAN_PATH: z.string().min(1).default("clamscan"),
  CLAMSCAN_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(20000),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  ENABLE_API_DOCS: z.enum(["true", "false"]).optional(),
  DISABLE_RATE_LIMIT: z.enum(["true", "false"]).optional(),
  TRUST_PROXY: z.enum(["true", "false"]).optional(),
});

// Some shells and CI runners export empty variables (e.g. `PORT=`). Treat those
// as "not set" so the documented default applies instead of a validation error.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  // Configuration problems must stop the process, not fail silently.
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

// Production must never accept unscanned uploads: refuse to start without a scanner.
if (raw.NODE_ENV === "production" && raw.CLAMAV_ENABLED !== "true") {
  console.error(
    "CLAMAV_ENABLED=true is required in production (fail-closed malware scanning). See docs/deployment.md.",
  );
  process.exit(1);
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  // Secure cookies are mandatory in production: the env flag can relax them only
  // outside production, never inside it.
  cookieSecure:
    raw.NODE_ENV === "production" ? true : raw.COOKIE_SECURE === "true",
  rateLimitEnabled: raw.DISABLE_RATE_LIMIT !== "true",
  clamavEnabled: raw.CLAMAV_ENABLED === "true",
  clamscanPath: raw.CLAMSCAN_PATH,
  clamscanTimeoutMs: raw.CLAMSCAN_TIMEOUT_MS,
  requestCreateLimitPerHour: raw.REQUEST_CREATE_LIMIT_PER_HOUR,
  uploadLimitPerHour: raw.UPLOAD_LIMIT_PER_HOUR,
  maxDocumentsPerRequest: raw.MAX_DOCUMENTS_PER_REQUEST,
  maxCaseUploadBytes: Math.round(raw.MAX_CASE_UPLOAD_MB * 1024 * 1024),
  maxUserStorageBytes: Math.round(raw.MAX_USER_STORAGE_MB * 1024 * 1024),
  // Swagger/OpenAPI is a development aid and is off in production unless enabled explicitly.
  apiDocsEnabled: raw.ENABLE_API_DOCS
    ? raw.ENABLE_API_DOCS === "true"
    : raw.NODE_ENV !== "production",
  sessionTtlMs: raw.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  maxUploadBytes: Math.round(raw.MAX_UPLOAD_MB * 1024 * 1024),
  trustProxy: raw.TRUST_PROXY === "true",
};

export type Env = typeof env;
