import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../common/errors';
import type { UserRole } from '../generated/prisma/enums';

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

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(new UnauthorizedError('UNAUTHORIZED'));
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('AUTH_TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('UNAUTHORIZED'));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
  } catch {
  }

  next();
}