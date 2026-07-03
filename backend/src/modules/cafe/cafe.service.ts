import { parsePaginationParams, buildCursorPaginationResult } from '../../common/pagination';
import * as cache from '../../common/cache';
import { NotFoundError, ValidationError } from '../../common/errors';
import { CafeStatus } from '../../generated/prisma/enums';
import { buildAvailabilitySnapshot } from './cafe-availability';
import type { CafePolicies } from './cafe.dto';
import * as repo from './cafe.repository';

async function withCache<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cache.getFromCache<T>(key);
  if (cached) return cached;

  const data = await loader();
  await cache.setToCache(key, data, ttl);
  
  return data;
}

async function assertCafeActive(cafeId: string): Promise<void> {
  const cafe = await repo.findById(cafeId);
  if (!cafe) throw new NotFoundError('CAFE_NOT_FOUND');
  if (cafe.status !== CafeStatus.ACTIVE) {
    throw new NotFoundError('CAFE_NOT_AVAILABLE');
  }
}

export async function listCafes(query: Record<string, string | undefined>) {
  const { limit, cursor } = parsePaginationParams(query);
  const params = { city: query.city, limit, cursor, sort: query.sort ?? '-createdAt' };
  const paramsHash = cache.buildParamsHash({ route: 'browse', ...params });
  const cacheKey = cache.buildCafeListKey(paramsHash);

  return withCache(cacheKey, cache.TTL.CAFE_LIST, async () => {
    const rows = await repo.findManyActive(params);
    const page = buildCursorPaginationResult(rows, limit);

    const items = await Promise.all(
      page.items.map(async (cafe) => ({
        ...cafe,
        totalSeats: await repo.countTotalSeats(cafe.id),
      })),
    );

    return { items, nextCursor: page.nextCursor, hasMore: page.hasMore };
  });
}

export async function searchCafes(query: Record<string, string | undefined>) {
  const { limit, cursor } = parsePaginationParams(query);
  const amenities = query.amenities?.split(',').map((a) => a.trim()).filter(Boolean);
  const startTime = query.startTime ? new Date(query.startTime) : undefined;
  const endTime = query.endTime ? new Date(query.endTime) : undefined;

  const params = {
    city: query.city!,
    limit,
    cursor,
    amenities,
    startTime,
    endTime,
  };

  const paramsHash = cache.buildParamsHash({ route: 'search', ...params });
  const cacheKey = cache.buildCafeListKey(paramsHash);

  return withCache(cacheKey, cache.TTL.CAFE_LIST, async () => {
    const rows = await repo.searchActive(params);
    const page = buildCursorPaginationResult(rows, limit);

    const items = await Promise.all(
      page.items.map(async (cafe) => {
        const totalSeats = await repo.countTotalSeats(cafe.id);

        if (!startTime || !endTime) {
          return { ...cafe, totalSeats };
        }

        const bookings = await repo.findOverlappingBookings(cafe.id, startTime, endTime);
        const bookedSeatIds = new Set<string>(bookings.map((b: { seatId: string }) => b.seatId));

        return {
          ...cafe,
          totalSeats,
          availableSeatsCount: totalSeats - bookedSeatIds.size,
        };
      }),
    );

    return { items, nextCursor: page.nextCursor, hasMore: page.hasMore };
  });
}

export async function getCafeDetail(cafeId: string) {
  const cacheKey = cache.buildCafeDetailKey(cafeId);

  return withCache(cacheKey, cache.TTL.CAFE_DETAIL, async () => {
    const cafe = await repo.findById(cafeId);
    if (!cafe) throw new NotFoundError('CAFE_NOT_FOUND');
    if (cafe.status !== CafeStatus.ACTIVE) {
      throw new NotFoundError('CAFE_NOT_AVAILABLE');
    }

    const policies: CafePolicies = {
      slotDurationMinutes: cafe.slotDurationMinutes,
      minAdvanceBookingMinutes: cafe.minAdvanceBookingMinutes,
      maxAdvanceBookingDays: cafe.maxAdvanceBookingDays,
      cancellationDeadlineMinutes: cafe.cancellationDeadlineMinutes,
      maxConcurrentBookings: cafe.maxConcurrentBookings,
      checkinGraceMinutes: cafe.checkinGraceMinutes,
      timezone: cafe.timezone,
    };

    return {
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        description: cafe.description,
        address: cafe.address,
        city: cafe.city,
        phone: cafe.phone,
        amenities: cafe.amenities,
        operatingHours: cafe.operatingHours,
      },
      policies,
    };
  });
}

export async function getCafeLayout(cafeId: string) {
  await assertCafeActive(cafeId);
  const cacheKey = cache.buildCafeLayoutKey(cafeId);

  return withCache(cacheKey, cache.TTL.CAFE_LAYOUT, async () => {
    const zones = await repo.findZonesWithSeats(cafeId);
    return { zones };
  });
}

export async function getSeatAvailability(
  cafeId: string,
  startTime: string,
  endTime: string,
  zoneId?: string,
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start < new Date()) {
    throw new ValidationError('TIME_SLOT_IN_PAST', 'Start time must be in the future');
  }

  await assertCafeActive(cafeId);

  const date = start.toISOString().slice(0, 10);
  const slotHash = cache.buildSlotHash(startTime, endTime);
  const cacheKey = cache.buildAvailabilityKey(cafeId, date, slotHash);

  return withCache(cacheKey, cache.TTL.AVAILABILITY, async () => {
    const zones = await repo.findZonesWithSeats(cafeId);
    const bookings = await repo.findOverlappingBookings(cafeId, start, end, zoneId);
    const bookedSeatIds = new Set<string>(bookings.map((b: { seatId: string }) => b.seatId));
    const snapshot = buildAvailabilitySnapshot(zones, bookedSeatIds, zoneId);

    return {
      timeSlot: { startTime, endTime },
      ...snapshot,
    };
  });
}
