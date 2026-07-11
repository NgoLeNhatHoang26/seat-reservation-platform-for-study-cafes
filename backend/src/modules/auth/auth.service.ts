import { randomUUID } from 'crypto';
import {
  AccountLockedError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../common/errors';
import { env } from '../../config/env';
import { OwnerVerificationStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
import type { User } from '../../generated/prisma/client';
import type { UserWithProfile } from './auth.repository';
import * as bookingRepo from '../booking/booking.repository';
import * as bookingQueue from '../booking/booking-queue.service';
import type {
  AuthTokensResponse,
  LoginDto,
  MeResponse,
  RegisterCustomerDto,
  RegisterOwnerDto,
  UserResponse,
} from './auth.dto';
import * as authRepo from './auth.repository';
import * as jwtService from './jwt.service';
import * as passwordService from './password.service';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
  };
}

async function issueTokens(user: User): Promise<AuthTokensResponse> {
  const tokenId = randomUUID();
  const accessToken = jwtService.signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = jwtService.signRefreshToken({ id: user.id, tokenId });
  await jwtService.storeRefreshToken(user.id, tokenId, refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
}

function assertAccountCanAuthenticate(user: User): void {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AccountLockedError();
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new ForbiddenError('ACCOUNT_SUSPENDED');
  }
}

function assertOwnerCanAuthenticate(user: UserWithProfile): void {
  if (user.role !== UserRole.OWNER) {
    return;
  }

  const profile = user.ownerProfile;
  if (!profile || profile.verificationStatus === OwnerVerificationStatus.PENDING) {
    throw new ForbiddenError('OWNER_PENDING_APPROVAL');
  }
  if (profile.verificationStatus === OwnerVerificationStatus.REJECTED) {
    throw new ForbiddenError('OWNER_REJECTED');
  }
}

export async function registerCustomer(dto: RegisterCustomerDto) {
  const existing = await authRepo.findUserByEmail(dto.email);
  if (existing) {
    throw new ConflictError('EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await passwordService.hashPassword(dto.password);
  const { user } = await authRepo.createUserWithProfile({
    email: dto.email,
    passwordHash,
    fullName: dto.fullName,
    phone: dto.phone,
    preferredCity: dto.preferredCity,
  });

  const tokens = await issueTokens(user);

  return {
    user: toUserResponse(user),
    tokens,
  };
}

export async function registerOwner(dto: RegisterOwnerDto) {
  const existing = await authRepo.findUserByEmail(dto.email);
  if (existing) {
    throw new ConflictError('EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await passwordService.hashPassword(dto.password);
  const { user } = await authRepo.createOwnerWithProfile({
    email: dto.email,
    passwordHash,
    fullName: dto.fullName,
    phone: dto.phone,
    businessLicenseUrl: dto.documents.businessLicenseUrl,
    idCardUrl: dto.documents.idCardUrl,
  });

  try {
    const verificationToken = randomUUID();
    await bookingQueue.enqueueVerificationEmail(user.id, user.email, verificationToken);
  } catch (error) {
    console.warn('Failed to enqueue verification email', error);
  }

  return {
    user: toUserResponse(user),
    message:
      'Hồ sơ đăng ký đã được gửi. Admin sẽ xem xét trong 1–3 ngày làm việc. Bạn có thể đăng nhập sau khi được duyệt.',
  };
}

export async function login(dto: LoginDto) {
  const user = await authRepo.findUserByEmail(dto.email);
  if (!user) {
    throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS');
  }

  assertAccountCanAuthenticate(user);

  const passwordValid = await passwordService.comparePassword(dto.password, user.passwordHash);
  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    await authRepo.updateUserLoginAttempts(user.id, attempts);

    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await authRepo.updateUserLockedUntil(
        user.id,
        new Date(Date.now() + LOCK_DURATION_MS),
      );
      throw new AccountLockedError();
    }

    throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS');
  }

  assertOwnerCanAuthenticate(user);

  await authRepo.updateUserLoginAttempts(user.id, 0);
  if (user.lockedUntil) {
    await authRepo.updateUserLockedUntil(user.id, null);
  }

  const tokens = await issueTokens(user);

  try {
    await bookingRepo.createAuditLog({
      actorId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: user.id,
    });
  } catch (error) {
    console.warn('Failed to write login audit log', error);
  }

  return {
    user: toUserResponse(user),
    tokens,
  };
}

export async function refreshToken(refreshTokenValue: string): Promise<{ tokens: AuthTokensResponse }> {
  let payload: jwtService.RefreshTokenPayload;
  try {
    payload = jwtService.verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new UnauthorizedError('AUTH_REFRESH_TOKEN_INVALID');
  }

  const stored = await jwtService.getRefreshToken(payload.id, payload.tokenId);
  if (!stored || stored !== refreshTokenValue) {
    throw new UnauthorizedError('AUTH_REFRESH_TOKEN_INVALID');
  }

  const user = await authRepo.findUserById(payload.id);
  if (!user) {
    throw new UnauthorizedError('AUTH_REFRESH_TOKEN_INVALID');
  }

  assertAccountCanAuthenticate(user);
  assertOwnerCanAuthenticate(user);

  await jwtService.revokeRefreshToken(payload.id, payload.tokenId);
  const tokens = await issueTokens(user);

  return { tokens };
}

export async function logout(userId: string, refreshTokenValue: string): Promise<{ loggedOut: true }> {
  try {
    const payload = jwtService.verifyRefreshToken(refreshTokenValue);
    if (payload.id === userId) {
      await jwtService.revokeRefreshToken(payload.id, payload.tokenId);
    }
  } catch {
    // Idempotent logout — invalid token still returns success
  }

  return { loggedOut: true };
}

export async function getCurrentUser(userId: string): Promise<MeResponse> {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  const response: MeResponse = {
    user: toUserResponse(user),
  };

  if (user.role === UserRole.CUSTOMER && user.customerProfile) {
    response.profile = {
      preferredCity: user.customerProfile.preferredCity,
      emailNotifications: user.customerProfile.emailNotifications,
      smsNotifications: user.customerProfile.smsNotifications,
    };
  }

  return response;
}
