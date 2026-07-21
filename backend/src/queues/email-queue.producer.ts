import { emailQueue } from './queue';
import { EMAIL_JOB } from './queue-names';

export const EXPIRE_EMAIL_REASON = 'Booking expired due to no check-in';

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

export async function enqueueExpiredBookingEmail(
  bookingId: string,
  customerId: string,
) {
  await enqueueCancellationEmail(bookingId, customerId, EXPIRE_EMAIL_REASON);
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
