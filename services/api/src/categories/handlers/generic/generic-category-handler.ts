/**
 * Generic Category Handler
 * 
 * Handles any category that doesn't have a specific handler.
 * Supports product-based orders (hardware, stationary, grocery, etc.)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Seller } from '@prisma/client';
import { CategoryHandler, ValidationResult, PriceBreakdown, FileRequirements } from '../category-handler.interface';

@Injectable()
export class GenericCategoryHandler implements CategoryHandler {
  private readonly logger = new Logger(GenericCategoryHandler.name);

  getCategoryId(): string {
    return 'generic'; // Default handler for unmapped categories
  }

  /**
   * Validate order payload for generic product orders
   * Accepts items array with product details
   */
  validatePayload(payload: any): ValidationResult {
    // Allow products, printing, or notes
    if (!payload) {
      return { valid: false, error: 'Order payload is required' };
    }

    // For product-based orders
    if (payload.items && Array.isArray(payload.items)) {
      if (payload.items.length === 0) {
        return { valid: false, error: 'At least one item is required' };
      }

      // Validate each item
      for (const item of payload.items) {
        if (!item.name || !item.quantity || item.price === undefined) {
          return {
            valid: false,
            error: 'Each item must have name, quantity, and price',
          };
        }
        if (item.quantity < 1) {
          return { valid: false, error: 'Item quantity must be at least 1' };
        }
      }

      return {
        valid: true,
        normalizedPayload: {
          items: payload.items,
          notes: payload.notes || '',
        },
      };
    }

    // For printing orders (file-based)
    if (payload.fileUrl) {
      return {
        valid: true,
        normalizedPayload: {
          fileUrl: payload.fileUrl,
          pages: payload.pages || 1,
          copies: payload.copies || 1,
          color: payload.color || false,
          notes: payload.notes || '',
        },
      };
    }

    // If neither products nor file, it's invalid
    return {
      valid: false,
      error: 'Order must contain either items (products) or fileUrl (printing)',
    };
  }

  /**
   * Optional: Process order after creation
   * Can be used for validation, notification, etc.
   */
  async processOrder(orderId: string, payload: any): Promise<void> {
    if (payload.items) {
      this.logger.log(`Processing product order ${orderId} with ${payload.items.length} items`);
    } else if (payload.fileUrl) {
      this.logger.log(`Processing printing order ${orderId} with ${payload.pages || 1} pages`);
    }
  }

  /**
   * Calculate price for generic orders
   * For products: sum of all item prices * quantities
   * For printing: calculated by printing handler
   */
  calculatePrice(payload: any, seller: Seller): PriceBreakdown {
    let totalPrice = 0;

    // Calculate for product items
    if (payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        totalPrice += (item.price || 0) * (item.quantity || 1);
      }
    }

    // Price in paise (smallest Indian currency unit)
    return {
      itemPrice: Math.round(totalPrice * 100),
      currency: 'INR',
      breakdown: {
        type: payload.items ? 'products' : 'file',
        itemCount: payload.items?.length || 0,
        baseAmount: totalPrice,
      },
    };
  }

  /**
   * File requirements for generic orders
   * Optional - files not required for product orders
   */
  getFileRequirements(): FileRequirements | null {
    // Generic products don't require files
    return null;
  }
}
