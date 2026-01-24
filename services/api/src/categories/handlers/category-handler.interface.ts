/**
 * Category Handler Interface
 *
 * Defines the contract for category-specific logic.
 * All category-specific behavior must be implemented via this interface.
 *
 * CRITICAL RULE: OrdersService MUST NOT contain if/else statements checking category name.
 * All category-specific logic lives in CategoryHandler implementations.
 */

import { Seller } from '@prisma/client';

/**
 * File upload requirements for a category
 */
export interface FileRequirements {
  /** Whether file upload is required for this category */
  required: boolean;
  /** Allowed file types (MIME types or extensions) */
  allowedTypes: string[];
  /** Maximum file size in bytes */
  maxSizeBytes: number;
  /** Whether multiple files are allowed */
  allowMultiple: boolean;
}

/**
 * Validation result for order payload
 */
export interface ValidationResult {
  /** Whether payload is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Normalized payload (if validation modifies data) */
  normalizedPayload?: unknown;
}

/**
 * Price breakdown for an order
 */
export interface PriceBreakdown {
  /** Base item price (in smallest currency unit, e.g., paise) */
  itemPrice: number;
  /** Currency code (e.g., 'INR') */
  currency: string;
  /** Optional: Detailed breakdown (e.g., per-page pricing) */
  breakdown?: Record<string, unknown>;
}

/**
 * Category Handler Interface
 *
 * Each category must implement this interface to handle category-specific logic.
 * Core order flow calls handler methods, never checks category name.
 */
export interface CategoryHandler {
  /**
   * Get the category ID this handler supports
   */
  getCategoryId(): string;

  /**
   * Validate category-specific order payload
   * @param payload - Order payload (category-specific structure)
   * @returns Validation result with normalized payload if needed
   */
  validatePayload(payload: unknown): ValidationResult;

  /**
   * Calculate item price for this order
   * @param payload - Validated order payload
   * @param seller - Seller who will fulfill the order
   * @returns Price breakdown
   */
  calculatePrice(payload: unknown, seller: Seller): PriceBreakdown;

  /**
   * Get file upload requirements for this category
   * @returns File requirements, or null if no files required
   */
  getFileRequirements(): FileRequirements | null;

  /**
   * Process order after creation (optional category-specific processing)
   * @param orderId - Order ID
   * @param payload - Order payload
   * @returns Promise that resolves when processing is complete
   */
  processOrder?(orderId: string, payload: unknown): Promise<void>;
}
