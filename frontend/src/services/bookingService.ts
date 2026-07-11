import { axiosInstance } from './axiosInstance';
import { normalizePaginated } from '../utils/pagination';
import type {
  BookingDetailResponse,
  BookingListResponse,
  CancelBookingResponse,
  CheckInResponse,
  CreateBookingPayload,
  CreateBookingResponse,
  GetBookingsParams,
} from '../types/booking.types';

export async function createBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<{ data: CreateBookingResponse }>(
    '/bookings',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data.data;
}

export async function cancelBooking(
  bookingId: string,
  reason?: string,
  idempotencyKey?: string,
): Promise<CancelBookingResponse> {
  const { data } = await axiosInstance.delete<{ data: CancelBookingResponse }>(
    `/bookings/${bookingId}`,
    {
      params: reason ? { reason } : undefined,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
  );
  return data.data;
}

export async function checkIn(bookingId: string): Promise<CheckInResponse> {
  const { data } = await axiosInstance.post<{ data: CheckInResponse }>(
    `/bookings/${bookingId}/check-in`,
    {},
  );
  return data.data;
}

export async function getBookingDetail(
  bookingId: string,
): Promise<BookingDetailResponse> {
  const { data } = await axiosInstance.get<{ data: BookingDetailResponse }>(
    `/bookings/${bookingId}`,
  );
  return data.data;
}

export async function getBookings(
  params: GetBookingsParams = {},
): Promise<BookingListResponse> {
  const { data } = await axiosInstance.get('/bookings', { params });
  return normalizePaginated(data.data) as BookingListResponse;
}
