import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  setupTestDatabase,
  disconnectTestDatabase,
  testPrisma,
} from '../helpers/db';

describe('integration setup', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('connects to test database', async () => {
    const result = await testPrisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(result[0].ok).toBe(1);
  });
});