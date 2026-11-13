import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../lib/errors";
import { ok, parsePage } from "../lib/http";
import { prisma } from "../lib/prisma";
import { audit } from "../lib/audit";
import { assertTransition, statusLabels } from "../lib/status";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { parseOrThrow, validateBody } from "../middleware/validate";
import { loadAccessibleRequest, serializeRequestDetail } from "./requests";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN", "EXPERT"));

const statusValues = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEED_MORE_INFO",
  "QUOTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

const listQuerySchema = z.object({
  status: z.enum(statusValues).optional(),
  q: z.string().trim().max(80).optional(),
  expertId: z.string().trim().max(40).optional(),
  from: z.string().trim().max(30).optional(),
  to: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

adminRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const query = parseOrThrow(listQuerySchema, req.query, "پارامترهای جست‌وجو معتبر نیستند.");
    const { page, pageSize, skip, take } = parsePage(query, 10);

    const where: Prisma.ClearanceRequestWhereInput = {
      // Experts only ever see the cases assigned to them.
      ...(user.role === "EXPERT" ? { assignedExpertId: user.id } : {}),
      ...(user.role === "ADMIN" && query.expertId
        ? { assignedExpertId: query.expertId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { trackingCode: { contains: query.q, mode: "insensitive" } },
              { goodsDescription: { contains: query.q, mode: "insensitive" } },
              { user: { fullName: { contains: query.q, mode: "insensitive" } } },
              { user: { mobile: { contains: query.q } } },
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
          user: { select: { id: true, fullName: true, mobile: true } },
          assignedExpert: { select: { id: true, fullName: true } },
          _count: { select: { documents: true, comments: true } },
        },
      }),
      prisma.clearanceRequest.count({ where }),
      prisma.clearanceRequest.groupBy({
        by: ["status"],
        where: user.role === "EXPERT" ? { assignedExpertId: user.id } : {},
        _count: { _all: true },
      }),
    ]);

    const summary = Object.fromEntries(
      statusValues.map((status) => [status, 0]),
    ) as Record<(typeof statusValues)[number], number>;
    for (const group of grouped) summary[group.status] = group._count._all;

    return ok(res, {
      items: items.map((item) => ({ ...item, statusLabel: statusLabels[item.status] })),
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

adminRouter.get(
  "/requests/:id",
  asyncHandler(async (req, res) => {
    const row = await loadAccessibleRequest(req.params.id, req.user!);
    return ok(res, serializeRequestDetail(row, req.user!.role));
  }),
);

const statusSchema = z.object({
  status: z.enum(statusValues),
  reason: z.string().trim().max(500).optional(),
});

adminRouter.patch(
  "/requests/:id/status",
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const row = await loadAccessibleRequest(req.params.id, user);
    const { status, reason } = req.body as z.infer<typeof statusSchema>;

    if (user.role === "EXPERT" && row.assignedExpertId !== user.id) {
      throw notFound("درخواست موردنظر یافت نشد.");
    }
    assertTransition(row.status, status);

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.clearanceRequest.update({
        where: { id: row.id },
        data: { status },
        select: { id: true, status: true, updatedAt: true },
      });
      await tx.requestStatusHistory.create({
        data: {
          requestId: row.id,
          fromStatus: row.status,
          toStatus: status,
          changedById: user.id,
          reason: reason ?? null,
        },
      });
      await audit(
        {
          actorId: user.id,
          action: "REQUEST_STATUS_CHANGED",
          entityType: "ClearanceRequest",
          entityId: row.id,
          metadata: { from: row.status, to: status, reason: reason ?? null },
        },
        tx,
      );
      return changed;
    });

    return ok(
      res,
      { ...updated, statusLabel: statusLabels[updated.status] },
      "وضعیت درخواست به‌روزرسانی شد و در تاریخچه ثبت گردید.",
    );
  }),
);

const assignSchema = z.object({
  expertId: z.string().trim().min(1).nullable(),
});

adminRouter.patch(
  "/requests/:id/assign",
  requireRole("ADMIN"),
  validateBody(assignSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const row = await loadAccessibleRequest(req.params.id, user);
    const { expertId } = req.body as z.infer<typeof assignSchema>;

    if (expertId) {
      const expert = await prisma.user.findFirst({
        where: { id: expertId, role: "EXPERT", isActive: true },
        select: { id: true, fullName: true },
      });
      if (!expert) throw badRequest("کارشناس انتخاب‌شده معتبر یا فعال نیست.");
    }

    const updated = await prisma.clearanceRequest.update({
      where: { id: row.id },
      data: { assignedExpertId: expertId },
      select: {
        id: true,
        assignedExpertId: true,
        assignedExpert: { select: { id: true, fullName: true } },
      },
    });

    await audit({
      actorId: user.id,
      action: "REQUEST_ASSIGNED",
      entityType: "ClearanceRequest",
      entityId: row.id,
      metadata: { previousExpertId: row.assignedExpertId, expertId },
    });

    return ok(res, updated, expertId ? "پرونده به کارشناس تخصیص یافت." : "تخصیص کارشناس برداشته شد.");
  }),
);

const quoteSchema = z.object({
  quoteNote: z.string().trim().min(3, "متن پیشنهاد را وارد کنید.").max(2000),
  markAsQuoted: z.boolean().optional().default(true),
});

adminRouter.patch(
  "/requests/:id/quote",
  validateBody(quoteSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const row = await loadAccessibleRequest(req.params.id, user);
    const { quoteNote, markAsQuoted } = req.body as z.infer<typeof quoteSchema>;

    const canQuote = row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "QUOTED";
    if (markAsQuoted && !canQuote) {
      throw badRequest("در این وضعیت امکان ثبت پیشنهاد جدید وجود ندارد.");
    }

    const nextStatus = markAsQuoted ? "QUOTED" : row.status;

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.clearanceRequest.update({
        where: { id: row.id },
        data: { quoteNote, ...(markAsQuoted ? { status: nextStatus } : {}) },
        select: { id: true, quoteNote: true, status: true, updatedAt: true },
      });
      if (markAsQuoted && nextStatus !== row.status) {
        await tx.requestStatusHistory.create({
          data: {
            requestId: row.id,
            fromStatus: row.status,
            toStatus: nextStatus,
            changedById: user.id,
            reason: "ثبت پیشنهاد خدمات",
          },
        });
      }
      await audit(
        {
          actorId: user.id,
          action: "REQUEST_QUOTE_UPDATED",
          entityType: "ClearanceRequest",
          entityId: row.id,
          metadata: { markAsQuoted, status: nextStatus },
        },
        tx,
      );
      return changed;
    });

    return ok(
      res,
      { ...updated, statusLabel: statusLabels[updated.status] },
      "پیشنهاد خدمات ثبت شد.",
    );
  }),
);

adminRouter.get(
  "/experts",
  asyncHandler(async (_req, res) => {
    const experts = await prisma.user.findMany({
      where: { role: "EXPERT", isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    });
    return ok(res, experts);
  }),
);

// ---------------------------------------------------------------- statistics

adminRouter.get(
  "/stats",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        from: z.string().trim().max(30).optional(),
        to: z.string().trim().max(30).optional(),
      })
      .parse(req.query);

    const from = query.from ? new Date(query.from) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
    const range = { gte: from, lte: to };

    const [total, byStatus, byProcedure, contactByStatus, newUsers, rangeRequests, recent] =
      await Promise.all([
        prisma.clearanceRequest.count(),
        prisma.clearanceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.clearanceRequest.groupBy({ by: ["procedureType"], _count: { _all: true } }),
        prisma.contactMessage.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.user.count({ where: { createdAt: range } }),
        prisma.clearanceRequest.findMany({
          where: { createdAt: range },
          select: { createdAt: true, status: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.clearanceRequest.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            trackingCode: true,
            goodsDescription: true,
            status: true,
            createdAt: true,
            user: { select: { fullName: true } },
          },
        }),
      ]);

    const statusSummary = Object.fromEntries(statusValues.map((status) => [status, 0]));
    for (const group of byStatus) statusSummary[group.status] = group._count._all;

    const dailyMap = new Map<string, number>();
    for (const item of rangeRequests) {
      const key = item.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }

    return ok(res, {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        requests: total,
        requestsInRange: rangeRequests.length,
        newUsersInRange: newUsers,
        contactMessages: contactByStatus.reduce((sum, group) => sum + group._count._all, 0),
        contactByStatus: Object.fromEntries(contactByStatus.map((g) => [g.status, g._count._all])),
      },
      byStatus: statusSummary,
      byProcedure: Object.fromEntries(byProcedure.map((g) => [g.procedureType, g._count._all])),
      daily: [...dailyMap.entries()].map(([date, count]) => ({ date, count })),
      recent,
    });
  }),
);

// -------------------------------------------------------------------- users

adminRouter.get(
  "/users",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        q: z.string().trim().max(80).optional(),
        role: z.enum(["CUSTOMER", "EXPERT", "ADMIN"]).optional(),
        page: z.coerce.number().int().positive().optional(),
        pageSize: z.coerce.number().int().positive().max(50).optional(),
      })
      .parse(req.query);
    const { page, pageSize, skip, take } = parsePage(query, 10);

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: "insensitive" } },
              { mobile: { contains: query.q } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { requests: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok(res, {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }),
);

adminRouter.patch(
  "/users/:id",
  requireRole("ADMIN"),
  validateBody(
    z.object({
      role: z.enum(["CUSTOMER", "EXPERT", "ADMIN"]).optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const targetId = req.params.id;
    const changes = req.body as { role?: "CUSTOMER" | "EXPERT" | "ADMIN"; isActive?: boolean };

    if (targetId === actor.id && (changes.role || changes.isActive === false)) {
      throw badRequest("امکان تغییر نقش یا غیرفعال‌سازی حساب خودتان وجود ندارد.");
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw notFound("کاربر موردنظر یافت نشد.");

    if (target.role === "ADMIN" && changes.role && changes.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) throw conflict("حداقل یک مدیر فعال باید در سامانه باقی بماند.");
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(changes.role ? { role: changes.role } : {}),
        ...(typeof changes.isActive === "boolean" ? { isActive: changes.isActive } : {}),
      },
      select: { id: true, fullName: true, role: true, isActive: true },
    });

    await audit({
      actorId: actor.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: targetId,
      metadata: { ...changes },
    });

    // Deactivating a user must also end their active sessions.
    if (changes.isActive === false) {
      await prisma.session.deleteMany({ where: { userId: targetId } });
    }

    return ok(res, updated, "اطلاعات کاربر به‌روزرسانی شد.");
  }),
);

// ---------------------------------------------------------------------- CMS

const slugSchema = z
  .string()
  .trim()
  .min(2, "نامک را وارد کنید.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "نامک فقط شامل حروف کوچک انگلیسی، عدد و خط تیره باشد.");

const serviceSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2, "عنوان خدمت را وارد کنید.").max(160),
  excerpt: z.string().trim().min(10, "توضیح کوتاه را کامل‌تر بنویسید.").max(400),
  body: z.string().trim().min(20, "متن خدمت را کامل‌تر بنویسید.").max(20000),
  isPublished: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

adminRouter.get(
  "/services",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return ok(res, services);
  }),
);

adminRouter.post(
  "/services",
  requireRole("ADMIN"),
  validateBody(serviceSchema),
  asyncHandler(async (req, res) => {
    const created = await prisma.service.create({ data: req.body });
    await audit({
      actorId: req.user!.id,
      action: "SERVICE_CREATED",
      entityType: "Service",
      entityId: created.id,
    });
    return ok(res, created, "خدمت ایجاد شد.", 201);
  }),
);

adminRouter.patch(
  "/services/:id",
  requireRole("ADMIN"),
  validateBody(serviceSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await audit({
      actorId: req.user!.id,
      action: "SERVICE_UPDATED",
      entityType: "Service",
      entityId: updated.id,
    });
    return ok(res, updated, "خدمت به‌روزرسانی شد.");
  }),
);

adminRouter.delete(
  "/services/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.service.delete({ where: { id: req.params.id } });
    await audit({
      actorId: req.user!.id,
      action: "SERVICE_DELETED",
      entityType: "Service",
      entityId: req.params.id,
    });
    return ok(res, null, "خدمت حذف شد.");
  }),
);

const articleSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3, "عنوان مقاله را وارد کنید.").max(200),
  excerpt: z.string().trim().min(10, "خلاصه مقاله را کامل‌تر بنویسید.").max(500),
  body: z.string().trim().min(20, "متن مقاله را کامل‌تر بنویسید.").max(40000),
  categoryId: z.string().trim().max(40).nullable().optional(),
  coverImage: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  sourceName: z.string().trim().max(160).nullable().optional(),
  sourceUrl: z.string().trim().max(500).nullable().optional(),
  reviewedAt: z.string().trim().max(40).nullable().optional(),
});

adminRouter.get(
  "/articles",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    return ok(res, articles);
  }),
);

adminRouter.post(
  "/articles",
  requireRole("ADMIN"),
  validateBody(articleSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof articleSchema>;
    const created = await prisma.article.create({
      data: {
        ...payload,
        publishedAt: payload.status === "PUBLISHED" ? new Date() : null,
        reviewedAt: payload.reviewedAt ? new Date(payload.reviewedAt) : null,
      },
    });
    await audit({
      actorId: req.user!.id,
      action: "ARTICLE_CREATED",
      entityType: "Article",
      entityId: created.id,
    });
    return ok(res, created, "مقاله ایجاد شد.", 201);
  }),
);

adminRouter.patch(
  "/articles/:id",
  requireRole("ADMIN"),
  validateBody(articleSchema.partial()),
  asyncHandler(async (req, res) => {
    const payload = req.body as Partial<z.infer<typeof articleSchema>>;
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("مقاله موردنظر یافت نشد.");

    const updated = await prisma.article.update({
      where: { id: existing.id },
      data: {
        ...payload,
        ...(payload.reviewedAt !== undefined
          ? { reviewedAt: payload.reviewedAt ? new Date(payload.reviewedAt) : null }
          : {}),
        ...(payload.status === "PUBLISHED" && !existing.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
    });
    await audit({
      actorId: req.user!.id,
      action: "ARTICLE_UPDATED",
      entityType: "Article",
      entityId: updated.id,
    });
    return ok(res, updated, "مقاله به‌روزرسانی شد.");
  }),
);

adminRouter.delete(
  "/articles/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.article.delete({ where: { id: req.params.id } });
    await audit({
      actorId: req.user!.id,
      action: "ARTICLE_DELETED",
      entityType: "Article",
      entityId: req.params.id,
    });
    return ok(res, null, "مقاله حذف شد.");
  }),
);

adminRouter.post(
  "/article-categories",
  requireRole("ADMIN"),
  validateBody(
    z.object({
      name: z.string().trim().min(2, "نام دسته را وارد کنید.").max(80),
      slug: slugSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const created = await prisma.articleCategory.create({ data: req.body });
    return ok(res, created, "دسته‌بندی ایجاد شد.", 201);
  }),
);

adminRouter.get(
  "/article-categories",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.articleCategory.findMany({ orderBy: { name: "asc" } });
    return ok(res, categories);
  }),
);

const faqSchema = z.object({
  question: z.string().trim().min(5, "پرسش را وارد کنید.").max(300),
  answer: z.string().trim().min(10, "پاسخ را کامل‌تر بنویسید.").max(5000),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

adminRouter.get(
  "/faqs",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const faqs = await prisma.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return ok(res, faqs);
  }),
);

adminRouter.post(
  "/faqs",
  requireRole("ADMIN"),
  validateBody(faqSchema),
  asyncHandler(async (req, res) => {
    const created = await prisma.faq.create({ data: req.body });
    await audit({
      actorId: req.user!.id,
      action: "FAQ_CREATED",
      entityType: "Faq",
      entityId: created.id,
    });
    return ok(res, created, "پرسش متداول ایجاد شد.", 201);
  }),
);

adminRouter.patch(
  "/faqs/:id",
  requireRole("ADMIN"),
  validateBody(faqSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await prisma.faq.update({ where: { id: req.params.id }, data: req.body });
    await audit({
      actorId: req.user!.id,
      action: "FAQ_UPDATED",
      entityType: "Faq",
      entityId: updated.id,
    });
    return ok(res, updated, "پرسش متداول به‌روزرسانی شد.");
  }),
);

adminRouter.delete(
  "/faqs/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.faq.delete({ where: { id: req.params.id } });
    return ok(res, null, "پرسش متداول حذف شد.");
  }),
);

adminRouter.get(
  "/contact-messages",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
        page: z.coerce.number().int().positive().optional(),
        pageSize: z.coerce.number().int().positive().max(50).optional(),
      })
      .parse(req.query);
    const { page, pageSize, skip, take } = parsePage(query, 10);

    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.contactMessage.count({ where }),
    ]);

    return ok(res, {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }),
);

adminRouter.patch(
  "/contact-messages/:id",
  requireRole("ADMIN"),
  validateBody(z.object({ status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]) })),
  asyncHandler(async (req, res) => {
    const updated = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status: (req.body as { status: "NEW" | "IN_PROGRESS" | "RESOLVED" }).status },
    });
    await audit({
      actorId: req.user!.id,
      action: "CONTACT_STATUS_CHANGED",
      entityType: "ContactMessage",
      entityId: updated.id,
      metadata: { status: updated.status },
    });
    return ok(res, updated, "وضعیت پیام به‌روزرسانی شد.");
  }),
);

adminRouter.get(
  "/settings",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return ok(res, Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
  }),
);

adminRouter.patch(
  "/settings",
  requireRole("ADMIN"),
  validateBody(
    z.object({
      settings: z.record(
        z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9.]+$/),
        z.string().max(2000),
      ),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { settings } = req.body as { settings: Record<string, string> };
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    await audit({
      actorId: req.user!.id,
      action: "SETTINGS_UPDATED",
      entityType: "Setting",
      metadata: { keys: Object.keys(settings) },
    });
    return ok(res, settings, "تنظیمات به‌روزرسانی شد.");
  }),
);

adminRouter.get(
  "/audit-logs",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { id: true, fullName: true } } },
    });
    return ok(res, logs);
  }),
);

adminRouter.use((_req, _res, next) => next(notFound("مسیر مدیریتی یافت نشد.")));
