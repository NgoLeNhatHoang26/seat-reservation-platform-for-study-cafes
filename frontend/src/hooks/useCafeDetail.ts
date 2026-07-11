import { useQuery } from '@tanstack/react-query';
import {
  getCafeDetail,
  getSeatAvailability,
  getSeatLayout,
  type SeatAvailabilityParams,
} from '../services/cafeService';

const DETAIL_STALE = 10 * 60 * 1000; // 10 min
const LAYOUT_STALE = 10 * 60 * 1000; // 10 min
const AVAILABILITY_STALE = 30 * 1000; // 30 sec — matches backend Redis TTL

export const cafeKeys = {
  detail: (cafeId: string) => ['cafe', cafeId] as const,
  layout: (cafeId: string) => ['cafe', cafeId, 'layout'] as const,
  availability: (cafeId: string, params: SeatAvailabilityParams | null) =>
    ['cafe', cafeId, 'availability', params] as const,
};

export function useCafeDetail(cafeId: string | undefined) {
  return useQuery({
    queryKey: cafeKeys.detail(cafeId ?? ''),
    queryFn: () => getCafeDetail(cafeId!),
    enabled: Boolean(cafeId),
    staleTime: DETAIL_STALE,
  });
}

export function useSeatLayout(cafeId: string | undefined) {
  return useQuery({
    queryKey: cafeKeys.layout(cafeId ?? ''),
    queryFn: () => getSeatLayout(cafeId!),
    enabled: Boolean(cafeId),
    staleTime: LAYOUT_STALE,
  });
}

export function useSeatAvailability(
  cafeId: string | undefined,
  params: SeatAvailabilityParams | null,
) {
  return useQuery({
    queryKey: cafeKeys.availability(cafeId ?? '', params),
    queryFn: () => getSeatAvailability(cafeId!, params!),
    enabled: Boolean(cafeId) && params !== null,
    staleTime: AVAILABILITY_STALE,
  });
}
