import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, errorResponse } from '@/common/dto/api-response.dto';

/**
 * HTTP Exception Filter
 *
 * Catches all exceptions and formats them in the standard API response format:
 * {
 *   "code": number,
 *   "data": null,
 *   "message": string
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let errorData: unknown = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
          [key: string]: unknown;
        };
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else if (responseObj.message) {
          message = responseObj.message;
        } else if (responseObj.error) {
          message = responseObj.error;
        }
        // Include additional error details if present
        errorData = responseObj;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponseData: ApiResponse<null> = errorResponse(
      message,
      status,
      errorData,
    );

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
    );

    response.status(status).json(errorResponseData);
  }
}
