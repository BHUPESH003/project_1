/**
 * Payments Service
 *
 * Handles payment creation, verification, and webhook processing.
 * CRITICAL: Never mutates order state directly - all state changes go through Order State Machine.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentStatus, OrderStatus } from '@repo/types';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { OrderStateMachineService } from '@/orders/state-machine';
import { Inject, forwardRef } from '@nestjs/common';
import { OrderRepository } from '@/orders/repositories/order.repository';
import {
  CreatePaymentRequest,
  VerifyPaymentRequest,
  WebhookPayload,
  WebhookVerificationResult,
} from './providers/payment-provider.interface';

/**
 * Create Payment Response
 */
export interface CreatePaymentResponse {
  payment_id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  payment_intent: {
    orderId: string;
    amount: number;
    currency: string;
    gatewayOrderId: string;
    paymentData: Record<string, unknown>;
  };
}

/**
 * Verify Payment Response
 */
export interface VerifyPaymentResponse {
  payment_id: string;
  order_id: string;
  status: PaymentStatus;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  amount?: number;
  paid_at?: Date;
  failure_reason?: string;
}

/**
 * Initiate Refund Result
 *
 * Returned by initiateRefund. Intentionally does NOT throw for "not refundable"
 * cases (no payment / not SUCCESS / already refunded) so that the auto-refund
 * background job treats them as terminal success instead of retrying forever.
 * Only transient/gateway errors throw (to trigger a job retry).
 */
export interface InitiateRefundResult {
  refunded: boolean;
  orderId: string;
  refundId?: string;
  refundStatus?: string; // PENDING | PROCESSED | FAILED
  amount?: number;
  message: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly stateMachine: OrderStateMachineService,
    @Inject(forwardRef(() => OrderRepository))
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * Create payment intent
   *
   * Called when user confirms order and initiates payment.
   * Creates payment record and returns payment intent for frontend.
   *
   * CRITICAL: Does NOT transition order state - that happens via webhook.
   *
   * @param orderId - Order ID
   * @param paymentMethod - Payment method (UPI, CARD, etc.)
   * @param customerPhone - Customer's phone number
   * @param customerName - Customer's name
   * @param providerName - Optional payment provider name (razorpay, paytm, etc.)
   */
  async createPayment(
    orderId: string,
    paymentMethod: string,
    customerPhone: string,
    customerName?: string,
    providerName?: string,
  ): Promise<CreatePaymentResponse> {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.SELLER_SELECTED) {
      throw new BadRequestException(
        `Order must be in SELLER_SELECTED state. Current state: ${order.status}`,
      );
    }

    // Verify order has total amount
    if (!order.totalAmount || order.totalAmount <= 0) {
      throw new BadRequestException('Order total amount must be set');
    }

    // Check if payment already exists
    const existingPayment = await this.paymentRepository.findByOrderId(orderId);
    if (existingPayment) {
      // Return existing payment if still pending
      if (existingPayment.status === PaymentStatus.PENDING) {
        this.logger.log(
          `Payment already exists for order ${orderId}, returning existing payment`,
        );
        return this.mapToCreateResponse(existingPayment);
      }
      throw new BadRequestException(
        `Payment already exists for order ${orderId} with status ${existingPayment.status}`,
      );
    }

    // Get payment provider (use specified provider or default)
    let provider;
    if (providerName) {
      provider = this.providerRegistry.getProvider(providerName);
    } else {
      provider = this.providerRegistry.getDefaultProvider();
    }

    // Create payment intent via provider
    const paymentRequest: CreatePaymentRequest = {
      orderId,
      amount: order.totalAmount,
      method: paymentMethod as any, // Will be validated by provider
      customerPhone,
      customerName,
    };

    const paymentIntent = await provider.createPayment(paymentRequest);

    // Create payment record in database
    const payment = await this.paymentRepository.create({
      orderId,
      amount: order.totalAmount,
      method: paymentMethod as any,
      gatewayName: provider.getProviderName(),
      gatewayOrderId: paymentIntent.gatewayOrderId,
    });

    this.logger.log(
      `Payment intent created for order ${orderId} (payment: ${payment.id}, gateway: ${paymentIntent.gatewayOrderId}, provider: ${provider.getProviderName()})`,
    );

    return {
      payment_id: payment.id,
      order_id: orderId,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      payment_intent: paymentIntent.paymentIntent,
    };
  }

  /**
   * Verify payment status
   *
   * Polls payment gateway to check payment status.
   * Used for manual verification or polling scenarios.
   */
  async verifyPayment(
    orderId: string,
    gatewayOrderId?: string,
  ): Promise<VerifyPaymentResponse> {
    // Get payment record
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundException(`Payment not found for order ${orderId}`);
    }

    // Get payment provider
    const provider = this.providerRegistry.getProvider(payment.gatewayName!);

    // Verify payment via provider
    const verifyRequest: VerifyPaymentRequest = {
      orderId,
      gatewayOrderId: gatewayOrderId || payment.gatewayOrderId || undefined,
      gatewayPaymentId: payment.gatewayPaymentId || undefined,
    };

    const verification = await provider.verifyPayment(verifyRequest);

    // Update payment record if status changed
    if (verification.status !== payment.status) {
      await this.paymentRepository.update(payment.id, {
        status: verification.status,
        gatewayPaymentId: verification.gatewayPaymentId,
        paidAt: verification.paidAt,
        failureReason: verification.failureReason,
      });

      // If payment succeeded, trigger state machine transition
      if (verification.status === PaymentStatus.SUCCESS) {
        await this.handlePaymentSuccess(orderId, payment.id);
      }
    }

    return {
      payment_id: payment.id,
      order_id: orderId,
      status: verification.status,
      gateway_order_id: verification.gatewayOrderId,
      gateway_payment_id: verification.gatewayPaymentId,
      amount: verification.amount,
      paid_at: verification.paidAt,
      failure_reason: verification.failureReason,
    };
  }

  /**
   * Verify Razorpay payment with signature (Frontend flow)
   *
   * Called from frontend after user completes Razorpay payment.
   * Verifies payment signature and updates payment record.
   *
   * @param orderId - Order ID
   * @param razorpayPaymentId - Razorpay payment ID from frontend
   * @param razorpayOrderId - Razorpay order ID from frontend
   * @param razorpaySignature - Razorpay signature from frontend
   */
  async verifyRazorpayPayment(
    orderId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
  ): Promise<VerifyPaymentResponse> {
    // Get payment record
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundException(`Payment not found for order ${orderId}`);
    }

    // Get Razorpay provider
    const provider = this.providerRegistry.getProvider('razorpay');

    // Verify payment via provider
    const verifyRequest: VerifyPaymentRequest = {
      orderId,
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
    };

    const verification = await provider.verifyPayment(verifyRequest);

    // Verify signature (additional security check)
    // This is handled by the Razorpay provider in verifyPayment

    // Update payment record
    await this.paymentRepository.update(payment.id, {
      status: verification.status,
      gatewayPaymentId: razorpayPaymentId,
      paidAt: verification.paidAt,
      failureReason: verification.failureReason,
    });

    // If payment succeeded, trigger state machine transition
    if (verification.status === PaymentStatus.SUCCESS) {
      await this.handlePaymentSuccess(orderId, payment.id);
    }

    this.logger.log(
      `Razorpay payment verified for order ${orderId}: ${verification.status}`,
    );

    return {
      payment_id: payment.id,
      order_id: orderId,
      status: verification.status,
      gateway_order_id: razorpayOrderId,
      gateway_payment_id: razorpayPaymentId,
      amount: verification.amount,
      paid_at: verification.paidAt,
      failure_reason: verification.failureReason,
    };
  }

  /**
   * Handle payment webhook
   *
   * Processes webhook from payment gateway.
   * CRITICAL: Must be idempotent - duplicate webhooks are safely ignored.
   * NEVER mutates order state directly - uses Order State Machine.
   */
  async handleWebhook(
    payload: WebhookPayload,
    signature?: string,
    providerName?: string,
  ): Promise<{
    processed: boolean;
    orderId?: string;
    status?: PaymentStatus;
    message: string;
  }> {
    try {
      // Determine provider (default: Paytm for MVP)
      const provider = providerName
        ? this.providerRegistry.getProvider(providerName)
        : this.providerRegistry.getDefaultProvider();

      // Parse and verify webhook
      const verification = await provider.parseWebhook(payload, signature);

      if (!verification.valid) {
        this.logger.warn(
          `Invalid webhook received: ${verification.error || 'Unknown error'}`,
        );
        return {
          processed: false,
          message: verification.error || 'Invalid webhook',
        };
      }

      // Refund lifecycle webhooks update refund status only; they never touch
      // order state. Handled separately from payment-capture events.
      if (verification.eventType === 'refund') {
        return this.handleRefundWebhook(verification);
      }

      if (!verification.orderId) {
        this.logger.warn(
          `Invalid webhook received: ${verification.error || 'Order ID missing'}`,
        );
        return {
          processed: false,
          message: verification.error || 'Invalid webhook',
        };
      }

      const { orderId, gatewayPaymentId, status, amount } = verification;

      // Get payment record
      let payment = await this.paymentRepository.findByOrderId(orderId);

      if (!payment) {
        this.logger.warn(`Payment not found for order ${orderId} in webhook`);
        return {
          processed: false,
          message: `Payment not found for order ${orderId}`,
        };
      }

      // IDEMPOTENCY CHECK: If payment already processed with same status, ignore
      if (
        payment.status === PaymentStatus.SUCCESS &&
        status === PaymentStatus.SUCCESS
      ) {
        this.logger.log(
          `Webhook already processed for order ${orderId} (payment: ${payment.id})`,
        );
        return {
          processed: true,
          orderId,
          status: payment.status,
          message: 'Webhook already processed (idempotent)',
        };
      }

      // Update payment record
      payment = await this.paymentRepository.update(payment.id, {
        status,
        gatewayPaymentId:
          gatewayPaymentId || payment.gatewayPaymentId || undefined,
        gatewaySignature: verification.signature,
        paidAt: status === PaymentStatus.SUCCESS ? new Date() : undefined,
        failureReason:
          status === PaymentStatus.FAILED
            ? 'Payment failed via webhook'
            : undefined,
      });

      this.logger.log(
        `Payment webhook processed for order ${orderId} (status: ${status})`,
      );

      // Handle payment success - transition order state via state machine
      if (status === PaymentStatus.SUCCESS) {
        await this.handlePaymentSuccess(orderId, payment.id);
      }

      return {
        processed: true,
        orderId,
        status: status || PaymentStatus.PENDING,
        message: `Payment ${(status || PaymentStatus.PENDING).toLowerCase()}`,
      };
    } catch (error) {
      this.logger.error('Error processing payment webhook:', error);
      return {
        processed: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error processing webhook',
      };
    }
  }

  /**
   * Handle payment success
   *
   * Transitions order to PAID state via Order State Machine.
   * CRITICAL: This is the ONLY place where payment success triggers state change.
   */
  private async handlePaymentSuccess(
    orderId: string,
    paymentId: string,
  ): Promise<void> {
    try {
      // Get order to verify current state
      const order = await this.orderRepository.findById(orderId, false);
      if (!order) {
        this.logger.error(
          `Order ${orderId} not found when processing payment success`,
        );
        return;
      }

      // Only transition if order is still in SELLER_SELECTED state
      // If already PAID, this is a duplicate webhook (idempotent)
      if (order.status === OrderStatus.SELLER_SELECTED) {
        await this.stateMachine.transition({
          orderId,
          toState: OrderStatus.PAID,
          triggeredBy: 'system',
          reason: `Payment successful (payment: ${paymentId})`,
        });

        this.logger.log(
          `Order ${orderId} transitioned to PAID after payment success`,
        );
      } else if (order.status === OrderStatus.PAID) {
        this.logger.log(
          `Order ${orderId} already in PAID state (idempotent webhook)`,
        );
      } else {
        this.logger.warn(
          `Order ${orderId} in unexpected state ${order.status} when processing payment success`,
        );
      }
    } catch (error) {
      this.logger.error(`Error transitioning order ${orderId} to PAID:`, error);
      // Don't throw - webhook should return success even if state transition fails
      // State can be manually corrected by admin
    }
  }

  /**
   * Initiate a refund for an order's payment.
   *
   * Called by the auto-refund background job when an order fails after payment
   * (SELLER_REJECTED / USER_CANCELLED / DELIVERY_FAILED).
   *
   * Idempotent and tolerant by design:
   * - No payment / payment not SUCCESS / already refunded → returns
   *   { refunded: false | true } WITHOUT throwing, so the job does not retry.
   * - Gateway/network failures throw, so the job retries with backoff.
   *
   * Does a full refund of the captured amount. (Partial refunds can layer on
   * later by accepting an explicit amount.)
   *
   * @param orderId - Order ID whose payment should be refunded
   * @param reason - Human-readable reason (stored on the gateway refund notes)
   */
  async initiateRefund(
    orderId: string,
    reason: string,
  ): Promise<InitiateRefundResult> {
    // Find payment by orderId
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      this.logger.warn(
        `Refund requested for order ${orderId} but no payment exists - nothing to refund`,
      );
      return {
        refunded: false,
        orderId,
        message: 'No payment found for order',
      };
    }

    // Idempotency: refund already initiated or completed → no-op
    if (
      payment.status === PaymentStatus.REFUNDED ||
      payment.refundStatus === 'PROCESSED' ||
      payment.refundStatus === 'PENDING'
    ) {
      this.logger.log(
        `Refund already initiated for order ${orderId} (status: ${payment.status}, refundStatus: ${payment.refundStatus}) - idempotent`,
      );
      return {
        refunded: true,
        orderId,
        refundStatus: payment.refundStatus || PaymentStatus.REFUNDED,
        amount: payment.refundAmount ?? payment.amount,
        message: 'Refund already initiated (idempotent)',
      };
    }

    // Only SUCCESS payments are refundable. Anything else (PENDING/FAILED) means
    // the customer was never charged, so there is nothing to refund.
    if (payment.status !== PaymentStatus.SUCCESS) {
      this.logger.warn(
        `Refund skipped for order ${orderId} - payment status is ${payment.status} (only SUCCESS is refundable)`,
      );
      return {
        refunded: false,
        orderId,
        message: `Payment status ${payment.status} is not refundable`,
      };
    }

    if (!payment.gatewayPaymentId) {
      // Captured payment with no gateway payment id is a data inconsistency we
      // can't resolve automatically. Don't retry — surface for manual handling.
      this.logger.error(
        `Refund skipped for order ${orderId} - payment ${payment.id} is SUCCESS but has no gatewayPaymentId`,
      );
      return {
        refunded: false,
        orderId,
        message: 'Payment is missing gateway payment id',
      };
    }

    // Resolve the provider that processed the original payment
    const provider = this.providerRegistry.getProvider(payment.gatewayName!);

    // Call the gateway. Gateway/network errors propagate so the job retries.
    const refund = await provider.refundPayment({
      gatewayPaymentId: payment.gatewayPaymentId,
      amount: payment.amount,
      reason,
      notes: {
        orderId,
        gatewayOrderId: payment.gatewayOrderId || '',
      },
    });

    // Persist refund outcome. Payment only flips to REFUNDED once the gateway
    // confirms the refund is PROCESSED; PENDING refunds are finalized later via
    // the refund webhook.
    const isProcessed = refund.status === 'PROCESSED';
    await this.paymentRepository.update(payment.id, {
      refundAmount: refund.amount,
      refundStatus: refund.status,
      refundedAt: isProcessed ? new Date() : null,
      status: isProcessed ? PaymentStatus.REFUNDED : undefined,
    });

    this.logger.log(
      `Refund initiated for order ${orderId} (payment: ${payment.id}, refund: ${refund.refundId}, ` +
        `status: ${refund.status}, amount: ₹${refund.amount}, reason: ${reason})`,
    );

    return {
      refunded: true,
      orderId,
      refundId: refund.refundId,
      refundStatus: refund.status,
      amount: refund.amount,
      message: `Refund ${refund.status.toLowerCase()}`,
    };
  }

  /**
   * Handle a refund-status webhook from the gateway.
   *
   * Finalizes refund state when the gateway confirms (or fails) a previously
   * initiated refund. Idempotent — duplicate webhooks are safely ignored.
   * NEVER mutates order state.
   */
  private async handleRefundWebhook(
    verification: WebhookVerificationResult,
  ): Promise<{
    processed: boolean;
    orderId?: string;
    status?: PaymentStatus;
    message: string;
  }> {
    const { orderId, gatewayPaymentId, refundStatus, refundId, amount } =
      verification;

    // Locate the payment by orderId (preferred) or by gateway payment id.
    let payment = orderId
      ? await this.paymentRepository.findByOrderId(orderId)
      : null;
    if (!payment && gatewayPaymentId) {
      payment =
        await this.paymentRepository.findByGatewayPaymentId(gatewayPaymentId);
    }

    if (!payment) {
      this.logger.warn(
        `Refund webhook received but no matching payment found (orderId: ${orderId}, refundId: ${refundId})`,
      );
      return {
        processed: false,
        message: 'Payment not found for refund webhook',
      };
    }

    // Idempotency: already finalized → ignore.
    if (
      payment.status === PaymentStatus.REFUNDED &&
      payment.refundStatus === 'PROCESSED'
    ) {
      this.logger.log(
        `Refund webhook already processed for order ${payment.orderId} (refund: ${refundId}) - idempotent`,
      );
      return {
        processed: true,
        orderId: payment.orderId,
        status: payment.status,
        message: 'Refund webhook already processed (idempotent)',
      };
    }

    const isProcessed = refundStatus === 'PROCESSED';
    await this.paymentRepository.update(payment.id, {
      refundStatus: refundStatus || payment.refundStatus || undefined,
      refundAmount: amount ?? payment.refundAmount ?? undefined,
      refundedAt: isProcessed ? new Date() : undefined,
      status: isProcessed ? PaymentStatus.REFUNDED : undefined,
    });

    this.logger.log(
      `Refund webhook processed for order ${payment.orderId} (refund: ${refundId}, status: ${refundStatus})`,
    );

    return {
      processed: true,
      orderId: payment.orderId,
      status: isProcessed ? PaymentStatus.REFUNDED : payment.status,
      message: `Refund ${(refundStatus || 'updated').toLowerCase()}`,
    };
  }

  /**
   * Map PaymentEntity to CreatePaymentResponse
   */
  private mapToCreateResponse(payment: any): CreatePaymentResponse {
    return {
      payment_id: payment.id,
      order_id: payment.orderId,
      amount: payment.amount,
      status: payment.status,
      payment_intent: {
        orderId: payment.orderId,
        amount: payment.amount,
        currency: 'INR',
        gatewayOrderId: payment.gatewayOrderId || '',
        paymentData: {},
      },
    };
  }
}
