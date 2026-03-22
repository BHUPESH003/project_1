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
  ForbiddenException,
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
import { DeliveryPartnerRepository } from '@/delivery/repositories/delivery-partner.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { QueueService } from '@/queue/queue.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  CreateBatchOrdersDto,
  CreateBatchOrdersResponseDto,
  BatchOrderResult,
} from './dto/create-batch-orders.dto';
import { SelectSellerDto } from './dto/select-seller.dto';
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
    private readonly deliveryPartnerRepository: DeliveryPartnerRepository,
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create draft order (USER APP)
   * State: CREATED
   *
   * Recommended flow:
   * 1. GET /sellers (discover sellers)
   * 2. GET /sellers/:sellerId/products (view seller products)
   * 3. POST /orders with sellerId (create order with pre-selected seller)
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Get category handler (NO if/else by category)
    const handler = this.categoryRegistry.getHandler(createOrderDto.categoryId);

    // Validate payload using handler
    const validation = handler.validatePayload(createOrderDto.orderPayload);
    if (!validation.valid) {
      throw new BadRequestException(
        validation.error || 'Invalid order payload',
      );
    }

    // Enrich order items with product details from database
    let enrichedPayload = (validation.normalizedPayload ||
      createOrderDto.orderPayload) as any;
    let itemCost = 0;
    let sellerId: string | null = createOrderDto.sellerId || null;

    if (
      enrichedPayload &&
      enrichedPayload.items &&
      Array.isArray(enrichedPayload.items)
    ) {
      const enrichedItems = [];

      for (const item of enrichedPayload.items) {
        try {
          // Fetch product details by productId
          if (!item.productId) {
            throw new BadRequestException(`Item must have a productId`);
          }

          const product = await this.prismaService.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }

          // Validate all products are from the same seller
          if (!sellerId) {
            sellerId = product.sellerId;
          } else if (product.sellerId !== sellerId) {
            throw new BadRequestException(
              `All products must be from the same seller. Found products from different sellers.`,
            );
          }

          // Calculate price and total
          const price = Number(product.price);
          const quantity = item.quantity || 1;
          const totalPrice = price * quantity;

          // Store seller ID from first item
          if (!sellerId) {
            sellerId = product.sellerId;
          }

          // Add to item cost
          itemCost += totalPrice;

          // Enrich item with product details
          enrichedItems.push({
            productId: item.productId,
            name: product.name,
            quantity,
            price,
            totalPrice,
          });
        } catch (error) {
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException
          ) {
            throw error;
          }
          this.logger.error(
            `Error enriching item with productId ${item.productId}:`,
            error,
          );
          throw new BadRequestException(
            `Could not fetch product details for ${item.productId}`,
          );
        }
      }
      this.logger.log(`Enriched ${enrichedItems.length} items. Total Cost: ${itemCost}`);
 
      enrichedPayload = {
        ...enrichedPayload,
        items: enrichedItems,
      };
      this.logger.log(`Enriched Payload Items: ${enrichedPayload.items?.length || 0}`);
    }

    // Ensure category exists in DB (auto-create if dynamically generated)
    try {
      await this.prismaService.prisma.category.upsert({
        where: { id: createOrderDto.categoryId },
        update: {},
        create: {
          id: createOrderDto.categoryId,
          name: createOrderDto.categoryId
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          status: 'ACTIVE',
          description: `Auto-generated category for ${createOrderDto.categoryId}`,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Could not auto-create category ${createOrderDto.categoryId}: ${err}`,
      );
    }

    // Create order with enriched payload
    const order = await this.orderRepository.create({
      userId,
      categoryId: createOrderDto.categoryId,
      orderPayload: enrichedPayload,
    });

    // Get user's delivery address (first address or default)
    let dropLatitude: number | null = null;
    let dropLongitude: number | null = null;
    let dropAddress: string | null = null;

    // Check if drop location is provided in orderPayload
    if (
      enrichedPayload &&
      enrichedPayload.dropLatitude &&
      enrichedPayload.dropLongitude
    ) {
      dropLatitude = enrichedPayload.dropLatitude;
      dropLongitude = enrichedPayload.dropLongitude;
      dropAddress = enrichedPayload.dropAddress || null;
      this.logger.log(
        `Using drop location from order payload: lat=${dropLatitude}, lng=${dropLongitude}`,
      );
    } else {
      // Try to fetch from user address table if not provided
      try {
        const userAddress =
          await this.prismaService.prisma.userAddress.findFirst({
            where: { userId },
          });

        if (userAddress) {
          dropLatitude = userAddress.latitude
            ? Number(userAddress.latitude)
            : null;
          dropLongitude = userAddress.longitude
            ? Number(userAddress.longitude)
            : null;
          dropAddress = userAddress.addressLine || null;
          this.logger.log(
            `Using drop location from user address table: lat=${dropLatitude}, lng=${dropLongitude}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch user address for order ${order.id}`,
          error,
        );
      }
    }

    // Update order with calculated values
    if (
      sellerId ||
      itemCost > 0 ||
      dropLatitude ||
      dropLongitude ||
      dropAddress
    ) {
      await this.orderRepository.update(order.id, {
        sellerId: sellerId || undefined,
        itemCost: itemCost > 0 ? itemCost : undefined,
        dropLatitude: dropLatitude || undefined,
        dropLongitude: dropLongitude || undefined,
        dropAddress: dropAddress || undefined,
      });
    }

    // Record initial state in history
    await this.stateMachine.recordInitialState(
      order.id,
      OrderStatus.CREATED,
      userId,
    );

    // Auto-select seller if inferred or provided (skip explicit selectSeller step)
    if (sellerId) {
      try {
        await this.selectSeller(order.id, userId, { sellerId });
        // Retrieve updated order so we return the latest status
        const updatedOrder = await this.orderRepository.findById(
          order.id,
          false,
        );
        if (updatedOrder) {
          order.status = updatedOrder.status;
          order.itemCost = updatedOrder.itemCost;
          order.sellerId = updatedOrder.sellerId;
        }
      } catch (err: any) {
        this.logger.error(
          `Auto-select seller failed for order ${order.id}: ${err.message}`,
        );
        throw err;
      }
    }

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
   * Create multiple orders in batch (for multi-cart combined checkout)
   * Processes each order independently in parallel using Promise.all()
   * Each order gets its own transaction and state machine
   * On partial failure: some orders may succeed while others fail
   * User clears only successful carts from frontend
   */
  async createBatch(
    userId: string,
    createBatchOrdersDto: CreateBatchOrdersDto,
  ): Promise<CreateBatchOrdersResponseDto> {
    const results: BatchOrderResult[] = [];

    // Process all orders in parallel
    const orderPromises = createBatchOrdersDto.orders.map(async (orderDto) => {
      try {
        // Create individual order using existing create() method
        const result = await this.create(userId, orderDto);

        return {
          sellerId: orderDto.sellerId || 'unknown',
          orderId: result.order_id,
          status: 'success' as const,
        };
      } catch (error: any) {
        const errorMsg =
          error?.message || 'Unknown error during order creation';

        this.logger.error(
          `Batch order creation failed for seller ${orderDto.sellerId}:`,
          error,
        );

        return {
          sellerId: orderDto.sellerId || 'unknown',
          orderId: '',
          status: 'failed' as const,
          error: errorMsg,
        };
      }
    });

    // Wait for all to settle (Promise.all fails on first error, so use allSettled)
    const settledResults = await Promise.allSettled(orderPromises);

    // Extract results
    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        results.push({
          sellerId: 'unknown',
          orderId: '',
          status: 'failed',
          error: settledResult.reason?.message || 'Order creation failed',
        });
      }
    }

    // Calculate summary stats
    const successCount = results.filter((r) => r.status === 'success').length;
    const failureCount = results.length - successCount;

    this.logger.log(
      `Batch order creation completed: ${successCount} success, ${failureCount} failed out of ${results.length} total`,
    );

    return {
      results,
      totalProcessed: results.length,
      successCount,
      failureCount,
    };
  }

  /**
   * Update order items and location
   * Can only update draft orders (status = CREATED or SELLER_SELECTED)
   * Items array is replaced entirely (not merged)
   */
  async update(orderId: string, userId: string, updateOrderDto: any) {
    // Fetch existing order
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }

    // Only allow updates on draft orders
    const allowedStatuses = [OrderStatus.CREATED, OrderStatus.SELLER_SELECTED];
    if (!allowedStatuses.includes(order.status as any)) {
      throw new BadRequestException(
        `Cannot update order in ${order.status} status. Only draft orders can be updated.`,
      );
    }

    const updatedPayload = { ...(order.orderPayload as any) };
    let newItemCost = 0;

    // Update items if provided
    if (updateOrderDto.items && Array.isArray(updateOrderDto.items)) {
      const enrichedItems = [];

      for (const item of updateOrderDto.items) {
        try {
          if (!item.productId) {
            throw new BadRequestException(`Item must have a productId`);
          }

          // Fetch product details
          const product = await this.prismaService.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }

          // Validate seller matches original
          if (product.sellerId !== order.sellerId) {
            throw new BadRequestException(
              `Product ${item.productId} is from different seller. All products must be from ${order.sellerId}`,
            );
          }

          // Calculate price and total
          const price = Number(product.price);
          const quantity = item.quantity || 1;
          const totalPrice = price * quantity;

          newItemCost += totalPrice;

          enrichedItems.push({
            productId: item.productId,
            name: product.name,
            quantity,
            price,
            totalPrice,
          });
        } catch (error) {
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException
          ) {
            throw error;
          }
          this.logger.error(
            `Error enriching item with productId ${item.productId}:`,
            error,
          );
          throw new BadRequestException(
            `Could not fetch product details for ${item.productId}`,
          );
        }
      }

      updatedPayload.items = enrichedItems;
    }

    // Update notes if provided
    if (updateOrderDto.notes !== undefined) {
      updatedPayload.notes = updateOrderDto.notes;
    }

    // Update location fields
    const updateData: any = {
      orderPayload: updatedPayload,
    };

    if (newItemCost > 0) {
      updateData.itemCost = newItemCost;
    }

    if (updateOrderDto.dropLatitude !== undefined) {
      updateData.dropLatitude = updateOrderDto.dropLatitude;
    }

    if (updateOrderDto.dropLongitude !== undefined) {
      updateData.dropLongitude = updateOrderDto.dropLongitude;
    }

    if (updateOrderDto.dropAddress !== undefined) {
      updateData.dropAddress = updateOrderDto.dropAddress;
    }

    if (updateOrderDto.deliveryFee !== undefined) {
      updateData.deliveryFee = updateOrderDto.deliveryFee;
    }

    // Update order
    const updatedOrder = await this.orderRepository.update(orderId, updateData);

    this.logger.log(`Order ${orderId} updated by user ${userId}`);

    return {
      order_id: updatedOrder.id,
      status: updatedOrder.status,
      message: 'Order updated successfully',
    };
  }

  /**
   * List orders for current user (USER APP) – orders history
   */
  async findAllForUser(userId: string) {
    const orders = await this.orderRepository.findByUserId(userId);
    this.logger.log(`Found ${orders.length} orders for user ${userId}`);
    return orders.map((order) => {
      const items = (order.orderPayload as any)?.items || [];
      this.logger.log(`Order ${order.id}: ${items.length} items. First item: ${items[0]?.name || 'N/A'}`);
      return {
        order_id: order.id,
        status: order.status,
        items: items,
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
      };
    });
  }

  /**
   * Get order details for tracking
   */
  async findOne(orderId: string) {
    const order = await this.orderRepository.findById(orderId, true);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
 
    const items = (order.orderPayload as any)?.items || [];
    this.logger.log(`Order Detail fetched: ${orderId}, items: ${items.length}, itemCost: ${order.itemCost}`);

    return {
      order_id: order.id,
      status: order.status,
      items: items,
      seller: order.seller
        ? {
            id: order.seller.id,
            shopName: order.seller.shopName,
            address: order.seller.address,
          }
        : null,
      delivery:
        order.status === OrderStatus.READY_FOR_PICKUP ||
        order.status === OrderStatus.PICKED_UP ||
        order.status === OrderStatus.DELIVERED
          ? {
              status: order.delivery?.status || 'pending',
              providerName: order.delivery?.providerName || null,
              trackingUrl: order.delivery?.providerTrackingUrl || null,
            }
          : null,
      pricing: {
        itemCost: order.itemCost,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      stateHistory: (order.stateHistory ?? []).map(
        (h: {
          id: string;
          fromStatus: string | null;
          toStatus: string;
          triggeredBy: string | null;
          reason: string | null;
          createdAt: Date;
        }) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          triggeredBy: h.triggeredBy,
          reason: h.reason,
          createdAt: h.createdAt,
        }),
      ),
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
      throw new BadRequestException('Seller is not available (must be ONLINE)');
    }

    // Verify seller supports this category (auto-link if missing)
    const sellerCategories =
      seller.categories?.map((sc) => sc.category.id) || [];
    if (!sellerCategories.includes(order.categoryId)) {
      // Auto-link the category to the seller if not already linked
      try {
        await this.prismaService.prisma.sellerCategory.upsert({
          where: {
            sellerId_categoryId: {
              sellerId: sellerDto.sellerId,
              categoryId: order.categoryId,
            },
          },
          update: {},
          create: {
            sellerId: sellerDto.sellerId,
            categoryId: order.categoryId,
          },
        });
        this.logger.log(
          `Auto-linked category ${order.categoryId} to seller ${sellerDto.sellerId}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to auto-link category ${order.categoryId} to seller: ${err}`,
        );
        throw new BadRequestException(
          `Seller does not support category ${order.categoryId}. Please select a different seller.`,
        );
      }
    }

    // Get category handler to calculate price
    const handler = this.categoryRegistry.getHandler(order.categoryId);

    // Fetch full seller from Prisma for pricing (handler needs Prisma Seller type)
    const sellerForPricing = await this.sellerRepository.findById(
      seller.id,
      false,
    );
    if (!sellerForPricing) {
      throw new NotFoundException('Seller not found for pricing');
    }

    // Convert SellerEntity to Prisma Seller format for handler
    // Handler only needs id and pricePerPage (as Decimal)
    const prismaSeller = {
      id: sellerForPricing.id,
      pricePerPage: sellerForPricing.pricePerPage,
    } as any; // Type assertion - handler will extract what it needs

    const priceBreakdown = handler.calculatePrice(
      order.orderPayload,
      prismaSeller,
    );

    // Update order with seller and pricing
    await this.orderRepository.update(orderId, {
      sellerId: sellerDto.sellerId,
      itemCost: priceBreakdown.itemPrice / 100, // Convert from paise to rupees
    });

    // Transition state: CREATED → SELLER_SELECTED (or stay in SELLER_SELECTED if changing seller)
    // This allows users to change their selected seller before payment
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.SELLER_SELECTED,
      triggeredBy: userId,
      reason: 'User selected seller',
    });

    this.logger.log(`Order ${orderId} seller selected: ${sellerDto.sellerId}`);

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
  /**
   * Get all available delivery quotes for an order (USER APP)
   * 
   * Dynamically calculates quotes based on:
   * - Seller pickup location (from order.sellerId)
   * - User drop location (from order.dropLatitude/dropLongitude or user address table)
   * 
   * Returns all available delivery partner options with pricing and ETAs
   */
  async getDeliveryQuotes(orderId: string, userId: string) {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order belongs to user
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    // Verify seller is selected
    if (!order.sellerId) {
      throw new BadRequestException(
        'Seller must be selected before getting delivery quotes',
      );
    }

    // Get seller for pickup location
    const seller = await this.sellerRepository.findById(order.sellerId);
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // Get user drop location - from order or user address table
    let dropLatitude: number | null = null;
    let dropLongitude: number | null = null;
    let dropAddress: string | null = null;

    if (order.dropLatitude && order.dropLongitude && order.dropAddress) {
      // Use stored location from order
      dropLatitude = Number(order.dropLatitude);
      dropLongitude = Number(order.dropLongitude);
      dropAddress = order.dropAddress;
    } else {
      // Try to fetch from user address table
      try {
        const userAddress =
          await this.prismaService.prisma.userAddress.findFirst({
            where: { userId },
          });
        if (userAddress && userAddress.latitude && userAddress.longitude) {
          dropLatitude = Number(userAddress.latitude);
          dropLongitude = Number(userAddress.longitude);
          dropAddress = userAddress.addressLine || null;
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch user address for order ${orderId}:`,
          error,
        );
      }
    }

    // Require drop location to calculate quotes
    if (!dropLatitude || !dropLongitude) {
      throw new BadRequestException(
        'User delivery address is required. Please provide delivery location to get quotes.',
      );
    }

    // Get quotes from all available delivery providers
    try {
      const allQuotes = await this.deliveryService.getAllQuotes(
        {
          latitude: Number(seller.latitude),
          longitude: Number(seller.longitude),
          address: seller.address,
        },
        {
          latitude: dropLatitude,
          longitude: dropLongitude,
          address: dropAddress || 'Delivery Address',
        },
        orderId,
      );

      // Update order with delivery location (if not already set)
      if (!order.dropLatitude || !order.dropLongitude) {
        await this.orderRepository.update(orderId, {
          dropLatitude,
          dropLongitude,
          dropAddress: dropAddress || undefined,
        });
      }

      // Transform to response format
      const options = allQuotes.map((quote) => ({
        provider: quote.provider,
        displayName: this.getProviderDisplayName(quote.provider),
        estimatedFee: quote.estimatedFee,
        estimatedDurationMinutes: quote.estimatedDurationMinutes,
        currency: 'INR',
        quoteId: quote.quoteId,
        expiresAt: quote.expiresAt,
        rating: this.getProviderRating(quote.provider),
        vehicleOptions: quote.vehicleOptions,
      }));

      // Sort by fee (cheapest first)
      options.sort((a, b) => a.estimatedFee - b.estimatedFee);

      this.logger.log(
        `Delivery quotes for order ${orderId}: ${options.length} providers available`,
      );

      return {
        order_id: orderId,
        pickup_location: {
          latitude: Number(seller.latitude),
          longitude: Number(seller.longitude),
          address: seller.address || 'Pickup Location',
        },
        drop_location: {
          latitude: dropLatitude,
          longitude: dropLongitude,
          address: dropAddress || 'Delivery Address',
        },
        providers: options,
        cheapest: options.length > 0 ? options[0] : null,
        total_options: options.length,
        message: `${options.length} delivery options available. Select your preferred provider.`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get delivery quotes';
      this.logger.error(
        `Failed to get delivery quotes for order ${orderId}:`,
        errorMessage,
      );
      throw new BadRequestException(
        `Unable to get delivery quotes: ${errorMessage}`,
      );
    }
  }

  // ===== HELPER METHODS =====

  private getProviderDisplayName(provider: string): string {
    const nameMap: Record<string, string> = {
      UBER_DIRECT: 'Uber Direct',
      DUNZO: 'Dunzo',
      PORTER: 'Porter',
    };
    return nameMap[provider] || provider;
  }

  private getProviderLogoUrl(provider: string): string {
    const logoMap: Record<string, string> = {
      UBER_DIRECT:
        'https://www.uber-cdn.com/image/upload/c_auto,f_auto,q_auto:eco/v1/202307-1604950057.png',
      DUNZO: 'https://cdn.dunzo.com/static/logo-white.png',
      PORTER: 'https://porter.in/assets/logo.png',
    };
    return logoMap[provider] || '';
  }

  private getProviderRating(provider: string): number {
    const ratingMap: Record<string, number> = {
      UBER_DIRECT: 4.8,
      DUNZO: 4.7,
      PORTER: 4.6,
    };
    return ratingMap[provider] || 4.5;
  }

  private getProviderFeatures(provider: string): string[] {
    const featuresMap: Record<string, string[]> = {
      UBER_DIRECT: [
        'Real-time tracking',
        'Insurance coverage',
        'Professional delivery',
        'GPS enabled',
      ],
      DUNZO: [
        'Fast delivery',
        'Local coverage',
        'Same-day service',
        'Affordable pricing',
      ],
      PORTER: [
        'Premium service',
        'Insured delivery',
        'Real-time updates',
        'Wide coverage area',
      ],
    };
    return featuresMap[provider] || [];
  }

  /**
   * Create payment intent (USER APP)
   * Generates payment data for Razorpay or specified provider
   * Does NOT transition order state
   *
   * Supports: razorpay, paytm
   */
  async createPaymentIntent(
    orderId: string,
    userId: string,
    provider?: string,
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

    // Verify seller is set
    if (!order.sellerId) {
      throw new BadRequestException('Seller must be selected');
    }

    // Calculate total amount
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

    // Create payment intent with specified provider (defaults to configured provider)
    const paymentIntent = await this.paymentsService.createPayment(
      orderId,
      PaymentMethod.UPI,
      userPhone,
      orderWithUser?.user?.name || undefined,
      provider,
    );

    this.logger.log(
      `Payment intent created for order ${orderId} by user ${userId} using provider: ${provider || 'default'}`,
    );

    return {
      payment_id: paymentIntent.payment_id,
      order_id: orderId,
      amount: totalAmount,
      status: paymentIntent.status,
      payment_intent: paymentIntent.payment_intent,
    };
  }

  /**
   * Verify payment and transition order to PAID (USER APP)
   *
   * CRITICAL: This endpoint should be called after frontend completes payment gateway flow.
   * Verifies payment with provider and transitions order to PAID.
   * Order will then transition to SELLER_ACCEPTED via webhook if seller accepted
   * or back to SELLER_SELECTED if seller needs to accept again.
   */
  async verifyPayment(
    orderId: string,
    userId: string,
    paymentData: Record<string, unknown>,
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

    // Extract gateway payment data and verify with provider
    const razorpayPaymentId = paymentData.razorpay_payment_id as string;
    const razorpayOrderId = paymentData.razorpay_order_id as string;
    const razorpaySignature = paymentData.razorpay_signature as string;

    if (!razorpayPaymentId || !razorpayOrderId) {
      throw new BadRequestException('Payment verification data is incomplete');
    }

    // Verify payment with payments service using Razorpay provider
    const verifyResult = await this.paymentsService.verifyRazorpayPayment(
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    );

    if (verifyResult.status !== 'SUCCESS') {
      throw new BadRequestException(
        `Payment verification failed: ${verifyResult.failure_reason || 'Unknown reason'}`,
      );
    }

    this.logger.log(
      `Payment verified for order ${orderId}, transitioned to PAID`,
    );

    // Fetch and return updated order
    const updatedOrder = await this.orderRepository.findById(orderId, true);
    return {
      payment_id: razorpayPaymentId,
      order_id: orderId,
      status: updatedOrder?.status || OrderStatus.PAID,
      gateway_payment_id: razorpayPaymentId,
      gateway_order_id: razorpayOrderId,
      amount: order.totalAmount,
    };
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
