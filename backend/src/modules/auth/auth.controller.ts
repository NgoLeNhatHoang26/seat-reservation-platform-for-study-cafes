import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../common/errors';
import { sendSuccess } from '../../common/response';
import type {
  LoginDto,
  RefreshTokenDto,
  RegisterCustomerDto,
  RegisterOwnerDto,
} from './auth.dto';
import * as authService from './auth.service';

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Authentication required');
  }
  return req.user;
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.registerCustomer(req.body as RegisterCustomerDto);
    sendSuccess(res, result, 'Registered successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function registerOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.registerOwner(req.body as RegisterOwnerDto);
    sendSuccess(res, result, 'Owner registered successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body as LoginDto);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenDto;
    const result = await authService.refreshToken(refreshToken);
    sendSuccess(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const { refreshToken } = req.body as RefreshTokenDto;
    const result = await authService.logout(user.id, refreshToken);
    sendSuccess(res, result, 'Logged out');
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await authService.getCurrentUser(user.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
