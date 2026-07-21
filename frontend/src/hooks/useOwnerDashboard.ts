import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import * as ownerService from '../services/ownerService';
import type {
  CreateCafePayload,
  GetOwnerBookingsParams,
  SaveLayoutPayload,
  UpdateCafePayload,
  UpdateCafeSettingsPayload,
} from '../types/cafe.types';

export function useOwnerCafes() {
  return useQuery({
    queryKey: queryKeys.owner.cafes(),
    queryFn: () => ownerService.listOwnerCafes(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOwnerCafe(cafeId: string) {
  return useQuery({
    queryKey: queryKeys.owner.cafe(cafeId),
    queryFn: () => ownerService.getOwnerCafe(cafeId),
    staleTime: 2 * 60 * 1000,
    enabled: !!cafeId,
  });
}

export function useOwnerSeatLayout(cafeId: string) {
  return useQuery({
    queryKey: queryKeys.owner.layout(cafeId),
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
    queryKey: queryKeys.owner.bookings(cafeId, params),
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
      qc.invalidateQueries({ queryKey: queryKeys.owner.cafes() });
    },
  });
}

export function useUpdateCafe(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCafePayload) =>
      ownerService.updateCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.owner.cafes() });
      qc.invalidateQueries({ queryKey: queryKeys.owner.cafe(cafeId) });
    },
  });
}

export function useUpdateCafeSettings(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCafeSettingsPayload) =>
      ownerService.updateCafeSettings(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.owner.cafe(cafeId) });
    },
  });
}

export function useSaveLayout(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveLayoutPayload) =>
      ownerService.saveLayout(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.owner.layout(cafeId) });
    },
  });
}

export function useOwnerCheckIn(cafeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      ownerService.ownerCheckIn(cafeId, bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.owner.bookingsAll(cafeId) });
    },
  });
}
