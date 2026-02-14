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
 * 
 * For printing category, fileUrl is MANDATORY (required)
 * Products (items) are optional for bundling with file orders
 */
interface PrintingPayload {
  // File-based printing - REQUIRED
  fileUrl: string;
  pages?: number;
  copies?: number;
  color?: boolean;
  
  // Optional: products to bundle with printing order
  items?: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  
  // Common fields
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
   * For printing category: fileUrl is MANDATORY (required)
   * - fileUrl is required
   * - pages, copies, color are optional
   * - items (products) are optional
   */
  validatePayload(payload: unknown): ValidationResult {
    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        error: 'Payload must be an object',
      };
    }

    const printingPayload = payload as PrintingPayload;

    // FILEURL IS MANDATORY for printing category
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

    // Validate items if provided (optional)
    if (printingPayload.items && Array.isArray(printingPayload.items)) {
      for (const item of printingPayload.items) {
        if (!item.productId || !item.name || item.quantity === undefined || item.price === undefined) {
          return {
            valid: false,
            error: 'Each item must have productId, name, quantity, and price',
          };
        }
        if (item.quantity < 1) {
          return {
            valid: false,
            error: 'Item quantity must be at least 1',
          };
        }
      }
    }

    // Return normalized payload
    return {
      valid: true,
      normalizedPayload: {
        fileUrl: printingPayload.fileUrl,
        pages: printingPayload.pages ?? 1,
        copies: printingPayload.copies ?? 1,
        color: printingPayload.color ?? false,
        items: printingPayload.items || [],
        notes: printingPayload.notes,
      },
    };
  }

  /**
   * Calculate printing price
   * 
   * Pricing logic:
   * 1. Base price from fileUrl: pages * copies * per_page_price * color_multiplier
   * 2. Add optional items if provided
   * 3. Total = file price + items price
   */
  calculatePrice(payload: unknown, seller: Seller): PriceBreakdown {
    const printingPayload = payload as PrintingPayload;

    // FILE-BASED PRINTING PRICING (required)
    const pages = printingPayload.pages ?? 1;
    const copies = printingPayload.copies ?? 1;
    const isColor = printingPayload.color ?? false;

    const pricePerPageRupees = seller.pricePerPage
      ? Number(seller.pricePerPage)
      : 0;
    
    const pricePerPage = pricePerPageRupees * 100; // Convert to paise

    if (pricePerPage <= 0) {
      throw new Error(
        `Seller ${seller.id} does not have pricePerPage configured`,
      );
    }

    let filePrice = pages * copies * pricePerPage;

    if (isColor) {
      filePrice = Math.ceil(filePrice * 1.5);
    }

    // ADD OPTIONAL ITEMS PRICE if provided
    let itemsPrice = 0;
    if (printingPayload.items && Array.isArray(printingPayload.items)) {
      for (const item of printingPayload.items) {
        itemsPrice += Number(item.price) * (item.quantity || 1) * 100; // Convert to paise
      }
    }

    const totalPrice = filePrice + itemsPrice;

    return {
      itemPrice: totalPrice,
      currency: 'INR',
      breakdown: {
        filePrice,
        pages,
        copies,
        pricePerPage: pricePerPage,
        isColor,
        colorMultiplier: isColor ? 1.5 : 1,
        itemsPrice,
        itemCount: printingPayload.items?.length || 0,
        totalPrice,
      },
    };
  }

  /**
   * Get file upload requirements for printing
   * 
   * Printing requires a file to be uploaded/provided:
   * - Supported formats: PDF, DOC, DOCX, images
   * - Max size: 50MB
   * - Single file only
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
   * Handles file-based printing orders with optional bundled products.
   * - Validates/processes the uploaded file
   * - Tracks any bundled products
   */
  async processOrder(orderId: string, payload: unknown): Promise<void> {
    const printingPayload = payload as PrintingPayload;
    
    // TODO: Process file-based printing
    // - Validate file exists
    // - Extract page count from file
    // - Queue for printing
    
    if (printingPayload.items && Array.isArray(printingPayload.items) && printingPayload.items.length > 0) {
      // Log bundled products with printing order
      const productNames = printingPayload.items.map(item => `${item.name} x${item.quantity}`).join(', ');
      // TODO: Log bundled products
    }
  }
}
