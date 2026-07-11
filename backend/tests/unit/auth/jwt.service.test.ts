import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../src/generated/prisma/enums';
import * as jwtService from '../../../src/modules/auth/jwt.service';
import { redis } from '../../../src/config/redis';

vi.mock('../../../src/config/redis', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
  },
}));

describe('JWTService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues and verifies an access token', () => {
    const token = jwtService.signAccessToken({
      id: 'user-1',
      email: 'customer@test.com',
      role: UserRole.CUSTOMER,
    });

    const payload = jwtService.verifyAccessToken(token);

    expect(payload).toMatchObject({
      id: 'user-1',
      email: 'customer@test.com',
      role: UserRole.CUSTOMER,
    });
  });

  it('rejects an invalid access token signature', () => {
    expect(() => jwtService.verifyAccessToken('not-a-token')).toThrow();
  });

  it('issues and verifies a refresh token', () => {
    const token = jwtService.signRefreshToken({
      id: 'user-1',
      tokenId: 'token-1',
    });

    const payload = jwtService.verifyRefreshToken(token);

    expect(payload).toMatchObject({
      id: 'user-1',
      tokenId: 'token-1',
    });
  });

  it('stores refresh tokens in Redis with a TTL', async () => {
    vi.mocked(redis.setex).mockResolvedValue('OK');

    await jwtService.storeRefreshToken('user-1', 'token-1', 'refresh-token');

    expect(redis.setex).toHaveBeenCalledWith(
      'refresh:user-1:token-1',
      7 * 24 * 60 * 60,
      'refresh-token',
    );
  });

  it('reads and revokes refresh tokens from Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue('refresh-token');
    vi.mocked(redis.del).mockResolvedValue(1);

    await expect(jwtService.getRefreshToken('user-1', 'token-1')).resolves.toBe('refresh-token');
    await jwtService.revokeRefreshToken('user-1', 'token-1');

    expect(redis.get).toHaveBeenCalledWith('refresh:user-1:token-1');
    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:token-1');
  });
});
