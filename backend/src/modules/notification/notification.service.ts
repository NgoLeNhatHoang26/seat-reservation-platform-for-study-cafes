import { ForbiddenError, NotFoundError } from '../../common/errors';
import { buildCursorPaginationResult } from '../../common/pagination';
import { NotificationChannel } from '../../generated/prisma/enums';
import type { ListNotificationsParams, NotificationItemResponse } from './notification.dto';
import { toNotificationItemResponse } from './notification.mapper';
import * as repo from './notification.repository';

export async function listNotifications(
  userId: string,
  params: ListNotificationsParams,
) {
  const [rows, unreadCount] = await Promise.all([
    repo.findByUser(userId, params),
    repo.countUnread(userId),
  ]);

  const page = buildCursorPaginationResult(rows, params.limit);

  return {
    items: page.items.map(toNotificationItemResponse),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    unreadCount,
  };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<NotificationItemResponse> {
  const existing = await repo.findById(notificationId);

  if (!existing || existing.channel !== NotificationChannel.IN_APP) {
    throw new NotFoundError('NOTIFICATION_NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError('FORBIDDEN', 'You can only read your own notifications');
  }

  if (existing.isRead) {
    return toNotificationItemResponse(existing);
  }

  const updated = await repo.markAsRead(notificationId, userId);
  if (!updated) {
    throw new NotFoundError('NOTIFICATION_NOT_FOUND');
  }

  return toNotificationItemResponse(updated);
}
