import { bookingQueue } from './queue';
import { BOOKING_JOB } from './queue-names';

const ONE_MINUTE_MS = 60_000;
const THIRTY_MINUTES_MS = 30 * ONE_MINUTE_MS;

function msUntil(target: Date, floorMs = 0): number {
  return Math.max(target.getTime() - Date.now(), floorMs);
}
function reminderDelayMs(startTime: Date): number {
  const fireAt = new Date(startTime.getTime() - THIRTY_MINUTES_MS);
  return msUntil(fireAt, ONE_MINUTE_MS);
}
function expireDelayMs(startTime: Date, graceMinutes: number): number {
  const fireAt = new Date(startTime.getTime() + graceMinutes * ONE_MINUTE_MS);
  return msUntil(fireAt, 0);
}
function completeDelayMs(endTime: Date): number {
  return msUntil(endTime, 0);
}
function reminderJobId(bookingId: string) {
  return `${bookingId}:reminder`;
}
function expireJobId(bookingId: string) {
  return `${bookingId}:expire`;
}
function completeJobId(bookingId: string) {
  return `${bookingId}:complete`;
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
      jobId: expireJobId(bookingId),
      delay: expireDelayMs(startTime, graceMinutes),
    },
  );
}

export async function enqueueAutoCompleteJob(
  bookingId: string,
  endTime: Date,
) {
  await bookingQueue.add(
    BOOKING_JOB.AUTO_COMPLETE,
    { bookingId },
    {
      jobId: completeJobId(bookingId),
      delay: completeDelayMs(endTime),
    },
  );
}

export async function cancelReminderJob(bookingId: string) {
  try {
    await bookingQueue.remove(reminderJobId(bookingId));
  } catch {
    // no-op
  }
}

export async function cancelExpireJob(bookingId: string) {
  try {
    await bookingQueue.remove(expireJobId(bookingId));
  } catch {
    // no-op
  }
}

export async function cancelCompleteJob(bookingId: string) {
  try {
    await bookingQueue.remove(completeJobId(bookingId));
  } catch {
    // no-op
  }
}

export async function cancelAllLifecycleJobs(bookingId: string): Promise<void> {
  await cancelReminderJob(bookingId);
  await cancelExpireJob(bookingId);
  await cancelCompleteJob(bookingId);
}
