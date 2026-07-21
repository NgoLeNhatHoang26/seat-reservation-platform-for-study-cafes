import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/common/errors';
import { OwnerVerificationStatus, UserRole, UserStatus } from '../../../src/generated/prisma/enums';
import * as authRepo from '../../../src/modules/auth/auth.repository';
import * as authService from '../../../src/modules/auth/auth.service';
import * as jwtService from '../../../src/modules/auth/jwt.service';
import * as passwordService from '../../../src/modules/auth/password.service';
import * as bookingRepo from '../../../src/modules/booking/booking.repository';
import * as emailQueueProducer from '../../../src/queues/email-queue.producer';

vi.mock('../../../src/modules/auth/auth.repository', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUserWithProfile: vi.fn(),
  createOwnerWithProfile: vi.fn(),
  updateUserLoginAttempts: vi.fn(),
  updateUserLockedUntil: vi.fn(),
}));

vi.mock('../../../src/modules/auth/password.service', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock('../../../src/modules/auth/jwt.service', () => ({
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  storeRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock('../../../src/queues/email-queue.producer', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueueAdminNewCafePendingEmail: vi.fn(),
}));

vi.mock('../../../src/modules/booking/booking.repository', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('../../../src/modules/cafe/owner.mapper', () => ({
  toOwnerCafeResponse: vi.fn((cafe) => cafe),
}));

type TestUserOptions = {
  id?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  ownerProfile?: {
    verificationStatus: OwnerVerificationStatus;
  } | null;
};

function makeUser(overrides: TestUserOptions = {}) {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'customer@test.com',
    passwordHash: 'hashed-password',
    role: overrides.role ?? UserRole.CUSTOMER,
    status: overrides.status ?? UserStatus.ACTIVE,
    fullName: 'Test User',
    phone: null,
    emailVerifiedAt: new Date(),
    failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    customerProfile: null,
    ownerProfile: overrides.ownerProfile ?? null,
  };
}

function expectAppError(error: unknown, errorCode: string): void {
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ errorCode });
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.mocked(jwtService.signAccessToken).mockReturnValue('access-token');
    vi.mocked(jwtService.signRefreshToken).mockReturnValue('refresh-token');
    vi.mocked(jwtService.storeRefreshToken).mockResolvedValue();
    vi.mocked(bookingRepo.createAuditLog).mockResolvedValue({} as never);
  });

  it('rejects duplicate customer registration emails', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(makeUser() as never);

    await expect(
      authService.registerCustomer({
        email: 'customer@test.com',
        password: 'Password123!',
        fullName: 'Test User',
      }),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'EMAIL_ALREADY_REGISTERED');
      return true;
    });

    expect(authRepo.createUserWithProfile).not.toHaveBeenCalled();
  });

  it('increments failed attempts and rejects invalid login credentials', async () => {
    const user = makeUser({ failedLoginAttempts: 2 });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(false);
    vi.mocked(authRepo.updateUserLoginAttempts).mockResolvedValue(makeUser() as never);

    await expect(
      authService.login({
        email: user.email,
        password: 'WrongPassword123!',
      }),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'AUTH_INVALID_CREDENTIALS');
      return true;
    });

    expect(authRepo.updateUserLoginAttempts).toHaveBeenCalledWith(user.id, 3);
    expect(authRepo.updateUserLockedUntil).not.toHaveBeenCalled();
  });

  it('locks an account after the maximum failed login attempts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T09:00:00.000Z'));

    const user = makeUser({ failedLoginAttempts: 4 });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(false);
    vi.mocked(authRepo.updateUserLoginAttempts).mockResolvedValue(makeUser() as never);
    vi.mocked(authRepo.updateUserLockedUntil).mockResolvedValue(makeUser() as never);

    await expect(
      authService.login({
        email: user.email,
        password: 'WrongPassword123!',
      }),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'ACCOUNT_LOCKED');
      return true;
    });

    expect(authRepo.updateUserLoginAttempts).toHaveBeenCalledWith(user.id, 5);
    expect(authRepo.updateUserLockedUntil).toHaveBeenCalledWith(
      user.id,
      new Date('2026-07-09T09:15:00.000Z'),
    );
  });

  it('logs in with valid credentials and issues tokens', async () => {
    const user = makeUser();
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(true);
    vi.mocked(authRepo.updateUserLoginAttempts).mockResolvedValue(makeUser() as never);

    const result = await authService.login({
      email: user.email,
      password: 'Password123!',
    });

    expect(passwordService.comparePassword).toHaveBeenCalledWith('Password123!', user.passwordHash);
    expect(authRepo.updateUserLoginAttempts).toHaveBeenCalledWith(user.id, 0);
    expect(jwtService.signAccessToken).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    expect(jwtService.signRefreshToken).toHaveBeenCalled();
    expect(jwtService.storeRefreshToken).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      'refresh-token',
    );
    expect(result).toMatchObject({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });

  it('rejects revoked refresh tokens', async () => {
    vi.mocked(jwtService.verifyRefreshToken).mockReturnValue({
      id: 'user-1',
      tokenId: 'token-1',
    });
    vi.mocked(jwtService.getRefreshToken).mockResolvedValue(null);

    await expect(authService.refreshToken('refresh-token')).rejects.toSatisfy((error) => {
      expectAppError(error, 'AUTH_REFRESH_TOKEN_INVALID');
      return true;
    });

    expect(jwtService.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('registers customer as active without verification email', async () => {
    const user = makeUser({ status: UserStatus.ACTIVE });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(passwordService.hashPassword).mockResolvedValue('hashed-password');
    vi.mocked(authRepo.createUserWithProfile).mockResolvedValue({
      user,
      profile: {},
    } as never);

    const result = await authService.registerCustomer({
      email: user.email,
      password: 'Password123!',
      fullName: 'Test User',
    });

    expect(emailQueueProducer.enqueueVerificationEmail).not.toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('registers owner without issuing tokens and enqueues verification email', async () => {
    const owner = makeUser({
      email: 'owner@test.com',
      role: UserRole.OWNER,
      status: UserStatus.PENDING_EMAIL_VERIFICATION,
    });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(passwordService.hashPassword).mockResolvedValue('hashed-password');
    vi.mocked(authRepo.createOwnerWithProfile).mockResolvedValue({
      user: owner,
      profile: {
        verificationStatus: OwnerVerificationStatus.PENDING,
      },
    } as never);
    vi.mocked(emailQueueProducer.enqueueVerificationEmail).mockResolvedValue(undefined as never);

    const result = await authService.registerOwner({
      email: 'owner@test.com',
      password: 'Password123!',
      fullName: 'Owner User',
      documents: {
        businessLicenseUrl: 'https://example.com/license.jpg',
        idCardUrl: 'https://example.com/id.jpg',
      },
    });

    expect(jwtService.signAccessToken).not.toHaveBeenCalled();
    expect(jwtService.signRefreshToken).not.toHaveBeenCalled();
    expect(emailQueueProducer.enqueueVerificationEmail).toHaveBeenCalledWith(
      owner.id,
      owner.email,
      expect.any(String),
    );
    expect(result).toMatchObject({
      user: {
        email: 'owner@test.com',
        role: UserRole.OWNER,
      },
      message: expect.any(String),
    });
  });

  it('rejects login for unapproved owners', async () => {
    const user = makeUser({
      email: 'owner@test.com',
      role: UserRole.OWNER,
      ownerProfile: { verificationStatus: OwnerVerificationStatus.PENDING },
    });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(true);

    await expect(
      authService.login({
        email: user.email,
        password: 'Password123!',
      }),
    ).rejects.toSatisfy((error) => {
      expectAppError(error, 'OWNER_PENDING_APPROVAL');
      return true;
    });

    expect(jwtService.signAccessToken).not.toHaveBeenCalled();
  });

  it('allows login for approved owners', async () => {
    const user = makeUser({
      email: 'owner@test.com',
      role: UserRole.OWNER,
      ownerProfile: { verificationStatus: OwnerVerificationStatus.APPROVED },
    });
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(true);
    vi.mocked(authRepo.updateUserLoginAttempts).mockResolvedValue(user as never);

    const result = await authService.login({
      email: user.email,
      password: 'Password123!',
    });

    expect(jwtService.signAccessToken).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('access-token');
  });
});
