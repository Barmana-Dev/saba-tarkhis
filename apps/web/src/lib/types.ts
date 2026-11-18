export type Role = "CUSTOMER" | "EXPERT" | "ADMIN";

export type NotificationItem = {
  id: string;
  requestId: string | null;
  type: "STATUS_CHANGE" | "QUOTE" | "REPLY";
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFeed = { items: NotificationItem[]; unreadCount: number };

export type RequestStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEED_MORE_INFO"
  | "QUOTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type CurrentUser = {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  role: Role;
  createdAt?: string;
};

export type Service = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  isPublished?: boolean;
  sortOrder?: number;
  updatedAt?: string;
};

export type ArticleCategory = { id: string; name: string; slug: string };

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  reviewedAt: string | null;
  category: { name: string; slug: string } | null;
};

export type Article = ArticleSummary & {
  body: string;
  status?: "DRAFT" | "PUBLISHED";
  categoryId?: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
};

export type Faq = { id: string; question: string; answer: string };

export type Paginated<T> = {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    summary?: Record<RequestStatus, number>;
  };
};

export type RequestSummary = {
  id: string;
  trackingCode: string;
  goodsDescription: string;
  procedureType: string;
  status: RequestStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; mobile: string };
  assignedExpert?: { id: string; fullName: string } | null;
  _count?: { documents: number; comments: number };
};

export type DocumentScanStatus = "PENDING" | "CLEAN" | "INFECTED" | "ERROR" | "SKIPPED";

export type RequestDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  scanStatus: DocumentScanStatus;
  canDownload: boolean;
  downloadUrl: string | null;
};

export type RequestComment = {
  id: string;
  body: string;
  visibility: "PUBLIC" | "INTERNAL";
  createdAt: string;
  author: { id: string; fullName: string; role: Role };
};

export type StatusHistoryEntry = {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  toStatusLabel: string;
  reason: string | null;
  createdAt: string;
  changedBy: { id: string; fullName: string; role: Role };
};

export type ClearanceRequest = {
  id: string;
  trackingCode: string;
  applicantType: "INDIVIDUAL" | "COMPANY";
  applicantName: string | null;
  preferredContact: string | null;
  goodsDescription: string;
  category: string | null;
  hsCode: string | null;
  procedureType: string;
  originCountry: string | null;
  destinationCountry: string | null;
  customsLocation: string | null;
  transportMode: string;
  quantity: string | null;
  quantityUnit: string | null;
  estimatedValue: string | null;
  currency: string | null;
  cargoStatus: string | null;
  notes: string | null;
  quoteNote: string | null;
  status: RequestStatus;
  statusLabel: string;
  assignedExpertId: string | null;
  assignedExpert?: { id: string; fullName: string };
  customer?: { id: string; fullName: string; mobile: string; email: string | null };
  documents: RequestDocument[];
  comments: RequestComment[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  range: { from: string; to: string };
  totals: {
    requests: number;
    requestsInRange: number;
    newUsersInRange: number;
    contactMessages: number;
    contactByStatus: Record<string, number>;
  };
  byStatus: Record<RequestStatus, number>;
  byProcedure: Record<string, number>;
  daily: { date: string; count: number }[];
  recent: {
    id: string;
    trackingCode: string;
    goodsDescription: string;
    status: RequestStatus;
    createdAt: string;
    user: { fullName: string };
  }[];
};

export type ContactMessage = {
  id: string;
  name: string;
  mobile: string;
  subject: string;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
};

export type AdminUser = {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  _count?: { requests: number };
};
