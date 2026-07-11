import { axiosInstance } from './axiosInstance';
import { normalizePaginated } from '../utils/pagination';
import type {
  GetNotificationsParams,
  MarkReadResponse,
  NotificationListResponse,
} from '../types/notification.types';

export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationListResponse> {
  const { data } = await axiosInstance.get('/notifications', { params });
  return normalizePaginated(data.data) as NotificationListResponse;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<MarkReadResponse> {
  const { data } = await axiosInstance.patch<{ data: MarkReadResponse }>(
    `/notifications/${notificationId}/read`,
  );
  return data.data;
}
