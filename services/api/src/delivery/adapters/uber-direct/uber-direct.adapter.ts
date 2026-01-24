/**
 * Uber Direct Adapter
 *
 * Implements DeliveryAdapter interface for Uber Direct.
 * Handles Uber Direct-specific delivery logic while maintaining abstraction.
 *
 * CRITICAL RULES:
 * - Never mutates order state directly
 * - All order state changes go through Order State Machine
 * - Webhook verification must be idempotent
 * - Uber-specific fields must NOT leak outside this adapter
 *
 * Reference: Uber Direct Postman collection
 * TODO: Integrate with real Uber Direct SDK when available
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus } from '@repo/types';
import {
  DeliveryAdapter,
  DeliveryQuoteRequest,
  DeliveryQuote,
  CreateTaskRequest,
  DeliveryTask,
  CancelTaskRequest,
  DeliveryWebhookPayload,
  WebhookVerificationResult,
  DeliveryEvent,
} from '../delivery-adapter.interface';
import * as crypto from 'crypto';

/**
 * Uber Direct Configuration
 */
interface UberDirectConfig {
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookSecret: string;
}

/**
 * Uber Direct Adapter
 *
 * Implements Uber Direct delivery integration.
 * Sprint 3: MVP implementation with webhook support.
 */
@Injectable()
export class UberDirectAdapter implements DeliveryAdapter {
  private readonly logger = new Logger(UberDirectAdapter.name);
  private readonly config: UberDirectConfig;

  constructor(private readonly configService: ConfigService) {
    // Load Uber Direct configuration from environment
    this.config = {
      apiKey:
        this.configService.get<string>('UBER_DIRECT_API_KEY') ||
        'TEST_API_KEY',
      apiSecret:
        this.configService.get<string>('UBER_DIRECT_API_SECRET') ||
        'TEST_API_SECRET',
      environment:
        (this.configService.get<'sandbox' | 'production'>(
          'UBER_DIRECT_ENVIRONMENT',
        ) as 'sandbox' | 'production') || 'sandbox',
      baseUrl:
        this.configService.get<string>('UBER_DIRECT_BASE_URL') ||
        'https://api.uber.com/v1/customers',
      webhookSecret:
        this.configService.get<string>('UBER_DIRECT_WEBHOOK_SECRET') ||
        'TEST_WEBHOOK_SECRET',
    };

    this.logger.log(
      `UberDirectAdapter initialized (${this.config.environment} environment)`,
    );
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'UBER_DIRECT';
  }

  /**
   * Get delivery quote
   *
   * Calls Uber Direct API to get delivery quote.
   * Reference: Uber Direct Postman collection - Get Quote endpoint
   */
  async getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    // In production, this would call Uber Direct API:
    // POST /v1/customers/{customer_id}/delivery_quotes
    // {
    //   "pickup": { "latitude": ..., "longitude": ... },
    //   "dropoff": { "latitude": ..., "longitude": ... }
    // }

    // Calculate distance for quote estimation
    const distance = this.calculateDistance(
      request.pickup.latitude,
      request.pickup.longitude,
      request.drop.latitude,
      request.drop.longitude,
    );

    // Stubbed pricing: ₹30 base + ₹5 per km (similar to Sprint 2)
    const estimatedFee = Math.max(30, 30 + distance * 5);
    const estimatedDurationMinutes = Math.ceil(distance * 3); // ~3 min per km

    this.logger.log(
      `Quote generated for order ${request.orderId}: ₹${estimatedFee} (${distance}km, ${estimatedDurationMinutes}min)`,
    );

    return {
      provider: this.getProviderName(),
      estimatedFee,
      estimatedDurationMinutes,
      currency: 'INR',
      quoteId: `QUOTE_${request.orderId}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  /**
   * Create delivery task
   *
   * Creates a delivery task with Uber Direct.
   * Reference: Uber Direct Postman collection - Create Delivery endpoint
   */
  async createTask(request: CreateTaskRequest): Promise<DeliveryTask> {
    // Validate request
    if (!request.pickup || !request.drop) {
      throw new BadRequestException('Pickup and drop locations are required');
    }

    // In production, this would call Uber Direct API:
    // POST /v1/customers/{customer_id}/deliveries
    // {
    //   "pickup": { "latitude": ..., "longitude": ..., "address": ... },
    //   "dropoff": { "latitude": ..., "longitude": ..., "address": ... },
    //   "quote_id": ... (if quote was obtained)
    // }

    // Generate provider task ID (stubbed - will be real ID from Uber in production)
    const providerTaskId = `UBER_${request.orderId}_${Date.now()}`;

    this.logger.log(
      `Delivery task created for order ${request.orderId} (Uber task: ${providerTaskId})`,
    );

    return {
      taskId: request.orderId, // Internal task ID (order ID)
      providerTaskId,
      status: DeliveryStatus.ASSIGNED,
      trackingUrl: `https://uber.com/track/${providerTaskId}`, // Stubbed
      estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    };
  }

  /**
   * Cancel delivery task
   *
   * Cancels an active delivery task with Uber Direct.
   * Reference: Uber Direct Postman collection - Cancel Delivery endpoint
   */
  async cancelTask(request: CancelTaskRequest): Promise<void> {
    // In production, this would call Uber Direct API:
    // POST /v1/customers/{customer_id}/deliveries/{delivery_id}/cancel

    this.logger.log(
      `Delivery task cancelled: ${request.providerTaskId} (reason: ${request.reason || 'No reason provided'})`,
    );

    // Stubbed - in production, this would actually cancel the task with Uber
  }

  /**
   * Parse and verify webhook payload
   *
   * Verifies webhook signature and extracts delivery event.
   * Must be idempotent - duplicate webhooks are safely ignored.
   *
   * Reference: Uber Direct webhook documentation
   */
  async parseWebhook(
    payload: DeliveryWebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    try {
      // Verify webhook signature
      if (signature) {
        const isValid = this.verifySignature(payload, signature);
        if (!isValid) {
          this.logger.warn('Invalid Uber Direct webhook signature');
          return {
            valid: false,
            error: 'Invalid webhook signature',
          };
        }
      }

      // Extract Uber Direct webhook data
      // Reference: Uber Direct webhook payload structure
      const eventType = payload.event_type as string;
      const providerTaskId = payload.delivery_id as string;
      const timestamp = payload.timestamp
        ? new Date(payload.timestamp as string)
        : new Date();

      if (!eventType || !providerTaskId) {
        return {
          valid: false,
          error: 'Missing required fields: event_type, delivery_id',
        };
      }

      // Map Uber Direct event types to internal delivery events
      let deliveryEventType: DeliveryEvent['eventType'];
      switch (eventType) {
        case 'delivery.picked_up':
        case 'delivery.pickup_complete':
          deliveryEventType = 'PICKED_UP';
          break;
        case 'delivery.delivered':
        case 'delivery.complete':
          deliveryEventType = 'DELIVERED';
          break;
        case 'delivery.failed':
        case 'delivery.cancelled':
          deliveryEventType = 'FAILED';
          break;
        case 'delivery.in_transit':
          deliveryEventType = 'IN_TRANSIT';
          break;
        default:
          this.logger.warn(`Unknown Uber Direct event type: ${eventType}`);
          return {
            valid: false,
            error: `Unknown event type: ${eventType}`,
          };
      }

      const event: DeliveryEvent = {
        provider: this.getProviderName(),
        providerTaskId,
        eventType: deliveryEventType,
        timestamp,
        metadata: {
          uberEventType: eventType,
          ...payload,
        },
      };

      this.logger.log(
        `Uber Direct webhook parsed: ${deliveryEventType} for task ${providerTaskId}`,
      );

      return {
        valid: true,
        event,
      };
    } catch (error) {
      this.logger.error('Error parsing Uber Direct webhook:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature
   *
   * Uber Direct uses HMAC-SHA256 for webhook verification.
   * This is a simplified version - production should use Uber SDK.
   */
  private verifySignature(
    payload: DeliveryWebhookPayload,
    receivedSignature: string,
  ): boolean {
    try {
      // Create signature string from payload
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures (constant-time comparison for security)
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Error verifying Uber Direct signature:', error);
      return false;
    }
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
