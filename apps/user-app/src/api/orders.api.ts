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
  displayName: string; // 'Uber Direct', 'Dunzo', 'Porter'
  estimatedFee: number; // Fee in rupees
  estimatedDurationMinutes: number; // ETA in minutes
  currency: string; // 'INR'
  features?: string[]; // Provider features
  logo?: string; // Provider logo URL
  rating?: number; // Provider rating
  quoteId?: string; // Provider quote ID
  expiresAt?: string; // Expiration timestamp
}

/** Response from GET /orders/:id/delivery-quotes – multiple provider options */
export interface DeliveryQuotesResponse {
  order_id: string;
  options: DeliveryQuoteOption[];
  selected_provider?: string;
  message: string;
}

/** Response from POST /orders/:id/select-delivery-provider */
export interface SelectDeliveryProviderResponse {
  order_id: string;
  provider: string;
  deliveryFee: number;
  estimatedDurationMinutes: number;
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
    fileUrl?: string;
    pages?: number;
    copies?: number;
    color?: boolean;
    notes?: string;
    [key: string]: unknown;
  };
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

  async selectSeller(orderId: string, sellerId: string) {
    const res = await client.post(`/orders/${orderId}/select-seller`, { sellerId });
    return unwrap(res);
  },

  async getDeliveryQuote(orderId: string, dropLocation: { lat: number; lng: number }) {
    const res = await client.post(`/orders/${orderId}/delivery-quote`, {
      dropLocation,
    });
    return unwrap(res);
  },

  async getAllDeliveryQuotes(
    orderId: string,
    dropLocation: { lat: number; lng: number; address?: string },
  ): Promise<DeliveryQuotesResponse> {
    const res = await client.post(`/orders/${orderId}/delivery-quotes`, {
      dropLocation,
    });
    return unwrap(res) as DeliveryQuotesResponse;
  },

  async selectDeliveryProvider(
    orderId: string,
    provider: string,
    deliveryAddressId?: string,
    quoteId?: string,
  ): Promise<SelectDeliveryProviderResponse> {
    const res = await client.post(`/orders/${orderId}/select-delivery-provider`, {
      provider,
      deliveryAddressId,
      quoteId,
    });
    return unwrap(res) as SelectDeliveryProviderResponse;
  },

  async confirmOrder(
    orderId: string,
    paymentMethod: 'UPI' | 'CASH' | 'CARD' = 'UPI',
  ): Promise<ConfirmOrderResponse> {
    const res = await client.post(`/orders/${orderId}/confirm`, { paymentMethod });
    return unwrap(res) as ConfirmOrderResponse;
  },
};
