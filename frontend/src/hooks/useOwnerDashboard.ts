import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ownerService from '../services/ownerService';
import type {
  CreateCafePayload,
  GetOwnerBookingsParams,
  SaveLayoutPayload,
  UpdateCafePayload,
  UpdateCafeSettingsPayload,
} from '../types/cafe.types';

// All keys nested under ['owner'] for targeted invalidation.

export const ownerKeys = {
  all: ['owner'] as const,
  cafes: () => ['owner', 'cafes'] as const,
  cafe: (cafeId: string) => ['owner', 'cafes', cafeId] as const,
  layout: (cafeId: string) => ['owner', 'cafes', cafeId, 'layout'] as const,
  bookings: (cafeId: string, params?: GetOwnerBookingsParams) =>
    ['owner', 'cafes', cafeId, 'bookings', params ?? {}] as const,
};

export function useOwnerCafes() {
  return useQuery({
    queryKey: ownerKeys.cafes(),
    queryFn: () => ownerService.listOwnerCafes(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOwnerCafe(cafeId: string) {
  return useQuery({
    queryKey: ownerKeys.cafe(cafeId),
    queryFn: () => ownerService.getOwnerCafe(cafeId),
    staleTime: 2 * 60 * 1000,
    enabled: !!cafeId,
  });
}

export function useOwnerSeatLayout(cafeId: string) {
  return useQuery({
    queryKey: ownerKeys.layout(cafeId),
    queryFn: () => ownerService.getOwnerSeatLayout(cafeId),
    staleTime: 2 * 60 * 1000,
    enabled: !!cafeId,
  });
}

export function useOwnerBookings(
  cafeId: string,
  params?: GetOwnerBookingsParams,
) {
  return useQuery({
    queryKey: ownerKeys.bookings(cafeId, params),
    queryFn: () => ownerService.getOwnerBookings(cafeId, params),
    staleTime: 0,
    enabled: !!cafeId,
  });
}

export function useCreateCafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCafePayload) => ownerService.createCafe(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerKeys.cafes() });
    },
  });
}

export function useUpdateCafe(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCafePayload) =>
      ownerService.updateCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerKeys.cafes() });
      qc.invalidateQueries({ queryKey: ownerKeys.cafe(cafeId) });
    },
  });
}

export function useUpdateCafeSettings(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCafeSettingsPayload) =>
      ownerService.updateCafeSettings(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerKeys.cafe(cafeId) });
    },
  });
}

export function useSaveLayout(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveLayoutPayload) =>
      ownerService.saveLayout(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerKeys.layout(cafeId) });
    },
  });
}

export function useOwnerCheckIn(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      ownerService.ownerCheckIn(cafeId, bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerKeys.bookings(cafeId) });
    },
  });
}
