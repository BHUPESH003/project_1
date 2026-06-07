import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiResponse, errorResponse } from '@/common/dto/api-response.dto';

const isProduction = process.env.NODE_ENV === 'production';

/** Map Prisma error codes to HTTP status + user-facing messages */
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'A record with these details already exists',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Related record not found',
  },
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Input value is too long' },
  P2016: { status: HttpStatus.BAD_REQUEST, message: 'Invalid query input' },
};

/**
 * Global Exception Filter
 *
 * Handles three error categories:
 * 1. NestJS HttpExceptions — pass through with proper formatting
 * 2. Prisma known errors — map to semantic HTTP status codes
 * 3. Everything else — 500, no stack trace in production
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorData: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const r = exceptionResponse as {
          message?: string | string[];
          error?: string;
          [k: string]: unknown;
        };
        if (Array.isArray(r.message)) {
          message = r.message.join(', ');
        } else if (r.message) {
          message = r.message;
        } else if (r.error) {
          message = r.error;
        }
        errorData = r;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database operation failed';
      }
      // Expose Prisma error code in non-production for easier debugging
      if (!isProduction)
        errorData = { prismaCode: exception.code, meta: exception.meta };
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      if (!isProduction) errorData = { detail: exception.message };
    } else if (exception instanceof Error) {
      message = isProduction ? 'Internal server error' : exception.message;
    }

    const errorResponseData: ApiResponse<null> = errorResponse(
      message,
      status,
      errorData,
    );

    // Always log full stack on the server; never expose it to clients in production
    this.logger.error(
      `${request.method} ${request.url} — ${status} — ${message}`,
      isProduction
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : String(exception),
    );

    response.status(status).json(errorResponseData);
  }
}
