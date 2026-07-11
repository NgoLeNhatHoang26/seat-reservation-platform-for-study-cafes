import type { BOOKING_JOB, EMAIL_JOB } from '../modules/booking/booking-queue.service';

export type BookingJobName = (typeof BOOKING_JOB)[keyof typeof BOOKING_JOB];
export type EmailJobName = (typeof EMAIL_JOB)[keyof typeof EMAIL_JOB];

export interface BookingReminderJobData {
  bookingId: string;
}

export interface AutoExpireBookingJobData {
  bookingId: string;
}

export interface AutoCompleteBookingJobData {
  bookingId: string;
}

export interface BookingConfirmationEmailJobData {
  bookingId: string;
  customerId: string;
}

export interface BookingCancellationEmailJobData {
  bookingId: string;
  customerId: string;
  reason?: string;
}

export interface BookingReminderEmailJobData {
  bookingId: string;
}

export interface SendVerificationEmailJobData {
  userId: string;
  email: string;
  token: string;
}

export interface AccountSuspendedEmailJobData {
  userId: string;
  reason: string;
}

export interface AdminNewCafePendingEmailJobData {
  cafeId: string;
  ownerEmail: string;
}

export type BookingJobDataMap = {
  BOOKING_REMINDER: BookingReminderJobData;
  AUTO_EXPIRE_BOOKING: AutoExpireBookingJobData;
  AUTO_COMPLETE_BOOKING: AutoCompleteBookingJobData;
};

export type EmailJobDataMap = {
  BOOKING_CONFIRMATION: BookingConfirmationEmailJobData;
  BOOKING_CANCELLATION: BookingCancellationEmailJobData;
  BOOKING_REMINDER: BookingReminderEmailJobData;
  SEND_VERIFICATION_EMAIL: SendVerificationEmailJobData;
  ACCOUNT_SUSPENDED: AccountSuspendedEmailJobData;
  ADMIN_NEW_CAFE_PENDING: AdminNewCafePendingEmailJobData;
};
