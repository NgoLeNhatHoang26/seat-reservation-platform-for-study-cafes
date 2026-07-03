
export class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly isOperational = true;
    readonly details?: Record<string, unknown>;
    constructor(
      statusCode: number,
      errorCode: string,
      message?: string,
      details?: Record<string, unknown>,
    ) {
      super(message ?? errorCode);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      this.details = details;
      Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ValidationError extends AppError {
  constructor(errorCode = 'VALIDATION_ERROR', message?: string, details?: Record<string, unknown>) {
    super(422, errorCode, message ?? 'Request validation failed', details);
  }
}

export class NotFoundError extends AppError {
  constructor(errorCode: string, message?: string) {
    super(404, errorCode, message ?? errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(errorCode = 'UNAUTHORIZED', message?: string) {
    super(401, errorCode, message ?? errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(errorCode = 'FORBIDDEN', message?: string) {
    super(403, errorCode, message ?? errorCode);
  }
}
export class ConflictError extends AppError {
  constructor(errorCode: string, message?: string) {
    super(409, errorCode, message ?? errorCode);
  }
}
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is temporarily locked') {
    super(403, 'ACCOUNT_LOCKED', message);
  }
}