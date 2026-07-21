import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import {
  AccountLockedError,
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from '../common/errors';
import { UserStatus } from '../generated/prisma/enums';
import type { UserRole } from '../generated/prisma/enums';
import type { AuthUserSnapshot } from '../modules/auth/auth.repository';
import * as authRepo from '../modules/auth/auth.repository';

type AccessTokenPayload = {
  id: string;
  email: string;
  role: UserRole;
};

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function assertAuthUserActive(user: AuthUserSnapshot): void {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AccountLockedError();
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new ForbiddenError('ACCOUNT_SUSPENDED');
  }
}

async function resolveAuthenticatedUser(payload: AccessTokenPayload) {
  const user = await authRepo.findAuthUserById(payload.id);
  if (!user) {
    throw new UnauthorizedError('UNAUTHORIZED');
  }

  assertAuthUserActive(user);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(new UnauthorizedError('UNAUTHORIZED'));
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = await resolveAuthenticatedUser(payload);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('AUTH_TOKEN_EXPIRED'));
    }
    if (err instanceof AppError) {
      return next(err);
    }
    return next(new UnauthorizedError('UNAUTHORIZED'));
  }
}

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = await resolveAuthenticatedUser(payload);
  } catch {
  }

  next();
}
