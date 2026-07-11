import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/common/errors';
import { CafeStatus } from '../../../src/generated/prisma/enums';
import * as cafeRepo from '../../../src/modules/cafe/cafe.repository';
import * as bookingRepo from '../../../src/modules/booking/booking.repository';
import {
  validateCustomerActiveBookings,
  validateCustomerNoOverlap,
  validateTimeSlot,
} from '../../../src/modules/booking/booking.service';

vi.mock('../../../src/modules/cafe/cafe.repository', () => ({
  findById: vi.fn(),
  findActiveSeatInCafe: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking.repository', () => ({
  countActiveBookingsByCustomer: vi.fn(),
  findCustomerOverlappingBooking: vi.fn(),
  lockSeatForUpdate: vi.fn(),
  findOverlappingBookings: vi.fn(),
  createBooking: vi.fn(),
  createBookingHistoryEntry: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../src/common/cache', () => ({
  IDEMPOTENCY_TTL_SECONDS: 60 * 60,
  buildBookingIdempotencyKey: vi.fn((key: string) => `booking-idem:${key}`),
  getFromCache: vi.fn(),
  setToCache: vi.fn(),
  deleteByPattern: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking-queue.service', () => ({
  enqueueBookingConfirmationEmail: vi.fn(),
  enqueueBookingReminderJob: vi.fn(),
  enqueueAutoExpireJob: vi.fn(),
  enqueueAutoCompleteJob: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking.mapper', () => ({
  toBookingResponse: vi.fn((booking) => booking),
  toBookingListItem: vi.fn((booking) => booking),
}));

function makeCafe() {
  return {
    id: 'cafe-1',
    ownerId: 'owner-1',
    name: 'Test Cafe',
    status: CafeStatus.ACTIVE,
    slotDurationMinutes: 120,
    minAdvanceBookingMinutes: 15,
    maxAdvanceBookingDays: 30,
    maxConcurrentBookings: 3,
    checkinGraceMinutes: 15,
    timezone: 'UTC',
    operatingHours: {
      thursday: { open: '08:00', close: '22:00' },
    },
  };
}

function expectAppError(error: unknown, errorCode: string): void {
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ errorCode });
}

describe('BookingService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('rejects overlapping customer bookings', async () => {
    vi.mocked(bookingRepo.findCustomerOverlappingBooking).mockResolvedValue({
      id: 'booking-1',
    } as never);

    await expect(
      validateCustomerNoOverlap(
        'customer-1',
        new Date('2026-07-09T10:00:00.000Z'),
        new Date('2026-07-09T12:00:00.000Z'),
      ),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'BOOKING_CONFLICT');
      return true;
    });
  });

  it('enforces maximum concurrent bookings per cafe', async () => {
    vi.mocked(bookingRepo.countActiveBookingsByCustomer).mockResolvedValue(3);

    await expect(
      validateCustomerActiveBookings('customer-1', 'cafe-1', 3),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'BOOKING_LIMIT_EXCEEDED');
      return true;
    });
  });

  it('rejects a past time slot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T09:00:00.000Z'));
    vi.mocked(cafeRepo.findById).mockResolvedValue(makeCafe() as never);

    await expect(
      validateTimeSlot(
        'cafe-1',
        new Date('2026-07-09T08:00:00.000Z'),
        new Date('2026-07-09T10:00:00.000Z'),
      ),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'TIME_SLOT_IN_PAST');
      return true;
    });
  });
});
