import { Controller, Post, Body, Headers, Query, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { DeliveryQuotationService } from './services/delivery-quotation.service';
import { GetQuotationsDto, AvailableDeliveryPartnersResponse } from './dto/get-quotations.dto';
import { PickupDropBookingDto, PickupDropBookingResponse } from './dto/pickup-drop-booking.dto';

/**
 * Delivery Controller
 *
 * PUBLIC API Contract v1 endpoints:
 * - POST /v1/delivery/quotations (get available delivery partners for order)
 * - POST /v1/delivery/pickup-drop (standalone pickup/drop location booking)
 * - POST /v1/delivery/book (book a delivery)
 *
 * INTERNAL endpoints:
 * - POST /v1/internal/delivery/assign (assign delivery to order)
 * - POST /v1/internal/delivery/webhook (delivery status updates)
 *
 * Public endpoints allow users to:
 * - Get delivery partner options with pricing
 * - Book deliveries for orders or ad-hoc ride requests
 *
 * Internal endpoints handle:
 * - System-level delivery coordination
 * - Webhook callbacks from delivery providers
 */
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly quotationService: DeliveryQuotationService,
  ) {}

  /**
   * POST /v1/delivery/quotations
   * Get available delivery partners with quotations
   * PUBLIC endpoint - called by user app
   * 
   * Fetches quotations from all active delivery partners for the given pickup and drop locations.
   * Returns multiple options so user can choose based on price, speed, or rating.
   * 
   * Also supports pure ride bookings without an order:
   * - pickupLatitude/pickupLongitude: Seller location OR ride pickup location  
   * - dropLatitude/dropLongitude: User location OR ride drop location
   * 
   * @param quotationsDto - Pickup and drop location details
   * @param orderId - Optional order ID to link quotations to an order
   */
  @Post('quotations')
  @ApiTags('Delivery (Public)')
  @ApiOperation({ 
    summary: 'Get available delivery partners', 
    description: 'Returns delivery partner options with quotations for the given pickup and drop locations. User can select their preferred option based on price, speed, or provider rating. Also supports ad-hoc ride bookings without an order.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Available delivery partners with quotations',
    type: AvailableDeliveryPartnersResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiQuery({ name: 'orderId', required: false, description: 'Optional order ID to link quotations to an order' })
  async getAvailableDeliveryPartners(
    @Body() quotationsDto: GetQuotationsDto,
    @Query('orderId') orderId?: string,
  ): Promise<AvailableDeliveryPartnersResponse> {
    return this.quotationService.getAvailableDeliveryPartners(quotationsDto, orderId);
  }

  /**
   * POST /v1/delivery/pickup-drop
   * Get available delivery options for pickup/drop location booking
   * PUBLIC endpoint - standalone feature without order
   * 
   * Fetches delivery partner quotations for standalone pickup and drop locations.
   * User can use this for ad-hoc deliveries/rides without placing an order.
   * Returns all available providers with pricing and ETAs.
   * 
   * @param bookingDto - Pickup and drop location details with coordinates
   * @returns PickupDropBookingResponse with available provider options
   */
  @Post('pickup-drop')
  @ApiTags('Delivery (Public)')
  @ApiOperation({ 
    summary: 'Get delivery options for pickup/drop locations', 
    description: 'Standalone endpoint for pickup/drop location bookings. Returns all available delivery provider options with pricing, estimated delivery time, and ratings. No order required.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Available delivery provider options with quotes',
    type: PickupDropBookingResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters or location coordinates' })
  @ApiResponse({ status: 503, description: 'No delivery partners available for this location' })
  async getPickupDropOptions(
    @Body() bookingDto: PickupDropBookingDto,
  ): Promise<PickupDropBookingResponse> {
    return this.deliveryService.getPickupDropOptions(bookingDto);
  }
  /**
   * System assigns delivery partner to order
   * Triggered when order reaches READY_FOR_PICKUP state
   * 
   * @param assignDto - Assignment request { orderId }
   */
  @Post('internal/assign')
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
   * POST /v1/delivery/internal/webhook
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
  @Post('internal/webhook')
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
