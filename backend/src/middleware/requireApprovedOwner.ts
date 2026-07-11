import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { OwnerVerificationStatus } from '../generated/prisma/enums';

/**
 * Ensures the authenticated OWNER has an admin-approved verification profile.
 * Must run after authenticate + authorize(OWNER).
 */
export async function requireApprovedOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    return next(new UnauthorizedError('UNAUTHORIZED'));
  }

  const profile = await prisma.ownerProfile.findUnique({
    where: { userId: req.user.id },
  });

  if (!profile || profile.verificationStatus === OwnerVerificationStatus.PENDING) {
    return next(new ForbiddenError('OWNER_PENDING_APPROVAL'));
  }

  if (profile.verificationStatus === OwnerVerificationStatus.REJECTED) {
    return next(new ForbiddenError('OWNER_REJECTED'));
  }

  next();
}
