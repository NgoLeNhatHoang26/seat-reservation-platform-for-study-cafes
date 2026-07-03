import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();
    (req as Request & { id?: string }).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
}
