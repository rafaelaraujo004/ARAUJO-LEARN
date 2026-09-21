'use server';

import { db } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function getNotificationsAction(): Promise<NotificationItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function getUnreadCountAction(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  return db.notification.count({
    where: { userId: user.id, readAt: null },
  });
}

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
