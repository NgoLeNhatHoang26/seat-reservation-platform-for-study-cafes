import { Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { BOOKING_JOB } from '../modules/booking/booking-queue.service';
import * as bookingQueueService from '../modules/booking/booking-queue.service';
import * as bookingRepo from '../modules/booking/booking.repository';
import { BookingStatus } from '../generated/prisma/enums';
import type {
  AutoCompleteBookingJobData,
  AutoExpireBookingJobData,
  BookingReminderJobData,
} from './worker.types';
import { prisma } from '../config/prisma';
import * as cache from '../common/cache';
import * as cafeRepo from '../modules/cafe/cafe.repository';
import type { Prisma } from '../generated/prisma/client';

const NO_SHOW_REASON = 'NO_SHOW';
const EXPIRE_EMAIL_REASON = 'Booking expired due to no check-in';
const COMPLETE_REASON = 'AUTO_COMPLETE';

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
};

export async function handleBookingReminder(
  data: BookingReminderJobData,
): Promise<void> {
  const booking = await bookingRepo.findById(data.bookingId);

  if (!booking) {
    console.warn('[booking.worker] booking not found for reminder', data);
    return;
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    console.info('[booking.worker] reminder skipped — not CONFIRMED', {
      bookingId: booking.id,
      status: booking.status,
    });
    return;
  }

  await bookingQueueService.enqueueBookingReminderEmail(booking.id);
}

export async function processBookingJob(job: Job): Promise<void> {
  switch (job.name) {
    case BOOKING_JOB.REMINDER:
      return handleBookingReminder(job.data as BookingReminderJobData);
    case BOOKING_JOB.AUTO_EXPIRE:
      return handleAutoExpireBooking(job.data as AutoExpireBookingJobData);
    case BOOKING_JOB.AUTO_COMPLETE:
      return handleAutoCompleteBooking(job.data as AutoCompleteBookingJobData);
    default:
      throw new Error(`Unknown booking job: ${job.name}`);
  }
}

export function createBookingWorker(): Worker {
  const worker = new Worker('booking', processBookingJob, {
    connection,
    concurrency: 3,
  });

  worker.on('failed', (job, err) => {
    console.error('[booking.worker] job failed', {
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}

function isPastExpireDeadline(
  startTime: Date,
  graceMinutes: number,
  now = new Date(),
): boolean {
  const deadline = new Date(startTime.getTime() + graceMinutes * 60_000);
  return now >= deadline;
}

function isPastCompleteDeadline(endTime: Date, now = new Date()): boolean {
  return now >= endTime;
}

async function rescheduleExpireJob(
  bookingId: string,
  startTime: Date,
  graceMinutes: number,
): Promise<void> {
  try {
    await bookingQueueService.enqueueAutoExpireJob(
      bookingId,
      startTime,
      graceMinutes,
    );
  } catch (e) {
    console.warn('[booking.worker] failed to reschedule expire job', {
      bookingId,
      error: e,
    });
  }
}

async function rescheduleCompleteJob(
  bookingId: string,
  endTime: Date,
): Promise<void> {
  try {
    await bookingQueueService.enqueueAutoCompleteJob(bookingId, endTime);
  } catch (e) {
    console.warn('[booking.worker] failed to reschedule complete job', {
      bookingId,
      error: e,
    });
  }
}

export async function handleAutoExpireBooking(
  data: AutoExpireBookingJobData,
): Promise<void> {
  const booking = await bookingRepo.findById(data.bookingId);

  // 1) Not found → discard
  if (!booking) {
    console.warn('[booking.worker] booking not found for expire', data);
    return;
  }

  const cafe = await cafeRepo.findById(booking.cafeId);
  const graceMinutes = cafe?.checkinGraceMinutes ?? 15;
  const now = new Date();

  // 2) Status đã đổi → no-op
  if (booking.status !== BookingStatus.CONFIRMED) {
    console.info('[booking.worker] expire skipped — not CONFIRMED', {
      bookingId: booking.id,
      status: booking.status,
    });
    return;
  }

  // 3) Chưa quá deadline → reschedule (clock drift)
  if (!isPastExpireDeadline(booking.startTime, graceMinutes, now)) {
    console.info('[booking.worker] expire fired early — rescheduling', {
      bookingId: booking.id,
    });
    await rescheduleExpireJob(booking.id, booking.startTime, graceMinutes);
    return;
  }

  // 4) TX: conditional update CONFIRMED → EXPIRED
  const updatedCount = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const count = await bookingRepo.updateBookingStatus(
        booking.id,
        BookingStatus.CONFIRMED,
        {
          nextStatus: BookingStatus.EXPIRED,
          expiredAt: now,
          updatedAt: now,
        },
        tx,
      );

      if (count === 0) return 0;

      await bookingRepo.createBookingHistoryEntry(
        {
          bookingId: booking.id,
          fromStatus: BookingStatus.CONFIRMED,
          toStatus: BookingStatus.EXPIRED,
          changedById: null, // system worker
          reason: NO_SHOW_REASON,
        },
        tx,
      );

      await bookingRepo.createAuditLog(
        {
          actorId: null, // system
          action: 'BOOKING_EXPIRED',
          resourceType: 'BOOKING',
          resourceId: booking.id,
          changes: {
            expiredAt: now.toISOString(),
            reason: NO_SHOW_REASON,
          },
        },
        tx,
      );

      return count;
    },
  );

  // 5) Race với check-in/cancel → no-op
  if (updatedCount === 0) {
    console.info('[booking.worker] expire noop — status changed during TX', {
      bookingId: booking.id,
    });
    return;
  }

  // 6) Post-commit side effects (SAU TX — giống cancellation.service)
  try {
    await cache.deleteByPattern(`availability:${booking.cafeId}:*`);
  } catch (e) {
    console.warn('[booking.worker] failed to invalidate availability cache', e);
  }

  try {
    await bookingQueueService.cancelCompleteJob(booking.id);
    await bookingQueueService.enqueueCancellationEmail(
      booking.id,
      booking.customerId,
      EXPIRE_EMAIL_REASON,
    );
  } catch (e) {
    // QUEUE-DESIGN: booking vẫn EXPIRED; chỉ log warning
    console.warn('[booking.worker] failed to enqueue expire cancellation email', e);
  }

  console.info('[booking.worker] booking expired', { bookingId: booking.id });
}

export async function handleAutoCompleteBooking(
  data: AutoCompleteBookingJobData,
): Promise<void> {
  const booking = await bookingRepo.findById(data.bookingId);

  if (!booking) {
    console.warn('[booking.worker] booking not found for complete', data);
    return;
  }

  const now = new Date();

  // Only CHECKED_IN → COMPLETED; CONFIRMED is handled by expire
  if (booking.status !== BookingStatus.CHECKED_IN) {
    console.info('[booking.worker] complete skipped — not CHECKED_IN', {
      bookingId: booking.id,
      status: booking.status,
    });
    return;
  }

  if (!isPastCompleteDeadline(booking.endTime, now)) {
    console.info('[booking.worker] complete fired early — rescheduling', {
      bookingId: booking.id,
    });
    await rescheduleCompleteJob(booking.id, booking.endTime);
    return;
  }

  const updatedCount = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const count = await bookingRepo.updateBookingStatus(
        booking.id,
        BookingStatus.CHECKED_IN,
        {
          nextStatus: BookingStatus.COMPLETED,
          updatedAt: now,
        },
        tx,
      );

      if (count === 0) return 0;

      await bookingRepo.createBookingHistoryEntry(
        {
          bookingId: booking.id,
          fromStatus: BookingStatus.CHECKED_IN,
          toStatus: BookingStatus.COMPLETED,
          changedById: null,
          reason: COMPLETE_REASON,
        },
        tx,
      );

      await bookingRepo.createAuditLog(
        {
          actorId: null,
          action: 'BOOKING_COMPLETED',
          resourceType: 'BOOKING',
          resourceId: booking.id,
          changes: {
            completedAt: now.toISOString(),
            reason: COMPLETE_REASON,
          },
        },
        tx,
      );

      return count;
    },
  );

  if (updatedCount === 0) {
    console.info('[booking.worker] complete noop — status changed during TX', {
      bookingId: booking.id,
    });
    return;
  }

  try {
    await cache.deleteByPattern(`availability:${booking.cafeId}:*`);
  } catch (e) {
    console.warn('[booking.worker] failed to invalidate availability cache', e);
  }

  console.info('[booking.worker] booking completed', { bookingId: booking.id });
}
