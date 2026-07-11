import jwt from 'jsonwebtoken';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import type { UserRole } from '../../generated/prisma/enums';

const REFRESH_KEY_PREFIX = 'refresh';

export type AccessTokenPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export type RefreshTokenPayload = {
  id: string;
  tokenId: string;
};

function refreshKey(userId: string, tokenId: string): string {
  return `${REFRESH_KEY_PREFIX}:${userId}:${tokenId}`;
}

function refreshKeyPattern(userId: string): string {
  return `${REFRESH_KEY_PREFIX}:${userId}:*`;
}

function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60;
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 7 * 24 * 60 * 60;
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export async function storeRefreshToken(
  userId: string,
  tokenId: string,
  token: string,
): Promise<void> {
  const ttl = parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
  await redis.setex(refreshKey(userId, tokenId), ttl, token);
}

export async function getRefreshToken(
  userId: string,
  tokenId: string,
): Promise<string | null> {
  return redis.get(refreshKey(userId, tokenId));
}

export async function revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
  await redis.del(refreshKey(userId, tokenId));
}

export async function revokeAllUserTokens(userId: string): Promise<number> {
  const pattern = refreshKeyPattern(userId);
  let cursor = '0';
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
}
