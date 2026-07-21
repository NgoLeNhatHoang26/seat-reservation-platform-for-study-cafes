import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import * as notificationService from '../services/notificationService';
import type {
  GetNotificationsParams,
  NotificationListResponse,
} from '../types/notification.types';

export { NOTIFICATION_LIST_PARAMS } from '../lib/queryKeys';

export interface UseNotificationsParams extends GetNotificationsParams {
  enabled?: boolean;
}

export function useNotificationsList(params: UseNotificationsParams = {}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<NotificationListResponse, Error>({
    queryKey: queryKeys.notifications.list(queryParams),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
