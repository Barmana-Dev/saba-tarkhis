import { prisma } from "./prisma";

type NotificationInput = {
  userId: string;
  requestId?: string | null;
  type: "STATUS_CHANGE" | "QUOTE" | "REPLY";
  title: string;
  body?: string | null;
};

/**
 * Records an in-panel notification for a customer. Notifications are a
 * convenience, never the source of truth: a failure here must not undo the
 * status change or message that triggered it.
 */
export async function notifyCustomer(input: NotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        requestId: input.requestId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
      },
    });
  } catch (error) {
    console.error("[notifications] could not record a notification:", error);
  }
}
