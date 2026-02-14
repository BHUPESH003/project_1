/**
 * Common Type Definitions
 */

/**
 * API Response Type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
}

/**
 * Pagination
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string>;
}

/**
 * User Type (Example)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Create User Request
 */
export interface CreateUserRequest {
  name: string;
  email: string;
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
}
