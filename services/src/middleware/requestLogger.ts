import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 * Logs incoming requests with timestamp
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`
    );
  });

  next();
};
