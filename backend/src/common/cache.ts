import { createHash } from "crypto";
import { redis } from "../config/redis";

export const TTL = {
  CAFE_LIST: 5 * 60,
  CAFE_DETAIL: 10 * 60,
  CAFE_LAYOUT: 10 * 60,
  AVAILABILITY: 30,
} as const;

export const IDEMPOTENCY_TTL_SECONDS = 60 * 60;

const IDEMPOTENCY_LOCK_TTL_SECONDS = 30;

const EMAIL_VERIFY_TTL = 24 * 60 * 60;

export async function acquireIdempotencyLock(key: string): Promise<boolean> {
  try {
    const result = await redis.set(`${key}:lock`, '1', 'EX', IDEMPOTENCY_LOCK_TTL_SECONDS, 'NX');
    return result === 'OK';
  } catch {
    return false; 
  }
}
export async function releaseIdempotencyLock(key: string): Promise<void> {
  try {
    await redis.del(`${key}:lock`);
  } catch {}
}

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

export function buildIdempotencyKey(scope: string, key: string) {
  return `idempotency:${scope}:${key}`;
}
export function buildBookingIdempotencyKey(customerId: string, idempotencyKey: string) {
  return buildIdempotencyKey('booking', `${customerId}:${idempotencyKey}`);
}
export async function deleteByPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await redis.unlink(...keys);
    } while (cursor !== '0');
  } catch {
    // degrade gracefully
  }
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

export async function storeEmailVerificationToken(
  userId: string,
  email: string,
  token: string,
): Promise<void> {
  const old = await redis.get(`email-verify:user:${userId}`);
  if (old) await redis.del(`email-verify:${old}`);
  await redis.setex(
    `email-verify:${token}`,
    EMAIL_VERIFY_TTL,
    JSON.stringify({ userId, email }),
  );
  await redis.setex(`email-verify:user:${userId}`, EMAIL_VERIFY_TTL, token);
}
export async function consumeEmailVerificationToken(token: string) {
  const raw = await redis.get(`email-verify:${token}`);
  if (!raw) return null;
  const payload = JSON.parse(raw) as { userId: string; email: string };
  await redis.del(`email-verify:${token}`);
  await redis.del(`email-verify:user:${payload.userId}`);
  return payload;
}