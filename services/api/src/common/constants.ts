/**
 * Application Constants
 *
 * Single source of truth for all application constants.
 * No hardcoded values should exist elsewhere.
 *
 * All values should be configurable via environment variables
 * with sensible defaults for development.
 */

import { ConfigService } from '@nestjs/config';

/**
 * OTP Configuration Constants
 */
export const OTP_CONFIG = {
  LENGTH: 6, // OTP code length
  EXPIRY_MINUTES: 5, // OTP expiry time in minutes (matches Prisma schema)
  MAX_ATTEMPTS: 5, // Maximum verification attempts before blocking
} as const;

/**
 * JWT Configuration Constants
 */
export const JWT_CONFIG = {
  DEFAULT_EXPIRATION_SECONDS: 3600, // 1 hour
  DEFAULT_EXPIRATION_STRING: '3600s', // String format for JWT module
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * Seller Configuration Constants
 */
export const SELLER_CONFIG = {
  DEFAULT_STATUS: 'OFFLINE', // Default status after login
  MIN_PREP_TIME_MINUTES: 5,
  MAX_PREP_TIME_MINUTES: 120,
  DEFAULT_PRICE_PER_PAGE: 2.0, // Default printing price per page
} as const;

/**
 * Order Configuration Constants
 */
export const ORDER_CONFIG = {
  DEFAULT_EXPIRY_MINUTES: 30, // Order expiry if not accepted
  MAX_ORDER_AMOUNT: 100000, // Maximum order amount (safety limit)
  MIN_ORDER_AMOUNT: 10, // Minimum order amount
} as const;

/**
 * File Upload Constants
 */
export const FILE_CONFIG = {
  MAX_FILE_SIZE_MB: 10, // Maximum file size in MB
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
  MAX_FILES_PER_ORDER: 5,
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMIT_CONFIG = {
  DEFAULT_TTL_MS: 60000, // 1 minute
  DEFAULT_LIMIT: 10, // Requests per window
  OTP_REQUEST_LIMIT: 5, // OTP requests per window (stricter)
  OTP_REQUEST_TTL_MS: 300000, // 5 minutes for OTP requests
} as const;

/**
 * Phone Number Validation
 */
export const PHONE_CONFIG = {
  E164_PATTERN: /^\+[1-9]\d{1,14}$/, // E.164 format regex
  E164_EXAMPLE: '+919876543210', // Example format
} as const;

/**
 * OTP Code Validation
 */
export const OTP_CODE_CONFIG = {
  PATTERN: /^\d{6}$/, // 6 digits only
  LENGTH: 6,
} as const;

/**
 * Get configuration values from environment or use defaults
 * This helper ensures all config is centralized
 */
export function getConfigValue<T>(
  configService: ConfigService,
  key: string,
  defaultValue: T,
): T {
  return configService.get<T>(key, defaultValue);
}
