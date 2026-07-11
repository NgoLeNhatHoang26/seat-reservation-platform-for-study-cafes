import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import * as notificationService from '../services/notificationService';
import { NOTIFICATIONS_QUERY_KEY } from '../hooks/useNotifications';

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
    queryKey: [...NOTIFICATIONS_QUERY_KEY, {}],
    queryFn: () => notificationService.getNotifications({ limit: 20 }),
    enabled: isAuthenticated,
    staleTime: 0,
    select: (d) => d.unreadCount,
  });

  const unreadCount = data ?? 0;

  const refetchNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
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
