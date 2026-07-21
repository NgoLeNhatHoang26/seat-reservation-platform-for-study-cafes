import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import * as bookingService from '../services/bookingService';
import type {
  BookingListResponse,
  BookingStatus,
  CreateBookingPayload,
} from '../types/booking.types';

// staleTime: 0 — booking list is user-specific, always refetch on mount

export interface UseBookingsParams {
  status?: BookingStatus;
  upcoming?: boolean;
  cafeId?: string;
  limit?: number;
}

export function useBookings(params: UseBookingsParams = {}) {
  const { status, upcoming, cafeId, limit = 10 } = params;
  const listParams = { status, upcoming, cafeId, limit };

  return useInfiniteQuery<BookingListResponse, Error>({
    queryKey: queryKeys.bookings.list(listParams),
    queryFn: ({ pageParam }) =>
      bookingService.getBookings({
        status,
        upcoming,
        cafeId,
        limit,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    staleTime: 0,
  });
}

interface CreateBookingVariables extends CreateBookingPayload {
  idempotencyKey: string;
}

interface CancelBookingVariables {
  bookingId: string;
  reason?: string;
  idempotencyKey?: string;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idempotencyKey, ...payload }: CreateBookingVariables) =>
      bookingService.createBooking(payload, idempotencyKey),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cafes.availabilityAll(data.cafe.id),
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason, idempotencyKey }: CancelBookingVariables) =>
      bookingService.cancelBooking(bookingId, reason, idempotencyKey),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cafes.availabilityAll(data.booking.cafeId),
      });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingService.checkIn(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
