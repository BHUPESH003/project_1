/**
 * Dunzo Delivery Adapter - DUMMY Implementation
 *
 * This is a dummy adapter that returns static quotations.
 * Replace with real Dunzo API integration when ready.
 *
 * Dunzo API Reference: https://api.dunzo.com/docs
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
export class DunzoAdapter implements DeliveryAdapter {
  private readonly logger = new Logger(DunzoAdapter.name);
  private readonly PROVIDER_NAME = 'DUNZO';

  /**
   * Get delivery quote from Dunzo
   * DUMMY: Returns static quote based on distance estimation
   */
  async getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    this.logger.log(`[DUMMY] Getting quote from Dunzo for order ${request.orderId}`);

    // Calculate estimated distance (simplified)
    const distance = this.calculateDistance(
      request.pickup.latitude,
      request.pickup.longitude,
      request.drop.latitude,
      request.drop.longitude,
    );

    // DUMMY: Dunzo pricing: Base ₹50 + ₹10/km
    const baseFee = 50;
    const perKmFee = 10;
    const estimatedFee = baseFee + Math.ceil(distance * perKmFee);
    const estimatedDurationMinutes = Math.ceil(15 + distance * 2);

    return {
      provider: this.PROVIDER_NAME,
      estimatedFee,
      estimatedDurationMinutes,
      currency: 'INR',
      quoteId: `dunzo-${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Expires in 5 minutes
    };
  }

  /**
   * Create delivery task on Dunzo
   * DUMMY: Returns success response with mock task ID
   */
  async createTask(request: CreateTaskRequest): Promise<DeliveryTask> {
    this.logger.log(`[DUMMY] Creating task on Dunzo for order ${request.orderId}`);

    const taskId = `dunzo-task-${request.orderId}`;
    const providerTaskId = `DUNZO-${Date.now()}`;

    return {
      taskId,
      providerTaskId,
      status: DeliveryStatus.PENDING,
      trackingUrl: `https://dunzo.com/track/${providerTaskId}`,
      estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000),
      estimatedDeliveryTime: new Date(Date.now() + 40 * 60 * 1000),
    };
  }

  /**
   * Cancel delivery task on Dunzo
   * DUMMY: Returns success response
   */
  async cancelTask(request: CancelTaskRequest): Promise<void> {
    this.logger.log(
      `[DUMMY] Cancelling task ${request.providerTaskId} on Dunzo`,
    );
    // Dummy implementation - no actual API call
  }

  /**
   * Parse webhook payload from Dunzo
   * DUMMY: Returns normalized event
   */
  async parseWebhook(
    payload: DeliveryWebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    this.logger.log('[DUMMY] Parsing Dunzo webhook');

    try {
      // Dummy webhook verification - always pass
      if (!signature) {
        this.logger.warn('No signature provided for Dunzo webhook');
        // Still valid for dummy, but log warning
      }

      // Dummy webhook parsing
      const eventType = (payload.status as string)?.toUpperCase() || 'PENDING';

      const event: DeliveryEvent = {
        provider: this.PROVIDER_NAME,
        providerTaskId: (payload.task_id as string) || 'unknown',
        eventType: this.mapEventType(eventType),
        timestamp: new Date(payload.timestamp as string || Date.now()),
      };

      return {
        valid: true,
        event,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to parse webhook',
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
   * Map Dunzo event types to normalized event types
   */
  private mapEventType(
    eventType: string,
  ): 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'IN_TRANSIT' {
    const eventMap: Record<
      string,
      'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'IN_TRANSIT'
    > = {
      'PICKUP_COMPLETE': 'PICKED_UP',
      'PICKED_UP': 'PICKED_UP',
      'COMPLETED': 'DELIVERED',
      'DELIVERED': 'DELIVERED',
      'FAILED': 'FAILED',
      'CANCELLED': 'CANCELLED',
      'IN_TRANSIT': 'IN_TRANSIT',
      'OUT_FOR_DELIVERY': 'IN_TRANSIT',
    };

    return eventMap[eventType] || 'IN_TRANSIT';
  }
}
