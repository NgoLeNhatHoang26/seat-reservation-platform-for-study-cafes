import { describe, expect, it } from 'vitest';
import * as passwordService from '../../../src/modules/auth/password.service';

describe('PasswordService', () => {
  it('hashes and verifies the same password', async () => {
    const plaintext = 'Password123!';

    const hash = await passwordService.hashPassword(plaintext);

    expect(hash).not.toBe(plaintext);
    await expect(passwordService.comparePassword(plaintext, hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await passwordService.hashPassword('Password123!');

    await expect(passwordService.comparePassword('WrongPassword123!', hash)).resolves.toBe(false);
  });
});
