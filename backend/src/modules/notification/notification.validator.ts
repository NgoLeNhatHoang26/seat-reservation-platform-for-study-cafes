import { z } from 'zod';
import { NotificationType } from '../../generated/prisma/enums';

export const listNotificationsQuerySchema = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  type: z.nativeEnum(NotificationType).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
