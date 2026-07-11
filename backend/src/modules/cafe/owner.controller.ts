import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors';
import { sendPaginatedSuccess, sendSuccess } from '../../common/response';
import * as ownerService from './owner.service';
import type {
  CreateCafeDto,
  UpdateCafeDto,
  UpdateCafeSettingsDto,
  UpdateSeatLayoutDto,
} from './owner.service';
import type {
  GetOwnerSeatLayoutQuery,
  UpdateCafeSettingsBody,
} from './owner.validator';

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

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return req.user;
}

export async function createCafe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await ownerService.createCafe(user.id, req.body as CreateCafeDto);
    sendSuccess(res, data, 'Cafe created', 201);
  } catch (err) {
    next(err);
  }
}

export async function listOwnerCafes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await ownerService.getOwnerCafes(user.id, asQueryRecord(req.query));
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getOwnerCafe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await ownerService.getOwnerCafeById(
      asRouteParam(req.params.cafeId),
      user.id,
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateCafe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await ownerService.updateCafe(
      asRouteParam(req.params.cafeId),
      user.id,
      req.body as UpdateCafeDto,
    );
    sendSuccess(res, data, 'Cafe updated');
  } catch (err) {
    next(err);
  }
}

export async function getOwnerSeatLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = req.query as GetOwnerSeatLayoutQuery;
    const includeInactive = query.includeInactive === 'true';
    const data = await ownerService.getOwnerSeatLayout(
      asRouteParam(req.params.cafeId),
      user.id,
      includeInactive,
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateCafeSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await ownerService.updateCafeSettings(
      asRouteParam(req.params.cafeId),
      user.id,
      req.body as UpdateCafeSettingsBody & UpdateCafeSettingsDto,
    );
    sendSuccess(res, data, 'Cafe settings updated');
  } catch (err) {
    next(err);
  }
}

export async function updateSeatLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await ownerService.updateSeatLayout(
      asRouteParam(req.params.cafeId),
      user.id,
      req.body as UpdateSeatLayoutDto,
    );
    const { isCreate, ...data } = result;
    sendSuccess(
      res,
      data,
      isCreate ? 'Seat layout created' : 'Seat layout updated',
      isCreate ? 201 : 200,
    );
  } catch (err) {
    next(err);
  }
}

export async function viewCafeBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await ownerService.viewCafeBookings(
      asRouteParam(req.params.cafeId),
      user.id,
      asQueryRecord(req.query),
    );
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function ownerCheckIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await ownerService.ownerCheckIn(
      asRouteParam(req.params.cafeId),
      asRouteParam(req.params.bookingId),
      user.id,
    );
    sendSuccess(res, data, 'Checked in successfully');
  } catch (err) {
    next(err);
  }
}
