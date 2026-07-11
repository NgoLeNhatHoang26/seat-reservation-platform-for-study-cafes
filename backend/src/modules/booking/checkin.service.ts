import { prisma } from '../../config/prisma';
import { BookingStatus } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors';
import * as cafeRepo from '../cafe/cafe.repository';
import * as bookingRepo from './booking.repository';
import * as bookingQueue from './booking-queue.service';
import type { CheckInResponse } from './booking.dto';
import { toBookingItemResponse } from './booking.mapper';

function buildCheckInResponse(
  booking: NonNullable<Awaited<ReturnType<typeof bookingRepo.findById>>>,
): CheckInResponse {
  return {
    booking: toBookingItemResponse(
      booking as Parameters<typeof toBookingItemResponse>[0],
    ),
    seat: {
      id: booking.seat.id,
      label: booking.seat.seatNumber,
      zoneId: booking.seat.zoneId,
    },
  };
}


function assertCheckInWindow(
  startTime: Date,
  graceMinutes: number,
): void {
  const now = new Date();
  const windowStart = new Date(startTime.getTime() - graceMinutes * 60_000);
  const windowEnd = new Date(startTime.getTime() + graceMinutes * 60_000);

  if (now < windowStart) {
    throw new ValidationError(
      'CHECKIN_TOO_EARLY',
      'Check-in is not allowed yet',
    );
  }

  if (now > windowEnd) {
    throw new ConflictError(
      'CHECKIN_WINDOW_EXPIRED',
      'Check-in window has expired',
    );
  }
}


type BookingWithRelations = NonNullable<
  Awaited<ReturnType<typeof bookingRepo.findById>>
>;

async function performCheckIn(
  booking: BookingWithRelations,
  actorId: string,
  reason: 'CUSTOMER_CHECK_IN' | 'OWNER_CHECK_IN',
): Promise<CheckInResponse> {
  const bookingId = booking.id;

  if (booking.status === BookingStatus.CHECKED_IN) {
    return buildCheckInResponse(booking);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new ConflictError(
      'BOOKING_INVALID_STATUS',
      `Cannot check in booking with status ${booking.status}`,
    );
  }

  const cafe = await cafeRepo.findById(booking.cafeId);
  const graceMinutes = cafe?.checkinGraceMinutes ?? 15;
  assertCheckInWindow(booking.startTime, graceMinutes);

  const now = new Date();
  const updatedCount = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const count = await bookingRepo.updateBookingStatus(
        bookingId,
        BookingStatus.CONFIRMED,
        {
          nextStatus: BookingStatus.CHECKED_IN,
          checkedInAt: now,
          updatedAt: now,
        },
        tx,
      );

      if (count === 0) return 0;

      await bookingRepo.createBookingHistoryEntry(
        {
          bookingId,
          fromStatus: BookingStatus.CONFIRMED,
          toStatus: BookingStatus.CHECKED_IN,
          changedById: actorId,
          reason,
        },
        tx,
      );

      await bookingRepo.createAuditLog(
        {
          actorId,
          action: 'BOOKING_CHECKED_IN',
          resourceType: 'BOOKING',
          resourceId: bookingId,
          changes: {
            checkedInAt: now.toISOString(),
            reason,
          },
        },
        tx,
      );

      return count;
    },
  );

  if (updatedCount === 0) {
    const fresh = await bookingRepo.findById(bookingId);
    if (!fresh) throw new NotFoundError('BOOKING_NOT_FOUND');

    if (fresh.status === BookingStatus.CHECKED_IN) {
      return buildCheckInResponse(fresh);
    }

    throw new ConflictError(
      'BOOKING_INVALID_STATUS',
      'Booking status changed before check-in could complete',
    );
  }

  const checkedIn = await bookingRepo.findById(bookingId);
  if (!checkedIn) throw new NotFoundError('BOOKING_NOT_FOUND');

  const response = buildCheckInResponse(checkedIn);

  try {
    await bookingQueue.cancelExpireJob(bookingId);
  } catch (e) {
    console.warn('Failed to cancel expire job after check-in', e);
  }

  return response;
}

export async function checkIn(bookingId: string, userId: string) {
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) throw new NotFoundError('BOOKING_NOT_FOUND');
  if (booking.customerId !== userId) {
    throw new ForbiddenError('FORBIDDEN', 'You can only check in your own bookings');
  }
  return performCheckIn(booking, userId, 'CUSTOMER_CHECK_IN');
}
export async function checkInForOwner(
  cafeId: string,
  bookingId: string,
  ownerId: string,
) {
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) throw new NotFoundError('BOOKING_NOT_FOUND');
  if (booking.cafeId !== cafeId) {
    throw new NotFoundError('BOOKING_NOT_FOUND'); // không leak booking café khác
  }
  return performCheckIn(booking, ownerId, 'OWNER_CHECK_IN');
}