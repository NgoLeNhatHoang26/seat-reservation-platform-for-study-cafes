import { axiosInstance } from './axiosInstance';
import { normalizePaginated, type PaginatedData } from '../utils/pagination';
import type {
  GetNotificationsParams,
  MarkReadResponse,
  Notification,
  NotificationListResponse,
} from '../types/notification.types';

export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationListResponse> {
  const { data } = await axiosInstance.get('/notifications', { params });
  const normalized = normalizePaginated(data.data) as PaginatedData<Notification> & {
    unreadCount?: number;
  };
  return {
    items: normalized.items,
    unreadCount: normalized.unreadCount ?? 0,
    pagination: normalized.pagination,
  };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<MarkReadResponse> {
  const { data } = await axiosInstance.patch<{ data: MarkReadResponse }>(
    `/notifications/${notificationId}/read`,
  );
  return data.data;
}
