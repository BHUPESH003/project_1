/**
 * Standard API Response Format
 *
 * All API responses follow this consistent structure:
 * {
 *   "code": number,      // HTTP status code
 *   "data": T,           // Response payload (can be any type)
 *   "message": string      // Human-readable message
 * }
 *
 * This ensures frontend can consistently parse all responses.
 */

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/**
 * Helper function to create success response
 */
export function successResponse<T>(
  data: T,
  message = 'Success',
  code = 200,
): ApiResponse<T> {
  return {
    code,
    data,
    message,
  };
}

/**
 * Helper function to create error response
 */
export function errorResponse(
  message: string,
  code = 500,
  data: unknown = null,
): ApiResponse<null> {
  return {
    code,
    data: data as null,
    message,
  };
}
