import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error Handler Middleware
 * Catches and formats all errors
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode =
    err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : 'Internal Server Error';

  console.error(`[ERROR] ${statusCode} - ${message}`, err);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  });
};
