import { Controller, Post, Body, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
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
   * 
   * CRITICAL: This endpoint must be idempotent.
   * Duplicate webhooks are safely ignored.
   * Order state transitions happen via Order State Machine.
   * 
   * @param webhookDto - Webhook payload (provider-specific format)
   * @param signature - Webhook signature for verification (from header)
   * @param provider - Payment provider name (optional, defaults to configured provider)
   */
  @Post('webhook')
  @ApiTags('Payments (Internal)')
  @ApiOperation({ 
    summary: 'Payment gateway webhook', 
    description: 'Receives payment status updates from payment gateway. Idempotent - duplicate webhooks are safely ignored. Order state transitions via Order State Machine.' 
  })
  @ApiHeader({ 
    name: 'x-paytm-signature', 
    required: false, 
    description: 'Webhook signature for verification' 
  })
  @ApiQuery({ 
    name: 'provider', 
    required: false, 
    description: 'Payment provider name (e.g., paytm)', 
    example: 'paytm' 
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  paymentWebhook(
    @Body() webhookDto: Record<string, unknown>,
    @Headers('x-paytm-signature') signature?: string,
    @Query('provider') provider?: string,
  ) {
    return this.paymentsService.handleWebhook(
      webhookDto,
      signature,
      provider,
    );
  }

  /**
   * POST /v1/internal/payments/verify
   * Internal payment verification
   * Polls payment gateway to check payment status
   * 
   * @param verifyDto - Verification request { orderId, gatewayOrderId? }
   */
  @Post('verify')
  @ApiTags('Payments (Internal)')
  @ApiOperation({ 
    summary: 'Verify payment status', 
    description: 'Polls payment gateway to check payment status. Used for manual verification or polling scenarios.' 
  })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  verifyPayment(@Body() verifyDto: { orderId: string; gatewayOrderId?: string }) {
    return this.paymentsService.verifyPayment(
      verifyDto.orderId,
      verifyDto.gatewayOrderId,
    );
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
