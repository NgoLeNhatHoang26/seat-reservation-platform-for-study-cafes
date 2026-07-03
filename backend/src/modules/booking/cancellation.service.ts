import { prisma } from '../../config/prisma';
import { BookingStatus } from '../../generated/prisma/enums';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors';
import * as cache from '../../common/cache';
import * as cafeRepo from '../cafe/cafe.repository';
import * as bookingRepo from './booking.repository';
import * as bookingQueue from './booking-queue.service';
import type { CancelBookingResponse, BookingItemResponse } from './booking.dto';
import type { Prisma } from '../../generated/prisma/client';

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
  
function buildCancelResponse(
    booking: NonNullable<Awaited<ReturnType<typeof bookingRepo.findById>>>,
    cancellationDeadlineMinutes: number,
): CancelBookingResponse {
    const deadline = new Date(
      booking.startTime.getTime() - cancellationDeadlineMinutes * 60_000,
    );
    const cancelledWithinDeadline = new Date() <= deadline;
  
    return {
      booking: toBookingItemResponse(booking as Parameters<typeof toBookingItemResponse>[0]),
      policy: {
        cancellationDeadlineMinutes,
        cancelledWithinDeadline,
      },
    };
}


export async function cancelBooking(
  bookingId: string,
  customerId: string,
  reason?: string,
): Promise<CancelBookingResponse> {
  // ── 1) Load booking ──
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND');
  }

  // ── 2) Ownership ──
  if (booking.customerId !== customerId) {
    throw new ForbiddenError('FORBIDDEN', 'You can only cancel your own bookings');
  }

  const cafe = await cafeRepo.findById(booking.cafeId);
  const cancellationDeadlineMinutes = cafe?.cancellationDeadlineMinutes ?? 60;

  // ── 3) Idempotent: đã CANCELLED ──
  if (booking.status === BookingStatus.CANCELLED) {
    return buildCancelResponse(booking, cancellationDeadlineMinutes);
  }

  // ── 4) Chỉ cancel được khi CONFIRMED ──
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new ConflictError(
      'BOOKING_CANNOT_CANCEL',
      `Cannot cancel booking with status ${booking.status}`,
    );
  }

  // ── 5) TX: conditional update ──
  const now = new Date();
  const updatedCount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const count = await bookingRepo.updateBookingStatus(
      bookingId,
      BookingStatus.CONFIRMED,
      {
        nextStatus: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: reason ?? null,
        updatedAt: now,
      },
      tx,
    );

    if (count === 0) return 0;

    await bookingRepo.createBookingHistoryEntry(
      {
        bookingId,
        fromStatus: BookingStatus.CONFIRMED,
        toStatus: BookingStatus.CANCELLED,
        changedById: customerId,
        reason: reason ?? 'CUSTOMER_CANCELLED',
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: customerId,
        action: 'BOOKING_CANCELLED',
        resourceType: 'BOOKING',
        resourceId: bookingId,
        changes: {
          reason: reason ?? null,
          cancelledAt: now.toISOString(),
        },
      },
      tx,
    );

    return count;
  });

  // ── 6) Race handling: 0 rows updated ──
  if (updatedCount === 0) {
    const fresh = await bookingRepo.findById(bookingId);
    if (!fresh) throw new NotFoundError('BOOKING_NOT_FOUND');

    if (fresh.status === BookingStatus.CANCELLED) {
      return buildCancelResponse(fresh, cancellationDeadlineMinutes);
    }

    throw new ConflictError(
      'BOOKING_CANNOT_CANCEL',
      'Booking status changed before cancel could complete',
    );
  }

  // ── 7) Load lại booking sau commit ──
  const cancelled = await bookingRepo.findById(bookingId);
  if (!cancelled) throw new NotFoundError('BOOKING_NOT_FOUND');

  const response = buildCancelResponse(cancelled, cancellationDeadlineMinutes);

  // ── 8) Post-commit (SAU TX) ──
  try {
    await cache.deleteByPattern(`availability:${booking.cafeId}:*`);
  } catch (e) {
    console.warn('Failed to invalidate availability cache', e);
  }

  try {
    await bookingQueue.cancelReminderJob(bookingId);
    await bookingQueue.cancelExpireJob(bookingId);
    await bookingQueue.enqueueCancellationEmail(
      bookingId,
      customerId,
      reason,
    );
  } catch (e) {
    console.warn('Failed to process cancel queue side effects', e);
  }

  return response;
}

