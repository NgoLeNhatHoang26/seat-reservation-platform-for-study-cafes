import { Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sendEmail } from '../common/sendgrid';
import { EMAIL_JOB } from '../modules/booking/booking-queue.service';
import * as bookingRepo from '../modules/booking/booking.repository';
import * as authRepo from '../modules/auth/auth.repository';
import * as cafeRepo from '../modules/cafe/cafe.repository';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../generated/prisma/enums';
import type {
  AccountSuspendedEmailJobData,
  AdminNewCafePendingEmailJobData,
  BookingCancellationEmailJobData,
  BookingConfirmationEmailJobData,
  BookingReminderEmailJobData,
  SendVerificationEmailJobData,
} from './worker.types';

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
};

type LogNotificationInput = {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  errorMessage?: string | null;
  sentAt?: Date | null;
};

async function logNotification(input: LogNotificationInput): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      channel: NotificationChannel.EMAIL,
      type: input.type,
      status: input.status,
      recipient: input.recipient,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
    },
  });
}

/** In-app bell feed — API chỉ đọc channel = IN_APP. */
async function logInAppNotification(input: {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
}): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      channel: NotificationChannel.IN_APP,
      type: input.type,
      status: NotificationStatus.SENT,
      recipient: 'in-app',
      sentAt: new Date(),
    },
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

async function loadBookingContext(bookingId: string, customerId: string) {
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) return null;

  const customer = await authRepo.findUserById(customerId);
  if (!customer) return null;

  return { booking, customer };
}

async function sendAndLog(input: {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
  to: string;
  subject: string;
  html: string;
  /** Booking events also write IN_APP so the notification bell is not empty. */
  alsoInApp?: boolean;
}): Promise<void> {
  await sendEmail({ to: input.to, subject: input.subject, html: input.html });

  await logNotification({
    userId: input.userId,
    bookingId: input.bookingId,
    type: input.type,
    status: NotificationStatus.SENT,
    recipient: input.to,
    sentAt: new Date(),
  });

  if (input.alsoInApp) {
    await logInAppNotification({
      userId: input.userId,
      bookingId: input.bookingId,
      type: input.type,
    });
  }
}

const EXPIRE_EMAIL_REASON = 'Booking expired due to no check-in';

function cancellationNotificationType(reason?: string): NotificationType {
  if (reason === EXPIRE_EMAIL_REASON) {
    return NotificationType.BOOKING_EXPIRED;
  }
  return NotificationType.BOOKING_CANCELLATION;
}

export async function sendBookingConfirmationEmail(
  data: BookingConfirmationEmailJobData,
): Promise<void> {
  const ctx = await loadBookingContext(data.bookingId, data.customerId);
  if (!ctx) {
    console.warn('[email.worker] booking/customer not found for confirmation', data);
    return;
  }

  const { booking, customer } = ctx;

  await sendAndLog({
    userId: customer.id,
    bookingId: booking.id,
    type: NotificationType.BOOKING_CONFIRMATION,
    to: customer.email,
    subject: `Xác nhận đặt chỗ #${booking.confirmationNumber}`,
    html: `
      <p>Xin chào ${customer.fullName},</p>
      <p>Đặt chỗ của bạn tại <strong>${booking.cafe.name}</strong> đã được xác nhận.</p>
      <ul>
        <li>Mã: <strong>${booking.confirmationNumber}</strong></li>
        <li>Ghế: <strong>${booking.seat.seatNumber}</strong></li>
        <li>Bắt đầu: ${formatDateTime(booking.startTime)}</li>
        <li>Kết thúc: ${formatDateTime(booking.endTime)}</li>
      </ul>
    `,
    alsoInApp: true,
  });
}

export async function sendBookingCancellationEmail(
  data: BookingCancellationEmailJobData,
): Promise<void> {
  const ctx = await loadBookingContext(data.bookingId, data.customerId);
  if (!ctx) {
    console.warn('[email.worker] booking/customer not found for cancellation', data);
    return;
  }

  const { booking, customer } = ctx;
  const reasonLine = data.reason ? `<p>Lý do: ${data.reason}</p>` : '';
  const type = cancellationNotificationType(data.reason);

  await sendAndLog({
    userId: customer.id,
    bookingId: booking.id,
    type,
    to: customer.email,
    subject:
      type === NotificationType.BOOKING_EXPIRED
        ? `Đặt chỗ #${booking.confirmationNumber} đã hết hạn`
        : `Đặt chỗ #${booking.confirmationNumber} đã bị hủy`,
    html: `
      <p>Xin chào ${customer.fullName},</p>
      <p>Đặt chỗ <strong>#${booking.confirmationNumber}</strong> tại ${booking.cafe.name} ${
        type === NotificationType.BOOKING_EXPIRED ? 'đã hết hạn' : 'đã bị hủy'
      }.</p>
      ${reasonLine}
    `,
    alsoInApp: true,
  });
}

export async function sendBookingReminderEmail(
  data: BookingReminderEmailJobData,
): Promise<void> {
  const booking = await bookingRepo.findById(data.bookingId);
  if (!booking) {
    console.warn('[email.worker] booking not found for reminder', data);
    return;
  }

  const customer = await authRepo.findUserById(booking.customerId);
  if (!customer) {
    console.warn('[email.worker] customer not found for reminder', data);
    return;
  }

  await sendAndLog({
    userId: customer.id,
    bookingId: booking.id,
    type: NotificationType.BOOKING_REMINDER,
    to: customer.email,
    subject: `Nhắc lịch: ${booking.cafe.name} sau 30 phút`,
    html: `
      <p>Xin chào ${customer.fullName},</p>
      <p>Bạn có lịch tại <strong>${booking.cafe.name}</strong> sắp bắt đầu.</p>
      <ul>
        <li>Mã: <strong>${booking.confirmationNumber}</strong></li>
        <li>Ghế: <strong>${booking.seat.seatNumber}</strong></li>
        <li>Bắt đầu: ${formatDateTime(booking.startTime)}</li>
      </ul>
    `,
    alsoInApp: true,
  });
}

export async function sendVerificationEmail(
  data: SendVerificationEmailJobData,
): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(data.token)}`;

  await sendAndLog({
    userId: data.userId,
    type: NotificationType.EMAIL_VERIFICATION,
    to: data.email,
    subject: 'Xác minh email của bạn',
    html: `
      <p>Vui lòng xác minh email bằng cách nhấn link bên dưới:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `,
  });
}

export async function sendAccountSuspendedEmail(
  data: AccountSuspendedEmailJobData,
): Promise<void> {
  const user = await authRepo.findUserById(data.userId);
  if (!user) {
    console.warn('[email.worker] user not found for suspension email', data);
    return;
  }

  await sendAndLog({
    userId: user.id,
    type: NotificationType.ACCOUNT_SUSPENDED,
    to: user.email,
    subject: 'Tài khoản của bạn đã bị tạm khóa',
    html: `
      <p>Xin chào ${user.fullName},</p>
      <p>Tài khoản của bạn đã bị tạm khóa.</p>
      <p>Lý do: ${data.reason}</p>
    `,
  });
}

export async function sendAdminNewCafePendingEmail(
  data: AdminNewCafePendingEmailJobData,
): Promise<void> {
  const adminEmail = env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn('[email.worker] ADMIN_NOTIFICATION_EMAIL missing — skip admin pending email', {
      cafeId: data.cafeId,
    });
    return;
  }

  const cafe = await cafeRepo.findById(data.cafeId);
  if (!cafe) {
    console.warn('[email.worker] cafe not found for admin pending email', data);
    return;
  }

  await sendEmail({
    to: adminEmail,
    subject: `Café "${cafe.name}" đang chờ duyệt`,
    html: `
      <p>Café <strong>${cafe.name}</strong> (${cafe.city}) đang ở trạng thái chờ duyệt.</p>
      <p>Owner: ${data.ownerEmail}</p>
    `,
  });

  const admin = await authRepo.findUserByEmail(adminEmail);
  await logNotification({
    userId: admin?.id ?? cafe.ownerId,
    bookingId: null,
    type: NotificationType.EMAIL_VERIFICATION,
    status: NotificationStatus.SENT,
    recipient: adminEmail,
    sentAt: new Date(),
  });
}

export async function processEmailJob(job: Job): Promise<void> {
  switch (job.name) {
    case EMAIL_JOB.CONFIRMATION:
      return sendBookingConfirmationEmail(job.data as BookingConfirmationEmailJobData);
    case EMAIL_JOB.CANCELLATION:
      return sendBookingCancellationEmail(job.data as BookingCancellationEmailJobData);
    case EMAIL_JOB.REMINDER:
      return sendBookingReminderEmail(job.data as BookingReminderEmailJobData);
    case EMAIL_JOB.VERIFICATION:
      return sendVerificationEmail(job.data as SendVerificationEmailJobData);
    case EMAIL_JOB.SUSPENDED:
      return sendAccountSuspendedEmail(job.data as AccountSuspendedEmailJobData);
    case EMAIL_JOB.ADMIN_NEW_CAFE_PENDING:
      return sendAdminNewCafePendingEmail(job.data as AdminNewCafePendingEmailJobData);
    default:
      throw new Error(`Unknown email job: ${job.name}`);
  }
}

async function resolveFailedLogContext(job: Job): Promise<LogNotificationInput | null> {
  const data = job.data as Record<string, unknown>;
  const errorMessage = job.failedReason ?? 'Email delivery failed';

  if (job.name === EMAIL_JOB.CONFIRMATION || job.name === EMAIL_JOB.CANCELLATION) {
    const customerId = data.customerId;
    const bookingId = data.bookingId;
    if (typeof customerId !== 'string') return null;

    const reason = typeof data.reason === 'string' ? data.reason : undefined;

    return {
      userId: customerId,
      bookingId: typeof bookingId === 'string' ? bookingId : null,
      type:
        job.name === EMAIL_JOB.CONFIRMATION
          ? NotificationType.BOOKING_CONFIRMATION
          : cancellationNotificationType(reason),
      status: NotificationStatus.FAILED,
      recipient: 'unknown',
      errorMessage,
    };
  }

  if (job.name === EMAIL_JOB.REMINDER && typeof data.bookingId === 'string') {
    const booking = await bookingRepo.findById(data.bookingId);
    const customer = booking ? await authRepo.findUserById(booking.customerId) : null;
    if (!customer) return null;

    return {
      userId: customer.id,
      bookingId: data.bookingId,
      type: NotificationType.BOOKING_REMINDER,
      status: NotificationStatus.FAILED,
      recipient: customer.email,
      errorMessage,
    };
  }

  if (job.name === EMAIL_JOB.VERIFICATION) {
    const userId = data.userId;
    const email = data.email;
    if (typeof userId !== 'string' || typeof email !== 'string') return null;

    return {
      userId,
      type: NotificationType.EMAIL_VERIFICATION,
      status: NotificationStatus.FAILED,
      recipient: email,
      errorMessage,
    };
  }

  if (job.name === EMAIL_JOB.SUSPENDED && typeof data.userId === 'string') {
    return {
      userId: data.userId,
      type: NotificationType.ACCOUNT_SUSPENDED,
      status: NotificationStatus.FAILED,
      recipient: 'unknown',
      errorMessage,
    };
  }

  return null;
}

export function createEmailWorker(): Worker {
  const worker = new Worker('email', processEmailJob, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 3;
    if (job.attemptsMade < maxAttempts) return;

    const ctx = await resolveFailedLogContext(job);
    if (!ctx) return;

    try {
      await logNotification(ctx);
    } catch (logErr) {
      console.error('[email.worker] failed to write FAILED notification log', logErr);
    }

    console.error('[email.worker] job moved to DLQ after retries', {
      jobId: job.id,
      name: job.name,
      error: err.message,
    });
  });

  return worker;
}
