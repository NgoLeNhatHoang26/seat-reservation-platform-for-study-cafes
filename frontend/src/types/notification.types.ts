
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS';

export type NotificationType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_REMINDER'
  | 'BOOKING_CANCELLATION'
  | 'BOOKING_EXPIRED'
  | 'CHECK_IN_REMINDER'
  | (string & Record<never, never>); // open union — allow future types without TS errors

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  isRead: boolean;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  metadata?: Record<string, unknown>;
}

export interface NotificationListResponse {
  items: Notification[];
  unreadCount: number;
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface MarkReadResponse {
  notification: Notification;
}

export interface GetNotificationsParams {
  isRead?: boolean;
  type?: string;
  limit?: number;
  cursor?: string;
}
