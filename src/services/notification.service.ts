import "server-only";
import { cache } from "react";
import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

/**
 * In-app notifications. Email/SMS/push drivers can subscribe to the same
 * `notify` entry point later (see lib/email).
 */

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  opts?: { body?: string; link?: string },
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: opts?.body ?? null,
        link: opts?.link ?? null,
      },
    });
  } catch {
    // Notifications must never break the primary operation.
  }
}

export async function notifyMany(
  userIds: string[],
  type: NotificationType,
  title: string,
  opts?: { body?: string; link?: string },
): Promise<void> {
  await Promise.all(userIds.map((id) => notify(id, type, title, opts)));
}

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      isRead: true,
      createdAt: true,
    },
  });
}

export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  return prisma.notification.count({ where: { userId, isRead: false } });
});

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
