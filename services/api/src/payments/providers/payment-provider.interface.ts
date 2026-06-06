/**
 * Payment Provider Interface
 *
 * Defines the contract for payment gateway integrations.
 * All payment providers must implement this interface.
 *
 * CRITICAL RULES:
 * - Payments must NEVER mutate order state directly
 * - Order state changes must go through Order State Machine
 * - Webhooks must be idempotent and safe to retry
 */

import { PaymentMethod, PaymentStatus } from '@repo/types';

/**
 * Payment creation request
 */
export interface CreatePaymentRequest {
  orderId: string;
  amount: number; // In rupees (not paise)
  method: PaymentMethod;
  customerPhone: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment creation response
 */
export interface CreatePaymentResponse {
  paymentId: string; // Internal payment ID
  gatewayOrderId: string; // Gateway's order ID
  paymentIntent: {
    // Payment intent data for frontend
    orderId: string;
    amount: number;
    currency: string;
    gatewayOrderId: string;
    // Provider-specific payment data (e.g., UPI QR code, payment URL)
    paymentData: Record<string, unknown>;
  };
}

/**
 * Webhook payload (provider-specific format)
 */
export interface WebhookPayload {
  // Provider-specific payload structure
  [key: string]: unknown;
}

/**
 * Refund status as reported by the gateway.
 * Normalized across providers so callers never depend on provider-specific values.
 */
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

/**
 * Refund request
 */
export interface RefundPaymentRequest {
  gatewayPaymentId: string;
  amount: number; // In rupees — partial or full
  reason?: string;
  /**
   * Optional metadata persisted with the refund (e.g., internal orderId).
   * Used to correlate the refund back to an order when the gateway sends a
   * refund webhook.
   */
  notes?: Record<string, string>;
}

/**
 * Refund response
 */
export interface RefundPaymentResponse {
  refundId: string;
  status: RefundStatus;
  amount: number; // In rupees
}

/**
 * Webhook event type.
 * Gateways send both payment-lifecycle and refund-lifecycle webhooks on the
 * same endpoint, so the parsed result discriminates between them.
 */
export type WebhookEventType = 'payment' | 'refund';

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  valid: boolean;
  /** Defaults to 'payment' when omitted (backwards compatible). */
  eventType?: WebhookEventType;
  orderId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount?: number;
  status?: PaymentStatus;
  signature?: string;
  error?: string;
  // Refund-specific fields (populated when eventType === 'refund')
  refundId?: string;
  refundStatus?: RefundStatus;
}

/**
 * Payment verification request
 */
export interface VerifyPaymentRequest {
  orderId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
}

/**
 * Payment verification response
 */
export interface VerifyPaymentResponse {
  status: PaymentStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount?: number;
  paidAt?: Date;
  failureReason?: string;
}

/**
 * Payment Provider Interface
 *
 * Each payment gateway (Paytm, Razorpay, etc.) must implement this interface.
 * The implementation handles provider-specific logic while maintaining a consistent interface.
 */
export interface PaymentProvider {
  /**
   * Get provider name (e.g., "paytm", "razorpay")
   */
  getProviderName(): string;

  /**
   * Create payment intent
   * Called when user confirms order and initiates payment
   *
   * @param request - Payment creation request
   * @returns Payment intent data for frontend
   */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  /**
   * Verify payment status
   * Called to check payment status (polling or manual verification)
   *
   * @param request - Verification request
   * @returns Payment status and details
   */
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;

  /**
   * Parse and verify webhook payload
   * Called when payment gateway sends webhook
   *
   * @param payload - Raw webhook payload (provider-specific format)
   * @param signature - Webhook signature for verification
   * @returns Verification result with extracted payment data
   */
  parseWebhook(
    payload: WebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult>;

  /**
   * Refund a captured payment (full or partial).
   * Called when an order is cancelled, rejected, or otherwise fails after the
   * customer has already paid.
   *
   * CRITICAL:
   * - Must NOT mutate order or payment state — the caller persists the result.
   * - Refund webhooks (status updates) are handled via parseWebhook.
   *
   * @param request - Refund request (gateway payment id + amount in rupees)
   * @returns Refund id and normalized status
   */
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse>;
}
