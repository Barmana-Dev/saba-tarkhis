import type { RequestStatus } from "@prisma/client";
import { badRequest } from "./errors";

/** Allowed internal workflow transitions (company workflow, not customs events). */
export const statusTransitions: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "NEED_MORE_INFO", "QUOTED", "CANCELLED"],
  UNDER_REVIEW: ["NEED_MORE_INFO", "QUOTED", "IN_PROGRESS", "CANCELLED"],
  NEED_MORE_INFO: ["UNDER_REVIEW", "QUOTED", "CANCELLED"],
  QUOTED: ["IN_PROGRESS", "UNDER_REVIEW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "NEED_MORE_INFO", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const statusLabels: Record<RequestStatus, string> = {
  SUBMITTED: "ثبت‌شده",
  UNDER_REVIEW: "در حال بررسی",
  NEED_MORE_INFO: "نیازمند تکمیل اطلاعات",
  QUOTED: "پیشنهاد ارائه‌شده",
  IN_PROGRESS: "در حال انجام خدمات",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغوشده",
};

export function assertTransition(from: RequestStatus, to: RequestStatus) {
  if (from === to) {
    throw badRequest("وضعیت جدید با وضعیت فعلی یکسان است.");
  }
  const allowed = statusTransitions[from];
  if (!allowed.includes(to)) {
    throw badRequest(
      `تغییر وضعیت از «${statusLabels[from]}» به «${statusLabels[to]}» در گردش‌کار مجاز نیست.`,
    );
  }
}
