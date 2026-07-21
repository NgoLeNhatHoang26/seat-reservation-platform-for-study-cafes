import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  NOTIFICATION_LIST_PARAMS,
  queryKeys,
} from '../lib/queryKeys';
import * as notificationService from '../services/notificationService';

export interface NotificationContextValue {
  unreadCount: number;
  refetchNotifications: () => void;
}

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.list(NOTIFICATION_LIST_PARAMS),
    queryFn: () => notificationService.getNotifications(NOTIFICATION_LIST_PARAMS),
    enabled: isAuthenticated,
    staleTime: 0,
    select: (d) => d.unreadCount,
  });

  const unreadCount = data ?? 0;

  const refetchNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used inside <NotificationProvider>',
    );
  }
  return ctx;
}
