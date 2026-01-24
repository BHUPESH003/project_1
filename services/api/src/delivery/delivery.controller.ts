import { Controller, Post, Body } from '@nestjs/common';
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
   * Payload: { order_id }
   * Response: { provider: "DUNZO", tracking_id: "D123" }
   */
  @Post('assign')
  assignDelivery(@Body() assignDto: Record<string, unknown>) {
    return this.deliveryService.assignDelivery(assignDto);
  }

  /**
   * POST /v1/internal/delivery/webhook
   * Webhook for delivery partner status updates
   * Payload: { order_id, status: "PICKED_UP" | "DELIVERED" | etc }
   * Updates order state accordingly
   */
  @Post('webhook')
  deliveryWebhook(@Body() webhookDto: Record<string, unknown>) {
    return this.deliveryService.handleWebhook(webhookDto);
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
