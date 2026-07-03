import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import type { UserRole } from '@/generated/prisma/enums';

export function authorize(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new UnauthorizedError('UNAUTHORIZED'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ForbiddenError('FORBIDDEN'));
        }
        next();
    };
}