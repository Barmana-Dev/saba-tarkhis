import { randomBytes } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { conflict, unauthorized } from "../lib/errors";
import { ok } from "../lib/http";
import { hashPassword, verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { emailSchema, mobileSchema, passwordSchema } from "../lib/validators";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  clearAuthCookies,
  requireAuth,
  setAuthCookies,
  setCsrfCookie,
  sha256,
} from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { validateBody } from "../middleware/validate";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !env.rateLimitEnabled,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "تعداد تلاش‌ها بیش از حد مجاز است. چند دقیقه بعد دوباره تلاش کنید.",
  },
});

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید.").max(120),
  mobile: mobileSchema,
  email: z.union([emailSchema, z.literal("")]).optional(),
  password: passwordSchema,
});

const loginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, "رمز عبور را وارد کنید.").max(72),
});

// A real bcrypt hash compared when the mobile is unknown, so both failure paths
// cost the same and cannot be distinguished by response timing.
const DUMMY_PASSWORD_HASH =
  "$2b$12$xwk3eRIXWEUOlcLzdNldLesMCp1Yeo04Cunw9PzFHp4SBx7/Wtcaq";

function publicUser(user: {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function createSession(
  res: Parameters<typeof setAuthCookies>[0],
  userId: string,
  ip: string | undefined,
  userAgent: string | undefined,
) {
  const sessionToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionTtlMs);

  await prisma.session.create({
    data: {
      tokenHash: sha256(sessionToken),
      csrfHash: sha256(csrfToken),
      userId,
      expiresAt,
      ip: ip?.slice(0, 60) ?? null,
      userAgent: userAgent?.slice(0, 200) ?? null,
    },
  });

  setAuthCookies(res, { session: sessionToken, csrf: csrfToken });
  return csrfToken;
}

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { fullName, mobile, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ mobile }, ...(email ? [{ email }] : [])] },
      select: { mobile: true, email: true },
    });
    if (existing) {
      throw conflict(
        existing.mobile === mobile
          ? "این شماره موبایل قبلاً ثبت‌نام کرده است."
          : "این ایمیل قبلاً استفاده شده است.",
      );
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        mobile,
        email: email ? email : null,
        passwordHash: await hashPassword(password),
        // Role is never taken from the client; public registration always creates a customer.
        role: "CUSTOMER",
      },
    });

    const csrfToken = await createSession(res, user.id, req.ip, req.get("user-agent"));
    return ok(
      res,
      { user: publicUser(user), csrfToken },
      "ثبت‌نام با موفقیت انجام شد.",
      201,
    );
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { mobile, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({ where: { mobile } });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    // Same message for unknown mobile and wrong password (no account enumeration).
    if (!user || !valid) {
      throw unauthorized("شماره موبایل یا رمز عبور نادرست است.");
    }
    if (!user.isActive) {
      throw unauthorized("حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید.");
    }

    const csrfToken = await createSession(res, user.id, req.ip, req.get("user-agent"));
    return ok(res, { user: publicUser(user), csrfToken }, "ورود با موفقیت انجام شد.");
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string" && token) {
      await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
    }
    clearAuthCookies(res);
    return ok(res, null, "از حساب خود خارج شدید.");
  }),
);

/**
 * Public session state read by the SPA on load. Unlike /auth/me it always
 * answers 200 and returns `user: null` when signed out, so an anonymous first
 * visit does not trigger a console-visible 401 (and a stale cookie is cleared).
 */
authRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");

    if (!req.user) {
      return ok(res, { user: null });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      clearAuthCookies(res);
      return ok(res, { user: null });
    }

    return ok(res, { user: publicUser(user) });
  }),
);

/**
 * Issues a fresh CSRF token for the current session. The browser can read the
 * CSRF cookie only on the API host, so a SPA served from another host asks for
 * the token here instead of reading `document.cookie`.
 */
authRouter.get(
  "/csrf",
  requireAuth,
  asyncHandler(async (req, res) => {
    const csrfToken = randomBytes(24).toString("base64url");
    await prisma.session.update({
      where: { id: req.authSession!.id },
      data: { csrfHash: sha256(csrfToken) },
    });
    setCsrfCookie(res, csrfToken);
    res.setHeader("Cache-Control", "private, no-store");
    return ok(res, { csrfToken });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      clearAuthCookies(res);
      throw unauthorized();
    }
    return ok(res, {
      user: publicUser(user),
      csrfCookie: CSRF_COOKIE,
    });
  }),
);
