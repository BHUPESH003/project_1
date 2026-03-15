/**
 * Orders API – backend contract v1.
 * Create draft, select seller, delivery quote, confirm, track, list my orders.
 */

import client from './client';
import { unwrap } from './unwrap';

/** Backend order status – from OrderStatus enum. */
export type OrderStatus =
  | 'CREATED'
  | 'SELLER_SELECTED'
  | 'PAID'
  | 'SELLER_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'SELLER_REJECTED'
  | 'ORDER_EXPIRED'
  | 'DELIVERY_FAILED'
  | 'USER_CANCELLED';

export interface OrderListItem {
  order_id: string;
  status: OrderStatus;
  seller: { id: string; shopName: string; address: string } | null;
  category: { id: string; name: string } | null;
  pricing: { itemCost: number | null; deliveryFee: number | null; totalAmount: number | null };
  createdAt: string;
  updatedAt: string;
}

export interface OrderStateHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  triggeredBy: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderDetail {
  order_id: string;
  status: OrderStatus;
  seller: { id: string; shopName: string; address: string } | null;
  delivery: unknown;
  pricing: { itemCost: number | null; deliveryFee: number | null; totalAmount: number | null };
  createdAt: string;
  updatedAt: string;
  stateHistory?: OrderStateHistoryItem[];
}

/** Delivery quote option - one provider option */
export interface DeliveryQuoteOption {
  provider: string; // 'UBER_DIRECT', 'DUNZO', 'PORTER'
  displayName?: string; // 'Uber Direct', 'Dunzo', 'Porter'
  estimatedFee?: number; // Fee in rupees
  estimatedDurationMinutes?: number; // ETA in minutes
  currency?: string; // 'INR'
  features?: string[]; // Provider features
  logo?: string; // Provider logo URL
  rating?: number; // Provider rating
  quoteId?: string; // Provider quote ID
  expiresAt?: string; // Expiration timestamp
  vehicles?: Array<{
    type: string;
    price: number;
    estimated_time: string;
  }>;
  vehicleOptions?: Array<{
    vehicleType: string;
    estimatedFee: number;
    estimatedDurationMinutes: number;
  }>;
}

/** Location object included in delivery Quote response */
export interface LocationInQuote {
  latitude: number;
  longitude: number;
  address: string;
}

/** Response from GET /orders/:id/delivery-quotes – multiple provider options with locations */
export interface DeliveryQuotesResponse {
  order_id: string;
  pickup_location: LocationInQuote;
  drop_location: LocationInQuote;
  providers: DeliveryQuoteOption[];
  cheapest?: DeliveryQuoteOption;
  fastest?: DeliveryQuoteOption;
  total_options: number;
  message: string;
}

/** Response from POST /orders/:id/confirm – payment intent for UPI. */
export interface ConfirmOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  payment: {
    payment_id: string;
    status: string;
    payment_intent: {
      orderId: string;
      amount: number;
      currency: string;
      gatewayOrderId: string;
      paymentData?: {
        upi?: { paymentUrl?: string; qrCode?: string };
        [key: string]: unknown;
      };
    };
  };
  message?: string;
}

export interface CreateOrderPayload {
  categoryId: string;
  orderPayload: {
    items?: Array<{ productId: string; name: string; quantity: number; price: number }>;
    fileUrl?: string;
    pages?: number;
    copies?: number;
    color?: boolean;
    notes?: string;
    dropLatitude?: number;
    dropLongitude?: number;
    dropAddress?: string;
    [key: string]: unknown;
  };
}

export interface UpdateOrderPayload {
  items?: Array<{ productId: string; name: string; quantity: number; price: number }>;
  notes?: string;
  dropLatitude?: number;
  dropLongitude?: number;
  dropAddress?: string;
}

export const ordersApi = {
  async getMyOrders(): Promise<OrderListItem[]> {
    const res = await client.get('/orders');
    return unwrap(res) as OrderListItem[];
  },

  async getOrder(orderId: string): Promise<OrderDetail> {
    const res = await client.get(`/orders/${orderId}`);
    return unwrap(res) as OrderDetail;
  },

  async createOrder(payload: CreateOrderPayload): Promise<{ order_id: string; status: string }> {
    const res = await client.post('/orders', payload);
    return unwrap(res) as { order_id: string; status: string };
  },

  async updateOrder(orderId: string, payload: UpdateOrderPayload): Promise<{ order_id: string; status: string; message: string }> {
    const res = await client.patch(`/orders/${orderId}`, payload);
    return unwrap(res) as { order_id: string; status: string; message: string };
  },

  async selectSeller(orderId: string, sellerId: string) {
    const res = await client.post(`/orders/${orderId}/select-seller`, { sellerId });
    return unwrap(res);
  },

  /**
   * Get available delivery quotes for an order
   * Fetches quotes from all delivery providers based on order's seller location and user drop location
   * Requires: order.sellerId to be set, order.dropLatitude/dropLongitude to be available
   */
  async getDeliveryQuotes(orderId: string): Promise<DeliveryQuotesResponse> {
    const res = await client.get(`/orders/${orderId}/delivery-quotes`);
    return unwrap(res) as DeliveryQuotesResponse;
  },

  async confirmOrder(
    orderId: string,
    paymentMethod: 'UPI' | 'CASH' | 'CARD' = 'UPI',
  ): Promise<ConfirmOrderResponse> {
    const res = await client.post(`/orders/${orderId}/confirm`, { paymentMethod });
    return unwrap(res) as ConfirmOrderResponse;
  },
};
