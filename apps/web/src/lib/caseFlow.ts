import type { RequestStatus } from "./types";

/** The internal handling steps a customer sees on a case page. */
const baseSteps: { status: RequestStatus; label: string }[] = [
  { status: "SUBMITTED", label: "ثبت درخواست" },
  { status: "UNDER_REVIEW", label: "بررسی کارشناس" },
  { status: "QUOTED", label: "ارائه پیشنهاد خدمات" },
  { status: "IN_PROGRESS", label: "در حال انجام خدمات" },
  { status: "COMPLETED", label: "تکمیل پرونده" },
];

export type CaseStep = {
  status: RequestStatus;
  label: string;
  state: "done" | "current" | "upcoming";
};

/**
 * Builds the progress strip for a case. `reached` comes from the status history,
 * so a case that skipped a step (for example a quote that went straight to work)
 * is not shown as if it had passed through it.
 */
export function caseTimeline(status: RequestStatus, reached: RequestStatus[]): CaseStep[] {
  const seen = new Set<RequestStatus>([...reached, status]);
  const currentIndex = baseSteps.findIndex((step) => step.status === status);

  return baseSteps.flatMap<CaseStep>((step, index) => {
    const isReached = seen.has(step.status);
    // The quote step is skipped for cases that never received one.
    if (step.status === "QUOTED" && !isReached) return [];
    if (step.status === status) return [{ ...step, state: "current" }];
    // A cancelled case has no current step: show only what it passed through.
    if (currentIndex === -1) {
      return isReached ? [{ ...step, state: "done" }] : [];
    }
    if (index > currentIndex) return [{ ...step, state: "upcoming" }];
    // A step behind the current one still only counts when the server recorded
    // it; the workflow allows jumps such as SUBMITTED → QUOTED.
    return [{ ...step, state: isReached ? "done" : "upcoming" }];
  });
}

export type NextStep = {
  title: string;
  detail: string;
  waitingOn: "شما" | "صبا ترخیص" | "—";
  needsYourAction: boolean;
};

/** What happens next, and whether the customer has to do anything for it. */
export function nextStep(status: RequestStatus, { hasDocuments }: { hasDocuments: boolean }): NextStep {
  switch (status) {
    case "SUBMITTED":
      return {
        title: "در نوبت بررسی اولیه",
        detail: "کارشناس پرونده را بررسی می‌کند؛ اگر مدرکی لازم باشد در همین صفحه اعلان می‌شود.",
        waitingOn: "صبا ترخیص",
        needsYourAction: false,
      };
    case "UNDER_REVIEW":
      return {
        title: "اسناد و اطلاعات در حال بررسی است",
        detail: hasDocuments
          ? "مدارک بارگذاری‌شده بررسی می‌شوند و در صورت نیاز پیام یا درخواست تکمیل دریافت می‌کنید."
          : "هنوز مدرکی بارگذاری نکرده‌اید؛ اگر پیش‌فاکتور یا بارنامه دارید، همین حالا اضافه کنید تا بررسی سریع‌تر شود.",
        waitingOn: "صبا ترخیص",
        needsYourAction: !hasDocuments,
      };
    case "NEED_MORE_INFO":
      return {
        title: "به مدرک یا اطلاعات تکمیلی نیاز است",
        detail: "مدرک خواسته‌شده یا پاسخ پیام کارشناس را در همین صفحه اضافه کنید تا بررسی ادامه پیدا کند.",
        waitingOn: "شما",
        needsYourAction: true,
      };
    case "QUOTED":
      return {
        title: "پیشنهاد خدمات آماده بررسی است",
        detail: "متن پیشنهاد را بخوانید و نظر یا تأیید خود را از بخش پیام‌ها ارسال کنید.",
        waitingOn: "شما",
        needsYourAction: true,
      };
    case "IN_PROGRESS":
      return {
        title: "خدمات پرونده در حال انجام است",
        detail: "کارشناس پرونده را پیش می‌برد؛ تغییرهای بعدی در همین صفحه و در اعلان‌ها دیده می‌شود.",
        waitingOn: "صبا ترخیص",
        needsYourAction: false,
      };
    case "COMPLETED":
      return {
        title: "پرونده تکمیل شده است",
        detail: "مدارک و تاریخچه در همین صفحه باقی می‌مانند؛ برای پرونده جدید، درخواست تازه ثبت کنید.",
        waitingOn: "—",
        needsYourAction: false,
      };
    case "CANCELLED":
      return {
        title: "این پرونده لغو شده است",
        detail: "در صورت نیاز به ادامه، می‌توانید درخواست جدیدی ثبت کنید یا با کارشناس تماس بگیرید.",
        waitingOn: "—",
        needsYourAction: false,
      };
  }
}
