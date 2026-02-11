/**
 * Delivery Service
 *
 * Orchestrates delivery assignment and tracking via delivery adapters.
 * CRITICAL: Never mutates order state directly - all state changes go through Order State Machine.
 * CRITICAL: No provider-specific logic - uses adapter abstraction only.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@repo/types';
import { DeliveryRepository } from './repositories/delivery.repository';
import { DeliveryAdapterRegistry } from './adapters/delivery-adapter.registry';
import { OrderStateMachineService } from '@/orders/state-machine';
import { OrderRepository } from '@/orders/repositories/order.repository';
import {
  DeliveryQuoteRequest,
  CreateTaskRequest,
  DeliveryEvent,
} from './adapters/delivery-adapter.interface';

/**
 * Assign Delivery Response
 */
export interface AssignDeliveryResponse {
  delivery_id: string;
  order_id: string;
  provider: string;
  provider_task_id: string;
  tracking_url?: string;
  status: DeliveryStatus;
  estimated_pickup_time?: Date;
  estimated_delivery_time?: Date;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly adapterRegistry: DeliveryAdapterRegistry,
    private readonly stateMachine: OrderStateMachineService,
    @Inject(forwardRef(() => OrderRepository))
    private readonly orderRepository: OrderRepository,
  ) { }

  /**
   * Assign delivery to order
   *
   * Called when order reaches READY_FOR_PICKUP state.
   * Creates delivery task via adapter and persists delivery record.
   *
   * CRITICAL: Does NOT transition order state - that happens via webhook.
   */
  async assignDelivery(orderId: string): Promise<AssignDeliveryResponse> {
    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verify order is in correct state
    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        `Order must be in READY_FOR_PICKUP state. Current state: ${order.status}`,
      );
    }

    // Verify order has delivery location
    if (
      !order.dropLatitude ||
      !order.dropLongitude ||
      !order.dropAddress
    ) {
      throw new BadRequestException(
        'Order must have delivery location set',
      );
    }

    // Verify order has seller
    if (!order.sellerId) {
      throw new BadRequestException('Order must have seller assigned');
    }

    // Check if delivery already exists
    const existingDelivery = await this.deliveryRepository.findByOrderId(
      orderId,
    );
    if (existingDelivery) {
      this.logger.log(
        `Delivery already exists for order ${orderId}, returning existing delivery`,
      );
      return this.mapToResponse(existingDelivery);
    }

    // Get seller location
    const seller = await this.orderRepository.findById(orderId, true);
    if (!seller?.seller) {
      throw new NotFoundException('Seller not found for order');
    }

    const sellerLat = Number(seller.seller.latitude);
    const sellerLng = Number(seller.seller.longitude);

    // Get default adapter (Uber Direct for MVP)
    const adapter = this.adapterRegistry.getDefaultAdapter();

    // Create delivery task via adapter
    const taskRequest: CreateTaskRequest = {
      orderId,
      pickup: {
        latitude: sellerLat,
        longitude: sellerLng,
        address: seller.seller.address,
      },
      drop: {
        latitude: order.dropLatitude!,
        longitude: order.dropLongitude!,
        address: order.dropAddress!,
      },
    };

    const task = await adapter.createTask(taskRequest);

    // Persist delivery record
    const delivery = await this.deliveryRepository.create({
      orderId,
      providerName: adapter.getProviderName(),
      providerTaskId: task.providerTaskId,
      providerTrackingUrl: task.trackingUrl,
      pickupLatitude: sellerLat,
      pickupLongitude: sellerLng,
      pickupAddress: seller.seller.address,
      dropLatitude: order.dropLatitude!,
      dropLongitude: order.dropLongitude!,
      dropAddress: order.dropAddress!,
    });

    this.logger.log(
      `Delivery assigned for order ${orderId} (provider: ${adapter.getProviderName()}, task: ${task.providerTaskId})`,
    );

    return {
      delivery_id: delivery.id,
      order_id: orderId,
      provider: adapter.getProviderName(),
      provider_task_id: task.providerTaskId,
      tracking_url: task.trackingUrl,
      status: delivery.status,
      estimated_pickup_time: task.estimatedPickupTime,
      estimated_delivery_time: task.estimatedDeliveryTime,
    };
  }

  /**
   * Get delivery quotes from all available providers
   *
   * Fetches quotes from all registered delivery adapters in parallel.
   * Used for displaying multiple delivery options to user.
   * Returns array of quote options sorted by price.
   */
  async getAllQuotes(
    pickup: { latitude: number; longitude: number; address: string },
    drop: { latitude: number; longitude: number; address: string },
    orderId: string,
  ): Promise<
    {
      provider: string;
      estimatedFee: number;
      estimatedDurationMinutes: number;
      quoteId?: string;
      expiresAt?: Date;
    }[]
  > {
    const registeredProviders = this.adapterRegistry.getRegisteredProviders();

    if (!registeredProviders.length) {
      throw new Error('No delivery providers registered');
    }

    // Request quote from adapter
    const quoteRequest: DeliveryQuoteRequest = {
      pickup,
      drop,
      orderId,
    };

    // Fetch quotes from all providers in parallel
    const quotePromises = registeredProviders.map(async (providerName) => {
      try {
        const adapter = this.adapterRegistry.getAdapter(providerName);
        const quote = await adapter.getQuote(quoteRequest);

        this.logger.log(
          `Quote from ${quote.provider}: ₹${quote.estimatedFee} (${quote.estimatedDurationMinutes}min)`,
        );

        return {
          provider: quote.provider,
          estimatedFee: quote.estimatedFee,
          estimatedDurationMinutes: quote.estimatedDurationMinutes,
          quoteId: quote.quoteId,
          expiresAt: quote.expiresAt,
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to get quote from ${providerName}: ${errorMsg}`,
        );
        // Return null for failed providers - they'll be filtered out
        return null;
      }
    });

    const quotes = await Promise.all(quotePromises);

    // Filter out failed providers and sort by price
    const validQuotes = quotes
      .filter((q) => q !== null)
      .sort((a, b) => a!.estimatedFee - b!.estimatedFee);

    if (!validQuotes.length) {
      throw new Error('Failed to fetch delivery quotes from all providers');
    }

    this.logger.log(
      `Delivery quotes for order ${orderId}: ${validQuotes.length} providers available`,
    );

    return validQuotes as any[];
  }

  /**
   * Get delivery quote (LEGACY)
   *
   * Gets delivery cost estimate from default provider only.
   * Kept for backward compatibility.
   * Recommend using getAllQuotes() instead.
   */
  async getQuote(
    pickup: { latitude: number; longitude: number; address: string },
    drop: { latitude: number; longitude: number; address: string },
    orderId: string,
  ): Promise<{ fee: number; provider: string; estimatedDurationMinutes: number }> {
    // Get default adapter (Uber Direct for MVP)
    const adapter = this.adapterRegistry.getDefaultAdapter();

    // Request quote from adapter
    const quoteRequest: DeliveryQuoteRequest = {
      pickup,
      drop,
      orderId,
    };

    const quote = await adapter.getQuote(quoteRequest);

    this.logger.log(
      `Delivery quote for order ${orderId}: ₹${quote.estimatedFee} (${quote.estimatedDurationMinutes}min) via ${quote.provider}`,
    );

    return {
      fee: quote.estimatedFee,
      provider: quote.provider,
      estimatedDurationMinutes: quote.estimatedDurationMinutes,
    };
  }

  /**
   * Handle delivery webhook
   *
   * Processes webhook from delivery provider.
   * CRITICAL: Must be idempotent - duplicate webhooks are safely ignored.
   * NEVER mutates order state directly - uses Order State Machine.
   */
  async handleWebhook(
    payload: Record<string, unknown>,
    signature?: string,
    providerName?: string,
  ): Promise<{
    processed: boolean;
    orderId?: string;
    eventType?: string;
    message: string;
  }> {
    try {
      // Determine provider (default: Uber Direct for MVP)
      const adapter = providerName
        ? this.adapterRegistry.getAdapter(providerName)
        : this.adapterRegistry.getDefaultAdapter();

      // Parse and verify webhook
      const verification = await adapter.parseWebhook(payload, signature);

      if (!verification.valid || !verification.event) {
        this.logger.warn(
          `Invalid delivery webhook: ${verification.error || 'Unknown error'}`,
        );
        return {
          processed: false,
          message: verification.error || 'Invalid webhook',
        };
      }

      const event = verification.event;

      // Find delivery by provider task ID
      let delivery = await this.deliveryRepository.findByProviderTaskId(
        event.providerTaskId,
      );

      if (!delivery) {
        this.logger.warn(
          `Delivery not found for provider task ${event.providerTaskId}`,
        );
        return {
          processed: false,
          message: `Delivery not found for task ${event.providerTaskId}`,
        };
      }

      // IDEMPOTENCY CHECK: If delivery already in same or later state, ignore
      const currentStatus = delivery.status;
      const eventStatus = this.mapEventToDeliveryStatus(event.eventType);

      if (this.isStatusAlreadyProcessed(currentStatus, eventStatus)) {
        this.logger.log(
          `Webhook already processed for delivery ${delivery.id} (current: ${currentStatus}, event: ${eventStatus})`,
        );
        return {
          processed: true,
          orderId: delivery.orderId,
          eventType: event.eventType,
          message: 'Webhook already processed (idempotent)',
        };
      }

      // Update delivery record
      const updateData: any = {
        status: eventStatus,
      };

      if (event.eventType === 'PICKED_UP') {
        updateData.pickedUpAt = event.timestamp;
      } else if (event.eventType === 'DELIVERED') {
        updateData.deliveredAt = event.timestamp;
      } else if (event.eventType === 'FAILED') {
        updateData.failureReason =
          (event.metadata?.reason as string) || 'Delivery failed';
      }

      delivery = await this.deliveryRepository.update(delivery.id, updateData);

      this.logger.log(
        `Delivery webhook processed for order ${delivery.orderId} (event: ${event.eventType}, status: ${eventStatus})`,
      );

      // Handle delivery events - transition order state via state machine
      await this.handleDeliveryEvent(delivery.orderId, event);

      return {
        processed: true,
        orderId: delivery.orderId,
        eventType: event.eventType,
        message: `Delivery ${event.eventType.toLowerCase()}`,
      };
    } catch (error) {
      this.logger.error('Error processing delivery webhook:', error);
      return {
        processed: false,
        message:
          error instanceof Error ? error.message : 'Unknown error processing webhook',
      };
    }
  }

  /**
   * Handle delivery event
   *
   * Transitions order state via Order State Machine based on delivery event.
   * CRITICAL: This is the ONLY place where delivery events trigger state changes.
   */
  private async handleDeliveryEvent(
    orderId: string,
    event: DeliveryEvent,
  ): Promise<void> {
    try {
      // Get order to verify current state
      const order = await this.orderRepository.findById(orderId, false);
      if (!order) {
        this.logger.error(
          `Order ${orderId} not found when processing delivery event`,
        );
        return;
      }

      // Map delivery event to order state transition
      let targetState: OrderStatus | null = null;

      switch (event.eventType) {
        case 'PICKED_UP':
          // PICKED_UP → Order.PICKED_UP
          if (order.status === OrderStatus.READY_FOR_PICKUP) {
            targetState = OrderStatus.PICKED_UP;
          }
          break;

        case 'DELIVERED':
          // DELIVERED → Order.DELIVERED
          if (
            order.status === OrderStatus.READY_FOR_PICKUP ||
            order.status === OrderStatus.PICKED_UP
          ) {
            targetState = OrderStatus.DELIVERED;
          }
          break;

        case 'FAILED':
        case 'CANCELLED':
          // FAILED/CANCELLED → Order.DELIVERY_FAILED
          if (
            order.status === OrderStatus.READY_FOR_PICKUP ||
            order.status === OrderStatus.PICKED_UP
          ) {
            targetState = OrderStatus.DELIVERY_FAILED;
          }
          break;

        case 'IN_TRANSIT':
          // IN_TRANSIT doesn't change order state (order already PICKED_UP)
          this.logger.log(
            `Order ${orderId} in transit (no state change needed)`,
          );
          return;
      }

      // Transition order state if needed
      if (targetState) {
        await this.stateMachine.transition({
          orderId,
          toState: targetState,
          triggeredBy: 'system',
          reason: `Delivery ${event.eventType.toLowerCase()} (provider: ${event.provider})`,
        });

        this.logger.log(
          `Order ${orderId} transitioned to ${targetState} after delivery event ${event.eventType}`,
        );
      } else {
        this.logger.warn(
          `No state transition for order ${orderId} with event ${event.eventType} (current state: ${order.status})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error transitioning order ${orderId} after delivery event:`,
        error,
      );
      // Don't throw - webhook should return success even if state transition fails
      // State can be manually corrected by admin
    }
  }

  /**
   * Map delivery event type to DeliveryStatus
   */
  private mapEventToDeliveryStatus(
    eventType: DeliveryEvent['eventType'],
  ): DeliveryStatus {
    switch (eventType) {
      case 'PICKED_UP':
        return DeliveryStatus.PICKED_UP;
      case 'IN_TRANSIT':
        return DeliveryStatus.IN_TRANSIT;
      case 'DELIVERED':
        return DeliveryStatus.DELIVERED;
      case 'FAILED':
      case 'CANCELLED':
        return DeliveryStatus.FAILED;
      default:
        return DeliveryStatus.PENDING;
    }
  }

  /**
   * Check if status is already processed (idempotency)
   */
  private isStatusAlreadyProcessed(
    currentStatus: DeliveryStatus,
    eventStatus: DeliveryStatus,
  ): boolean {
    // If already in same status, ignore
    if (currentStatus === eventStatus) {
      return true;
    }

    // If already in a later state, ignore
    const statusOrder: DeliveryStatus[] = [
      DeliveryStatus.PENDING,
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.DELIVERED,
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    const eventIndex = statusOrder.indexOf(eventStatus);

    // If current status is later than event status, ignore
    if (currentIndex > eventIndex && currentIndex !== -1 && eventIndex !== -1) {
      return true;
    }

    // If already failed/cancelled and event is not delivered, ignore
    if (
      (currentStatus === DeliveryStatus.FAILED ||
        currentStatus === DeliveryStatus.CANCELLED) &&
      eventStatus !== DeliveryStatus.DELIVERED
    ) {
      return true;
    }

    return false;
  }

  /**
   * Map DeliveryEntity to AssignDeliveryResponse
   */
  private mapToResponse(delivery: any): AssignDeliveryResponse {
    return {
      delivery_id: delivery.id,
      order_id: delivery.orderId,
      provider: delivery.providerName || 'UNKNOWN',
      provider_task_id: delivery.providerTaskId || '',
      tracking_url: delivery.providerTrackingUrl || undefined,
      status: delivery.status,
    };
  }

  /**
   * Validate delivery provider is registered
   * @throws Error if provider not registered
   */
  validateDeliveryProvider(providerName: string): void {
    if (!this.adapterRegistry.hasAdapter(providerName)) {
      const available = this.adapterRegistry.getRegisteredProviders().join(', ');
      throw new Error(
        `Provider ${providerName} not available. Available: ${available}`,
      );
    }
  }

  /**
   * Get quote from specific delivery provider
   * @param providerName - Provider name (e.g., 'UBER_DIRECT', 'DUNZO')
   */
  async getQuoteFromProvider(
    providerName: string,
    pickup: { latitude: number; longitude: number; address: string },
    drop: { latitude: number; longitude: number; address: string },
    orderId: string,
  ): Promise<{ estimatedFee: number; provider: string; estimatedDurationMinutes: number }> {
    // Validate provider
    this.validateDeliveryProvider(providerName);

    // Get adapter for provider
    const adapter = this.adapterRegistry.getAdapter(providerName);

    // Request quote from adapter
    const quoteRequest: DeliveryQuoteRequest = {
      pickup,
      drop,
      orderId,
    };

    const quote = await adapter.getQuote(quoteRequest);

    this.logger.log(
      `Quote from ${providerName} for order ${orderId}: ₹${quote.estimatedFee} (${quote.estimatedDurationMinutes}min)`,
    );

    return {
      estimatedFee: quote.estimatedFee,
      provider: quote.provider,
      estimatedDurationMinutes: quote.estimatedDurationMinutes,
    };
  }

  /**
   * Get all registered delivery providers
   */
  getAvailableProviders(): string[] {
    return this.adapterRegistry.getRegisteredProviders();
  }
}
