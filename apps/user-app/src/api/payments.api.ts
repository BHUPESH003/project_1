/**
 * Payments API – Frontend integration with payment providers
 * Handles payment creation and verification
 * Currently supports: Razorpay, Paytm
 */

import client from './client';
import { unwrap } from './unwrap';

export enum PaymentProvider {
  RAZORPAY = 'razorpay',
  PAYTM = 'paytm',
}

export type PaymentVerifyStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentIntentResponse {
  payment_id: string;
  order_id: string;
  amount: number;
  status: PaymentVerifyStatus;
  payment_intent: {
    orderId: string;
    amount: number;
    currency: string;
    gatewayOrderId: string;
    paymentData: Record<string, unknown>;
  };
}

export interface VerifyPaymentResponse {
  payment_id: string;
  order_id: string;
  status: PaymentVerifyStatus;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  amount?: number;
  paid_at?: string;
  failure_reason?: string;
}

export const paymentsApi = {
  /**
   * POST /orders/:id/create-payment-intent
   * Create payment intent for order
   * Called when user confirms order and initiates payment
   *
   * @param orderId - Order ID
   * @param provider - Payment provider (optional, defaults to configured provider)
   * @returns Payment intent data for frontend to use with payment gateway
   */
  async createPaymentIntent(
    orderId: string,
    provider?: PaymentProvider,
  ): Promise<CreatePaymentIntentResponse> {
    const query = new URLSearchParams();
    if (provider) query.append('provider', provider);

    const res = await client.post(
      `/orders/${orderId}/create-payment-intent${query.toString() ? '?' + query.toString() : ''}`,
    );
    return unwrap(res) as CreatePaymentIntentResponse;
  },

  /**
   * POST /orders/:id/verify-payment
   * Verify payment after user completes payment gateway flow
   * Called after Razorpay/Paytm payment is completed
   *
   * @param orderId - Order ID
   * @param paymentData - Payment verification data from gateway
   * @returns Payment verification result
   */
  async verifyPayment(
    orderId: string,
    paymentData: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      // Paytm fields
      txnToken?: string;
      orderToken?: string;
    },
  ): Promise<VerifyPaymentResponse> {
    const res = await client.post(`/orders/${orderId}/verify-payment`, paymentData);
    return unwrap(res) as VerifyPaymentResponse;
  },

  /**
   * POST /internal/payments/verify (Legacy/Polling)
   * Verify payment status via polling
   * Used for fallback if payment confirmation delays
   *
   * @param orderId - Order ID
   * @param gatewayOrderId - Gateway order ID (optional)
   * @returns Payment status
   */
  async verifyPaymentStatus(orderId: string, gatewayOrderId?: string): Promise<VerifyPaymentResponse> {
    const res = await client.post('/internal/payments/verify', { orderId, gatewayOrderId });
    return unwrap(res) as VerifyPaymentResponse;
  },

  /**
   * GET /payments/:paymentId
   * Get payment status
   *
   * @param paymentId - Payment ID
   * @returns Payment details
   */
  async getPaymentStatus(paymentId: string): Promise<VerifyPaymentResponse> {
    const res = await client.get(`/internal/payments/${paymentId}`);
    return unwrap(res) as VerifyPaymentResponse;
  },
};
