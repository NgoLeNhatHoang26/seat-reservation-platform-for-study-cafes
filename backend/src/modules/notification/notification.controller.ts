import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors';
import { parsePaginationParams } from '../../common/pagination';
import { sendPaginatedSuccess, sendSuccess } from '../../common/response';
import * as notificationService from './notification.service';
import type { ListNotificationsQuery } from './notification.validator';

function asRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const query = req.query as ListNotificationsQuery;
    const { limit, cursor } = parsePaginationParams(req.query);

    const result = await notificationService.listNotifications(req.user.id, {
      limit,
      cursor,
      ...(query.isRead === 'true'
        ? { isRead: true }
        : query.isRead === 'false'
          ? { isRead: false }
          : {}),
      ...(query.type ? { type: query.type } : {}),
    });

    sendPaginatedSuccess(
      res,
      result.items,
      result.nextCursor,
      result.hasMore,
      'OK',
      { unreadCount: result.unreadCount },
    );
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const notificationId = asRouteParam(req.params.notificationId);
    const notification = await notificationService.markNotificationRead(
      notificationId,
      req.user.id,
    );

    sendSuccess(res, { notification });
  } catch (err) {
    next(err);
  }
}
