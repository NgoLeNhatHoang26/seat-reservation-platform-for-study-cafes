import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { OwnerVerificationStatus } from '../generated/prisma/enums';
import * as authRepo from '../modules/auth/auth.repository';

export async function requireApprovedOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    return next(new UnauthorizedError('UNAUTHORIZED'));
  }

  const profile = await authRepo.findOwnerProfileByUserId(req.user.id);

  if (!profile || profile.verificationStatus === OwnerVerificationStatus.PENDING) {
    return next(new ForbiddenError('OWNER_PENDING_APPROVAL'));
  }

  if (profile.verificationStatus === OwnerVerificationStatus.REJECTED) {
    return next(new ForbiddenError('OWNER_REJECTED'));
  }

  next();
}
