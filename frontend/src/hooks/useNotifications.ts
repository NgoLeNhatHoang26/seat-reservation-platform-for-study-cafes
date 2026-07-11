import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationService from '../services/notificationService';
import type {
  GetNotificationsParams,
  NotificationListResponse,
} from '../types/notification.types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

// staleTime: 0 — notifications should reflect latest unread state

export interface UseNotificationsParams extends GetNotificationsParams {
  enabled?: boolean;
}

export function useNotificationsList(params: UseNotificationsParams = {}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<NotificationListResponse, Error>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, queryParams],
    queryFn: () => notificationService.getNotifications(queryParams),
    enabled,
    staleTime: 0,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
