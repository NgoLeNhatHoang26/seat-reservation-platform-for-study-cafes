import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors';
import { sendSuccess } from '../../common/response';
import type { CreateBookingDto } from './booking.dto';
import * as bookingService from './booking.service';


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