import { Injectable } from '@nestjs/common';

/**
 * DeliveryService - Multi-Provider Delivery Orchestration
 *
 * ⚠️ CRITICAL ARCHITECTURE REQUIREMENTS:
 * Before implementing this service, READ: ./DELIVERY_ARCHITECTURE.md
 *
 * Key Rules:
 * - MUST depend ONLY on DeliveryProvider interface (no concrete providers)
 * - MUST use provider registry/factory pattern
 * - MUST NOT have provider-specific logic
 * - Adding new aggregator = NO changes to this service
 *
 * @see ./DELIVERY_ARCHITECTURE.md for complete design requirements
 */
@Injectable()
export class DeliveryService {
  assignDelivery(_assignDto: Record<string, unknown>) {
    // TODO: Call delivery aggregator API
    // Fetch quotes from multiple providers
    // Choose best option
    // Return provider and tracking_id
    return { message: 'Assign delivery - to be implemented' };
  }

  handleWebhook(_webhookDto: Record<string, unknown>) {
    // TODO: Process delivery status update webhook
    // Update order state accordingly
    // Notify user of status change
    return { message: 'Handle delivery webhook - to be implemented' };
  }
}
