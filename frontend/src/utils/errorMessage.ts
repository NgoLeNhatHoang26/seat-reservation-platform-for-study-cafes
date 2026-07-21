export function getErrorMessage(errorCode: string | undefined | null): string {
  switch (errorCode) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu không đúng.';
    case 'AUTH_TOKEN_EXPIRED':
      return 'Phiên đăng nhập đã hết hạn.';
    case 'AUTH_REFRESH_TOKEN_INVALID':
      return 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.';
    case 'ACCOUNT_LOCKED':
      return 'Tài khoản tạm khóa do đăng nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút.';
    case 'ACCOUNT_SUSPENDED':
      return 'Tài khoản của bạn đã bị đình chỉ.';
    case 'OWNER_PENDING_APPROVAL':
      return 'Tài khoản chủ quán đang chờ admin duyệt. Vui lòng thử lại sau khi được phê duyệt.';
    case 'OWNER_REJECTED':
      return 'Hồ sơ đăng ký chủ quán đã bị từ chối. Vui lòng liên hệ hỗ trợ nếu cần hỗ trợ.';
    case 'FORBIDDEN':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'UNAUTHORIZED':
      return 'Bạn cần đăng nhập để tiếp tục.';

    case 'EMAIL_ALREADY_REGISTERED':
      return 'Email này đã được đăng ký.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Vui lòng xác minh email trước khi đặt chỗ.';
    case 'TOKEN_INVALID_OR_EXPIRED':
      return 'Link xác minh không hợp lệ hoặc đã hết hạn.';
    case 'EMAIL_DELIVERY_FAILED':
      return 'Không thể gửi email xác minh. Vui lòng thử lại sau.';

    case 'RATE_LIMIT_EXCEEDED':
      return 'Quá nhiều yêu cầu, vui lòng thử lại sau.';

    case 'VALIDATION_ERROR':
      return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.';
    case 'IDEMPOTENCY_KEY_REQUIRED':
      return 'Lỗi kỹ thuật: thiếu Idempotency-Key.';

    case 'CAFE_NOT_FOUND':
    case 'CAFE_NOT_AVAILABLE':
      return 'Quán cà phê không tồn tại hoặc đã ngừng hoạt động.';
    case 'SEAT_NOT_FOUND':
      return 'Ghế không tồn tại.';
    case 'DUPLICATE_SEAT_NUMBER':
      return 'Số ghế bị trùng trong cùng khu vực.';
    case 'LAYOUT_CONFLICT':
      return 'Sơ đồ ghế xung đột với booking đang hoạt động.';

    case 'BOOKING_NOT_FOUND':
      return 'Đặt chỗ không tồn tại.';
    case 'SEAT_ALREADY_BOOKED':
    case 'BOOKING_CONFLICT':
      return 'Ghế này vừa được đặt. Vui lòng chọn ghế khác.';
    case 'BOOKING_LIMIT_EXCEEDED':
      return 'Bạn đã đạt số lượng đặt chỗ tối đa cho phép.';
    case 'BOOKING_CANNOT_CANCEL':
      return 'Không thể hủy đặt chỗ này.';
    case 'BOOKING_INVALID_STATUS':
      return 'Trạng thái đặt chỗ không hợp lệ.';
    case 'BOOKING_EXPIRED':
      return 'Đặt chỗ đã hết hạn.';
    case 'INVALID_TIME_SLOT':
      return 'Khung giờ không hợp lệ với chính sách quán.';
    case 'TIME_SLOT_IN_PAST':
      return 'Không thể đặt chỗ trong quá khứ.';
    case 'CHECKIN_TOO_EARLY':
      return 'Chưa đến giờ check-in.';
    case 'CHECKIN_WINDOW_EXPIRED':
      return 'Đã quá giờ check-in cho phép.';
    case 'BOOKING_TIMEOUT':
      return 'Hệ thống đang bận, vui lòng thử lại.';

    case 'NOTIFICATION_NOT_FOUND':
      return 'Thông báo không tồn tại.';

    case 'USER_NOT_FOUND':
      return 'Người dùng không tồn tại.';
    case 'CANNOT_SUSPEND_ADMIN':
    case 'CANNOT_SUSPEND_SELF':
      return 'Không thể thực hiện thao tác này.';

    case 'INTERNAL_SERVER_ERROR':
    case 'SERVICE_UNAVAILABLE':
      return 'Có lỗi xảy ra, vui lòng thử lại.';

    default:
      return 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}

/** Extract the business error code from an Axios error response. */
export function extractErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { error?: string } } })
    ?.response?.data;
  return data?.error;
}

/** Extract validation field errors from a VALIDATION_ERROR response. */
export function extractFieldErrors(
  error: unknown,
): Record<string, string> | null {
  const details = (
    error as {
      response?: { data?: { meta?: { details?: Record<string, string> } } };
    }
  )?.response?.data?.meta?.details;
  return details ?? null;
}
