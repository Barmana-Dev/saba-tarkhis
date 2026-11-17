import { Router } from "express";
import { z } from "zod";
import { conflict, notFound } from "../lib/errors";
import { ok } from "../lib/http";
import { prisma } from "../lib/prisma";
import { emailSchema } from "../lib/validators";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { validateBody } from "../middleware/validate";

export const usersRouter = Router();

// Every field is optional so a PATCH only touches what the client sent.
const updateMeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "نام و نام خانوادگی را کامل وارد کنید.")
    .max(120)
    .optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
});

usersRouter.patch(
  "/me",
  requireAuth,
  validateBody(updateMeSchema),
  asyncHandler(async (req, res) => {
    const { fullName, email } = req.body as z.infer<typeof updateMeSchema>;

    if (email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user!.id } },
        select: { id: true },
      });
      if (taken) {
        throw conflict("این ایمیل قبلاً برای حساب دیگری استفاده شده است.");
      }
    }

    // A missing email means "leave it alone"; an empty string clears it.
    const changes: { fullName?: string; email?: string | null } = {};
    if (fullName !== undefined) changes.fullName = fullName;
    if (email !== undefined) changes.email = email ? email : null;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: changes,
    });

    return ok(
      res,
      {
        id: user.id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
      "اطلاعات حساب شما به‌روزرسانی شد.",
    );
  }),
);

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw notFound("حساب کاربری یافت نشد.");
    return ok(res, {
      id: user.id,
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  }),
);
