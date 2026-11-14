import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { Prisma, RequestStatus, Role } from "@prisma/client";
import { env } from "../config/env";
import { badRequest, forbidden, notFound } from "../lib/errors";
import {
  removeStoredFile,
  resolveStoragePath,
  saveRequestFile,
  type SavedFile,
} from "../lib/files";
import { ok, parsePage } from "../lib/http";
import { prisma } from "../lib/prisma";
import { nextTrackingCode } from "../lib/tracking";
import { buildIranDateRange } from "../lib/dates";
import { stripEmpty } from "../lib/validators";
import { canAccessRequest, requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { parseOrThrow } from "../middleware/validate";
import { assertTransition, statusLabels } from "../lib/status";

export const requestsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 4 },
});

// Limits are keyed by the authenticated user, never by a client-supplied value.
function rateLimitMessage(message: string) {
  return { success: false, code: "RATE_LIMITED", message };
}

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.requestCreateLimitPerHour,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !env.rateLimitEnabled,
  keyGenerator: (req: Request) => `user:${req.user!.id}`,
  message: rateLimitMessage(
    "تعداد درخواست‌های ثبت‌شده در یک ساعت بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
  ),
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.uploadLimitPerHour,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !env.rateLimitEnabled,
  keyGenerator: (req: Request) => `user:${req.user!.id}`,
  message: rateLimitMessage(
    "تعداد بارگذاری فایل در یک ساعت بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
  ),
});

function assertCaseBudget(existingDocuments: { fileSize: number }[], newSize: number) {
  if (existingDocuments.length >= env.maxDocumentsPerRequest) {
    throw badRequest(
      `تعداد مدارک این پرونده به سقف مجاز (${env.maxDocumentsPerRequest} فایل) رسیده است.`,
    );
  }
  const totalBytes =
    existingDocuments.reduce((sum, document) => sum + document.fileSize, 0) + newSize;
  if (totalBytes > env.maxCaseUploadBytes) {
    throw badRequest(
      `حجم مجموع مدارک این پرونده نباید بیشتر از ${env.maxCaseUploadBytes / (1024 * 1024)} مگابایت باشد.`,
    );
  }
}

/**
 * Persists a document row only when the per-case and per-account budgets still
 * allow it. The account row is locked for the duration of the transaction, so
 * two parallel uploads of the same user cannot both pass the check and exceed
 * the quota (a separate pre-check would race).
 */
async function persistDocument(input: {
  requestId: string;
  ownerUserId: string;
  uploadedById: string;
  file: SavedFile;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${input.ownerUserId} FOR UPDATE`;

    const existing = await tx.requestDocument.findMany({
      where: { requestId: input.requestId },
      select: { fileSize: true },
    });
    assertCaseBudget(existing, input.file.fileSize);

    const aggregate = await tx.requestDocument.aggregate({
      where: { request: { userId: input.ownerUserId } },
      _sum: { fileSize: true },
    });
    const used = aggregate._sum.fileSize ?? 0;
    if (used + input.file.fileSize > env.maxUserStorageBytes) {
      throw badRequest(
        `حجم کل مدارک حساب شما از سقف مجاز (${env.maxUserStorageBytes / (1024 * 1024)} مگابایت) بیشتر می‌شود.`,
      );
    }

    return tx.requestDocument.create({
      data: {
        requestId: input.requestId,
        uploadedById: input.uploadedById,
        fileName: input.file.fileName,
        storageKey: input.file.storageKey,
        mimeType: input.file.mimeType,
        fileSize: input.file.fileSize,
        scanStatus: input.file.scanStatus,
        scanEngine: input.file.scanEngine,
        scannedAt: input.file.scannedAt,
      },
    });
  });
}

export const detailInclude = {
  documents: { orderBy: { createdAt: "asc" } },
  comments: {
    include: { author: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
  statusHistory: {
    include: { changedBy: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
  assignedExpert: { select: { id: true, fullName: true } },
  user: { select: { id: true, fullName: true, mobile: true, email: true } },
} satisfies Prisma.ClearanceRequestInclude;

export type RequestDetailRow = Prisma.ClearanceRequestGetPayload<{ include: typeof detailInclude }>;

const numericText = /^[0-9۰-۹]+([.,][0-9۰-۹]{1,3})?$/;

export const clearanceRequestSchema = z.object({
  applicantType: z.enum(["INDIVIDUAL", "COMPANY"]),
  applicantName: z.string().trim().max(160).optional(),
  preferredContact: z.enum(["MOBILE", "EMAIL"]).default("MOBILE"),
  goodsDescription: z
    .string()
    .trim()
    .min(3, "شرح کالا را وارد کنید.")
    .max(2000, "شرح کالا بیش از حد طولانی است."),
  category: z.string().trim().max(120).optional(),
  hsCode: z
    .string()
    .trim()
    .regex(/^[0-9۰-۹]{4,10}$/, "کد تعرفه باید بین ۴ تا ۱۰ رقم باشد.")
    .optional(),
  procedureType: z.enum(["IMPORT", "EXPORT", "TRANSIT", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
  originCountry: z.string().trim().max(80).optional(),
  destinationCountry: z.string().trim().max(80).optional(),
  customsLocation: z.string().trim().max(120).optional(),
  transportMode: z.enum(["SEA", "ROAD", "AIR", "RAIL", "UNKNOWN"]).default("UNKNOWN"),
  quantity: z.string().trim().regex(numericText, "مقدار باید عددی باشد.").optional(),
  quantityUnit: z.string().trim().max(30).optional(),
  estimatedValue: z.string().trim().regex(numericText, "ارزش تقریبی باید عددی باشد.").optional(),
  currency: z.enum(["IRR", "USD", "EUR", "AED", "CNY", "OTHER"]).optional(),
  cargoStatus: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(4000, "توضیحات بیش از حد طولانی است.").optional(),
  privacyAccepted: z.boolean().refine((value) => value === true, {
    message: "تأیید صحت اطلاعات و پذیرش سیاست حریم خصوصی الزامی است.",
  }),
});

const commentSchema = z.object({
  body: z.string().trim().min(2, "متن پیام را وارد کنید.").max(3000),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).optional(),
});

export function serializeDocument(document: RequestDetailRow["documents"][number]) {
  return {
    id: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    createdAt: document.createdAt,
    downloadUrl: `/api/v1/requests/${document.requestId}/documents/${document.id}/download`,
  };
}

export function serializeRequestDetail(row: RequestDetailRow, role: Role) {
  const internal = role !== "CUSTOMER";
  const { documents, comments, statusHistory, assignedExpert, user, ...base } = row;

  return {
    ...base,
    statusLabel: statusLabels[row.status],
    documents: documents.map(serializeDocument),
    comments: comments
      .filter((comment) => internal || comment.visibility === "PUBLIC")
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt,
        author: comment.author,
      })),
    statusHistory: statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      toStatusLabel: statusLabels[entry.toStatus],
      reason: entry.reason,
      createdAt: entry.createdAt,
      changedBy: entry.changedBy,
    })),
    assignedExpert: internal ? assignedExpert : undefined,
    customer: internal ? user : undefined,
  };
}

export async function loadAccessibleRequest(
  id: string,
  user: NonNullable<Express.Request["user"]>,
): Promise<RequestDetailRow> {
  const row = await prisma.clearanceRequest.findUnique({ where: { id }, include: detailInclude });
  // Not-found (rather than 403) avoids confirming that someone else's case exists.
  if (!row || !canAccessRequest(user, row)) {
    throw notFound("درخواست موردنظر یافت نشد.");
  }
  return row;
}

function parseSubmitPayload(body: unknown): unknown {
  if (body && typeof body === "object" && "payload" in body) {
    const raw = (body as { payload?: unknown }).payload;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        throw badRequest("ساختار اطلاعات ارسالی معتبر نیست.");
      }
    }
    return raw;
  }
  return body;
}

requestsRouter.post(
  "/",
  requireAuth,
  requireRole("CUSTOMER"),
  createLimiter,
  upload.array("files", 4),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const parsed = parseOrThrow(clearanceRequestSchema, parseSubmitPayload(req.body));
    const payload = stripEmpty(parsed);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    // Validate every file before touching the database.
    for (const file of files) {
      if (file.size > env.maxUploadBytes) {
        throw badRequest(
          `حجم هر فایل نباید بیشتر از ${env.maxUploadBytes / (1024 * 1024)} مگابایت باشد.`,
        );
      }
    }
    const totalNewBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalNewBytes > env.maxCaseUploadBytes) {
      throw badRequest(
        `حجم مجموع مدارک نباید بیشتر از ${env.maxCaseUploadBytes / (1024 * 1024)} مگابایت باشد.`,
      );
    }

    let created: { id: string; trackingCode: string } | null = null;

    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const trackingCode = await nextTrackingCode(tx);
          const row = await tx.clearanceRequest.create({
            data: {
              trackingCode,
              userId: user.id,
              applicantType: payload.applicantType,
              applicantName: payload.applicantName ?? null,
              preferredContact: payload.preferredContact,
              goodsDescription: payload.goodsDescription,
              category: payload.category ?? null,
              hsCode: payload.hsCode ?? null,
              procedureType: payload.procedureType,
              originCountry: payload.originCountry ?? null,
              destinationCountry: payload.destinationCountry ?? null,
              customsLocation: payload.customsLocation ?? null,
              transportMode: payload.transportMode,
              quantity: payload.quantity ?? null,
              quantityUnit: payload.quantityUnit ?? null,
              estimatedValue: payload.estimatedValue ?? null,
              currency: payload.currency ?? null,
              cargoStatus: payload.cargoStatus ?? null,
              notes: payload.notes ?? null,
              status: "SUBMITTED",
            },
            select: { id: true, trackingCode: true },
          });
          await tx.requestStatusHistory.create({
            data: {
              requestId: row.id,
              fromStatus: null,
              toStatus: "SUBMITTED",
              changedById: user.id,
              reason: "ثبت درخواست توسط مشتری",
            },
          });
          return row;
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002" && attempt < 4) continue;
        throw error;
      }
    }

    if (!created) {
      throw badRequest("ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید.");
    }

    const savedKeys: string[] = [];
    try {
      for (const file of files) {
        const saved = await saveRequestFile(file, created.id);
        savedKeys.push(saved.storageKey);
        await persistDocument({
          requestId: created.id,
          ownerUserId: user.id,
          uploadedById: user.id,
          file: saved,
        });
      }
    } catch (error) {
      await Promise.all(savedKeys.map((key) => removeStoredFile(key)));
      await prisma.clearanceRequest.delete({ where: { id: created.id } });
      throw error;
    }

    const row = await prisma.clearanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      include: detailInclude,
    });

    return ok(
      res,
      serializeRequestDetail(row, user.role),
      "درخواست شما با موفقیت ثبت شد. شناسه پیگیری برای شما نمایش داده می‌شود.",
      201,
    );
  }),
);

requestsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== "CUSTOMER") {
      throw forbidden("فهرست درخواست‌های شخصی فقط برای مشتریان در دسترس است.");
    }

    const query = z
      .object({
        status: z
          .enum([
            "SUBMITTED",
            "UNDER_REVIEW",
            "NEED_MORE_INFO",
            "QUOTED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
          ])
          .optional(),
        q: z.string().trim().max(80).optional(),
        from: z.string().trim().max(30).optional(),
        to: z.string().trim().max(30).optional(),
        page: z.coerce.number().int().positive().optional(),
        pageSize: z.coerce.number().int().positive().max(50).optional(),
      })
      .parse(req.query);

    const { page, pageSize, skip, take } = parsePage(query, 8);
    const dateRange = buildIranDateRange(query.from, query.to);
    const dateFilter = dateRange ? { createdAt: dateRange } : {};

    const where: Prisma.ClearanceRequestWhereInput = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
      ...dateFilter,
      ...(query.q
        ? {
            OR: [
              { trackingCode: { contains: query.q, mode: "insensitive" } },
              { goodsDescription: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total, grouped] = await Promise.all([
      prisma.clearanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          trackingCode: true,
          goodsDescription: true,
          procedureType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { documents: true, comments: true } },
        },
      }),
      prisma.clearanceRequest.count({ where }),
      prisma.clearanceRequest.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
    ]);

    const summary = Object.fromEntries(
      Object.keys(statusLabels).map((status) => [status, 0]),
    ) as Record<RequestStatus, number>;
    for (const group of grouped) {
      summary[group.status] = group._count._all;
    }

    return ok(res, {
      items: items.map((item) => ({
        ...item,
        statusLabel: statusLabels[item.status],
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        summary,
      },
    });
  }),
);

requestsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await loadAccessibleRequest(req.params.id, req.user!);
    return ok(res, serializeRequestDetail(row, req.user!.role));
  }),
);

requestsRouter.post(
  "/:id/documents",
  requireAuth,
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const row = await loadAccessibleRequest(req.params.id, user);

    if (!req.file) {
      throw badRequest("فایلی برای بارگذاری انتخاب نشده است.");
    }
    // Cheap pre-check for a friendly early error; the authoritative, race-safe
    // check happens inside persistDocument.
    assertCaseBudget(row.documents, req.file.size);

    const saved = await saveRequestFile(req.file, row.id);
    try {
      const document = await persistDocument({
        requestId: row.id,
        ownerUserId: row.userId,
        uploadedById: user.id,
        file: saved,
      });
      return ok(res, serializeDocument({ ...document, requestId: row.id }), "مدرک با موفقیت بارگذاری شد.", 201);
    } catch (error) {
      await removeStoredFile(saved.storageKey);
      throw error;
    }
  }),
);

requestsRouter.get(
  "/:id/documents/:documentId/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await loadAccessibleRequest(req.params.id, req.user!);
    const document = row.documents.find((item) => item.id === req.params.documentId);
    // Unscanned, infected or failed documents are never served.
    if (!document || document.scanStatus !== "CLEAN") throw notFound("مدرک موردنظر یافت نشد.");

    let buffer: Buffer;
    try {
      buffer = await readFile(resolveStoragePath(document.storageKey));
    } catch {
      throw notFound("فایل این مدرک در سامانه موجود نیست.");
    }

    const encodedName = encodeURIComponent(document.fileName);
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(buffer);
  }),
);

requestsRouter.post(
  "/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const row = await loadAccessibleRequest(req.params.id, user);
    const payload = parseOrThrow(commentSchema, req.body);

    // Customers can only ever write messages that are visible to them.
    const visibility =
      user.role === "CUSTOMER" ? "PUBLIC" : (payload.visibility ?? "PUBLIC");

    const comment = await prisma.requestComment.create({
      data: {
        requestId: row.id,
        authorId: user.id,
        body: payload.body,
        visibility,
      },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    });

    return ok(
      res,
      {
        id: comment.id,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt,
        author: comment.author,
      },
      "پیام شما ثبت شد.",
      201,
    );
  }),
);

export { assertTransition };
