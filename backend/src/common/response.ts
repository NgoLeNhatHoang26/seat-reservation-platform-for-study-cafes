import type { Response } from 'express';

type SuccessBody<T> = {
  success: true;
  message: string;
  data: T;
};

export type PaginatedData<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
): Response {
  const body: SuccessBody<T> = { success: true, message, data };
  return res.status(statusCode).json(body);
}

export function sendPaginatedSuccess<T>(
  res: Response,
  items: T[],
  nextCursor: string | null,
  hasMore: boolean,
  message = 'OK',
  extraData: Record<string, unknown> = {},
): Response {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      nextCursor,
      hasMore,
      ...extraData, 
    },
  });
}