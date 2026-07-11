
export type BookingStatus =
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface BookingSeat {
  id: string;
  seatNumber: string;
  seatType: string;
  zone?: {
    id: string;
    name: string;
  };
}

export interface BookingCafe {
  id: string;
  name: string;
  city: string;
  address?: string;
  checkinGraceMinutes?: number;
}

export interface Booking {
  id: string;
  bookingCode?: string;
  cafeId: string;
  seatId: string;
  startTime: string; // ISO datetime
  endTime: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  checkedInAt?: string;
  cafe?: BookingCafe;
  seat?: BookingSeat;
}

export type BookingListItem = Booking;

export interface CreateBookingPayload {
  cafeId: string;
  seatId: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;
  notes?: string;
}

export interface CreateBookingResponse {
  booking: Booking;
  seat: BookingSeat;
  cafe: BookingCafe;
}

export interface CancelBookingResponse {
  booking: Booking;
  policy: {
    cancellationDeadlineMinutes: number;
    cancelledWithinDeadline?: boolean;
  };
}

export interface CheckInResponse {
  booking: Booking;
  seat: BookingSeat;
}

export interface BookingDetailResponse {
  booking: Booking;
  cafe: BookingCafe;
  seat: BookingSeat;
}

export interface BookingListResponse {
  items: BookingListItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface GetBookingsParams {
  status?: BookingStatus;
  upcoming?: boolean;
  cafeId?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}
