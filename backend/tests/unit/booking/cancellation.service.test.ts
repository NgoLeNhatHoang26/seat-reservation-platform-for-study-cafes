import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/common/errors';
import { BookingStatus } from '../../../src/generated/prisma/enums';
import { prisma } from '../../../src/config/prisma';
import * as cafeRepo from '../../../src/modules/cafe/cafe.repository';
import * as bookingRepo from '../../../src/modules/booking/booking.repository';
import { cancelBooking } from '../../../src/modules/booking/cancellation.service';

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

vi.mock('../../../src/queues/booking-queue.producer', () => ({
  cancelAllLifecycleJobs: vi.fn(),
}));

vi.mock('../../../src/queues/email-queue.producer', () => ({
  enqueueCancellationEmail: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking.mapper', () => ({
  toBookingItemResponse: vi.fn((booking) => ({
    id: booking.id,
    status: booking.status,
  })),
}));

function makeBooking(status: BookingStatus, startTime = new Date('2026-07-09T11:30:00.000Z')) {
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
    checkedInAt: null,
    cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
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

function expectAppError(error: unknown, errorCode: string): void {
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ errorCode });
}

describe('CancellationService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));
    vi.mocked(cafeRepo.findById).mockResolvedValue({
      id: 'cafe-1',
      cancellationDeadlineMinutes: 60,
    } as never);
  });

  it('cancels a confirmed booking before the deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00.000Z'));

    const confirmed = makeBooking(BookingStatus.CONFIRMED);
    const cancelled = makeBooking(BookingStatus.CANCELLED);
    vi.mocked(bookingRepo.findById)
      .mockResolvedValueOnce(confirmed as never)
      .mockResolvedValueOnce(cancelled as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(1);

    const result = await cancelBooking('booking-1', 'customer-1', 'changed plans');

    expect(bookingRepo.updateBookingStatus).toHaveBeenCalledWith(
      'booking-1',
      BookingStatus.CONFIRMED,
      expect.objectContaining({
        nextStatus: BookingStatus.CANCELLED,
        cancellationReason: 'changed plans',
      }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      booking: { id: 'booking-1', status: BookingStatus.CANCELLED },
      policy: {
        cancellationDeadlineMinutes: 60,
        cancelledWithinDeadline: true,
      },
    });
  });

  it('rejects cancellation when booking is checked in', async () => {
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CHECKED_IN) as never);

    await expect(cancelBooking('booking-1', 'customer-1')).rejects.toSatisfy((error) => {
      expectAppError(error, 'BOOKING_CANNOT_CANCEL');
      return true;
    });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('returns an idempotent response for already cancelled bookings', async () => {
    const cancelled = makeBooking(BookingStatus.CANCELLED);
    vi.mocked(bookingRepo.findById).mockResolvedValue(cancelled as never);

    const result = await cancelBooking('booking-1', 'customer-1');

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
    expect(result.booking).toEqual({ id: 'booking-1', status: BookingStatus.CANCELLED });
  });
});
