import {
  NotificationType,
} from '../../generated/prisma/enums';
import type { InAppNotificationRow } from './notification.repository';
import type { NotificationItemResponse } from './notification.dto';

const NOTIFICATION_COPY: Record<
  NotificationType,
  { title: string; message: string }
> = {
  [NotificationType.BOOKING_CONFIRMATION]: {
    title: 'Đặt chỗ thành công',
    message: 'Đặt chỗ của bạn đã được xác nhận.',
  },
  [NotificationType.BOOKING_REMINDER]: {
    title: 'Nhắc lịch sắp tới',
    message: 'Bạn có lịch tại quán sắp bắt đầu trong 30 phút.',
  },
  [NotificationType.BOOKING_CANCELLATION]: {
    title: 'Đặt chỗ đã hủy',
    message: 'Đặt chỗ của bạn đã bị hủy.',
  },
  [NotificationType.BOOKING_EXPIRED]: {
    title: 'Đặt chỗ hết hạn',
    message: 'Đặt chỗ đã hết hạn do không check-in đúng hạn.',
  },
  [NotificationType.EMAIL_VERIFICATION]: {
    title: 'Xác minh email',
    message: 'Vui lòng xác minh email của bạn.',
  },
  [NotificationType.ACCOUNT_SUSPENDED]: {
    title: 'Tài khoản bị tạm khóa',
    message: 'Tài khoản của bạn đã bị tạm khóa.',
  },
};

export function toNotificationItemResponse(
  row: InAppNotificationRow,
): NotificationItemResponse {
  const copy = NOTIFICATION_COPY[row.type] ?? {
    title: 'Thông báo',
    message: '',
  };

  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    bookingId: row.bookingId,
    isRead: row.isRead,
    title: copy.title,
    message: copy.message,
    createdAt: row.createdAt.toISOString(),
  };
}
