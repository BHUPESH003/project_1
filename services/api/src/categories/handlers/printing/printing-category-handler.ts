/**
 * Printing Category Handler
 *
 * Implements CategoryHandler for Printing category.
 * This is the first concrete category handler implementation.
 *
 * Sprint 2: This is the ONLY category handler implemented.
 */

import { Injectable } from '@nestjs/common';
import { Seller } from '@prisma/client';
import {
  CategoryHandler,
  ValidationResult,
  PriceBreakdown,
  FileRequirements,
} from '../category-handler.interface';

/**
 * Printing order payload structure
 */
interface PrintingPayload {
  fileUrl?: string;
  pages?: number;
  copies?: number;
  color?: boolean;
  notes?: string;
}

/**
 * Printing Category Handler
 *
 * Handles all printing-specific logic:
 * - Validates printing order payload
 * - Calculates printing price (per-page pricing)
 * - Defines file upload requirements
 */
@Injectable()
export class PrintingCategoryHandler implements CategoryHandler {
  private readonly CATEGORY_ID = 'printing';

  /**
   * Get category ID
   */
  getCategoryId(): string {
    return this.CATEGORY_ID;
  }

  /**
   * Validate printing order payload
   * 
   * Requirements:
   * - fileUrl is required
   * - pages must be positive integer
   * - copies must be positive integer
   * - color is boolean
   */
  validatePayload(payload: unknown): ValidationResult {
    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        error: 'Payload must be an object',
      };
    }

    const printingPayload = payload as PrintingPayload;

    // Validate fileUrl (required for printing)
    if (!printingPayload.fileUrl || typeof printingPayload.fileUrl !== 'string') {
      return {
        valid: false,
        error: 'fileUrl is required for printing orders',
      };
    }

    // Validate pages (must be positive integer)
    if (
      printingPayload.pages !== undefined &&
      (typeof printingPayload.pages !== 'number' ||
        printingPayload.pages < 1 ||
        !Number.isInteger(printingPayload.pages))
    ) {
      return {
        valid: false,
        error: 'pages must be a positive integer',
      };
    }

    // Validate copies (must be positive integer)
    if (
      printingPayload.copies !== undefined &&
      (typeof printingPayload.copies !== 'number' ||
        printingPayload.copies < 1 ||
        !Number.isInteger(printingPayload.copies))
    ) {
      return {
        valid: false,
        error: 'copies must be a positive integer',
      };
    }

    // Validate color (must be boolean if provided)
    if (
      printingPayload.color !== undefined &&
      typeof printingPayload.color !== 'boolean'
    ) {
      return {
        valid: false,
        error: 'color must be a boolean',
      };
    }

    // Normalize payload (ensure defaults)
    const normalized: PrintingPayload = {
      fileUrl: printingPayload.fileUrl,
      pages: printingPayload.pages ?? 1,
      copies: printingPayload.copies ?? 1,
      color: printingPayload.color ?? false,
      notes: printingPayload.notes,
    };

    return {
      valid: true,
      normalizedPayload: normalized,
    };
  }

  /**
   * Calculate printing price
   * 
   * Pricing logic:
   * - Base price = pages * copies * per_page_price
   * - Color multiplier: 1.5x if color = true
   */
  calculatePrice(payload: unknown, seller: Seller): PriceBreakdown {
    const printingPayload = payload as PrintingPayload;

    // Extract values (use defaults if not provided)
    const pages = printingPayload.pages ?? 1;
    const copies = printingPayload.copies ?? 1;
    const isColor = printingPayload.color ?? false;

    // Get seller's per-page price (in rupees, stored as Decimal)
    // Convert to paise for calculation (multiply by 100)
    const pricePerPageRupees = seller.pricePerPage
      ? Number(seller.pricePerPage)
      : 0;
    
    // Convert to paise (smallest currency unit)
    const pricePerPage = pricePerPageRupees * 100;

    if (pricePerPage <= 0) {
      throw new Error(
        `Seller ${seller.id} does not have pricePerPage configured`,
      );
    }

    // Calculate base price (pages * copies * per_page_price)
    let itemPrice = pages * copies * pricePerPage;

    // Apply color multiplier (1.5x for color printing)
    if (isColor) {
      itemPrice = Math.ceil(itemPrice * 1.5);
    }

    // Return price breakdown
    return {
      itemPrice, // In paise (smallest currency unit)
      currency: 'INR',
      breakdown: {
        pages,
        copies,
        pricePerPage: pricePerPage,
        isColor,
        colorMultiplier: isColor ? 1.5 : 1,
        basePrice: pages * copies * pricePerPage,
        finalPrice: itemPrice,
      },
    };
  }

  /**
   * Get file upload requirements for printing
   * 
   * Printing requires:
   * - Single file upload
   * - PDF, DOC, DOCX, or image formats
   * - Max size: 50MB
   */
  getFileRequirements(): FileRequirements {
    return {
      required: true,
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ],
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
      allowMultiple: false,
    };
  }

  /**
   * Process printing order (optional)
   * 
   * Could include:
   * - File validation
   * - Page count extraction
   * - Other printing-specific processing
   */
  async processOrder(orderId: string, payload: unknown): Promise<void> {
    // TODO: Implement processing logic in Sprint 2 if needed
    // - Validate file exists
    // - Extract page count from file
    // - Update order with extracted data
  }
}
