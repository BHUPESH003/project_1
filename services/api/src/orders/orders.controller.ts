import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
import { UserRole, OrderStatus } from '@repo/types';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/create-order.dto';
import { CreateBatchOrdersDto, CreateBatchOrdersResponseDto } from './dto/create-batch-orders.dto';
import { SelectSellerDto } from './dto/select-seller.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { GetSellerOrdersDto } from './dto/get-seller-orders.dto';

/**
 * Orders Controller - MVP Scope
 *
 * API Contract v1 endpoints (USER APP):
 * - POST /v1/orders (create draft order)
 * - POST /v1/orders/:id/select-seller (assign seller to order) [optional]
 * - GET /v1/orders/:id/delivery-quotes (get all available delivery partners with quotes)
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
   *
   * RECOMMENDED FLOW:
   * 1. GET /sellers (find available sellers)
   * 2. GET /sellers/:sellerId/products (view seller's products)
   * 3. POST /orders with sellerId + items (create order with pre-selected seller)
   *
   * LEGACY FLOW (still supported):
   * 1. POST /orders (create order)
   * 2. POST /orders/:id/select-seller (select seller after creation)
   *
   * Payload: { categoryId, sellerId?, orderPayload: { items?, notes? } }
   * Items format: { productId, quantity } - price fetched from database
   * Response: { order_id, status: "CREATED", sellerId?, itemCost? }
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new draft order',
    description:
      'Creates a draft order with CREATED status. Backend auto-fetches product prices, calculates costs, and extracts seller info. Optionally pre-select seller with sellerId. Requires USER role.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  /**
   * POST /v1/orders/batch
   * Create multiple orders in batch (for multi-cart combined checkout)
   *
   * FLOW:
   * 1. User selects multiple seller carts for combined checkout
   * 2. Frontend sends all cart data as array of CreateOrderDto
   * 3. Backend processes each order independently in parallel
   * 4. Returns results array showing which succeeded/failed
   * 5. Frontend clears only successful carts from Zustand store
   *
   * Payload: { orders: [ { categoryId, sellerId, orderPayload }, ... ] }
   * Response: { results: [ { sellerId, orderId, status, error? } ], totalProcessed, successCount, failureCount }
   *
   * NOTE: Uses Promise.allSettled() so partial failures don't block other orders
   */
  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create multiple orders in batch (combined checkout)',
    description:
      'Creates multiple independent orders for different sellers in parallel. Each order is processed independently with its own transaction. On partial failure, some orders may succeed while others fail. Frontend should clear only successful carts. Requires USER role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch orders processed',
    type: CreateBatchOrdersResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createBatch(
    @Body() createBatchOrdersDto: CreateBatchOrdersDto,
    @Request() req: { user: { id: string } },
  ): Promise<CreateBatchOrdersResponseDto> {
    return this.ordersService.createBatch(req.user.id, createBatchOrdersDto);
  }

  /**
   * PATCH /v1/orders/:id
   * Update draft order items and location (USER APP)
   *
   * Can only update orders in CREATED or SELLER_SELECTED status
   * Replaces items array entirely (not merged)
   *
   * Payload: { items?, dropLatitude?, dropLongitude?, dropAddress?, notes? }
   * Items format: { productId, quantity } - price fetched from database
   * Response: { order_id, status, message }
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update draft order items or location',
    description:
      'Updates items or location for orders in CREATED or SELLER_SELECTED status. Items array is replaced entirely. Recalculates item cost based on current product prices. Requires USER role.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or cannot update in current status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: "Cannot update other user's order" })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.update(id, req.user.id, updateOrderDto);
  }

  /**
   * GET /v1/orders
   * List orders for current user (USER APP) – orders history.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List my orders',
    description:
      'Returns orders for the authenticated user. Requires USER role.',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllForUser(@Request() req: { user: { id: string } }) {
    return this.ordersService.findAllForUser(req.user.id);
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
  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieves order details for tracking. Available to USER, SELLER, and ADMIN roles.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * POST /v1/orders/:id/select-seller (Optional - for backwards compatibility)
   * Assign seller to an existing order
   *
   * Note: RECOMMENDED flow is to select seller BEFORE creating order:
   * 1. GET /sellers (discover sellers)
   * 2. GET /sellers/:sellerId/products (view products)
   * 3. POST /orders with sellerId in body (create order with pre-selected seller)
   *
   * This endpoint exists for orders created without a seller.
   * Payload: { seller_id }
   * Transitions: CREATED → SELLER_SELECTED
   */
  @Post(':id/select-seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Select seller for order (optional)',
    description:
      'Assigns a seller to an existing order. RECOMMENDED: Provide sellerId when creating order instead. Transitions order from CREATED to SELLER_SELECTED status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Seller selected successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or invalid state transition',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order or seller not found' })
  selectSeller(
    @Param('id') id: string,
    @Body() sellerDto: SelectSellerDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.selectSeller(id, req.user.id, sellerDto);
  }

  /**
   * GET /v1/orders/:id/delivery-quotes
   * Get all available delivery provider quotes for an order (USER APP)
   *
   * Dynamically calculates quotes based on:
   * - Order pickup location (from seller selected for order)
   * - Order drop location (from user address stored in order)
   *
   * Response: { order_id, pickup_location, drop_location, providers: [...] }
   */
  @Get(':id/delivery-quotes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available delivery quotes for order',
    description:
      'Fetches delivery quotes from all available providers based on seller pickup location and user drop location. Returns multiple options with pricing and ETAs.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({
    status: 200,
    description: 'Delivery quotes retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or missing location data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getDeliveryQuotes(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.getDeliveryQuotes(id, req.user.id);
  }

  /**
   * POST /v1/orders/:id/create-payment-intent
   * Create payment intent for order
   * Generates payment data for Razorpay or other payment provider
   * Payload: { provider?: "razorpay" | "paytm" }
   */
  @Post(':id/create-payment-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create payment intent',
    description:
      'Creates a payment intent for the order. Returns payment gateway-specific data for frontend.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['razorpay', 'paytm'],
    description: 'Payment provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or order state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  createPaymentIntent(
    @Param('id') id: string,
    @Query('provider') provider?: string,
    @Request() req: { user: { id: string } } = { user: { id: '' } },
  ) {
    return this.ordersService.createPaymentIntent(id, req.user?.id, provider);
  }

  /**
   * POST /v1/orders/:id/verify-payment
   * Verify payment after user completes payment gateway flow
   * Payload: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
   * Transitions: SELLER_SELECTED → PAID
   */
  @Post(':id/verify-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify payment',
    description: 'Verifies payment and transitions order to PAID status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  verifyPayment(
    @Param('id') id: string,
    @Body() paymentData: Record<string, unknown>,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.verifyPayment(id, req.user.id, paymentData);
  }

  /**
   * POST /v1/orders/:id/confirm
   * User confirms and pays for order
   * Payload: { payment_method: "UPI" }
   * Transitions: SELLER_SELECTED → PAID
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm and pay for order',
    description:
      'Confirms the order and processes payment. Transitions order from SELLER_SELECTED to PAID status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed and payment processed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or invalid state transition',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  confirmOrder(
    @Param('id') id: string,
    @Body() paymentDto: ConfirmOrderDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ordersService.confirmOrder(id, req.user.id, paymentDto);
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
  @ApiOperation({
    summary: 'List seller orders',
    description:
      'Retrieves list of orders for the authenticated seller. Can be filtered by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(OrderStatus),
    description: 'Filter by order status. Leave empty to retrieve all orders.',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid status value provided' })
  getSellerOrders(
    @Query() query: GetSellerOrdersDto,
    @Request() req: { user: { id: string } },
  ) {
    // Get seller ID from user ID
    // Note: In Sprint 2, we assume user.id is the seller's userId
    // In future, we may need to look up seller by userId
    return this.ordersService.getSellerOrders(req.user.id, query);
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
  @ApiOperation({
    summary: 'Accept order',
    description:
      'Seller accepts the order. Transitions order from PAID to SELLER_ACCEPTED status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  acceptOrder(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    // Get seller ID from user ID
    return this.ordersService.acceptOrder(id, req.user.id);
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
  @ApiOperation({
    summary: 'Reject order',
    description:
      'Seller rejects the order. Transitions order from PAID to SELLER_REJECTED status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  rejectOrder(
    @Param('id') id: string,
    @Body() rejectDto: RejectOrderDto,
    @Request() req: { user: { id: string } },
  ) {
    // Get seller ID from user ID
    return this.ordersService.rejectOrder(id, req.user.id, rejectDto);
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
  @ApiOperation({
    summary: 'Mark order ready for pickup',
    description:
      'Seller marks the order as ready for pickup. Transitions order from PREPARING to READY_FOR_PICKUP status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', example: 'order-123' })
  @ApiResponse({ status: 200, description: 'Order marked as ready for pickup' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  markReady(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    // Get seller ID from user ID
    return this.ordersService.markReady(id, req.user.id);
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
