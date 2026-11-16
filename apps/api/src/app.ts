import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { ok } from "./lib/http";
import { openApiSpec } from "./openapi";
import {
  csrfProtection,
  enforceTrustedOrigin,
  loadSession,
} from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { contactRouter, contentRouter } from "./routes/content";
import { notificationsRouter } from "./routes/notifications";
import { requestsRouter } from "./routes/requests";
import { usersRouter } from "./routes/users";

const webDistDir = path.resolve(process.cwd(), env.WEB_DIST_DIR);
const webIndexFile = path.join(webDistDir, "index.html");
// Tests must never serve a stray build from the developer's machine.
const webBuildAvailable = !env.isTest && fs.existsSync(webIndexFile);

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy ? 1 : false);

  // Swagger UI is a development aid: disabled in production unless ENABLE_API_DOCS=true.
  // It is mounted before Helmet so its bundled inline init script is not blocked by the API CSP.
  if (env.apiDocsEnabled) {
    app.get("/api/docs/openapi.json", (_req, res) => res.json(openApiSpec));
    app.use(
      "/api/docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, { customSiteTitle: "Saba Tarkhis API" }),
    );
  }

  // One policy for the whole origin: the SPA needs its own assets and inline
  // styles, and the API only ever answers with JSON, so a single CSP covers both.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          // Helmet adds upgrade-insecure-requests by default; that breaks plain
          // HTTP previews, so it is enabled only for real production.
          upgradeInsecureRequests: env.isProduction ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
      hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      origin: env.APP_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
      maxAge: 600,
    }),
  );

  // Single-origin deployment: when a web build exists, this process serves the
  // SPA too, so the browser keeps first-party cookies and cookies stay SameSite.
  // Registered before session/CSRF middleware so static files never touch the DB.
  if (webBuildAvailable) {
    app.use(
      express.static(webDistDir, {
        index: false,
        // Assets carry a content hash, so they can be cached forever; the HTML
        // shell must never be cached or clients keep an old bundle.
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          } else {
            res.setHeader("Cache-Control", "public, max-age=604800");
          }
        },
      }),
    );

    // Client-side routes fall back to the SPA shell; /api/* keeps its JSON 404.
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(webIndexFile);
    });
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));
  app.use(cookieParser());

  app.use(enforceTrustedOrigin);
  app.use(loadSession);
  app.use(csrfProtection);

  app.get("/api/v1/health", (_req, res) =>
    ok(res, { status: "ok", time: new Date().toISOString() }),
  );

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/contact", contactRouter);
  app.use("/api/v1/requests", requestsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/admin", adminRouter);
  // Public content lives at /api/v1/services, /articles, /faqs, /settings/public.
  app.use("/api/v1", contentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
