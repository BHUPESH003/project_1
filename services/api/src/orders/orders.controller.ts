import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';
import { CreateOrderDto } from './dto/create-order.dto';
import { SelectSellerDto } from './dto/select-seller.dto';
import { DeliveryQuoteDto } from './dto/delivery-quote.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { GetSellerOrdersDto } from './dto/get-seller-orders.dto';

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
@ApiTags('Orders')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new draft order', description: 'Creates a draft order with CREATED status. Requires USER role.' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * GET /v1/orders/:id
   * Get order details for tracking (USER APP)
   * Returns: { order_id, status, seller: {...}, delivery: {...} }
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details', description: 'Retrieves order details for tracking. Available to USER, SELLER, and ADMIN roles.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select seller for order', description: 'Assigns a seller to the order. Transitions order from CREATED to SELLER_SELECTED status.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Seller selected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order or seller not found' })
  selectSeller(@Param('id') id: string, @Body() sellerDto: SelectSellerDto) {
    return this.ordersService.selectSeller(id, sellerDto);
  }

  /**
   * POST /v1/orders/:id/delivery-quote
   * Get delivery pricing for order
   * Payload: { drop_location: { lat, lng } }
   * Response: { delivery_fee, provider }
   */
  @Post(':id/delivery-quote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get delivery quote', description: 'Calculates delivery pricing for the order based on drop location.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Delivery quote retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getDeliveryQuote(
    @Param('id') id: string,
    @Body() locationDto: DeliveryQuoteDto,
  ) {
    return this.ordersService.getDeliveryQuote(id, locationDto);
  }

  /**
   * POST /v1/orders/:id/confirm
   * User confirms and pays for order
   * Payload: { payment_method: "UPI" }
   * Transitions: SELLER_SELECTED → PAID
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm and pay for order', description: 'Confirms the order and processes payment. Transitions order from SELLER_SELECTED to PAID status.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order confirmed and payment processed' })
  @ApiResponse({ status: 400, description: 'Invalid request or invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  confirmOrder(@Param('id') id: string, @Body() paymentDto: ConfirmOrderDto) {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List seller orders', description: 'Retrieves list of orders for the authenticated seller. Can be filtered by status.' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'CANCELLED'], description: 'Filter by order status' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSellerOrders(@Query() query: GetSellerOrdersDto) {
    return this.ordersService.getSellerOrders(query);
  }

  /**
   * POST /v1/seller/orders/:id/accept
   * Seller accepts order
   * Transitions: PAID → SELLER_ACCEPTED
   */
  @Post('seller/orders/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept order', description: 'Seller accepts the order. Transitions order from PAID to SELLER_ACCEPTED status.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject order', description: 'Seller rejects the order. Transitions order from PAID to SELLER_REJECTED status.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  rejectOrder(@Param('id') id: string, @Body() rejectDto: RejectOrderDto) {
    return this.ordersService.rejectOrder(id, rejectDto);
  }

  /**
   * POST /v1/seller/orders/:id/ready
   * Seller marks order ready for pickup
   * Transitions: PREPARING → READY_FOR_PICKUP
   */
  @Post('seller/orders/:id/ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark order ready for pickup', description: 'Seller marks the order as ready for pickup. Transitions order from PREPARING to READY_FOR_PICKUP status.' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order marked as ready for pickup' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
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
