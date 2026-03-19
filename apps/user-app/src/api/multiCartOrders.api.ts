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

/** Delivery address for an order */
export interface DeliveryAddress {
  latitude: number;
  longitude: number;
  address: string;
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
      category?: string;
    }>;
    notes?: string;
  }>;
  /** Single address for all orders, or per-seller addresses */
  deliveryAddress: DeliveryAddress;
  /** Optional: per-seller addresses (overrides deliveryAddress when provided for a seller) */
  deliveryAddresses?: Record<string, DeliveryAddress>;
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

/** Order reference for delivery quotes */
export interface OrderRef {
  orderId: string;
  sellerId: string;
}

/** Request for getting delivery quotes for multiple orders */
export interface GetMultiDeliveryQuotesPayload {
  orders: OrderRef[];
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
   * Maps to backend POST /orders/batch
   */
  async createMultipleOrders(
    payload: CreateMultiOrdersPayload,
  ): Promise<CreateMultiOrdersResponse> {
    const backendPayload = {
      orders: payload.orders.map((o) => {
        const addr = payload.deliveryAddresses?.[o.sellerId] ?? payload.deliveryAddress;
        const categoryId = o.items[0]?.category ?? 'generic';
        return {
          categoryId,
          sellerId: o.sellerId,
          orderPayload: {
            items: o.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            dropLatitude: addr.latitude,
            dropLongitude: addr.longitude,
            dropAddress: addr.address,
          },
        };
      }),
    };
    const res = await client.post('/orders/batch', backendPayload);
    const data = unwrap(res) as {
      results: Array<{ sellerId: string; orderId?: string; status: string; error?: string }>;
      totalProcessed: number;
      successCount: number;
      failureCount: number;
    };
    const successfulOrders = data.results
      .filter((r) => r.status === 'success' && r.orderId)
      .map((r) => {
        const order = payload.orders.find((o) => o.sellerId === r.sellerId);
        const items = (order?.items ?? []).map((item, idx) => ({
          id: `${r.orderId}-${idx}`,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
        }));
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        return {
          orderId: r.orderId!,
          sellerId: r.sellerId,
          sellerName: order?.sellerName ?? r.sellerId,
          items,
          subtotal,
          status: 'CREATED',
          createdAt: new Date().toISOString(),
        };
      });
    const failedOrders = data.results
      .filter((r) => r.status === 'failed')
      .map((r) => ({ sellerId: r.sellerId, error: r.error ?? 'Unknown error' }));
    const totalAmount = successfulOrders.reduce((s, o) => s + o.subtotal, 0);
    return {
      success: failedOrders.length === 0,
      totalOrders: payload.orders.length,
      successfulOrders,
      failedOrders,
      totalAmount,
      message: failedOrders.length > 0
        ? `${successfulOrders.length} of ${payload.orders.length} orders created`
        : 'All orders created',
    };
  },

  /**
   * Get delivery quotes for multiple orders
   * Calls GET /orders/:id/delivery-quotes for each order in parallel
   */
  async getMultipleDeliveryQuotes(
    payload: GetMultiDeliveryQuotesPayload,
  ): Promise<GetMultiDeliveryQuotesResponse> {
    const { ordersApi } = await import('./orders.api');
    const results = await Promise.allSettled(
      payload.orders.map((o) => ordersApi.getDeliveryQuotes(o.orderId)),
    );
    const orders: DeliveryQuoteForSeller[] = results.map((result, i) => {
      const orderRef = payload.orders[i];
      if (result.status === 'fulfilled' && orderRef) {
        const res = result.value;
        return {
          orderId: res.order_id,
          sellerId: orderRef.sellerId,
          providers: (res.providers ?? []).map((p) => ({
            provider: p.provider,
            displayName: p.displayName ?? p.provider,
            estimatedFee: p.estimatedFee ?? 0,
            estimatedDurationMinutes: p.estimatedDurationMinutes ?? 30,
            rating: p.rating,
            logo: p.logo,
            quoteId: p.quoteId,
          })),
          cheapest: res.cheapest
            ? {
                provider: res.cheapest.provider,
                estimatedFee: res.cheapest.estimatedFee ?? 0,
              }
            : undefined,
          fastest: res.providers?.[0]
            ? {
                provider: res.providers[0].provider,
                estimatedDurationMinutes: res.providers[0].estimatedDurationMinutes ?? 30,
              }
            : undefined,
        };
      }
      return {
        orderId: orderRef?.orderId ?? '',
        sellerId: orderRef?.sellerId ?? '',
        providers: [],
      };
    });
    const totalDeliveryFees = orders.reduce(
      (sum, o) => sum + (o.cheapest?.estimatedFee ?? 0),
      0,
    );
    return {
      orders,
      totalDeliveryFees,
      estimatedDeliveryTimes: { earliest: 15, latest: 60 },
    };
  },

  /**
   * Confirm multiple orders with their corresponding delivery partners
   * For each order: updates deliveryFee via PATCH, then calls POST /orders/:id/confirm
   */
  async confirmMultipleOrders(
    payload: ConfirmMultiOrdersPayload,
  ): Promise<ConfirmMultiOrdersResponse> {
    const { ordersApi } = await import('./orders.api');
    const confirmedOrders: Array<{ orderId: string; sellerId: string; status: string; totalAmount: number }> = [];
    const failedOrders: Array<{ orderId: string; sellerId: string; error: string }> = [];
    let grandTotal = 0;

    for (const conf of payload.deliveryConfirmations) {
      try {
        await ordersApi.updateOrder(conf.orderId, { deliveryFee: conf.deliveryFee });
        const res = await ordersApi.confirmOrder(conf.orderId, payload.paymentMethod);
        grandTotal += res.total_amount;
        confirmedOrders.push({
          orderId: conf.orderId,
          sellerId: conf.sellerId,
          status: 'success',
          totalAmount: res.total_amount,
        });
      } catch (err) {
        failedOrders.push({
          orderId: conf.orderId,
          sellerId: conf.sellerId,
          error: err instanceof Error ? err.message : 'Failed to confirm',
        });
      }
    }

    return {
      success: failedOrders.length === 0,
      totalOrders: payload.deliveryConfirmations.length,
      confirmedOrders,
      failedOrders,
      grandTotal,
      paymentIntents: confirmedOrders.map((o) => ({
        orderId: o.orderId,
        paymentIntentId: '',
        paymentUrl: undefined,
      })),
    };
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
