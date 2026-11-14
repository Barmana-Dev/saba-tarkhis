import { badRequest } from "./errors";

/**
 * Day boundaries for the Persian (Jalali) calendar shown in the UI are always
 * resolved against Iran local time. Iran uses a fixed +03:30 offset (no DST
 * since 2022), so a plain offset keeps the range deterministic on any server
 * timezone — a UTC-midnight boundary would drop the first 3.5 hours of the day
 * and pull in the next morning.
 */
export const IRAN_UTC_OFFSET = "+03:30";
const IRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function invalidDay(field: string): never {
  throw badRequest(`تاریخ «${field}» معتبر نیست. قالب درست: YYYY-MM-DD`);
}

/** Rejects non-ISO text and impossible calendar dates such as 2026-02-31. */
function assertRealDay(value: string, field: string) {
  if (!DAY_PATTERN.test(value)) invalidDay(field);
  const probe = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== value) {
    invalidDay(field);
  }
}

export function parseIranDayStart(value: string, field = "from"): Date {
  assertRealDay(value, field);
  return new Date(`${value}T00:00:00.000${IRAN_UTC_OFFSET}`);
}

export function parseIranDayEnd(value: string, field = "to"): Date {
  assertRealDay(value, field);
  return new Date(`${value}T23:59:59.999${IRAN_UTC_OFFSET}`);
}

/** Builds a Prisma `createdAt` filter covering whole Iran days. */
export function buildIranDateRange(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const start = from ? parseIranDayStart(from, "from") : undefined;
  const end = to ? parseIranDayEnd(to, "to") : undefined;
  if (start && end && start.getTime() > end.getTime()) {
    throw badRequest("بازه تاریخ نامعتبر است: تاریخ شروع بعد از تاریخ پایان است.");
  }
  return { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
}

/** Buckets a timestamp into the Iran calendar day (YYYY-MM-DD) for reports. */
export function iranDayKey(date: Date): string {
  return new Date(date.getTime() + IRAN_OFFSET_MS).toISOString().slice(0, 10);
}
