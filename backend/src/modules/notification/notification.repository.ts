import { prisma } from '../../config/prisma';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../generated/prisma/enums';

export type CreateEmailLogInput = {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  errorMessage?: string | null;
  sentAt?: Date | null;
};

export type CreateInAppLogInput = {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
};

export async function createEmailLog(input: CreateEmailLogInput): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      channel: NotificationChannel.EMAIL,
      type: input.type,
      status: input.status,
      recipient: input.recipient,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
    },
  });
}

export async function createInAppLog(input: CreateInAppLogInput): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      channel: NotificationChannel.IN_APP,
      type: input.type,
      status: NotificationStatus.SENT,
      recipient: 'in-app',
      sentAt: new Date(),
    },
  });
}

export type FindByUserParams = {
  limit: number;
  cursor?: string;
  isRead?: boolean;
  type?: NotificationType;
};

const inAppSelect = {
  id: true,
  userId: true,
  bookingId: true,
  channel: true,
  type: true,
  isRead: true,
  status: true,
  createdAt: true,
} as const;

export type InAppNotificationRow = {
  id: string;
  userId: string;
  bookingId: string | null;
  channel: NotificationChannel;
  type: NotificationType;
  isRead: boolean;
  status: string;
  createdAt: Date;
};

export async function findByUser(
  userId: string,
  params: FindByUserParams,
): Promise<InAppNotificationRow[]> {
  return prisma.notificationLog.findMany({
    where: {
      userId,
      channel: NotificationChannel.IN_APP,
      ...(params.isRead !== undefined ? { isRead: params.isRead } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: params.limit + 1,
    select: inAppSelect,
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notificationLog.count({
    where: {
      userId,
      channel: NotificationChannel.IN_APP,
      isRead: false,
    },
  });
}

export async function findById(
  notificationId: string,
): Promise<InAppNotificationRow | null> {
  return prisma.notificationLog.findUnique({
    where: { id: notificationId },
    select: inAppSelect,
  });
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<InAppNotificationRow | null> {
  const updated = await prisma.notificationLog.updateMany({
    where: {
      id: notificationId,
      userId,
      channel: NotificationChannel.IN_APP,
    },
    data: { isRead: true },
  });

  if (updated.count === 0) {
    return null;
  }

  return findById(notificationId);
}
