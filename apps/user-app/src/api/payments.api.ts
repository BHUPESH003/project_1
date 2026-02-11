/**
 * Payments API – verify payment status (internal endpoint).
 * Used after user completes UPI flow to poll until success/failure.
 */

import client from './client';
import { unwrap } from './unwrap';

export type PaymentVerifyStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

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
  async verifyPayment(orderId: string, gatewayOrderId?: string): Promise<VerifyPaymentResponse> {
    const res = await client.post('/internal/payments/verify', { orderId, gatewayOrderId });
    return unwrap(res) as VerifyPaymentResponse;
  },
};
