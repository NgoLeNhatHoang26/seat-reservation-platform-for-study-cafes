import { emailQueue, bookingQueue } from '../../workers/queue';

export const BOOKING_JOB = {
  REMINDER: 'BOOKING_REMINDER',
  AUTO_EXPIRE: 'AUTO_EXPIRE_BOOKING',
} as const;
export const EMAIL_JOB = {
  CONFIRMATION: 'BOOKING_CONFIRMATION',
  CANCELLATION: 'BOOKING_CANCELLATION',
} as const;

const ONE_MINUTE_MS = 60_000;
const THIRTY_MINUTES_MS = 30 * ONE_MINUTE_MS;

function msUntil(target: Date, floorMs = 0): number {
  return Math.max(target.getTime() - Date.now(), floorMs);
}
function reminderDelayMs(startTime: Date): number {
  const fireAt = new Date(startTime.getTime() - THIRTY_MINUTES_MS);
  return msUntil(fireAt, ONE_MINUTE_MS); // tối thiểu 1 phút
}
function expireDelayMs(startTime: Date, graceMinutes: number): number {
  const fireAt = new Date(startTime.getTime() + graceMinutes * ONE_MINUTE_MS);
  return msUntil(fireAt, 0);
}
function reminderJobId(bookingId: string) {
  return `${bookingId}:reminder`;
}
function expireJobId(bookingId: string) {
  return `${bookingId}:expire`;
}

export async function enqueueBookingConfirmationEmail(
    bookingId: string,
    customerId: string,
) {
    await emailQueue.add(
        EMAIL_JOB.CONFIRMATION,
        { bookingId, customerId },
        { delay: 1_000}
    );
}

export async function enqueueBookingReminderJob(
    bookingId: string,
    startTime: Date,
) {
    await bookingQueue.add(
        BOOKING_JOB.REMINDER,
        { bookingId },
        {
            jobId: reminderJobId(bookingId),
            delay: reminderDelayMs(startTime),
        },
    );
}

export async function enqueueAutoExpireJob(
  bookingId: string,
  startTime: Date,
  graceMinutes: number,
) {
  await bookingQueue.add(
    BOOKING_JOB.AUTO_EXPIRE,
    { bookingId },
    {
      jobId: expireJobId(bookingId), // "{bookingId}:expire"
      delay: expireDelayMs(startTime, graceMinutes),
    },
  );
}

export async function cancelReminderJob(bookingId: string) {
  try {
    await bookingQueue.remove(reminderJobId(bookingId));
  } catch {
    // Job không tồn tại → no-op (đã fire hoặc chưa enqueue)
  }
}
export async function cancelExpireJob(bookingId: string) {
  try {
    await bookingQueue.remove(expireJobId(bookingId));
  } catch {
    // no-op
  }
}

export async function enqueueCancellationEmail(
  bookingId: string,
  customerId: string,
  reason?: string,
) {
  await emailQueue.add(EMAIL_JOB.CANCELLATION, {
    bookingId,
    customerId,
    ...(reason ? { reason } : {}),
  });
}
