import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('vitest runs', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('cafe_reservation_test');
  });
});