/**
 * Seed script. All people, phone numbers, prices and documents are fake demo data.
 * Never use these credentials or values in production.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { env } from "../src/config/env";
import { buildSamplePdf } from "./sample-pdf";

const prisma = new PrismaClient();

const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo@12345";

async function seedUsers() {
  const passwordHash = await hashPassword(demoPassword);

  const admin = await prisma.user.upsert({
    where: { mobile: "09120000001" },
    update: { role: "ADMIN", passwordHash },
    create: {
      fullName: "مدیر نمونه (دمو)",
      mobile: "09120000001",
      email: "admin@demo.sabatarkhis.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  const expert = await prisma.user.upsert({
    where: { mobile: "09120000002" },
    update: { role: "EXPERT", passwordHash },
    create: {
      fullName: "کارشناس نمونه (دمو)",
      mobile: "09120000002",
      email: "expert@demo.sabatarkhis.local",
      passwordHash,
      role: "EXPERT",
    },
  });

  const customer = await prisma.user.upsert({
    where: { mobile: "09120000003" },
    update: { passwordHash },
    create: {
      fullName: "مشتری نمونه (دمو)",
      mobile: "09120000003",
      email: "customer@demo.sabatarkhis.local",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const secondCustomer = await prisma.user.upsert({
    where: { mobile: "09120000004" },
    update: { passwordHash },
    create: {
      fullName: "مشتری دوم (دمو)",
      mobile: "09120000004",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  return { admin, expert, customer, secondCustomer };
}

const services = [
  {
    slug: "clearance-from-customs",
    title: "ترخیص کالا از گمرک",
    excerpt:
      "همراهی در بررسی پرونده، آماده‌سازی اسناد و پیشبرد تشریفات ترخیص بر اساس نوع کالا و رویه روز.",
    body:
      "ترخیص کالا مجموعه‌ای از اقدامات برای خروج قانونی کالا از گمرک است. نوع کالا، رویه تجاری، کشور مبدأ و مقررات جاری تعیین می‌کند چه مدارکی لازم است.\n\nدر صبا ترخیص، ابتدا اطلاعات محموله و اسناد موجود بررسی می‌شود، سپس فهرست مدارک موردنیاز و مراحل پیش‌رو به شما اعلام می‌شود. هرگونه ارزیابی تعرفه یا هزینه، مبنای رسمی محاسبه حقوق گمرکی نیست و فقط برای هماهنگی اولیه است.\n\nبرای شروع، می‌توانید درخواست خود را در سامانه ثبت کنید تا کارشناس، پرونده را بررسی کند.",
    sortOrder: 1,
    isPublished: true,
  },
  {
    slug: "customs-document-review",
    title: "مشاوره و بررسی اسناد گمرکی",
    excerpt:
      "کنترل اولیه پیش‌فاکتور، فاکتور تجاری، عدل‌بندی، بارنامه و سایر اسناد رایج پرونده.",
    body:
      "بسیاری از تأخیرها ناشی از ناسازگاری میان اسناد تجاری و اطلاعات محموله است. بررسی اولیه اسناد می‌تواند مغایرت‌ها را پیش از شروع تشریفات مشخص کند.\n\nاین بررسی جایگزین ارزیابی رسمی گمرک نیست و نتیجه نهایی درباره پذیرش اسناد، در اختیار مراجع رسمی است. برای بررسی، مدارک موجود خود را در پرونده بارگذاری کنید.",
    sortOrder: 2,
    isPublished: true,
  },
  {
    slug: "order-registration-guidance",
    title: "راهنمای ثبت سفارش و مجوزهای مرتبط",
    excerpt:
      "شناخت مسیر ثبت سفارش و مجوزهای احتمالی بر اساس نوع کالا و مقررات جاری.",
    body:
      "ثبت سفارش و دریافت مجوزها از الزامات برخی کالاها پیش از ترخیص است. این الزامات به ردیف تعرفه، نوع کالا و مقررات روز وابسته است.\n\nما مسیر کلی و مدارک رایج را توضیح می‌دهیم و در صورت نیاز، شما را به منابع رسمی ارجاع می‌دهیم. مسئولیت تأیید نهایی الزامات قانونی بر عهده مراجع رسمی و واردکننده است.",
    sortOrder: 3,
    isPublished: true,
  },
  {
    slug: "import-export-guidance",
    title: "راهنمای واردات و صادرات",
    excerpt:
      "آشنایی با تفاوت رویه‌های واردات، صادرات و نکات اسنادی هر مسیر.",
    body:
      "واردات و صادرات از نظر اسناد، مجوزها و تشریفات تفاوت دارند. انتخاب نادرست رویه می‌تواند باعث توقف پرونده شود.\n\nدرخواست مشاوره ثبت کنید و اطلاعات محموله را وارد کنید تا مسیر مناسب و مدارک موردنیاز به‌صورت اولیه بررسی شود.",
    sortOrder: 4,
    isPublished: true,
  },
  {
    slug: "hs-code-review",
    title: "بررسی اولیه ردیف تعرفه و مدارک",
    excerpt:
      "کمک به شناسایی ردیف تعرفه پیشنهادی و مدارک مرتبط، با تأکید بر تأیید نهایی توسط مراجع رسمی.",
    body:
      "ردیف تعرفه (HS Code) تعیین‌کننده الزامات، مجوزها و مبنای محاسبات گمرکی است. تشخیص آن نیازمند اطلاعات فنی دقیق کالا است.\n\nبررسی ما اولیه و مشورتی است؛ کد نهایی و تفسیر آن باید توسط مراجع رسمی یا کارشناس دارای صلاحیت تأیید شود. وارد کردن کد در فرم درخواست نیز به معنی تأیید کارشناسی آن نیست.",
    sortOrder: 5,
    isPublished: true,
  },
  {
    slug: "transit-process-guidance",
    title: "راهنمای فرایندهای ترانزیت",
    excerpt:
      "این خدمت در انتظار تأیید کارفرما است و فعلاً در سایت منتشر نشده است.",
    body:
      "محتوای این خدمت باید توسط کارفرما تأیید شود. تا زمان تأیید رسمی، این صفحه در سایت عمومی نمایش داده نمی‌شود.",
    sortOrder: 6,
    isPublished: false,
  },
];

const articleCategories = [
  { name: "آشنایی با ترخیص", slug: "clearance-basics" },
  { name: "مدارک و اسناد", slug: "documents" },
  { name: "اصطلاحات گمرکی", slug: "customs-terms" },
];

const articles = [
  {
    slug: "what-is-customs-clearance",
    title: "ترخیص کالا چیست و چه مراحلی دارد؟",
    excerpt:
      "مروری عمومی بر مفهوم ترخیص کالا، ترتیب کلی مراحل و نکاتی که پیش از شروع کار باید بدانید.",
    categorySlug: "clearance-basics",
    status: "PUBLISHED" as const,
    body:
      "ترخیص کالا فرایند خروج قانونی کالا از گمرک است. این فرایند معمولاً از بررسی نوع کالا و رویه تجاری آغاز می‌شود و با آماده‌سازی اسناد، طی تشریفات و تحویل کالا ادامه می‌یابد.\n\nمراحل دقیق و ترتیب آن‌ها به نوع کالا، کشور مبدأ، رویه (واردات، صادرات یا ترانزیت) و مقررات جاری بستگی دارد. به همین دلیل، هیچ فهرست ثابتی برای همه پرونده‌ها وجود ندارد.\n\nپیش از شروع، بهتر است اطلاعات پایه محموله و اسناد موجود را جمع‌آوری کنید. در صفحه «مراحل ترخیص» این مسیر به‌صورت آموزشی توضیح داده شده است. توجه کنید که این توضیحات راهنمای عمومی است و جای مشاوره تخصصی پرونده را نمی‌گیرد.",
    sourceName: "سایت گمرک جمهوری اسلامی ایران",
    sourceUrl: "https://www.irica.ir/",
    daysAgo: 12,
  },
  {
    slug: "common-clearance-documents",
    title: "مدارک رایج ترخیص کالا؛ از پیش‌فاکتور تا بارنامه",
    excerpt:
      "فهرست آموزشی مدارکی که در بسیاری از پرونده‌ها خواسته می‌شود و دلیل اهمیت هر یک.",
    categorySlug: "documents",
    status: "PUBLISHED" as const,
    body:
      "در بسیاری از پرونده‌های ترخیص، اسنادی مانند پیش‌فاکتور، فاکتور تجاری، فهرست عدل‌بندی، بارنامه و گواهی مبدأ بررسی می‌شود. بسته به نوع کالا و رویه، مدارک دیگری مانند مجوزها یا ثبت سفارش نیز ممکن است لازم باشد.\n\nهمخوانی اطلاعات میان این اسناد اهمیت زیادی دارد؛ اختلاف در وزن، تعداد، ارزش یا شرح کالا می‌تواند روند کار را متوقف کند.\n\nاین فهرست آموزشی است و الزام قطعی همه پرونده‌ها نیست. فهرست نهایی مدارک باید بر اساس پرونده و مقررات روز تعیین شود. راهنمای کامل مدارک در صفحه «راهنمای مدارک» آمده است.",
    sourceName: "سایت گمرک جمهوری اسلامی ایران",
    sourceUrl: "https://www.irica.ir/",
    daysAgo: 20,
  },
  {
    slug: "what-is-hs-code",
    title: "کد تعرفه گمرکی (HS Code) چیست؟",
    excerpt:
      "توضیح نقش ردیف تعرفه در تعیین الزامات و مدارک، و علت اهمیت تأیید کارشناسی آن.",
    categorySlug: "customs-terms",
    status: "PUBLISHED" as const,
    body:
      "کد تعرفه یا HS Code یک طبقه‌بندی بین‌المللی برای کالاها است. این کد در تعیین الزامات، مجوزهای احتمالی و مبنای محاسبات گمرکی نقش دارد.\n\nانتخاب کد نیازمند شناخت فنی کالا، مواد سازنده، کاربرد و گاهی مستندات تکمیلی است. یک اشتباه در انتخاب ردیف می‌تواند باعث اصلاح پرونده یا توقف آن شود.\n\nاگر کد تعرفه را می‌دانید، می‌توانید آن را در فرم درخواست وارد کنید؛ اما وارد کردن کد به معنای تأیید کارشناسی آن توسط صبا ترخیص نیست. تأیید نهایی بر عهده مراجع رسمی است.",
    sourceName: "سامانه جامع تجارت ایران",
    sourceUrl: "https://www.ntsw.ir/",
    daysAgo: 30,
  },
  {
    slug: "transit-basics",
    title: "ترانزیت کالا: مفاهیم پایه (پیش‌نویس)",
    excerpt: "این مقاله پیش‌نویس است و پس از بازبینی تخصصی منتشر می‌شود.",
    categorySlug: "clearance-basics",
    status: "DRAFT" as const,
    body:
      "این متن پیش‌نویس است و در سایت عمومی نمایش داده نمی‌شود. پس از بازبینی تخصصی و تأیید کارفرما منتشر خواهد شد.",
    sourceName: null,
    sourceUrl: null,
    daysAgo: 2,
  },
];

const faqs = [
  {
    question: "ترخیص کالا چیست؟",
    answer:
      "ترخیص کالا فرایند انجام تشریفات قانونی برای خروج کالا از گمرک است. مراحل و مدارک آن بر اساس نوع کالا، رویه تجاری و مقررات جاری تعیین می‌شود.",
    sortOrder: 1,
  },
  {
    question: "برای شروع درخواست ترخیص چه اطلاعاتی لازم است؟",
    answer:
      "شرح کالا، رویه موردنظر (واردات، صادرات یا ترانزیت)، کشور مبدأ و مقصد، روش حمل و در صورت اطلاع، کد تعرفه و ارزش تقریبی. هرچه اطلاعات دقیق‌تر باشد، بررسی اولیه بهتر انجام می‌شود.",
    sortOrder: 2,
  },
  {
    question: "چه مدارکی معمولاً برای ترخیص لازم است؟",
    answer:
      "پیش‌فاکتور، فاکتور تجاری، فهرست عدل‌بندی، بارنامه و گواهی مبدأ در بسیاری از پرونده‌ها بررسی می‌شود. بسته به کالا و رویه، مجوزها یا ثبت سفارش هم ممکن است لازم باشد. فهرست نهایی پس از بررسی پرونده اعلام می‌شود.",
    sortOrder: 3,
  },
  {
    question: "مدت فرایند ترخیص به چه چیزهایی بستگی دارد؟",
    answer:
      "نوع کالا، کامل بودن اسناد، الزامات مجوزها، رویه گمرکی و مقررات روز بر مدت فرایند اثر می‌گذارند. به همین دلیل هیچ مدت تضمینی برای همه پرونده‌ها قابل اعلام نیست.",
    sortOrder: 4,
  },
  {
    question: "هزینه ترخیص چگونه برآورد می‌شود؟",
    answer:
      "برآورد هزینه به نوع کالا، ردیف تعرفه، ارزش، روش حمل و خدمات موردنیاز وابسته است. هر برآوردی که در این سامانه ثبت شود، غیررسمی و برای هماهنگی اولیه است و جای محاسبه رسمی حقوق و عوارض گمرکی را نمی‌گیرد.",
    sortOrder: 5,
  },
  {
    question: "چگونه وضعیت درخواست خود را در صبا ترخیص پیگیری کنم؟",
    answer:
      "پس از ثبت درخواست، یک شناسه پیگیری داخلی دریافت می‌کنید. با ورود به حساب کاربری، در بخش «پرونده‌های من» می‌توانید وضعیت، پیام‌ها و مدارک پرونده را ببینید.",
    sortOrder: 6,
  },
  {
    question: "چه تفاوتی بین پیگیری داخل صبا ترخیص و سامانه‌های رسمی گمرکی وجود دارد؟",
    answer:
      "وضعیت‌های نمایش‌داده‌شده در این سامانه، وضعیت رسیدگی داخلی شرکت به پرونده شما هستند. این سامانه به سامانه‌های رسمی گمرک، EPL یا سامانه جامع تجارت متصل نیست و وضعیت رسمی پرونده محسوب نمی‌شود.",
    sortOrder: 7,
  },
];

const settings = [
  ["company.tagline", "خدمات تخصصی ترخیص کالا و مشاوره امور گمرکی"],
  ["company.intro", "صبا ترخیص، همراه شما در بررسی اسناد و پیشبرد پرونده‌های ترخیص کالا."],
  ["contact.phone", "نیازمند تأیید کارفرما"],
  ["contact.email", "نیازمند تأیید کارفرما"],
  ["contact.address", "نیازمند تأیید کارفرما"],
  ["contact.hours", "نیازمند تأیید کارفرما"],
  ["contact.instagram", "نیازمند تأیید کارفرما"],
  [
    "site.notice",
    "وضعیت‌های نمایش‌داده‌شده، وضعیت رسیدگی داخلی شرکت صبا ترخیص هستند و به معنی رویداد رسمی گمرکی یا اتصال به سامانه‌های دولتی نیستند.",
  ],
];

async function seedContent() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  const categoryIds = new Map<string, string>();
  for (const category of articleCategories) {
    const row = await prisma.articleCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const article of articles) {
    const publishedAt =
      article.status === "PUBLISHED" ? new Date(Date.now() - article.daysAgo * 86400000) : null;
    const data = {
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      categoryId: categoryIds.get(article.categorySlug) ?? null,
      status: article.status,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      publishedAt,
      reviewedAt: new Date(Date.now() - article.daysAgo * 86400000),
    };
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: data,
      create: { slug: article.slug, ...data },
    });
  }

  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (existing) {
      await prisma.faq.update({ where: { id: existing.id }, data: faq });
    } else {
      await prisma.faq.create({ data: { ...faq, isPublished: true } });
    }
  }

  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

async function seedRequests(ids: {
  admin: string;
  expert: string;
  customer: string;
  secondCustomer: string;
}) {
  const existing = await prisma.clearanceRequest.count();
  if (existing > 0) return;

  const year = new Date().getFullYear();
  const samples = [
    {
      trackingCode: `ST-${year}-000001`,
      userId: ids.customer,
      applicantType: "COMPANY" as const,
      applicantName: "شرکت نمونه بازرگانی (دمو)",
      goodsDescription: "قطعات یدکی صنعتی — نمونه دمو",
      category: "قطعات ماشین‌آلات",
      hsCode: "84839000",
      procedureType: "IMPORT" as const,
      originCountry: "آلمان",
      destinationCountry: "ایران",
      customsLocation: "گمرک تهران",
      transportMode: "AIR" as const,
      quantity: "120",
      quantityUnit: "کارتن",
      estimatedValue: "25000",
      currency: "EUR",
      cargoStatus: "کالا در فرودگاه مبدأ آماده ارسال است.",
      notes: "این پرونده صرفاً داده نمونه برای نمایش سامانه است.",
      status: "UNDER_REVIEW" as const,
      assignedExpertId: ids.expert,
      daysAgo: 6,
    },
    {
      trackingCode: `ST-${year}-000002`,
      userId: ids.customer,
      applicantType: "INDIVIDUAL" as const,
      preferredContact: "MOBILE",
      goodsDescription: "دستگاه آزمایشگاهی نمونه دمو",
      procedureType: "IMPORT" as const,
      originCountry: "چین",
      destinationCountry: "ایران",
      customsLocation: "بندرعباس",
      transportMode: "SEA" as const,
      estimatedValue: "12000",
      currency: "USD",
      notes: "منتظر اعلام فهرست مدارک تکمیلی هستم.",
      status: "NEED_MORE_INFO" as const,
      assignedExpertId: ids.expert,
      daysAgo: 11,
    },
    {
      trackingCode: `ST-${year}-000003`,
      userId: ids.secondCustomer,
      applicantType: "COMPANY" as const,
      applicantName: "بازرگانی دوم (دمو)",
      goodsDescription: "مواد بسته‌بندی — نمونه دمو",
      procedureType: "IMPORT" as const,
      originCountry: "ترکیه",
      destinationCountry: "ایران",
      customsLocation: "گمرک بازرگان",
      transportMode: "ROAD" as const,
      quantity: "3",
      quantityUnit: "کامیون",
      status: "IN_PROGRESS" as const,
      assignedExpertId: ids.expert,
      daysAgo: 18,
    },
  ];

  await mkdir(path.join(env.UPLOAD_DIR, "requests"), { recursive: true });

  for (const sample of samples) {
    const { daysAgo, ...data } = sample;
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    const row = await prisma.clearanceRequest.create({
      data: {
        ...data,
        notes: data.notes ?? null,
        createdAt,
        updatedAt: createdAt,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "SUBMITTED",
            changedById: sample.userId,
            reason: "ثبت درخواست توسط مشتری",
            createdAt,
          },
        },
      },
    });

    if (sample.status !== "SUBMITTED") {
      await prisma.requestStatusHistory.create({
        data: {
          requestId: row.id,
          fromStatus: "SUBMITTED",
          toStatus: sample.status,
          changedById: ids.expert,
          reason: "بررسی اولیه پرونده (داده نمونه)",
          createdAt: new Date(createdAt.getTime() + 86400000),
        },
      });
    }

    if (sample.status === "NEED_MORE_INFO") {
      await prisma.requestComment.create({
        data: {
          requestId: row.id,
          authorId: ids.expert,
          body: "برای ادامه بررسی، لطفاً فهرست عدل‌بندی و تصویر بارنامه را بارگذاری کنید.",
          visibility: "PUBLIC",
          createdAt: new Date(createdAt.getTime() + 2 * 86400000),
        },
      });
      await prisma.requestComment.create({
        data: {
          requestId: row.id,
          authorId: ids.expert,
          body: "یادداشت داخلی نمونه: ارزش اظهارشده نیاز به کنترل دارد.",
          visibility: "INTERNAL",
          createdAt: new Date(createdAt.getTime() + 2 * 86400000),
        },
      });
    }

    // Attach one synthetic sample PDF to the first request.
    if (data.trackingCode.endsWith("000001")) {
      const storageKey = path.posix.join("requests", row.id, `${randomUUID()}.pdf`);
      const absolute = path.join(env.UPLOAD_DIR, storageKey);
      await mkdir(path.dirname(absolute), { recursive: true });
      const pdf = buildSamplePdf("SABA TARKHIS - Demo sample document");
      await writeFile(absolute, pdf, { mode: 0o600 });
      await prisma.requestDocument.create({
        data: {
          requestId: row.id,
          uploadedById: sample.userId,
          fileName: "proforma-sample.pdf",
          storageKey,
          mimeType: "application/pdf",
          fileSize: pdf.length,
          // Trusted demo fixture, not a customer upload.
          scanStatus: "CLEAN",
          scanEngine: "seed-demo",
          scannedAt: new Date(),
          createdAt,
        },
      });
    }
  }

  await prisma.contactMessage.createMany({
    data: [
      {
        name: "پیام‌دهنده نمونه یک (دمو)",
        mobile: "09120000005",
        subject: "سؤال درباره مدارک واردات",
        message: "این پیام نمونه برای نمایش صندوق پیام‌های تماس است.",
      },
      {
        name: "پیام‌دهنده نمونه دو (دمو)",
        mobile: "09120000006",
        subject: "درخواست مشاوره اولیه",
        message: "این پیام نمونه دوم برای نمایش وضعیت رسیدگی پیام‌هاست.",
        status: "RESOLVED",
      },
    ],
  });
}

async function main() {
  const ids = await seedUsers();
  await seedContent();
  await seedRequests({
    admin: ids.admin.id,
    expert: ids.expert.id,
    customer: ids.customer.id,
    secondCustomer: ids.secondCustomer.id,
  });

  console.log("\nSeed completed.");
  console.log("Demo accounts (development only):");
  console.log(`  ADMIN    mobile 09120000001 / password ${demoPassword}`);
  console.log(`  EXPERT   mobile 09120000002 / password ${demoPassword}`);
  console.log(`  CUSTOMER mobile 09120000003 / password ${demoPassword}`);
  console.log(`  CUSTOMER mobile 09120000004 / password ${demoPassword}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
