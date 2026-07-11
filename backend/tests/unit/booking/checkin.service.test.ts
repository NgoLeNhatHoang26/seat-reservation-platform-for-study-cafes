import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/common/errors';
import { BookingStatus } from '../../../src/generated/prisma/enums';
import { prisma } from '../../../src/config/prisma';
import * as cafeRepo from '../../../src/modules/cafe/cafe.repository';
import * as bookingRepo from '../../../src/modules/booking/booking.repository';
import { checkIn } from '../../../src/modules/booking/checkin.service';

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

vi.mock('../../../src/modules/booking/booking-queue.service', () => ({
  cancelExpireJob: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking.mapper', () => ({
  toBookingItemResponse: vi.fn((booking) => ({
    id: booking.id,
    status: booking.status,
  })),
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

function expectAppError(error: unknown, errorCode: string): void {
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ errorCode });
}

describe('CheckinService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));
    vi.mocked(cafeRepo.findById).mockResolvedValue({
      id: 'cafe-1',
      checkinGraceMinutes: 15,
    } as never);
  });

  it('accepts check-in within the grace window', async () => {
    vi.setSystemTime(new Date('2026-07-09T09:55:00.000Z'));

    const confirmed = makeBooking(BookingStatus.CONFIRMED);
    const checkedIn = makeBooking(BookingStatus.CHECKED_IN);
    vi.mocked(bookingRepo.findById)
      .mockResolvedValueOnce(confirmed as never)
      .mockResolvedValueOnce(checkedIn as never);
    vi.mocked(bookingRepo.updateBookingStatus).mockResolvedValue(1);

    const result = await checkIn('booking-1', 'customer-1');

    expect(bookingRepo.updateBookingStatus).toHaveBeenCalledWith(
      'booking-1',
      BookingStatus.CONFIRMED,
      expect.objectContaining({
        nextStatus: BookingStatus.CHECKED_IN,
      }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      booking: { id: 'booking-1', status: BookingStatus.CHECKED_IN },
      seat: { id: 'seat-1', label: 'A1', zoneId: 'zone-1' },
    });
  });

  it('rejects check-in before the grace window opens', async () => {
    vi.setSystemTime(new Date('2026-07-09T09:40:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CONFIRMED) as never);

    await expect(checkIn('booking-1', 'customer-1')).rejects.toSatisfy((error) => {
      expectAppError(error, 'CHECKIN_TOO_EARLY');
      return true;
    });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('rejects check-in after the grace window expires', async () => {
    vi.setSystemTime(new Date('2026-07-09T10:16:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CONFIRMED) as never);

    await expect(checkIn('booking-1', 'customer-1')).rejects.toSatisfy((error) => {
      expectAppError(error, 'CHECKIN_WINDOW_EXPIRED');
      return true;
    });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('rejects check-in for a booking in the wrong status', async () => {
    vi.setSystemTime(new Date('2026-07-09T09:55:00.000Z'));
    vi.mocked(bookingRepo.findById).mockResolvedValue(makeBooking(BookingStatus.CANCELLED) as never);

    await expect(checkIn('booking-1', 'customer-1')).rejects.toSatisfy((error) => {
      expectAppError(error, 'BOOKING_INVALID_STATUS');
      return true;
    });

    expect(bookingRepo.updateBookingStatus).not.toHaveBeenCalled();
  });
});
