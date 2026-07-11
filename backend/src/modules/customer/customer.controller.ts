import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../common/errors';
import { sendSuccess } from '../../common/response';
import * as customerService from './customer.service';
import type { UpdateProfileBody } from './customer.validator';

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Authentication required');
    }

    const result = await customerService.getProfile(req.user.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Authentication required');
    }

    const body = req.body as UpdateProfileBody;
    const result = await customerService.updateProfile(req.user.id, body);

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
