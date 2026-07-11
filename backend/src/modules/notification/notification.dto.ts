import type {
  NotificationChannel,
  NotificationType,
} from '../../generated/prisma/enums';

export type NotificationItemResponse = {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  bookingId: string | null;
  isRead: boolean;
  title: string;
  message: string;
  createdAt: string;
};

export type ListNotificationsParams = {
  limit: number;
  cursor?: string;
  isRead?: boolean;
  type?: NotificationType;
};
