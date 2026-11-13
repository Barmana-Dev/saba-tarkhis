const successEnvelope = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: {},
    message: { type: "string" },
  },
} as const;

const errorEnvelope = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    code: { type: "string", example: "VALIDATION_ERROR" },
    message: { type: "string" },
    errors: { type: "array", items: { type: "object" } },
  },
} as const;

const requestStatusEnum = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEED_MORE_INFO",
  "QUOTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function okResponse(description: string) {
  return {
    description,
    content: { "application/json": { schema: successEnvelope } },
  };
}

function errorResponses(...codes: number[]) {
  return Object.fromEntries(
    codes.map((code) => [
      String(code),
      {
        description: code === 400 ? "اعتبارسنجی" : code === 401 ? "نیاز به ورود" : code === 403 ? "عدم دسترسی" : code === 404 ? "یافت نشد" : "خطا",
        content: { "application/json": { schema: errorEnvelope } },
      },
    ]),
  );
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Saba Tarkhis API",
    version: "1.0.0",
    description:
      "API سامانه داخلی صبا ترخیص. وضعیت‌های پرونده، وضعیت رسیدگی داخلی شرکت هستند و به معنی رویداد رسمی گمرکی نیستند.",
  },
  servers: [{ url: "/api/v1" }],
  tags: [
    { name: "Auth" },
    { name: "Content" },
    { name: "Requests" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "st_session" },
    },
    schemas: {
      RequestStatus: { type: "string", enum: requestStatusEnum },
      RegisterInput: {
        type: "object",
        required: ["fullName", "mobile", "password"],
        properties: {
          fullName: { type: "string", example: "کاربر نمونه" },
          mobile: { type: "string", example: "09120000000" },
          email: { type: "string", example: "user@example.com" },
          password: { type: "string", example: "Demo@12345" },
        },
      },
      LoginInput: {
        type: "object",
        required: ["mobile", "password"],
        properties: {
          mobile: { type: "string", example: "09120000000" },
          password: { type: "string", example: "Demo@12345" },
        },
      },
      ClearanceRequestInput: {
        type: "object",
        required: ["applicantType", "goodsDescription", "privacyAccepted"],
        properties: {
          applicantType: { type: "string", enum: ["INDIVIDUAL", "COMPANY"] },
          applicantName: { type: "string" },
          preferredContact: { type: "string", enum: ["MOBILE", "EMAIL"] },
          goodsDescription: { type: "string", example: "قطعات یدکی صنعتی" },
          category: { type: "string" },
          hsCode: { type: "string", example: "84839000" },
          procedureType: { type: "string", enum: ["IMPORT", "EXPORT", "TRANSIT", "OTHER", "UNKNOWN"] },
          originCountry: { type: "string" },
          destinationCountry: { type: "string" },
          customsLocation: { type: "string" },
          transportMode: { type: "string", enum: ["SEA", "ROAD", "AIR", "RAIL", "UNKNOWN"] },
          quantity: { type: "string", example: "120" },
          quantityUnit: { type: "string", example: "کارتن" },
          estimatedValue: { type: "string", example: "25000" },
          currency: { type: "string", enum: ["IRR", "USD", "EUR", "AED", "CNY", "OTHER"] },
          cargoStatus: { type: "string" },
          notes: { type: "string" },
          privacyAccepted: { type: "boolean", enum: [true] },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    "/health": {
      get: { tags: ["Auth"], summary: "بررسی سلامت سرویس", responses: { "200": okResponse("سالم") } },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "ثبت‌نام مشتری (نقش همیشه CUSTOMER است)",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" } } },
        },
        responses: { "201": okResponse("ثبت‌نام موفق"), ...errorResponses(400, 409, 429) },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "ورود و ایجاد نشست HttpOnly",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } } },
        },
        responses: { "200": okResponse("ورود موفق"), ...errorResponses(400, 401, 429) },
      },
    },
    "/auth/logout": {
      post: { tags: ["Auth"], summary: "خروج و حذف نشست", responses: { "200": okResponse("خروج موفق") } },
    },
    "/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "وضعیت نشست برای SPA؛ برای کاربر مهمان ۲۰۰ با user=null",
        security: [],
        responses: { "200": okResponse("کاربر جاری یا null") },
      },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "اطلاعات حساب جاری", responses: { "200": okResponse("کاربر"), ...errorResponses(401) } },
    },
    "/users/me": {
      patch: {
        tags: ["Auth"],
        summary: "ویرایش نام و ایمیل",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { fullName: { type: "string" }, email: { type: "string" } } },
            },
          },
        },
        responses: { "200": okResponse("به‌روزرسانی"), ...errorResponses(400, 401, 409) },
      },
    },
    "/services": {
      get: { tags: ["Content"], summary: "خدمات منتشرشده", security: [], responses: { "200": okResponse("فهرست خدمات") } },
    },
    "/services/{slug}": {
      get: {
        tags: ["Content"],
        summary: "جزئیات خدمت",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": okResponse("خدمت"), ...errorResponses(404) },
      },
    },
    "/articles": {
      get: {
        tags: ["Content"],
        summary: "مقالات منتشرشده با جست‌وجو و صفحه‌بندی",
        security: [],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "pageSize", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": okResponse("فهرست مقالات") },
      },
    },
    "/articles/{slug}": {
      get: {
        tags: ["Content"],
        summary: "جزئیات مقاله منتشرشده",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": okResponse("مقاله"), ...errorResponses(404) },
      },
    },
    "/faqs": {
      get: { tags: ["Content"], summary: "پرسش‌های متداول", security: [], responses: { "200": okResponse("فهرست") } },
    },
    "/contact": {
      post: {
        tags: ["Content"],
        summary: "ثبت پیام تماس (با محدودیت نرخ)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "mobile", "subject", "message", "privacyAccepted"],
                properties: {
                  name: { type: "string" },
                  mobile: { type: "string" },
                  subject: { type: "string" },
                  message: { type: "string" },
                  privacyAccepted: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "201": okResponse("ثبت شد"), ...errorResponses(400, 429) },
      },
    },
    "/requests": {
      post: {
        tags: ["Requests"],
        summary: "ثبت درخواست ترخیص (JSON یا multipart با فیلد payload و files)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ClearanceRequestInput" } },
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  payload: { type: "string", description: "JSON مطابق ClearanceRequestInput" },
                  files: { type: "array", items: { type: "string", format: "binary" } },
                },
              },
            },
          },
        },
        responses: { "201": okResponse("ثبت شد"), ...errorResponses(400, 401, 403) },
      },
      get: {
        tags: ["Requests"],
        summary: "فهرست درخواست‌های شخصی مشتری",
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/RequestStatus" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": okResponse("فهرست"), ...errorResponses(401, 403) },
      },
    },
    "/requests/{id}": {
      get: {
        tags: ["Requests"],
        summary: "جزئیات پرونده (فقط مالک/کارشناس مجاز/مدیر)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": okResponse("پرونده"), ...errorResponses(401, 404) },
      },
    },
    "/requests/{id}/documents": {
      post: {
        tags: ["Requests"],
        summary: "بارگذاری مدرک (PDF/JPG/PNG، حداکثر ۵ مگابایت)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { "201": okResponse("بارگذاری شد"), ...errorResponses(400, 401, 404) },
      },
    },
    "/requests/{id}/documents/{documentId}/download": {
      get: {
        tags: ["Requests"],
        summary: "دریافت محافظت‌شده مدرک",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "فایل" }, ...errorResponses(401, 404) },
      },
    },
    "/requests/{id}/comments": {
      post: {
        tags: ["Requests"],
        summary: "افزودن پیام؛ مشتری همیشه پیام عمومی می‌نویسد",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string" },
                  visibility: { type: "string", enum: ["PUBLIC", "INTERNAL"] },
                },
              },
            },
          },
        },
        responses: { "201": okResponse("ثبت شد"), ...errorResponses(400, 401, 404) },
      },
    },
    "/admin/requests": {
      get: {
        tags: ["Admin"],
        summary: "فهرست پرونده‌ها با فیلتر، جست‌وجو و صفحه‌بندی",
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/RequestStatus" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "page", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": okResponse("فهرست"), ...errorResponses(401, 403) },
      },
    },
    "/admin/requests/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "تغییر وضعیت + ثبت تاریخچه و ممیزی",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { $ref: "#/components/schemas/RequestStatus" },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": okResponse("به‌روزرسانی"), ...errorResponses(400, 401, 403, 404) },
      },
    },
    "/admin/requests/{id}/assign": {
      patch: {
        tags: ["Admin"],
        summary: "تخصیص کارشناس (فقط مدیر)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["expertId"],
                properties: { expertId: { type: "string", nullable: true } },
              },
            },
          },
        },
        responses: { "200": okResponse("تخصیص"), ...errorResponses(400, 401, 403, 404) },
      },
    },
    "/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "آمار واقعی پرونده‌ها (فقط مدیر)",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": okResponse("آمار"), ...errorResponses(401, 403) },
      },
    },
    "/admin/services": {
      get: { tags: ["Admin"], summary: "همه خدمات (شامل پیش‌نویس)", responses: { "200": okResponse("فهرست") } },
      post: { tags: ["Admin"], summary: "ایجاد خدمت", responses: { "201": okResponse("ایجاد شد"), ...errorResponses(400, 401, 403) } },
    },
    "/admin/articles": {
      get: { tags: ["Admin"], summary: "همه مقالات", responses: { "200": okResponse("فهرست") } },
      post: { tags: ["Admin"], summary: "ایجاد مقاله", responses: { "201": okResponse("ایجاد شد"), ...errorResponses(400, 401, 403) } },
    },
    "/admin/faqs": {
      get: { tags: ["Admin"], summary: "همه پرسش‌ها", responses: { "200": okResponse("فهرست") } },
      post: { tags: ["Admin"], summary: "ایجاد پرسش", responses: { "201": okResponse("ایجاد شد"), ...errorResponses(400, 401, 403) } },
    },
    "/admin/contact-messages": {
      get: { tags: ["Admin"], summary: "پیام‌های تماس", responses: { "200": okResponse("فهرست") } },
    },
    "/admin/settings": {
      get: { tags: ["Admin"], summary: "تنظیمات عمومی", responses: { "200": okResponse("تنظیمات") } },
      patch: { tags: ["Admin"], summary: "به‌روزرسانی تنظیمات", responses: { "200": okResponse("به‌روزرسانی"), ...errorResponses(400, 401, 403) } },
    },
  },
} as const;
