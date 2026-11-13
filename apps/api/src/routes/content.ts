import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { notFound } from "../lib/errors";
import { ok, parsePage } from "../lib/http";
import { prisma } from "../lib/prisma";
import { stripEmpty } from "../lib/validators";
import { asyncHandler } from "../middleware/error";
import { validateBody } from "../middleware/validate";

export const contentRouter = Router();

/** Settings that are safe to expose publicly (never secrets). */
export const PUBLIC_SETTING_KEYS = [
  "company.tagline",
  "company.intro",
  "contact.phone",
  "contact.email",
  "contact.address",
  "contact.hours",
  "contact.instagram",
  "site.notice",
] as const;

contentRouter.get(
  "/services",
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, title: true, excerpt: true, sortOrder: true },
    });
    return ok(res, services);
  }),
);

contentRouter.get(
  "/services/:slug",
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findFirst({
      where: { slug: req.params.slug, isPublished: true },
    });
    if (!service) throw notFound("خدمت موردنظر یافت نشد.");
    return ok(res, service);
  }),
);

const articleListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

contentRouter.get(
  "/articles",
  asyncHandler(async (req, res) => {
    const query = articleListQuery.parse(req.query);
    const { page, pageSize, skip, take } = parsePage(query, 9);

    const where = {
      status: "PUBLISHED" as const,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { excerpt: { contains: query.q, mode: "insensitive" as const } },
              { body: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          publishedAt: true,
          reviewedAt: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return ok(res, {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }),
);

contentRouter.get(
  "/articles/:slug",
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findFirst({
      where: { slug: req.params.slug, status: "PUBLISHED" },
      include: { category: { select: { name: true, slug: true } } },
    });
    if (!article) throw notFound("مقاله موردنظر یافت نشد.");
    return ok(res, article);
  }),
);

contentRouter.get(
  "/article-categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.articleCategory.findMany({ orderBy: { name: "asc" } });
    return ok(res, categories);
  }),
);

contentRouter.get(
  "/faqs",
  asyncHandler(async (_req, res) => {
    const faqs = await prisma.faq.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, question: true, answer: true },
    });
    return ok(res, faqs);
  }),
);

contentRouter.get(
  "/settings/public",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany({
      where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
    });
    const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    return ok(res, map);
  }),
);

export const contactRouter = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isTest ? 1000 : 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !env.rateLimitEnabled,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "تعداد پیام‌های ارسالی بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  },
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "نام را وارد کنید.").max(120),
  mobile: z
    .string()
    .trim()
    .transform((value) =>
      value
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[\s\-()]/g, ""),
    )
    .refine((value) => /^09\d{9}$/.test(value), { message: "شماره موبایل معتبر وارد کنید." }),
  subject: z.string().trim().min(2, "موضوع را وارد کنید.").max(160),
  message: z.string().trim().min(10, "متن پیام حداقل ۱۰ کاراکتر باشد.").max(2000),
  privacyAccepted: z.boolean().refine((value) => value === true, {
    message: "پذیرش سیاست حریم خصوصی الزامی است.",
  }),
});

contactRouter.post(
  "/",
  contactLimiter,
  validateBody(contactSchema),
  asyncHandler(async (req, res) => {
    const payload = stripEmpty(req.body as z.infer<typeof contactSchema>);
    const saved = await prisma.contactMessage.create({
      data: {
        name: payload.name,
        mobile: payload.mobile,
        subject: payload.subject,
        message: payload.message,
      },
    });
    return ok(
      res,
      { id: saved.id },
      "پیام شما ثبت شد. کارشناسان در اولین فرصت پاسخ می‌دهند.",
      201,
    );
  }),
);
