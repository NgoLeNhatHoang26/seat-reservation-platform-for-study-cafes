import { createHash } from "crypto";
import { redis } from "../config/redis";

export const TTL = {
  CAFE_LIST: 5 * 60,
  CAFE_DETAIL: 10 * 60,
  CAFE_LAYOUT: 10 * 60,
  AVAILABILITY: 30,
} as const;

export async function getFromCache<T>(key: string): Promise<T | null> {
    try {
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) as T : null;

    } catch {
        return null;
    }
}

export async function setToCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis down — bỏ qua, response vẫn trả từ DB
  }
}

export async function deleteFromCache(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch { }
  }

export function buildParamsHash(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = params[k];
        return acc;
  }, {});

  return createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex')
    .slice(0, 16);
}

export function buildCafeListKey(paramsHash: string) {
  return `cafes:list:${paramsHash}`;
}
export function buildCafeDetailKey(cafeId: string) {
  return `cafe:detail:${cafeId}`;
}
export function buildCafeLayoutKey(cafeId: string) {
  return `cafe:layout:${cafeId}`;
}
export function buildAvailabilityKey(cafeId: string, date: string, slotHash: string) {
  return `availability:${cafeId}:${date}:${slotHash}`;
}

export function buildSlotHash(startTime: string, endTime: string) {
  return createHash('sha256').update(`${startTime}|${endTime}`).digest('hex').slice(0, 12);
}