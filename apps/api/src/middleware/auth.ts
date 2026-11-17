import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import { AppError, forbidden, unauthorized } from "../lib/errors";
import { prisma } from "../lib/prisma";

export const SESSION_COOKIE = "st_session";
export const CSRF_COOKIE = "st_csrf";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function clearAuthCookies(res: Response) {
  const base = { path: "/", sameSite: "lax" as const, secure: env.cookieSecure };
  res.clearCookie(SESSION_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

export function setAuthCookies(
  res: Response,
  tokens: { session: string; csrf: string },
  ttlMs: number = env.sessionTtlMs,
) {
  res.cookie(SESSION_COOKIE, tokens.session, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: ttlMs,
  });
  // Readable by the SPA so it can send the double-submit CSRF header.
  setCsrfCookie(res, tokens.csrf, ttlMs);
}

/** Writes the readable CSRF cookie (the session cookie stays HttpOnly). */
export function setCsrfCookie(res: Response, token: string, ttlMs: number = env.sessionTtlMs) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: ttlMs,
  });
}

/** Loads the server-side session (if any) and attaches the current user. */
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 20) {
    return next();
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      // A dead session must not keep the browser holding a stale cookie: with it
      // in place the CSRF check rejects even anonymous requests (contact form,
      // logout). Drop the cookie and the orphaned row, then continue signed out.
      clearAuthCookies(res);
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return next();
    }

    // Authenticated payloads are private and must never be cached by shared caches.
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");

    req.authSession = { id: session.id, csrfHash: session.csrfHash };
    req.user = {
      id: session.user.id,
      fullName: session.user.fullName,
      mobile: session.user.mobile,
      email: session.user.email,
      role: session.user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || !req.authSession) {
    return next(unauthorized());
  }
  return next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}

/**
 * Rejects state-changing requests coming from a foreign browser origin.
 * Non-browser clients (curl, server-to-server, tests) send no Origin header.
 */
export function enforceTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const origin = req.get("origin");
  if (origin && origin !== env.APP_ORIGIN) {
    return next(forbidden("مبدأ درخواست معتبر نیست."));
  }
  return next();
}

/**
 * Double-submit CSRF check bound to the server-side session:
 * the header token must hash to the value stored with the session.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const hasSessionCookie = Boolean(req.cookies?.[SESSION_COOKIE]);
  if (!hasSessionCookie) {
    return next();
  }
  if (!req.authSession) {
    clearAuthCookies(res);
    return next(unauthorized("نشست شما منقضی شده است. دوباره وارد شوید."));
  }

  const provided = req.get("x-csrf-token");
  if (!provided) {
    return next(new AppError(403, "CSRF_FAILED", "درخواست فاقد توکن امنیتی معتبر است."));
  }

  const providedHash = Buffer.from(sha256(provided));
  const expectedHash = Buffer.from(req.authSession.csrfHash);
  const valid =
    providedHash.length === expectedHash.length && timingSafeEqual(providedHash, expectedHash);

  if (!valid) {
    return next(new AppError(403, "CSRF_FAILED", "درخواست فاقد توکن امنیتی معتبر است."));
  }
  return next();
}

export function canAccessRequest(
  user: Express.Request["user"],
  request: { userId: string; assignedExpertId: string | null },
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "EXPERT") return request.assignedExpertId === user.id;
  return request.userId === user.id;
}
