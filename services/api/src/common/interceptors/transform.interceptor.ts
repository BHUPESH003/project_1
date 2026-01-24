import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, successResponse } from '@/common/dto/api-response.dto';

/**
 * Transform Interceptor
 *
 * Wraps all successful responses in the standard API response format:
 * {
 *   "code": number,
 *   "data": T,
 *   "message": string
 * }
 *
 * If the controller returns an object with `code`, `data`, and `message`,
 * it uses those values. Otherwise, it wraps the response.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        // If data is already in ApiResponse format, use it
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'data' in data &&
          'message' in data
        ) {
          return data as ApiResponse<T>;
        }

        // Otherwise, wrap the response
        return successResponse<T>(
          data as T,
          this.getDefaultMessage(statusCode),
          statusCode,
        );
      }),
    );
  }

  /**
   * Get default message based on HTTP status code
   */
  private getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      200: 'Success',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
    };
    return messages[statusCode] || 'Success';
  }
}
