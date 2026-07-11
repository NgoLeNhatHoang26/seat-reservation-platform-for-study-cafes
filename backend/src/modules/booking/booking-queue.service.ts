import { emailQueue, bookingQueue } from '../../workers/queue';

export const BOOKING_JOB = {
  REMINDER: 'BOOKING_REMINDER',
  AUTO_EXPIRE: 'AUTO_EXPIRE_BOOKING',
  AUTO_COMPLETE: 'AUTO_COMPLETE_BOOKING',
} as const;
export const EMAIL_JOB = {
  CONFIRMATION: 'BOOKING_CONFIRMATION',
  CANCELLATION: 'BOOKING_CANCELLATION',
  ADMIN_NEW_CAFE_PENDING: 'ADMIN_NEW_CAFE_PENDING',
  REMINDER: 'BOOKING_REMINDER',
  VERIFICATION: 'SEND_VERIFICATION_EMAIL',
  SUSPENDED: 'ACCOUNT_SUSPENDED',
} as const;

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

export async function enqueueBookingConfirmationEmail(
  bookingId: string,
  customerId: string,
) {
  await emailQueue.add(
    EMAIL_JOB.CONFIRMATION,
    { bookingId, customerId },
    { delay: 1_000 },
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

export async function enqueueAdminNewCafePendingEmail(
  cafeId: string,
  ownerEmail: string,
) {
  await emailQueue.add(EMAIL_JOB.ADMIN_NEW_CAFE_PENDING, {
    cafeId,
    ownerEmail,
  });
}

export async function enqueueBookingReminderEmail(bookingId: string) {
  await emailQueue.add(EMAIL_JOB.REMINDER, { bookingId }, { delay: 0 });
}

export async function enqueueAccountSuspendedEmail(
  userId: string,
  reason: string,
) {
  await emailQueue.add(EMAIL_JOB.SUSPENDED, { userId, reason });
}

export async function enqueueVerificationEmail(
  userId: string,
  email: string,
  token: string,
) {
  await emailQueue.add(EMAIL_JOB.VERIFICATION, { userId, email, token });
}
