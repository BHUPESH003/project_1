/**
 * Multi-Cart Orders API – Handle orders from multiple sellers
 * 
 * Features:
 * - Create one order per seller
 * - Process all orders in parallel
 * - Support multiple delivery providers
 * - Combined checkout in single flow
 */

import client from './client';
import { unwrap } from './unwrap';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface CartItemForOrder {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice?: number; // For calculated items like prints
}

/** Single order structure for a seller */
export interface MultiCartOrder {
  orderId: string;
  sellerId: string;
  sellerName: string;
  items: CartItemForOrder[];
  subtotal: number; // Items cost only
  deliveryPartner?: string; // Selected delivery partner
  deliveryFee?: number;
  totalAmount?: number; // Including delivery
  status: string;
  createdAt: string;
}

/** Request payload for creating multiple orders at once */
export interface CreateMultiOrdersPayload {
  orders: Array<{
    sellerId: string;
    sellerName: string;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    notes?: string;
  }>;
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  paymentMethod?: 'UPI' | 'CASH' | 'CARD';
}

/** Response from creating multiple orders */
export interface CreateMultiOrdersResponse {
  success: boolean;
  totalOrders: number;
  successfulOrders: MultiCartOrder[];
  failedOrders: Array<{
    sellerId: string;
    error: string;
  }>;
  totalAmount: number;
  message: string;
}

/** Request for getting delivery quotes for multiple orders */
export interface GetMultiDeliveryQuotesPayload {
  orderIds: string[];
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

/** Delivery quote option for a seller's order */
export interface DeliveryQuoteForSeller {
  orderId: string;
  sellerId: string;
  providers: Array<{
    provider: string;
    displayName: string;
    estimatedFee: number;
    estimatedDurationMinutes: number;
    rating?: number;
    logo?: string;
    quoteId?: string;
  }>;
  cheapest?: {
    provider: string;
    estimatedFee: number;
  };
  fastest?: {
    provider: string;
    estimatedDurationMinutes: number;
  };
}

/** Response for multiple delivery quotes */
export interface GetMultiDeliveryQuotesResponse {
  orders: DeliveryQuoteForSeller[];
  totalDeliveryFees: number;
  estimatedDeliveryTimes: {
    earliest: number;
    latest: number;
  };
}

/** Confirm object for each seller's delivery choice */
export interface DeliveryConfirmation {
  orderId: string;
  sellerId: string;
  deliveryPartner: string;
  deliveryFee: number;
}

/** Request to confirm delivery for multiple orders */
export interface ConfirmMultiOrdersPayload {
  deliveryConfirmations: DeliveryConfirmation[];
  paymentMethod: 'UPI' | 'CASH' | 'CARD';
}

/** Response from confirming multiple orders */
export interface ConfirmMultiOrdersResponse {
  success: boolean;
  totalOrders: number;
  confirmedOrders: Array<{
    orderId: string;
    sellerId: string;
    status: string;
    totalAmount: number;
  }>;
  failedOrders: Array<{
    orderId: string;
    sellerId: string;
    error: string;
  }>;
  grandTotal: number;
  paymentIntents: Array<{
    orderId: string;
    paymentIntentId: string;
    paymentUrl?: string;
  }>;
}

// ============================================================
// API METHODS
// ============================================================

export const multiCartOrdersApi = {
  /**
   * Create multiple orders (one per seller) in a single request
   * This ensures consistency and allows batch processing
   */
  async createMultipleOrders(
    payload: CreateMultiOrdersPayload,
  ): Promise<CreateMultiOrdersResponse> {
    const res = await client.post('/orders/batch/create', payload);
    return unwrap(res) as CreateMultiOrdersResponse;
  },

  /**
   * Get delivery quotes for multiple orders at once
   * Returns quotes from all delivery providers for each seller
   */
  async getMultipleDeliveryQuotes(
    payload: GetMultiDeliveryQuotesPayload,
  ): Promise<GetMultiDeliveryQuotesResponse> {
    const res = await client.post('/orders/batch/delivery-quotes', payload);
    return unwrap(res) as GetMultiDeliveryQuotesResponse;
  },

  /**
   * Confirm multiple orders with their corresponding delivery partners
   * This finalizes all orders and processes payment
   */
  async confirmMultipleOrders(
    payload: ConfirmMultiOrdersPayload,
  ): Promise<ConfirmMultiOrdersResponse> {
    const res = await client.post('/orders/batch/confirm', payload);
    return unwrap(res) as ConfirmMultiOrdersResponse;
  },

  /**
   * Get status of multiple orders
   */
  async getMultipleOrdersStatus(orderIds: string[]): Promise<Array<{
    orderId: string;
    status: string;
    sellerId: string;
    estimatedDeliveryTime?: number;
  }>> {
    const res = await client.post('/orders/batch/status', { orderIds });
    return unwrap(res) as Array<{
      orderId: string;
      status: string;
      sellerId: string;
      estimatedDeliveryTime?: number;
    }>;
  },

  /**
   * Cancel one or multiple orders
   */
  async cancelOrders(orderIds: string[]): Promise<{
    success: boolean;
    cancelledOrders: string[];
    failedOrders: Array<{ orderId: string; error: string }>;
  }> {
    const res = await client.post('/orders/batch/cancel', { orderIds });
    return unwrap(res) as {
      success: boolean;
      cancelledOrders: string[];
      failedOrders: Array<{ orderId: string; error: string }>;
    };
  },

  /**
   * Get combined order by combining multiple individual orders
   * Useful for order history view
   */
  async getCombinedOrder(orderIds: string[]): Promise<{
    combinedOrderId: string;
    orders: MultiCartOrder[];
    totalAmount: number;
    estimatedDeliveryTime: string;
  }> {
    const res = await client.get('/orders/batch/combined', {
      params: { orderIds: orderIds.join(',') },
    });
    return unwrap(res) as {
      combinedOrderId: string;
      orders: MultiCartOrder[];
      totalAmount: number;
      estimatedDeliveryTime: string;
    };
  },
};
