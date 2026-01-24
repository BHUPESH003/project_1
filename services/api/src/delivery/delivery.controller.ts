import { Controller, Post, Body, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';

/**
 * Delivery Controller - MVP Scope (INTERNAL ONLY)
 *
 * API Contract v1 endpoints:
 * - POST /v1/internal/delivery/assign (assign delivery to order)
 * - POST /v1/internal/delivery/webhook (delivery status updates)
 *
 * Purpose:
 * - Integration with third-party delivery aggregators
 * - NOT exposed to user or seller apps
 * - Internal system-to-system communication
 *
 * Delivery is triggered automatically when seller marks "ready for pickup"
 *
 * Removed:
 * - All generic CRUD operations
 * - Public endpoints
 * - List/read operations (delivery info embedded in order)
 */
@Controller('internal/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * POST /v1/internal/delivery/assign
   * System assigns delivery partner to order
   * Triggered when order reaches READY_FOR_PICKUP state
   * 
   * @param assignDto - Assignment request { orderId }
   */
  @Post('assign')
  @ApiTags('Delivery (Internal)')
  @ApiOperation({ 
    summary: 'Assign delivery to order', 
    description: 'Assigns a delivery partner to an order. Called automatically when order reaches READY_FOR_PICKUP state.' 
  })
  @ApiResponse({ status: 200, description: 'Delivery assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or invalid order state' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  assignDelivery(@Body() assignDto: { orderId: string }) {
    return this.deliveryService.assignDelivery(assignDto.orderId);
  }

  /**
   * POST /v1/internal/delivery/webhook
   * Webhook for delivery partner status updates
   * 
   * CRITICAL: This endpoint must be idempotent.
   * Duplicate webhooks are safely ignored.
   * Order state transitions happen via Order State Machine.
   * 
   * @param webhookDto - Webhook payload (provider-specific format)
   * @param signature - Webhook signature for verification (from header)
   * @param provider - Delivery provider name (optional, defaults to configured provider)
   */
  @Post('webhook')
  @ApiTags('Delivery (Internal)')
  @ApiOperation({ 
    summary: 'Delivery provider webhook', 
    description: 'Receives delivery status updates from delivery provider. Idempotent - duplicate webhooks are safely ignored. Order state transitions via Order State Machine.' 
  })
  @ApiHeader({ 
    name: 'x-uber-signature', 
    required: false, 
    description: 'Webhook signature for verification' 
  })
  @ApiQuery({ 
    name: 'provider', 
    required: false, 
    description: 'Delivery provider name (e.g., UBER_DIRECT)', 
    example: 'UBER_DIRECT' 
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  deliveryWebhook(
    @Body() webhookDto: Record<string, unknown>,
    @Headers('x-uber-signature') signature?: string,
    @Query('provider') provider?: string,
  ) {
    return this.deliveryService.handleWebhook(webhookDto, signature, provider);
  }

  // ❌ REMOVED: All CRUD operations - delivery is internal service integration
  // ❌ REMOVED: findAll() - not needed, delivery info in order object
  // ❌ REMOVED: findOne() - not needed, delivery info in order object
  // ❌ REMOVED: update() - updates come via webhook only
  // ❌ REMOVED: remove() - deliveries never deleted
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - assignDelivery() - Critical for coordinating third-party delivery
 *    - deliveryWebhook() - Essential for real-time order status updates
 */
