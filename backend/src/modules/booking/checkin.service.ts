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
import type { CheckInResponse, BookingItemResponse, BookingSeatSummary } from './booking.dto';


function toBookingItemResponse(booking: {
  id: string;
  confirmationNumber: string;
  customerId: string;
  cafeId: string;
  seatId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes: string | null;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BookingItemResponse {
  return {
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    customerId: booking.customerId,
    cafeId: booking.cafeId,
    seatId: booking.seatId,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    notes: booking.notes,
    checkedInAt: booking.checkedInAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

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


export async function checkIn(
  bookingId: string,
  userId: string,
): Promise<CheckInResponse> {
  // ── 1) Load booking ──
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND');
  }

  // ── 2) Ownership ──
  if (booking.customerId !== userId) {
    throw new ForbiddenError('FORBIDDEN', 'You can only check in your own bookings');
  }

  // ── 3) Idempotent: đã CHECKED_IN ──
  if (booking.status === BookingStatus.CHECKED_IN) {
    return buildCheckInResponse(booking);
  }

  // ── 4) Chỉ check-in khi CONFIRMED ──
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new ConflictError(
      'BOOKING_INVALID_STATUS',
      `Cannot check in booking with status ${booking.status}`,
    );
  }

  // ── 5) Time window ──
  const cafe = await cafeRepo.findById(booking.cafeId);
  const graceMinutes = cafe?.checkinGraceMinutes ?? 15;
  assertCheckInWindow(booking.startTime, graceMinutes);

  // ── 6) TX: conditional update ──
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
          changedById: userId,
          reason: 'CUSTOMER_CHECK_IN',
        },
        tx,
      );

      await bookingRepo.createAuditLog(
        {
          actorId: userId,
          action: 'BOOKING_CHECKED_IN',
          resourceType: 'BOOKING',
          resourceId: bookingId,
          changes: {
            checkedInAt: now.toISOString(),
          },
        },
        tx,
      );

      return count;
    },
  );

  // ── 7) Race handling: 0 rows ──
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

  // ── 8) Load lại sau commit ──
  const checkedIn = await bookingRepo.findById(bookingId);
  if (!checkedIn) throw new NotFoundError('BOOKING_NOT_FOUND');

  const response = buildCheckInResponse(checkedIn);

  // ── 9) Post-commit: chỉ cancel expire job ──
  try {
    await bookingQueue.cancelExpireJob(bookingId);
  } catch (e) {
    console.warn('Failed to cancel expire job after check-in', e);
  }

  return response;
}