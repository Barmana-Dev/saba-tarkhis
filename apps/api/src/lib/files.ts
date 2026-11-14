import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { AppError, badRequest } from "./errors";
import { ScannerUnavailableError, scanFile } from "./scan";

export const ALLOWED_UPLOAD_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export type AllowedMime = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

const extensionByMime: Record<AllowedMime, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const quarantineRoot = path.resolve(process.cwd(), env.QUARANTINE_DIR);

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((byte, index) => buffer[index] === byte);
}

/** Verifies the real file signature, not just the declared content type. */
function detectMime(buffer: Buffer): AllowedMime | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return "application/pdf";
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  return null;
}

export function safeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]/g, "").trim();
  const limited = base.slice(0, 180);
  return limited.length > 0 ? limited : "document";
}

export function assertSafeUpload(file: Express.Multer.File): AllowedMime {
  if (file.size <= 0) {
    throw badRequest("فایل ارسالی خالی است.");
  }
  if (file.size > env.maxUploadBytes) {
    throw badRequest(
      `حجم هر فایل نباید بیشتر از ${env.maxUploadBytes / (1024 * 1024)} مگابایت باشد.`,
    );
  }
  const detected = detectMime(file.buffer);
  if (!detected) {
    throw badRequest("فقط فایل‌های PDF، JPG و PNG قابل بارگذاری هستند.");
  }
  return detected;
}

export type SavedFile = {
  storageKey: string;
  mimeType: AllowedMime;
  fileSize: number;
  fileName: string;
  scanStatus: "CLEAN";
  scanEngine: string;
  scannedAt: Date;
};

/**
 * Quarantines the upload, scans it, and only then moves it into private storage.
 * A missing/failed scanner rejects the upload (503) and removes the temp file;
 * an infected file is rejected (400) and never reaches the download directory.
 */
export async function saveRequestFile(
  file: Express.Multer.File,
  requestId: string,
): Promise<SavedFile> {
  const mimeType = assertSafeUpload(file);
  const directory = path.join(uploadRoot, "requests", requestId);
  const storageKey = path.posix.join(
    "requests",
    requestId,
    `${randomUUID()}.${extensionByMime[mimeType]}`,
  );
  const absolutePath = resolveStoragePath(storageKey);
  const tempPath = path.join(
    quarantineRoot,
    `pending-${randomUUID()}.${extensionByMime[mimeType]}`,
  );

  await mkdir(quarantineRoot, { recursive: true, mode: 0o700 });
  await writeFile(tempPath, file.buffer, { mode: 0o600 });

  let scanEngine = "disabled";
  try {
    if (env.clamavEnabled) {
      const result = await scanFile(tempPath);
      scanEngine = result.engine;
      if (result.status === "INFECTED") {
        throw badRequest("فایل بارگذاری‌شده توسط موتور اسکن به‌عنوان تهدید شناسایی شد و ذخیره نشد.");
      }
    }

    await mkdir(directory, { recursive: true });
    await moveIntoStorage(tempPath, absolutePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    if (error instanceof ScannerUnavailableError) {
      throw new AppError(
        503,
        "SCAN_UNAVAILABLE",
        "سامانه بررسی امنیتی فایل در دسترس نیست. لطفاً چند دقیقه بعد دوباره تلاش کنید.",
      );
    }
    throw error;
  }

  return {
    storageKey,
    mimeType,
    fileSize: file.size,
    fileName: safeOriginalName(file.originalname),
    scanStatus: "CLEAN",
    scanEngine,
    scannedAt: new Date(),
  };
}

/**
 * Moves a scanned file out of quarantine. The two directories can live on
 * different filesystems (e.g. two Docker volumes), where `rename` fails with
 * EXDEV; in that case copy the bytes and drop the quarantine file.
 */
async function moveIntoStorage(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
  }
  await copyFile(from, to);
  await unlink(from).catch(() => undefined);
}

/** Prevents path traversal outside the private upload root. */
export function resolveStoragePath(storageKey: string): string {
  const absolutePath = path.resolve(uploadRoot, storageKey);
  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw badRequest("مسیر فایل معتبر نیست.");
  }
  return absolutePath;
}

export async function removeStoredFile(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch {
    // Best-effort cleanup; a missing file must not break the request flow.
  }
}
