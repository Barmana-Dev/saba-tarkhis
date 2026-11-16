import { Router } from "express";
import { notFound } from "../lib/errors";
import { ok } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const listSelect = {
  id: true,
  requestId: true,
  type: true,
  title: true,
  body: true,
  readAt: true,
  createdAt: true,
} as const;

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: listSelect,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return ok(res, { items, unreadCount });
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    // updateMany keeps the ownership check in the same query, so another user's
    // id can never be marked as read.
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await prisma.notification.findFirst({
        where: { id: req.params.id, userId },
        select: { id: true },
      });
      if (!exists) throw notFound("اعلان موردنظر یافت نشد.");
    }
    return ok(res, { id: req.params.id, read: true });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok(res, { updated: result.count }, "همه اعلان‌ها خوانده شدند.");
  }),
);
