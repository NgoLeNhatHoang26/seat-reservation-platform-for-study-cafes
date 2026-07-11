import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors';
import { sendSuccess } from '../../common/response';
import type { CreateBookingDto } from './booking.dto';
import * as bookingService from './booking.service';


import { sendPaginatedSuccess } from '../../common/response';
import { parsePaginationParams } from '../../common/pagination';
import * as cancellationService from './cancellation.service';
import * as checkinService from './checkin.service';
import type { ListBookingsQuery } from './booking.validator';

function getIdempotencyKey(req: Request): string {
  const raw = req.headers['idempotency-key'];

  if (!raw || Array.isArray(raw) || !raw.trim()) {
    throw new AppError(
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      'Idempotency-Key header is required',
    );
  }

  return raw.trim();
}

function asRouteParam(value: string | string[]): string {
    return Array.isArray(value) ? value[0] : value;
  }

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1) Extract + validate header
    const idempotencyKey = getIdempotencyKey(req);

    // 2) Auth guard (authenticate middleware sẽ set req.user ở route)
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // 3) Body đã được Zod validate ở route (Task 7.7)
    const data = await bookingService.createBooking(
      req.user.id,
      req.body as CreateBookingDto,
      idempotencyKey,
    );

    // 4) 201 Created
    sendSuccess(res, data, 'Booking created', 201);
  } catch (err) {
    next(err);
  }
}


export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, 'UNAUTHORIZED');

    const query = req.query as ListBookingsQuery;
    const { limit, cursor } = parsePaginationParams(req.query);

    const result = await bookingService.listBookingsByCustomer(req.user.id, {
      limit,
      cursor,
      status: query.status,
      upcoming: query.upcoming === 'true',
      cafeId: query.cafeId,
      sort: query.sort ?? '-startTime',
    });

    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, 'UNAUTHORIZED');

    const data = await bookingService.getBookingById(
      asRouteParam(req.params.bookingId),
      req.user.id,
      req.user.role,
    );

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, 'UNAUTHORIZED');

    const reason =
      typeof req.query.reason === 'string' ? req.query.reason : undefined;

    const data = await cancellationService.cancelBooking(
      asRouteParam(req.params.bookingId),
      req.user.id,
      reason,
    );

    sendSuccess(res, data, 'Booking cancelled');
  } catch (err) {
    next(err);
  }
}

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, 'UNAUTHORIZED');

    const data = await checkinService.checkIn(
      asRouteParam(req.params.bookingId),
      req.user.id,
    );

    sendSuccess(res, data, 'Checked in successfully');
  } catch (err) {
    next(err);
  }
}