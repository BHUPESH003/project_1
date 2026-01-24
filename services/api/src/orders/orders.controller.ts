import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Orders Controller - MVP Scope
 * 
 * API Contract v1 endpoints (USER APP):
 * - POST /v1/orders (create draft order)
 * - POST /v1/orders/:id/select-seller (assign seller to order)
 * - POST /v1/orders/:id/delivery-quote (get delivery pricing)
 * - POST /v1/orders/:id/confirm (confirm & pay)
 * - GET /v1/orders/:id (track order)
 * 
 * API Contract v1 endpoints (SELLER APP):
 * - GET /v1/seller/orders (list incoming/historical orders)
 * - POST /v1/seller/orders/:id/accept (seller accepts order)
 * - POST /v1/seller/orders/:id/reject (seller rejects order)
 * - POST /v1/seller/orders/:id/ready (mark ready for pickup)
 * 
 * Order State Machine:
 * CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → 
 * READY_FOR_PICKUP → PICKED_UP → DELIVERED
 * 
 * Removed:
 * - Generic update() - State changes must follow state machine
 * - Generic delete() - Orders never deleted, only cancelled via admin
 * - findAll() without filters - Too broad, violates role-based access
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /v1/orders
   * Create draft order (USER APP)
   * Payload: { category, order_payload: { file_url, pages, copies, color, notes } }
   * Response: { order_id, status: "CREATED" }
   */
  @Post()
  create(@Body() createOrderDto: Record<string, unknown>) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * GET /v1/orders/:id
   * Get order details for tracking (USER APP)
   * Returns: { order_id, status, seller: {...}, delivery: {...} }
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * POST /v1/orders/:id/select-seller
   * User selects a seller from available list
   * Payload: { seller_id }
   * Transitions: CREATED → SELLER_SELECTED
   */
  @Post(':id/select-seller')
  selectSeller(@Param('id') id: string, @Body() sellerDto: Record<string, unknown>) {
    return this.ordersService.selectSeller(id, sellerDto);
  }

  /**
   * POST /v1/orders/:id/delivery-quote
   * Get delivery pricing for order
   * Payload: { drop_location: { lat, lng } }
   * Response: { delivery_fee, provider }
   */
  @Post(':id/delivery-quote')
  getDeliveryQuote(@Param('id') id: string, @Body() locationDto: Record<string, unknown>) {
    return this.ordersService.getDeliveryQuote(id, locationDto);
  }

  /**
   * POST /v1/orders/:id/confirm
   * User confirms and pays for order
   * Payload: { payment_method: "UPI" }
   * Transitions: SELLER_SELECTED → PAID
   */
  @Post(':id/confirm')
  confirmOrder(@Param('id') id: string, @Body() paymentDto: Record<string, unknown>) {
    return this.ordersService.confirmOrder(id, paymentDto);
  }

  /**
   * ========================================
   * SELLER APP ENDPOINTS
   * ========================================
   * Note: These use /v1/seller/orders prefix in API contract
   * Consider moving to dedicated SellerOrdersController in future
   */

  /**
   * GET /v1/seller/orders?status=PENDING
   * List orders for seller (SELLER APP)
   * Query params: status (PENDING, COMPLETED, etc.)
   */
  @Get('seller/orders')
  getSellerOrders(
    // TODO: Use @Query decorator for status filter
  ) {
    return this.ordersService.getSellerOrders();
  }

  /**
   * POST /v1/seller/orders/:id/accept
   * Seller accepts order
   * Transitions: PAID → SELLER_ACCEPTED
   */
  @Post('seller/orders/:id/accept')
  acceptOrder(@Param('id') id: string) {
    return this.ordersService.acceptOrder(id);
  }

  /**
   * POST /v1/seller/orders/:id/reject
   * Seller rejects order
   * Payload: { reason: "Busy" }
   * Transitions: PAID → SELLER_REJECTED (failure state)
   */
  @Post('seller/orders/:id/reject')
  rejectOrder(@Param('id') id: string, @Body() rejectDto: Record<string, unknown>) {
    return this.ordersService.rejectOrder(id, rejectDto);
  }

  /**
   * POST /v1/seller/orders/:id/ready
   * Seller marks order ready for pickup
   * Transitions: PREPARING → READY_FOR_PICKUP
   */
  @Post('seller/orders/:id/ready')
  markReady(@Param('id') id: string) {
    return this.ordersService.markReady(id);
  }

  // ❌ REMOVED: findAll() - Too broad, violates role-based filtering
  // ❌ REMOVED: update() - Generic updates bypass state machine
  // ❌ REMOVED: remove() - Orders never deleted, only admin cancel
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - All endpoints map directly to API Contract v1
 *    - All state transitions follow enforced state machine
 *    - No generic CRUD that bypasses business rules
 */
