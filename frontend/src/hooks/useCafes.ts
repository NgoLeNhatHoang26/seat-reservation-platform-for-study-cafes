import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getCafes,
  searchCafes,
  type BrowseCafesParams,
} from '../services/cafeService';
import { queryKeys } from '../lib/queryKeys';
import type { CafeListResponse } from '../types/cafe.types';

const STALE_TIME = 5 * 60 * 1000; // 5 min — matches backend café list cache TTL

export interface UseCafesParams {
  city?: string;
  amenities?: string[];
  limit?: number;
  sort?: string;
}

export function useCafes(params: UseCafesParams = {}) {
  const { city, amenities, limit = 12, sort } = params;
  const useSearch = Boolean(city);
  const listParams = { city, amenities, limit, sort };

  return useInfiniteQuery<CafeListResponse, Error>({
    queryKey: queryKeys.cafes.list(listParams),
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      if (useSearch) {
        return searchCafes({
          city: city!,
          amenities,
          limit,
          cursor,
        });
      }
      const browseParams: BrowseCafesParams = { limit, cursor, sort };
      return getCafes(browseParams);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    staleTime: STALE_TIME,
  });
}
