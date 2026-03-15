/**
 * Multi-Cart API Service Layer
 * 
 * Comprehensive wrapper for multi-cart system providing:
 * - Batch order creation from multiple seller carts
 * - Per-seller delivery quotations
 * - Fault-tolerant batch processing
 * - Type-safe API integration
 */

import client from './client';
import { unwrap } from './unwrap';
import type { DeliveryQuoteOption } from './orders.api';

/**
 * Represents a single item in a seller's cart
 */
export interface CartItemInput {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

/**
 * Payload for creating an order from a seller's cart
 * This is the format expected by POST /orders/batch
 */
export interface BatchOrderInput {
  sellerId: string;
  sellerName: string;
  categoryId: string;
  items: CartItemInput[];
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  deliveryPartnerId: string; // Selected delivery partner (UBER, PORTER, DUNZO)
  paymentMethod?: 'UPI' | 'CASH' | 'CARD';
  notes?: string;
}

/**
 * Success result for a single order in the batch
 */
export interface BatchOrderSuccess {
  orderId: string;
  sellerId: string;
  status: 'SUCCESS';
  message: string;
  orderData?: {
    order_id: string;
    status: string;
    pricing?: {
      itemCost: number;
      deliveryFee: number;
      totalAmount: number;
    };
  };
}

/**
 * Failure result for a single order in the batch
 */
export interface BatchOrderFailure {
  orderId?: string;
  sellerId: string;
  status: 'FAILED';
  error: string;
  reason?: string;
}

/**
 * Result for a single order (success or failure)
 */
export type BatchOrderResult = BatchOrderSuccess | BatchOrderFailure;

/**
 * Complete response from batch order creation
 */
export interface CreateBatchOrdersResponse {
  results: BatchOrderResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  summary: {
    totalAmount: number;
    itemsCount: number;
  };
}

/**
 * Delivery quote options for a specific seller cart
 */
export interface SellerDeliveryQuote {
  sellerId: string;
  sellerName: string;
  providers: DeliveryQuoteOption[];
  cheapest?: DeliveryQuoteOption;
  fastest?: DeliveryQuoteOption;
  pickupLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

/**
 * Request payload for getting delivery quotes for multiple sellers
 */
export interface GetDeliveryQuotesPayload {
  sellers: Array<{
    sellerId: string;
    cartTotal: number;
  }>;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
}

/**
 * Response containing delivery quotes for all sellers
 */
export interface GetDeliveryQuotesResponse {
  quotes: SellerDeliveryQuote[];
  total_options: number;
}

/**
 * Multi-Cart API Service
 * All methods are type-safe and include comprehensive error handling
 */
export const multiCartApi = {
  /**
   * Create batch orders from multiple seller carts
   *
   * @param orders - Array of orders to create (one per seller cart)
   * @returns Response with results array showing success/failure for each order
   *
   * @example
   * ```typescript
   * const response = await multiCartApi.createBatchOrders([
   *   {
   *     sellerId: 'seller-1',
   *     sellerName: 'Copy Shop',
   *     categoryId: 'printing',
   *     items: [...],
   *     dropLatitude: 28.6139,
   *     dropLongitude: 77.2090,
   *     dropAddress: 'My Address',
   *     deliveryPartnerId: 'UBER_DIRECT',
   *   },
   *   // ... more orders
   * ]);
   *
   * // Process successful orders
   * response.results
   *   .filter(r => r.status === 'SUCCESS')
   *   .forEach(success => console.log(`Order ${success.orderId} created`));
   *
   * // Handle failures
   * response.results
   *   .filter(r => r.status === 'FAILED')
   *   .forEach(failure => console.error(`Order for ${failure.sellerId} failed: ${failure.error}`));
   * ```
   */
  async createBatchOrders(orders: BatchOrderInput[]): Promise<CreateBatchOrdersResponse> {
    try {
      const res = await client.post('/orders/batch', { orders });
      const data = unwrap(res) as CreateBatchOrdersResponse;
      return data;
    } catch (error) {
      // Re-throw with additional context for debugging
      throw {
        message: 'Failed to create batch orders',
        error,
        ordersCount: orders.length,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get delivery quotes for multiple seller carts
   * Fetches available delivery partner options for each seller
   *
   * @param sellers - Array of seller IDs with their cart totals
   * @param dropLatitude - Delivery latitude
   * @param dropLongitude - Delivery longitude
   * @param dropAddress - Delivery address
   * @returns Response with delivery options for each seller
   *
   * @example
   * ```typescript
   * const quotes = await multiCartApi.getDeliveryQuotes(
   *   [
   *     { sellerId: 'seller-1', cartTotal: 500 },
   *     { sellerId: 'seller-2', cartTotal: 300 },
   *   ],
   *   28.6139,
   *   77.2090,
   *   'My Address'
   * );
   *
   * // Access quotes for each seller
   * quotes.quotes.forEach(quote => {
   *   console.log(`${quote.sellerName} delivery options:`);
   *   quote.providers.forEach(provider => {
   *     console.log(`- ${provider.displayName}: ₹${provider.estimatedFee}`);
   *   });
   * });
   * ```
   */
  async getDeliveryQuotes(
    sellers: Array<{ sellerId: string; cartTotal: number }>,
    dropLatitude: number,
    dropLongitude: number,
    dropAddress: string,
  ): Promise<GetDeliveryQuotesResponse> {
    try {
      const payload: GetDeliveryQuotesPayload = {
        sellers,
        dropLatitude,
        dropLongitude,
        dropAddress,
      };
      const res = await client.post('/delivery/quotations-batch', payload);
      const data = unwrap(res) as GetDeliveryQuotesResponse;
      return data;
    } catch (error) {
      throw {
        message: 'Failed to fetch delivery quotes',
        error,
        sellersCount: sellers.length,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get delivery quotes for a single seller (wrapper for single-cart flows)
   * Maintains backward compatibility with existing single-cart checkout
   *
   * @param sellerId - Seller ID
   * @param dropLatitude - Delivery latitude
   * @param dropLongitude - Delivery longitude
   * @param dropAddress - Delivery address
   * @returns Delivery quote options for this seller
   */
  async getSellerDeliveryQuotes(
    sellerId: string,
    dropLatitude: number,
    dropLongitude: number,
    dropAddress: string,
  ): Promise<SellerDeliveryQuote> {
    try {
      const response = await this.getDeliveryQuotes(
        [{ sellerId, cartTotal: 0 }],
        dropLatitude,
        dropLongitude,
        dropAddress,
      );

      const sellerQuote = response.quotes[0];
      if (!sellerQuote) {
        throw new Error(`No delivery quotes found for seller ${sellerId}`);
      }

      return sellerQuote;
    } catch (error) {
      throw {
        message: 'Failed to fetch single seller delivery quotes',
        error,
        sellerId,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Validate batch orders before submission
   * Checks for missing required fields and data consistency
   *
   * @param orders - Orders to validate
   * @returns Validation result with any errors found
   *
   * @example
   * ```typescript
   * const validation = multiCartApi.validateBatchOrders(orders);
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  validateBatchOrders(orders: BatchOrderInput[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!orders || orders.length === 0) {
      errors.push('Orders array cannot be empty');
      return { isValid: false, errors };
    }

    orders.forEach((order, index) => {
      if (!order.sellerId) errors.push(`Order ${index}: Missing sellerId`);
      if (!order.sellerName) errors.push(`Order ${index}: Missing sellerName`);
      if (!order.categoryId) errors.push(`Order ${index}: Missing categoryId`);
      if (!order.items || order.items.length === 0) {
        errors.push(`Order ${index}: No items in cart`);
      }
      if (!order.dropLatitude || !order.dropLongitude) {
        errors.push(`Order ${index}: Missing delivery coordinates`);
      }
      if (!order.dropAddress) errors.push(`Order ${index}: Missing delivery address`);
      if (!order.deliveryPartnerId) {
        errors.push(`Order ${index}: No delivery partner selected`);
      }

      // Validate items
      order.items?.forEach((item, itemIndex) => {
        if (!item.productId) {
          errors.push(`Order ${index}, Item ${itemIndex}: Missing productId`);
        }
        if (!item.name) errors.push(`Order ${index}, Item ${itemIndex}: Missing name`);
        if (item.quantity <= 0) {
          errors.push(`Order ${index}, Item ${itemIndex}: Invalid quantity`);
        }
        if (item.price < 0) {
          errors.push(`Order ${index}, Item ${itemIndex}: Invalid price`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Calculate total amount for batch orders
   * Useful for order summary before checkout
   *
   * @param orders - Orders to calculate total for
   * @returns Total amount across all orders
   */
  calculateBatchTotal(orders: BatchOrderInput[]): number {
    return orders.reduce((total, order) => {
      const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      // Note: Delivery fees would be added separately based on delivery quotes
      return total + orderTotal;
    }, 0);
  },

  /**
   * Filter orders by success/failure status
   * Helper function for processing batch results
   *
   * @param results - Batch order results
   * @returns Object with successful and failed orders
   */
  filterResults(results: BatchOrderResult[]): {
    successful: BatchOrderSuccess[];
    failed: BatchOrderFailure[];
  } {
    return {
      successful: results.filter((r): r is BatchOrderSuccess => r.status === 'SUCCESS'),
      failed: results.filter((r): r is BatchOrderFailure => r.status === 'FAILED'),
    };
  },
};
