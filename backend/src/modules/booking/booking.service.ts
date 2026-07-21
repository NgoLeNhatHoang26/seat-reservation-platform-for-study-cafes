import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from '../../common/errors';
import { CafeStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
import * as cafeRepo from '../cafe/cafe.repository';
import * as bookingRepo from './booking.repository';
import { prisma } from '../../config/prisma';
import { BookingStatus } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { customAlphabet } from 'nanoid';
import { AppError } from '../../common/errors';
import * as cache from '../../common/cache';
import * as bookingQueue from './booking-queue.service';
import type { CreateBookingDto, BookingResponse, ListBookingsParams } from './booking.dto';
import { buildCursorPaginationResult } from '../../common/pagination';
import { toBookingResponse, toBookingListItem } from './booking.mapper';
import * as authRepo from '../auth/auth.repository';

type DaySchedule = { open: string; close: string };
type OperatingHours = Record<string, DaySchedule>;

function parseHHmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getCafeLocalParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')!.value.toLowerCase();
  const hour = Number(parts.find((p) => p.type === 'hour')!.value);
  const minute = Number(parts.find((p) => p.type === 'minute')!.value);
  return { dayKey: weekday, minutes: hour * 60 + minute };
}

function isWithinOperatingHours(
  startTime: Date,
  endTime: Date,
  operatingHours: OperatingHours,
  timezone: string,
): boolean {
  const startLocal = getCafeLocalParts(startTime, timezone);
  const endLocal = getCafeLocalParts(endTime, timezone);
  // Slot không được cắt qua ngày
  if (startLocal.dayKey !== endLocal.dayKey) return false;
  const schedule = operatingHours[startLocal.dayKey];
  if (!schedule?.open || !schedule?.close) return false;
  const openMin = parseHHmmToMinutes(schedule.open);
  const closeMin = parseHHmmToMinutes(schedule.close);
  return (
    startLocal.minutes >= openMin &&
    endLocal.minutes <= closeMin
  );
}


const genConfirmationSuffix = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  6,
);

function generateConfirmationNumber(startTime: Date): string {
  const ymd = startTime.toISOString().slice(0, 10).replace(/-/g, '');
  return `BK-${ymd}-${genConfirmationSuffix()}`;
}


export async function validateTimeSlot(
  cafeId: string,
  startTime: Date,
  endTime: Date,
): Promise<void> {
  const cafe = await cafeRepo.findById(cafeId);
  if (!cafe) throw new NotFoundError('CAFE_NOT_FOUND');
  if (cafe.status !== CafeStatus.ACTIVE) {
    throw new NotFoundError('CAFE_NOT_AVAILABLE');
  }

  const now = new Date();

  // 1) Past
  if (startTime <= now) {
    throw new ValidationError('TIME_SLOT_IN_PAST', 'Start time must be in the future');
  }

  // 2) end > start
  if (endTime <= startTime) {
    throw new ValidationError('INVALID_TIME_SLOT', 'End time must be after start time');
  }

  // 3) Duration match slotDurationMinutes
  const durationMs = endTime.getTime() - startTime.getTime();
  const expectedMs = cafe.slotDurationMinutes * 60_000;
  if (durationMs !== expectedMs) {
    throw new ValidationError(
      'INVALID_TIME_SLOT',
      `Slot duration must be ${cafe.slotDurationMinutes} minutes`,
    );
  }

  // 4) Min advance
  const minStart = new Date(now.getTime() + cafe.minAdvanceBookingMinutes * 60_000);
  if (startTime < minStart) {
    throw new ValidationError(
      'INVALID_TIME_SLOT',
      `Booking must be at least ${cafe.minAdvanceBookingMinutes} minutes in advance`,
    );
  }

  // 5) Max advance
  const maxStart = new Date(now.getTime() + cafe.maxAdvanceBookingDays * 24 * 60 * 60_000);
  if (startTime > maxStart) {
    throw new ValidationError(
      'INVALID_TIME_SLOT',
      `Booking cannot be more than ${cafe.maxAdvanceBookingDays} days in advance`,
    );
  }

  // 6) Operating hours (theo timezone café)
  const withinHours = isWithinOperatingHours(
    startTime,
    endTime,
    cafe.operatingHours as OperatingHours,
    cafe.timezone,
  );
  if (!withinHours) {
    throw new ValidationError('INVALID_TIME_SLOT', 'Time slot is outside operating hours');
  }
}


export async function validateCustomerActiveBookings(
  customerId: string,
  cafeId: string,
  maxConcurrent: number,
): Promise<void> {
  const activeCount = await bookingRepo.countActiveBookingsByCustomer(customerId, cafeId);

  // count >= max => không được tạo thêm
  if (activeCount >= maxConcurrent) {
    throw new ConflictError(
      'BOOKING_LIMIT_EXCEEDED',
      'Maximum concurrent bookings reached for this café',
    );
  }
}

export async function validateCustomerNoOverlap(
  customerId: string,
  startTime: Date,
  endTime: Date,
): Promise<void> {
  const overlap = await bookingRepo.findCustomerOverlappingBooking(
    customerId,
    startTime,
    endTime,
  );

  if (overlap) {
    throw new ConflictError(
      'BOOKING_CONFLICT',
      'Customer already has an overlapping booking in this time window',
    );
  }
}


export async function createBooking(
  customerId: string,
  dto: CreateBookingDto,
  idempotencyKey: string,
): Promise<BookingResponse> {
  // Idempotency
  const idemKey = cache.buildBookingIdempotencyKey(customerId, idempotencyKey);
  let cached = await cache.getFromCache<BookingResponse>(idemKey);
  if (cached) return cached;

  const customer = await authRepo.findUserById(customerId);
  if (!customer || customer.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError('EMAIL_NOT_VERIFIED', 'Please verify your email before booking');
  }
  
  const start = new Date(dto.startTime);
  const end = new Date(dto.endTime);

  const lockAcquired = await cache.acquireIdempotencyLock(idemKey);
  if (!lockAcquired) {
    throw new ConflictError('IDEMPOTENCY_IN_PROGRESS');
  }
  try {
    cached = await cache.getFromCache<BookingResponse>(idemKey);
    if (cached) return cached;


  //Load café + seat 
  const cafe = await cafeRepo.findById(dto.cafeId);
  if (!cafe) throw new NotFoundError('CAFE_NOT_FOUND');
  if (cafe.status !== CafeStatus.ACTIVE) {
    throw new NotFoundError('CAFE_NOT_AVAILABLE');
  }

  const seat = await cafeRepo.findActiveSeatInCafe(dto.seatId, dto.cafeId);
  if (!seat) throw new NotFoundError('SEAT_NOT_FOUND');

  // Validation (TRƯỚC TX)
  await validateTimeSlot(dto.cafeId, start, end);
  await validateCustomerActiveBookings(
    customerId,
    dto.cafeId,
    cafe.maxConcurrentBookings,
  );
  await validateCustomerNoOverlap(customerId, start, end);

  // Transaction (CHỈ DB)
  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // FOR UPDATE trước overlap check
        const lockedSeat = await bookingRepo.lockSeatForUpdate(dto.seatId, tx);
        if (!lockedSeat) throw new NotFoundError('SEAT_NOT_FOUND');

        const overlaps = await bookingRepo.findOverlappingBookings(
          dto.seatId,
          start,
          end,
          tx,
        );
        if (overlaps.length > 0) {
          throw new ConflictError('SEAT_ALREADY_BOOKED');
        }

        const created = await bookingRepo.createBooking(
          {
            confirmationNumber: generateConfirmationNumber(start),
            customerId,
            seatId: dto.seatId,
            cafeId: dto.cafeId,
            startTime: start,
            endTime: end,
            status: BookingStatus.CONFIRMED,
            notes: dto.notes ?? null,
          },
          tx,
        );

        await bookingRepo.createBookingHistoryEntry(
          {
            bookingId: created.id,
            fromStatus: null,
            toStatus: BookingStatus.CONFIRMED,
            changedById: customerId,
            reason: 'BOOKING_CREATED',
          },
          tx,
        );

        await bookingRepo.createAuditLog(
          {
            actorId: customerId,
            action: 'BOOKING_CREATED',
            resourceType: 'BOOKING',
            resourceId: created.id,
            changes: {
              confirmationNumber: created.confirmationNumber,
              seatId: created.seatId,
              cafeId: created.cafeId,
              startTime: created.startTime.toISOString(),
              endTime: created.endTime.toISOString(),
            },
          },
          tx,
        );

        return created;
      },
      { timeout: 5000 },
    );
  } catch (err) {
    await cache.releaseIdempotencyLock(idemKey);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictError('SEAT_ALREADY_BOOKED');
    }
    if (err instanceof AppError) throw err;
    throw err;
  }

  const response = toBookingResponse(booking, seat, {
    id: cafe.id,
    name: cafe.name,
    timezone: cafe.timezone,
  });
  // Post-commit (SAU TX)
  try {
    await cache.deleteByPattern(`availability:${dto.cafeId}:*`);
  } catch (e) {
    console.warn('Failed to invalidate availability cache', e);
  }

  try {
    await cache.setToCache(idemKey, response, cache.IDEMPOTENCY_TTL_SECONDS);
  } catch (e) {
    console.warn('Failed to write idempotency cache', e);
  }

  try {
    await bookingQueue.enqueueBookingConfirmationEmail(booking.id, customerId);
    await bookingQueue.enqueueBookingReminderJob(booking.id, start);
    await bookingQueue.enqueueAutoExpireJob(
      booking.id,
      start,
      cafe.checkinGraceMinutes,
    );
    await bookingQueue.enqueueAutoCompleteJob(booking.id, end);
  } catch (e) {
    console.warn('Failed to enqueue booking jobs', e);
  }

  return response;
  } finally {
  if (lockAcquired) {
    await cache.releaseIdempotencyLock(idemKey);
  }
}}

async function assertCanViewBooking(
  booking: { customerId: string; cafeId: string },
  requesterId: string,
  requesterRole: UserRole,
): Promise<void> {
  if (requesterRole === UserRole.ADMIN) return;
  if (requesterRole === UserRole.CUSTOMER) {
    if (booking.customerId !== requesterId) {
      throw new ForbiddenError('FORBIDDEN');
    }
    return;
  }
  if (requesterRole === UserRole.OWNER) {
    const cafe = await cafeRepo.findById(booking.cafeId);
    if (!cafe || cafe.ownerId !== requesterId) {
      throw new ForbiddenError('FORBIDDEN');
    }
    return;
  }
  throw new ForbiddenError('FORBIDDEN');
}

export async function getBookingById(
  bookingId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<BookingResponse> {
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND');
  }

  await assertCanViewBooking(booking, requesterId, requesterRole);

  return toBookingResponse(
    booking as Parameters<typeof toBookingResponse>[0],
    booking.seat,
    booking.cafe,
  );
}


export async function listBookingsByCustomer(
  customerId: string,
  params: ListBookingsParams,
) {
  const rows = await bookingRepo.findByCustomer(customerId, {
    limit: params.limit,
    cursor: params.cursor,
    status: params.status,
    upcoming: params.upcoming,
    cafeId: params.cafeId,
    sort: params.sort === 'startTime' ? 'startTime' : '-startTime',
  });

  const page = buildCursorPaginationResult(rows, params.limit);

  return {
    items: page.items.map((row) => toBookingListItem(row as Parameters<typeof toBookingListItem>[0])),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

