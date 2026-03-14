/**
 * Delivery Adapter Interface
 *
 * Defines the contract for delivery provider integrations.
 * All delivery providers must implement this interface.
 *
 * CRITICAL RULES:
 * - Deliveries must NEVER mutate order state directly
 * - Order state changes must go through Order State Machine
 * - Webhooks must be idempotent and safe to retry
 * - Provider-specific fields must NOT leak outside adapter
 */

import { DeliveryStatus } from '@repo/types';

/**
 * Location coordinates and address
 */
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  name?: string; // Optional: location/person name
  phone?: string; // Optional: contact phone number
  notes?: string; // Optional: delivery notes
}

/**
 * Delivery quote request
 */
export interface DeliveryQuoteRequest {
  pickup: Location;
  drop: Location;
  orderId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Delivery quote response
 */
export interface DeliveryQuote {
  provider: string;
  estimatedFee: number; // In rupees
  estimatedDurationMinutes: number;
  currency: string;
  quoteId?: string; // Provider-specific quote ID
  expiresAt?: Date; // Quote expiration time
  vehicleOptions?: Array<{
    vehicleType: string;
    estimatedFee: number;
    estimatedDurationMinutes: number;
  }>;
}

/**
 * Create delivery task request
 */
export interface CreateTaskRequest {
  orderId: string;
  pickup: Location;
  drop: Location;
  quote?: DeliveryQuote; // Optional: if quote was obtained earlier
  metadata?: Record<string, unknown>;
}

/**
 * Delivery task response
 */
export interface DeliveryTask {
  taskId: string; // Internal task ID
  providerTaskId: string; // Provider's task ID
  status: DeliveryStatus;
  trackingUrl?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
}

/**
 * Cancel task request
 */
export interface CancelTaskRequest {
  taskId: string;
  providerTaskId: string;
  reason?: string;
}

/**
 * Webhook payload (provider-specific format)
 */
export interface DeliveryWebhookPayload {
  // Provider-specific payload structure
  [key: string]: unknown;
}

/**
 * Delivery event (normalized from webhook)
 */
export interface DeliveryEvent {
  provider: string;
  providerTaskId: string;
  eventType: 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'IN_TRANSIT';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  valid: boolean;
  event?: DeliveryEvent;
  error?: string;
}

/**
 * Delivery Adapter Interface
 *
 * Each delivery provider (Uber Direct, Dunzo, Porter, etc.) must implement this interface.
 * The implementation handles provider-specific logic while maintaining a consistent interface.
 */
export interface DeliveryAdapter {
  /**
   * Get provider name (e.g., "UBER_DIRECT", "DUNZO", "PORTER")
   */
  getProviderName(): string;

  /**
   * Get delivery quote
   * Called to estimate delivery cost and duration
   *
   * @param request - Quote request with pickup/drop locations
   * @returns Delivery quote with estimated fee and duration
   */
  getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote>;

  /**
   * Create delivery task
   * Called when order reaches READY_FOR_PICKUP state
   *
   * @param request - Task creation request
   * @returns Delivery task with provider task ID
   */
  createTask(request: CreateTaskRequest): Promise<DeliveryTask>;

  /**
   * Cancel delivery task
   * Called when order is cancelled or delivery needs to be cancelled
   *
   * @param request - Cancel request
   * @returns Promise that resolves when cancellation is complete
   */
  cancelTask(request: CancelTaskRequest): Promise<void>;

  /**
   * Parse and verify webhook payload
   * Called when delivery provider sends webhook
   *
   * @param payload - Raw webhook payload (provider-specific format)
   * @param signature - Webhook signature for verification
   * @returns Verification result with normalized delivery event
   */
  parseWebhook(
    payload: DeliveryWebhookPayload,
    signature?: string,
  ): Promise<WebhookVerificationResult>;
}
