/**
 * Orders Service
 *
 * Handles all order-related business logic.
 * CRITICAL: Uses CategoryHandler pattern - NO if/else by category.
 * All state transitions go through OrderStateMachineService.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, SellerStatus, PaymentMethod } from '@repo/types';
import { OrderRepository } from './repositories/order.repository';
import { OrderStateMachineService } from './state-machine';
import { CategoryRegistry } from '@/categories/handlers/category-registry';
import { SellerRepository } from '@/sellers/repositories/seller.repository';
import { PaymentsService } from '@/payments/payments.service';
import { DeliveryService } from '@/delivery/delivery.service';
import { QueueService } from '@/queue/queue.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SelectSellerDto } from './dto/select-seller.dto';
import { DeliveryQuoteDto } from './dto/delivery-quote.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { GetSellerOrdersDto } from './dto/get-seller-orders.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly stateMachine: OrderStateMachineService,
    private readonly categoryRegistry: CategoryRegistry,
    private readonly sellerRepository: SellerRepository,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveryService: DeliveryService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create draft order (USER APP)
   * State: CREATED
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Get category handler (NO if/else by category)
    const handler = this.categoryRegistry.getHandler(createOrderDto.categoryId);

    // Validate payload using handler
    const validation = handler.validatePayload(createOrderDto.orderPayload);
    if (!validation.valid) {
      throw new BadRequestException(validation.error || 'Invalid order payload');
    }

    // Create order with validated payload
    const order = await this.orderRepository.create({
      userId,
      categoryId: createOrderDto.categoryId,
      orderPayload: validation.normalizedPayload || createOrderDto.orderPayload,
    });

    // Record initial state in history
    await this.stateMachine.recordInitialState(
      order.id,
      OrderStatus.CREATED,
      userId,
    );

    // Optional: Process order via handler (if handler implements it)
    if (handler.processOrder) {
      await handler.processOrder(order.id, validation.normalizedPayload);
    }

    // Enqueue order timeout job
    // Job will check if order expires after timeout period
    // Default timeout: 30 minutes (configurable)
    const timeoutMinutes = 30; // TODO: Get from config or order metadata
    await this.queueService.enqueueOrderTimeout(
      order.id,
      timeoutMinutes,
      new Date(order.createdAt),
    );

    this.logger.log(`Order ${order.id} created by user ${userId}`);

    return {
      order_id: order.id,
      status: order.status,
    };
  }

  /**
   * List orders for current user (USER APP) – orders history
   */
  async findAllForUser(userId: string) {
    const orders = await this.orderRepository.findByUserId(userId);
    return orders.map((order) => ({
      order_id: order.id,
      status: order.status,
      seller: order.seller
        ? {
            id: order.seller.id,
            shopName: order.seller.shopName,
            address: order.seller.address,
          }
        : null,
      category: order.category
        ? { id: order.category.id, name: order.category.name }
        : null,
      pricing: {
        itemCost: order.itemCost,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  /**
   * Get order details for tracking
   */
  async findOne(orderId: string) {
    const order = await this.orderRepository.findById(orderId, true);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      order_id: order.id,
      status: order.status,
      seller: order.seller
        ? {
            id: order.seller.id,
            shopName: order.seller.shopName,
            address: order.seller.address,
          }
        : null,
      delivery: order.status === OrderStatus.READY_FOR_PICKUP ||
        order.status === OrderStatus.PICKED_UP ||
        order.status === OrderStatus.DELIVERED
        ? {
            status: 'pending',
          }
        : null,
      pricing: {
        itemCost: order.itemCost,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      stateHistory: (order.stateHistory ?? []).map((h: { id: string; fromStatus: string | null; toStatus: string; triggeredBy: string | null; reason: string | null; createdAt: Date }) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        triggeredBy: h.triggeredBy,
        reason: h.reason,
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * Select seller for order (USER APP)
   * Transition: CREATED → SELLER_SELECTED
   */
  async selectSeller(
    orderId: string,
    userId: string,
    sellerDto: SelectSellerDto,
  ) {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to user
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    // Verify seller exists and is ONLINE
    const seller = await this.sellerRepository.findById(sellerDto.sellerId);
    if (!seller) {
      throw new NotFoundException(`Seller ${sellerDto.sellerId} not found`);
    }

    if (seller.status !== SellerStatus.ONLINE) {
      throw new BadRequestException(
        'Seller is not available (must be ONLINE)',
      );
    }

    // Verify seller supports this category
    const sellerCategories = seller.categories?.map((sc) => sc.category.id) || [];
    if (!sellerCategories.includes(order.categoryId)) {
      throw new BadRequestException(
        `Seller does not support category ${order.categoryId}`,
      );
    }

    // Get category handler to calculate price
    const handler = this.categoryRegistry.getHandler(order.categoryId);
    
    // Fetch full seller from Prisma for pricing (handler needs Prisma Seller type)
    const sellerForPricing = await this.sellerRepository.findById(seller.id, false);
    if (!sellerForPricing) {
      throw new NotFoundException('Seller not found for pricing');
    }

    // Convert SellerEntity to Prisma Seller format for handler
    // Handler only needs id and pricePerPage (as Decimal)
    const prismaSeller = {
      id: sellerForPricing.id,
      pricePerPage: sellerForPricing.pricePerPage,
    } as any; // Type assertion - handler will extract what it needs

    const priceBreakdown = handler.calculatePrice(order.orderPayload, prismaSeller);

    // Update order with seller and pricing
    await this.orderRepository.update(orderId, {
      sellerId: sellerDto.sellerId,
      itemCost: priceBreakdown.itemPrice / 100, // Convert from paise to rupees
    });

    // Transition state: CREATED → SELLER_SELECTED
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.SELLER_SELECTED,
      triggeredBy: userId,
      reason: 'User selected seller',
    });

    this.logger.log(
      `Order ${orderId} seller selected: ${sellerDto.sellerId}`,
    );

    return {
      order_id: orderId,
      status: OrderStatus.SELLER_SELECTED,
      seller: {
        seller_id: seller.id,
        shop_name: seller.shopName,
      },
      pricing: {
        itemCost: priceBreakdown.itemPrice / 100, // Convert from paise to rupees
        currency: priceBreakdown.currency,
      },
    };
  }

  /**
   * Get delivery quote (USER APP)
   * Uses real delivery provider APIs for accurate pricing
   */
  async getDeliveryQuote(
    orderId: string,
    userId: string,
    locationDto: DeliveryQuoteDto,
  ) {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to user
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    // Verify order has seller selected
    if (!order.sellerId) {
      throw new BadRequestException(
        'Seller must be selected before getting delivery quote',
      );
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.SELLER_SELECTED) {
      throw new BadRequestException(
        `Order must be in SELLER_SELECTED state. Current state: ${order.status}`,
      );
    }

    // Get seller location
    const seller = await this.sellerRepository.findById(order.sellerId);
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // Get real delivery quote from provider
    try {
      const quote = await this.deliveryService.getQuote(
        {
          latitude: Number(seller.latitude),
          longitude: Number(seller.longitude),
          address: seller.address,
        },
        {
          latitude: locationDto.dropLocation.lat,
          longitude: locationDto.dropLocation.lng,
          address: locationDto.dropLocation.address || 'Delivery Address',
        },
        orderId,
      );

      const deliveryFee = quote.fee;

      // Update order with delivery location and fee
      await this.orderRepository.update(orderId, {
        dropLatitude: locationDto.dropLocation.lat,
        dropLongitude: locationDto.dropLocation.lng,
        dropAddress: locationDto.dropLocation.address,
        deliveryFee: deliveryFee,
      });

      this.logger.log(
        `Real delivery quote for order ${orderId}: ₹${deliveryFee} via ${quote.provider} (${quote.estimatedDurationMinutes}min)`,
      );

      return {
        delivery_fee: deliveryFee,
        provider: quote.provider,
        distance_km: 0, // Not needed with real quotes
      };
    } catch (error) {
      // If delivery quote fails, surface the error - don't guess pricing
      const errorMessage = error instanceof Error ? error.message : 'Failed to get delivery quote';
      this.logger.error(`Failed to get delivery quote for order ${orderId}:`, errorMessage);
      throw new BadRequestException(`Unable to get delivery pricing: ${errorMessage}`);
    }
  }

  /**
   * Confirm order and process payment (USER APP)
   * Creates payment intent - order transitions to PAID via webhook
   *
   * CRITICAL: Does NOT transition order state here.
   * Order state transitions to PAID only after successful payment webhook.
   */
  async confirmOrder(
    orderId: string,
    userId: string,
    paymentDto: ConfirmOrderDto,
  ) {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to user
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.SELLER_SELECTED) {
      throw new BadRequestException(
        `Order must be in SELLER_SELECTED state. Current state: ${order.status}`,
      );
    }

    // Verify seller is set (deliveryFee may be null for self-pickup)
    if (!order.sellerId) {
      throw new BadRequestException('Seller must be selected');
    }

    // Calculate total amount (null deliveryFee = self-pickup, treated as 0)
    const totalAmount = (order.itemCost || 0) + (order.deliveryFee ?? 0);

    // Update order with total amount (if not already set)
    if (!order.totalAmount) {
      await this.orderRepository.update(orderId, {
        totalAmount: totalAmount,
      });
    }

    // Get user info for payment
    const orderWithUser = await this.orderRepository.findById(orderId, false);
    const userPhone = orderWithUser?.user?.phone || '';

    // Create payment intent via PaymentsService
    // Payment method defaults to UPI for MVP
    const paymentMethod = paymentDto.paymentMethod || PaymentMethod.UPI;

    const paymentIntent = await this.paymentsService.createPayment(
      orderId,
      paymentMethod,
      userPhone,
      orderWithUser?.user?.name || undefined,
    );

    this.logger.log(
      `Payment intent created for order ${orderId} by user ${userId}`,
    );

    // Return payment intent - order will transition to PAID via webhook
    return {
      order_id: orderId,
      status: OrderStatus.SELLER_SELECTED, // Still in SELLER_SELECTED until payment succeeds
      total_amount: order.totalAmount || totalAmount,
      payment: {
        payment_id: paymentIntent.payment_id,
        status: paymentIntent.status,
        payment_intent: paymentIntent.payment_intent,
      },
      message:
        'Payment intent created. Complete payment to proceed. Order will transition to PAID after successful payment.',
    };
  }

  /**
   * List orders for seller (SELLER APP)
   */
  async getSellerOrders(userId: string, query: GetSellerOrdersDto) {
    // Get seller by userId
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const orders = await this.orderRepository.findBySellerId(
      seller.id,
      query.status,
    );

    return orders.map((order) => ({
      order_id: order.id,
      status: order.status,
      user: order.user,
      category: order.category,
      orderPayload: order.orderPayload,
      pricing: {
        itemCost: order.itemCost,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  /**
   * Seller accepts order (SELLER APP)
   * Transition: PAID → SELLER_ACCEPTED
   */
  async acceptOrder(orderId: string, userId: string) {
    // Get seller by userId
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const sellerId = seller.id;
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to seller
    if (order.sellerId !== sellerId) {
      throw new BadRequestException('Order does not belong to seller');
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Order must be in PAID state. Current state: ${order.status}`,
      );
    }

    // Transition state: PAID → SELLER_ACCEPTED
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.SELLER_ACCEPTED,
      triggeredBy: sellerId,
      reason: 'Seller accepted the order',
    });

    // Auto-transition to PREPARING (seller starts preparing immediately)
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.PREPARING,
      triggeredBy: sellerId,
      reason: 'Seller started preparing the order',
    });

    this.logger.log(`Order ${orderId} accepted by seller ${sellerId}`);

    return {
      order_id: orderId,
      status: OrderStatus.PREPARING,
    };
  }

  /**
   * Seller rejects order (SELLER APP)
   * Transition: PAID → SELLER_REJECTED
   * Allows fallback to different seller
   */
  async rejectOrder(
    orderId: string,
    userId: string,
    rejectDto: RejectOrderDto,
  ) {
    // Get seller by userId
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const sellerId = seller.id;
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to seller
    if (order.sellerId !== sellerId) {
      throw new BadRequestException('Order does not belong to seller');
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Order must be in PAID state. Current state: ${order.status}`,
      );
    }

    // Update order with rejection reason
    await this.orderRepository.update(orderId, {
      failureReason: rejectDto.reason || 'Seller rejected the order',
      sellerId: null, // Clear seller so user can select different one
    });

    // Transition state: PAID → SELLER_REJECTED
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.SELLER_REJECTED,
      triggeredBy: sellerId,
      reason: rejectDto.reason || 'Seller rejected the order',
    });

    this.logger.log(
      `Order ${orderId} rejected by seller ${sellerId}: ${rejectDto.reason}`,
    );

    return {
      order_id: orderId,
      status: OrderStatus.SELLER_REJECTED,
      message: 'Order rejected. You can select a different seller.',
    };
  }

  /**
   * Seller marks order ready for pickup (SELLER APP)
   * Transition: PREPARING → READY_FOR_PICKUP
   */
  async markReady(orderId: string, userId: string) {
    // Get seller by userId
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const sellerId = seller.id;
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to seller
    if (order.sellerId !== sellerId) {
      throw new BadRequestException('Order does not belong to seller');
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(
        `Order must be in PREPARING state. Current state: ${order.status}`,
      );
    }

    // Transition state: PREPARING → READY_FOR_PICKUP
    // CRITICAL: State machine will automatically enqueue delivery assignment job
    // Do NOT call deliveryService directly - let the queue handle it
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.READY_FOR_PICKUP,
      triggeredBy: sellerId,
      reason: 'Order ready for pickup',
    });

    // Delivery assignment job is automatically enqueued by state machine
    // No need to call deliveryService directly here

    this.logger.log(`Order ${orderId} marked ready by seller ${sellerId}`);

    return {
      order_id: orderId,
      status: OrderStatus.READY_FOR_PICKUP,
      message: 'Order ready for pickup. Delivery assignment has been queued.',
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
