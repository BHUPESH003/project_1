/**
 * Orders API endpoints
 * Fetch orders, order details, status tracking
 */

import client from './client';

export interface Order {
  id: string;
  referenceNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  sellerId: string;
  sellerName: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress?: string;
  estimatedDelivery?: string;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  specifications?: Record<string, string>;
}

export const ordersApi = {
  /**
   * Get all orders for current user
   */
  async getOrders(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
  }> {
    const { data } = await client.get('/orders', {
      params: { page, limit },
    });
    return data;
  },

  /**
   * Get single order details
   */
  async getOrder(orderId: string): Promise<Order> {
    const { data } = await client.get(`/orders/${orderId}`);
    return data;
  },

  /**
   * Create new order
   * TODO: This will be used in checkout flow
   */
  async createOrder(payload: any): Promise<Order> {
    const { data } = await client.post('/orders', payload);
    return data;
  },

  /**
   * Track order status
   */
  async trackOrder(orderId: string): Promise<{
    status: Order['status'];
    lastUpdate: string;
    estimatedDelivery?: string;
  }> {
    const { data } = await client.get(`/orders/${orderId}/track`);
    return data;
  },
};
