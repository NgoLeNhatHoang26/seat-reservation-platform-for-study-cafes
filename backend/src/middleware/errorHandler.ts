import type {Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    const requestId =  (req as Request & { id?: string }).id;

    if (err instanceof ZodError) {
        res.status(422).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            meta: {
                requestId,
                details: err.flatten(),
            },
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
          success: false,
          error: err.errorCode,
          message: err.message,
          meta: {
            requestId,
            ...(err.details ? { details: err.details } : {}),
          },
        });
        return;
    }

    console.error(err);

    const isDev = process.env.NODE_ENV === 'development';

    res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
        meta: {
            requestId,
            ...(isDev && err instanceof Error ? { details: err.stack } : {}),
        },
    })
}