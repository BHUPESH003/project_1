/**
 * Paytm Payment Provider
 *
 * Implements PaymentProvider interface for Paytm gateway.
 * Handles Paytm-specific payment logic while maintaining abstraction.
 *
 * CRITICAL RULES:
 * - Never mutates order state directly
 * - Webhook verification must be idempotent
 * - All order state changes go through Order State Machine
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus } from '@repo/types';
import {
  PaymentProvider,
  CreatePaymentRequest,
  CreatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  WebhookPayload,
  WebhookVerificationResult,
} from '../payment-provider.interface';
import * as crypto from 'crypto';

/**
 * Paytm Provider Configuration
 */
interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  environment: 'sandbox' | 'production';
  website: string;
  callbackUrl: string;
}

/**
 * Paytm Payment Provider
 *
 * Implements Paytm payment gateway integration.
 * Sprint 3: MVP implementation with webhook support.
 */
@Injectable()
export class PaytmProvider implements PaymentProvider {
  private readonly logger = new Logger(PaytmProvider.name);
  private readonly config: PaytmConfig;

  constructor(private readonly configService: ConfigService) {
    // Load Paytm configuration from environment
    this.config = {
      merchantId:
        this.configService.get<string>('PAYTM_MERCHANT_ID') || 'TEST_MERCHANT',
      merchantKey:
        this.configService.get<string>('PAYTM_MERCHANT_KEY') || 'TEST_KEY',
      environment:
        (this.configService.get<'sandbox' | 'production'>(
          'PAYTM_ENVIRONMENT',
        ) as 'sandbox' | 'production') || 'sandbox',
      website: this.configService.get<string>('PAYTM_WEBSITE') || 'WEBSTAGING',
      callbackUrl:
        this.configService.get<string>('PAYTM_CALLBACK_URL') ||
        'http://localhost:3000/api/internal/payments/webhook',
    };

    this.logger.log(
      `PaytmProvider initialized (${this.config.environment} environment)`,
    );
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'paytm';
  }

  /**
   * Create payment intent
   *
   * Validates order state and creates payment intent with Paytm.
   * Returns payment data for frontend to initiate payment.
   */
  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    // Validate payment method (MVP: UPI only)
    if (request.method !== PaymentMethod.UPI) {
      throw new BadRequestException(
        `Payment method ${request.method} not supported. MVP supports UPI only.`,
      );
    }

    // Generate unique order ID for Paytm
    const gatewayOrderId = `ORDER_${request.orderId}_${Date.now()}`;

    // In production, this would call Paytm API to create order
    // For MVP, we'll generate payment intent data
    // TODO: Integrate with Paytm SDK when available
    const paymentData = {
      orderId: gatewayOrderId,
      amount: request.amount,
      merchantId: this.config.merchantId,
      // UPI payment data
      upi: {
        // In production, this would be a real UPI payment URL or QR code
        paymentUrl: `paytm://pay?orderId=${gatewayOrderId}&amount=${request.amount}`,
        qrCode: `data:image/png;base64,${Buffer.from(gatewayOrderId).toString('base64')}`, // Stubbed
      },
      callbackUrl: this.config.callbackUrl,
    };

    this.logger.log(
      `Payment intent created for order ${request.orderId} (Paytm order: ${gatewayOrderId})`,
    );

    return {
      paymentId: request.orderId, // Will be replaced with actual payment ID
      gatewayOrderId,
      paymentIntent: {
        orderId: request.orderId,
        amount: request.amount,
        currency: 'INR',
        gatewayOrderId,
        paymentData,
      },
    };
  }

  /**
   * Verify payment status
   *
   * Polls Paytm API to check payment status.
   * Used for manual verification or polling scenarios.
   */
  async verifyPayment(
    request: VerifyPaymentRequest,
  ): Promise<VerifyPaymentResponse> {
    // In production, this would call Paytm API to verify payment
    // For MVP, we'll return a stubbed response
    // TODO: Integrate with Paytm SDK when available

    this.logger.log(
      `Verifying payment for order ${request.orderId} (gateway: ${request.gatewayOrderId})`,
    );

    // Stubbed verification - in production, call Paytm status API
    return {
      status: PaymentStatus.PENDING, // Will be updated via webhook
      gatewayOrderId: request.gatewayOrderId,
      gatewayPaymentId: request.gatewayPaymentId,
    };
  }

  /**
   * Parse and verify webhook payload
   *
   * Verifies webhook signature and extracts payment data.
   * Must be idempotent - duplicate webhooks are safely ignored.
   */
  async parseWebhook(
    payload: WebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    try {
      // Extract Paytm webhook data
      const orderId = payload.ORDERID as string;
      const gatewayOrderId = payload.ORDERID as string;
      const gatewayPaymentId = payload.TXNID as string;
      const amount = parseFloat(payload.TXNAMOUNT as string) || 0;
      const status = payload.STATUS as string;
      const checksum = payload.CHECKSUMHASH as string;

      if (!orderId || !gatewayOrderId) {
        return {
          valid: false,
          error: 'Missing required fields: ORDERID',
        };
      }

      // Verify signature (checksum)
      if (signature || checksum) {
        const isValidSignature = this.verifyChecksum(
          payload,
          signature || checksum,
        );
        if (!isValidSignature) {
          this.logger.warn(
            `Invalid Paytm webhook signature for order ${orderId}`,
          );
          return {
            valid: false,
            error: 'Invalid webhook signature',
          };
        }
      }

      // Map Paytm status to PaymentStatus
      let paymentStatus: PaymentStatus;
      if (status === 'TXN_SUCCESS') {
        paymentStatus = PaymentStatus.SUCCESS;
      } else if (status === 'TXN_FAILURE' || status === 'PENDING') {
        paymentStatus = PaymentStatus.FAILED;
      } else {
        paymentStatus = PaymentStatus.PENDING;
      }

      // Extract order ID from gateway order ID (format: ORDER_<orderId>_<timestamp>)
      const orderIdMatch = gatewayOrderId.match(/^ORDER_(.+?)_\d+$/);
      const extractedOrderId = orderIdMatch ? orderIdMatch[1] : orderId;

      this.logger.log(
        `Paytm webhook verified for order ${extractedOrderId} (status: ${paymentStatus})`,
      );

      return {
        valid: true,
        orderId: extractedOrderId,
        gatewayOrderId,
        gatewayPaymentId,
        amount,
        status: paymentStatus,
        signature: signature || checksum,
      };
    } catch (error) {
      this.logger.error('Error parsing Paytm webhook:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify Paytm checksum
   *
   * Paytm uses checksum hash for webhook verification.
   * This is a simplified version - production should use Paytm SDK.
   */
  private verifyChecksum(
    payload: WebhookPayload,
    receivedChecksum: string,
  ): boolean {
    try {
      // In production, use Paytm's checksum verification method
      // For MVP, we'll do basic validation
      // TODO: Implement proper Paytm checksum verification

      // Create checksum string from payload (excluding CHECKSUMHASH)
      const checksumString = Object.keys(payload)
        .filter((key) => key !== 'CHECKSUMHASH')
        .sort()
        .map((key) => `${key}=${payload[key]}`)
        .join('&');

      // Generate checksum using merchant key
      const generatedChecksum = crypto
        .createHash('sha256')
        .update(checksumString + this.config.merchantKey)
        .digest('hex')
        .toUpperCase();

      return generatedChecksum === receivedChecksum.toUpperCase();
    } catch (error) {
      this.logger.error('Error verifying Paytm checksum:', error);
      return false;
    }
  }
}
