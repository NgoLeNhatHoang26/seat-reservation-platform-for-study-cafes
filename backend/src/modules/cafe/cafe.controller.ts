import type { Request, Response, NextFunction } from 'express';
import { sendPaginatedSuccess, sendSuccess } from '../../common/response';
import * as cafeService from './cafe.service';

function asQueryRecord(query: Request['query']): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = typeof value[0] === 'string' ? value[0] : undefined;
    } else if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function asRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function listCafes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await cafeService.listCafes(asQueryRecord(req.query));
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function searchCafes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await cafeService.searchCafes(asQueryRecord(req.query));
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getCafeDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cafeService.getCafeDetail(asRouteParam(req.params.cafeId));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}


export async function getSeatLayout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cafeService.getCafeLayout(asRouteParam(req.params.cafeId));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getSeatAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { startTime, endTime, zoneId } = req.query as {
      startTime: string;
      endTime: string;
      zoneId?: string;
    };
    const data = await cafeService.getSeatAvailability(
      asRouteParam(req.params.cafeId),
      startTime,
      endTime,
      zoneId,
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
