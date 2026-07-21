import type { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';
import { RateLimitError } from '../common/errors';

type RateLimiterOptions = {
    windowMs: number;
    max: number;
    keyPrefix: string;
    keyGenerator: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const key = `rate-limit:${options.keyPrefix}:${options.keyGenerator(req)}`;
            const count = await redis.incr(key);

            if ( count === 1 ) {
                await redis.pexpire(key, options.windowMs);

            }

            if ( count > options.max ) {
                return next(new RateLimitError());
            }
            next();
        } catch (error) {
            console.error('Rate limiter error:', error);
            next(new RateLimitError())
        }
    };
}

const ipKey = (req: Request) => req.ip || 'unknown';
const userKey = (req: Request) => req.user?.id || ipKey(req);

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyPrefix: 'register',
  keyGenerator: ipKey,
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'login',
  keyGenerator: ipKey,
});

export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  
  max: 20,                   
  keyPrefix: 'refresh',
  keyGenerator: ipKey,
});

export const registrationUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyPrefix: 'upload-registration',
  keyGenerator: ipKey,
});

export const bookingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: 'booking-create',
  keyGenerator: userKey,
});