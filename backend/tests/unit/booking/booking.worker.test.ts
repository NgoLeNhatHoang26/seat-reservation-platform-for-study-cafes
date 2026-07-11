import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingStatus } from '../../../src/generated/prisma/enums';
import { prisma } from '../../../src/config/prisma';
import * as cache from '../../../src/common/cache';
import * as cafeRepo from '../../../src/modules/cafe/cafe.repository';
import * as bookingRepo from '../../../src/modules/booking/booking.repository';
import * as bookingQueueService from '../../../src/modules/booking/booking-queue.service';
import { handleAutoCompleteBooking, handleAutoExpireBooking } from '../../../src/workers/booking.worker';

vi.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../src/modules/booking/booking.repository', () => ({
  findById: vi.fn(),
  updateBookingStatus: vi.fn(),
  createBookingHistoryEntry: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock('../../../src/modules/cafe/cafe.repository', () => ({
  findById: vi.fn(),
}));

vi.mock('../../../src/common/cache', () => ({
  deleteByPattern: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking-queue.service', () => ({
  BOOKING_JOB: {
    REMINDER: 'BOOKING_REMINDER',
    AUTO_EXPIRE: 'AUTO_EXPIRE_BOOKING',
    AUTO_COMPLETE: 'AUTO_COMPLETE_BOOKING',
  },
  enqueueAutoExpireJob: vi.fn(),
  enqueueAutoCompleteJob: vi.fn(),
  cancelCompleteJob: vi.fn(),
  enqueueCancellationEmail: vi.fn(),
  enqueueBookingReminderEmail: vi.fn(),
}));

function makeBooking(status: BookingStatus, startTime = new Date('2026-07-09T10:00:00.000Z')) {
  return {
    id: 'booking-1',
    customerId: 'customer-1',
    cafeId: 'cafe-1',
    seatId: 'seat-1',
    confirmationNumber: 'BK-1',
    startTime,
    endTime: new Date(startTime.getTime() + 2 * 60 * 60_000),
    status,
    notes: null,
    checkedInAt: status === BookingStatus.CHECKED_IN ? new Date() : null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    seat: {
      id: 'seat-1',
      seatNumber: 'A1',
      zoneId: 'zone-1',
    },
    cafe: {
      id: 'cafe-1',
      name: 'Test Cafe',
      timezone: 'UTC',
    },
  };
}

describe('BookingWorker auto-expire', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));
    vi.mocked(cafeRepo.findById).mockResolvedValue({
      id: 'cafe-1',
      checkinGraceMinutes: 15,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('expires a confirmed booking after the check-in grace window', async () => {
    vi.setSystemTime(new Date('2026-07-09T10:20:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CONFIRMED) as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(1);

    await handleAutoExpireBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).toHaveBeenCalledWith(
      'booking-1',
      BookingStatus.CONFIRMED,
      expect.objectContaining({
        nextStatus: BookingStatus.EXPIRED,
        expiredAt: new Date('2026-07-09T10:20:00.000Z'),
      }),
      expect.anything(),
    );
    expect(cache.deleteByPattern).toHaveBeenCalledWith('availability:cafe-1:*');
    expect(bookingQueueService.enqueueCancellationEmail).toHaveBeenCalledWith(
      'booking-1',
      'customer-1',
      'Booking expired due to no check-in',
    );
  });

  it('does nothing when the booking has already checked in', async () => {
    vi.setSystemTime(new Date('2026-07-09T10:20:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CHECKED_IN) as never);

    await handleAutoExpireBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
    expect(bookingQueueService.enqueueCancellationEmail).not.toHaveBeenCalled();
  });

  it('reschedules when the expire job fires before the deadline', async () => {
    vi.setSystemTime(new Date('2026-07-09T10:10:00.000Z'));
    const booking = makeBooking(BookingStatus.CONFIRMED);
    vi.mocked(bookingRepo.findById).mockResolvedValue(booking as never);

    await handleAutoExpireBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
    expect(bookingQueueService.enqueueAutoExpireJob).toHaveBeenCalledWith(
      'booking-1',
      booking.startTime,
      15,
    );
  });

  it('does not run post-commit side effects when the status changes during the transaction', async () => {
    vi.setSystemTime(new Date('2026-07-09T10:20:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CONFIRMED) as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(0);

    await handleAutoExpireBooking({ bookingId: 'booking-1' });

    expect(cache.deleteByPattern).not.toHaveBeenCalled();
    expect(bookingQueueService.enqueueCancellationEmail).not.toHaveBeenCalled();
  });
});

describe('BookingWorker auto-complete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('completes a checked-in booking after endTime', async () => {
    vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CHECKED_IN) as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(1);

    await handleAutoCompleteBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).toHaveBeenCalledWith(
      'booking-1',
      BookingStatus.CHECKED_IN,
      expect.objectContaining({
        nextStatus: BookingStatus.COMPLETED,
        updatedAt: new Date('2026-07-09T12:00:00.000Z'),
      }),
      expect.anything(),
    );
    expect(cache.deleteByPattern).toHaveBeenCalledWith('availability:cafe-1:*');
  });

  it('does nothing when the booking is still confirmed', async () => {
    vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CONFIRMED) as never);

    await handleAutoCompleteBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('reschedules when the complete job fires before endTime', async () => {
    vi.setSystemTime(new Date('2026-07-09T11:00:00.000Z'));
    const booking = makeBooking(BookingStatus.CHECKED_IN);
    vi.mocked(bookingRepo.findById).mockResolvedValue(booking as never);

    await handleAutoCompleteBooking({ bookingId: 'booking-1' });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
    expect(bookingQueueService.enqueueAutoCompleteJob).toHaveBeenCalledWith(
      'booking-1',
      booking.endTime,
    );
  });

  it('does not run post-commit side effects when the status changes during the transaction', async () => {
    vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CHECKED_IN) as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(0);

    await handleAutoCompleteBooking({ bookingId: 'booking-1' });

    expect(cache.deleteByPattern).not.toHaveBeenCalled();
  });
});
