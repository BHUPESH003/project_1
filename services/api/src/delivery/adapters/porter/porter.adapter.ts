/**
 * Porter Delivery Adapter - DUMMY Implementation
 *
 * This is a dummy adapter that returns static quotations.
 * Replace with real Porter API integration when ready.
 *
 * Porter API Reference: https://porter.in/developers
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  DeliveryAdapter,
  DeliveryQuote,
  CreateTaskRequest,
  DeliveryTask,
  CancelTaskRequest,
  DeliveryWebhookPayload,
  DeliveryEvent,
  DeliveryQuoteRequest,
  WebhookVerificationResult,
} from '../delivery-adapter.interface';
import { DeliveryStatus } from '@repo/types';

@Injectable()
export class PorterAdapter implements DeliveryAdapter {
  private readonly logger = new Logger(PorterAdapter.name);
  private readonly PROVIDER_NAME = 'PORTER';

  /**
   * Get delivery quote from Porter
   * DUMMY: Returns static quote based on distance estimation
   */
  async getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    this.logger.log(
      `[DUMMY] Getting quote from Porter for order ${request.orderId}`,
    );

    // Calculate estimated distance (simplified)
    const distance = this.calculateDistance(
      request.pickup.latitude,
      request.pickup.longitude,
      request.drop.latitude,
      request.drop.longitude,
    );

    // DUMMY: Porter pricing: Base ₹60 + ₹12/km (slightly premium)
    const baseFee = 60;
    const perKmFee = 12;
    const estimatedDistanceFee = Math.ceil(distance * perKmFee);

    // Bike: base
    const bikeFee = baseFee + estimatedDistanceFee;
    const bikeMinutes = Math.ceil(12 + distance * 1.8);

    // Mini Truck/Van: Base * 1.5
    const vanFee = Math.ceil(bikeFee * 1.5);
    const vanMinutes = Math.ceil(12 + distance * 2.2);

    // Large Truck: Base * 2.5
    const truckFee = Math.ceil(bikeFee * 2.5);
    const truckMinutes = Math.ceil(12 + distance * 2.8);

    return {
      provider: this.PROVIDER_NAME,
      estimatedFee: bikeFee, // Keep cheapest as default
      estimatedDurationMinutes: bikeMinutes,
      currency: 'INR',
      quoteId: `porter-${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Expires in 5 minutes
      vehicleOptions: [
        {
          vehicleType: 'bike',
          estimatedFee: bikeFee,
          estimatedDurationMinutes: bikeMinutes,
        },
        {
          vehicleType: 'van',
          estimatedFee: vanFee,
          estimatedDurationMinutes: vanMinutes,
        },
        {
          vehicleType: 'truck',
          estimatedFee: truckFee,
          estimatedDurationMinutes: truckMinutes,
        },
      ],
    };
  }

  /**
   * Create delivery task on Porter
   * DUMMY: Returns success response with mock task ID
   */
  async createTask(request: CreateTaskRequest): Promise<DeliveryTask> {
    this.logger.log(
      `[DUMMY] Creating task on Porter for order ${request.orderId}`,
    );

    const taskId = `porter-task-${request.orderId}`;
    const providerTaskId = `PORTER-${Date.now()}`;

    return {
      taskId,
      providerTaskId,
      status: DeliveryStatus.PENDING,
      trackingUrl: `https://porter.in/track/${providerTaskId}`,
      estimatedPickupTime: new Date(Date.now() + 8 * 60 * 1000),
      estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000),
    };
  }

  /**
   * Cancel delivery task on Porter
   * DUMMY: Returns success response
   */
  async cancelTask(request: CancelTaskRequest): Promise<void> {
    this.logger.log(
      `[DUMMY] Cancelling task ${request.providerTaskId} on Porter`,
    );
    // Dummy implementation - no actual API call
  }

  /**
   * Parse webhook payload from Porter
   * DUMMY: Returns normalized event
   */
  async parseWebhook(
    payload: DeliveryWebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    this.logger.log('[DUMMY] Parsing Porter webhook');

    try {
      // Dummy webhook verification - always pass
      if (!signature) {
        this.logger.warn('No signature provided for Porter webhook');
        // Still valid for dummy, but log warning
      }

      // Dummy webhook parsing
      const eventType = (payload.event as string)?.toUpperCase() || 'PENDING';

      const event: DeliveryEvent = {
        provider: this.PROVIDER_NAME,
        providerTaskId: (payload.delivery_id as string) || 'unknown',
        eventType: this.mapEventType(eventType),
        timestamp: new Date((payload.created_at as string) || Date.now()),
      };

      return {
        valid: true,
        event,
      };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : 'Failed to parse webhook',
      };
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.PROVIDER_NAME;
  }

  // ===== HELPERS =====

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Map Porter event types to normalized event types
   */
  private mapEventType(
    eventType: string,
  ): 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'IN_TRANSIT' {
    const eventMap: Record<
      string,
      'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'IN_TRANSIT'
    > = {
      PICKED_UP: 'PICKED_UP',
      PICKUP_COMPLETED: 'PICKED_UP',
      DELIVERED: 'DELIVERED',
      DELIVERY_COMPLETED: 'DELIVERED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      IN_TRANSIT: 'IN_TRANSIT',
      OUT_FOR_DELIVERY: 'IN_TRANSIT',
    };

    return eventMap[eventType] || 'IN_TRANSIT';
  }
}
