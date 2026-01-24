import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

/**
 * Payments Controller - MVP Scope (INTERNAL)
 * 
 * ⚠️ NO STANDALONE PAYMENT ENDPOINTS IN API CONTRACT
 * 
 * Payment flow is embedded within order flow:
 * - POST /v1/orders/:id/confirm handles payment
 * 
 * This module handles:
 * - Payment gateway integration (internal)
 * - Payment webhooks (internal)
 * - Payment verification (internal)
 * 
 * NOT exposed as public API endpoints
 * 
 * Removed:
 * - All public CRUD operations
 * - Payment creation endpoint (embedded in order confirm)
 * - Payment listing (audit via admin orders view)
 * - Payment updates (handled by webhooks)
 */
@Controller('internal/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /v1/internal/payments/webhook
   * Payment gateway webhook for status updates
   * Payload: { order_id, transaction_id, status, ... }
   * Internal use only
   */
  @Post('webhook')
  paymentWebhook(@Body() webhookDto: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(webhookDto);
  }

  /**
   * POST /v1/internal/payments/verify
   * Internal payment verification
   * Called by order service during confirm flow
   */
  @Post('verify')
  verifyPayment(@Body() verifyDto: Record<string, unknown>) {
    return this.paymentsService.verifyPayment(verifyDto);
  }

  // ❌ REMOVED: All public CRUD operations
  // Payment creation is handled via POST /v1/orders/:id/confirm
  // Payment history is viewed via order history
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - paymentWebhook() - Critical for payment status updates
 *    - verifyPayment() - Essential for confirming payment before order progression
 */
