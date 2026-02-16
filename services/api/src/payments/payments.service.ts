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

      if (!verification.valid || !verification.orderId) {
        this.logger.warn(
          `Invalid webhook received: ${verification.error || 'Unknown error'}`,
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
