import type { Prisma } from "@prisma/client";

/**
 * Internal, company-only tracking code. It is deliberately NOT presented as a
 * customs/EPL reference number anywhere in the UI.
 */
export async function nextTrackingCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  const last = await tx.clearanceRequest.findFirst({
    where: { trackingCode: { startsWith: prefix } },
    orderBy: { trackingCode: "desc" },
    select: { trackingCode: true },
  });

  const lastNumber = last ? Number.parseInt(last.trackingCode.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
