/**
 * Delivery Adapter Registry
 *
 * Factory/Registry pattern for Delivery Adapters.
 * Allows easy registration and retrieval of delivery adapters.
 *
 * Similar to PaymentProviderRegistry and CategoryRegistry patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DeliveryAdapter } from './delivery-adapter.interface';

@Injectable()
export class DeliveryAdapterRegistry {
  private readonly logger = new Logger(DeliveryAdapterRegistry.name);
  private readonly adapters = new Map<string, DeliveryAdapter>();

  /**
   * Register a delivery adapter
   * @param adapter - Delivery adapter instance
   */
  register(adapter: DeliveryAdapter): void {
    const providerName = adapter.getProviderName();
    this.adapters.set(providerName, adapter);
    this.logger.log(`Registered delivery adapter: ${providerName}`);
  }

  /**
   * Get adapter by provider name
   * @param providerName - Provider name (e.g., "UBER_DIRECT", "DUNZO")
   * @returns Delivery adapter instance
   * @throws Error if adapter not found
   */
  getAdapter(providerName: string): DeliveryAdapter {
    const adapter = this.adapters.get(providerName);
    if (!adapter) {
      throw new Error(
        `No delivery adapter registered: ${providerName}. Available adapters: ${Array.from(this.adapters.keys()).join(', ') || 'none'}`,
      );
    }
    return adapter;
  }

  /**
   * Get default adapter (first registered or configured)
   * @returns Delivery adapter instance
   */
  getDefaultAdapter(): DeliveryAdapter {
    if (this.adapters.size === 0) {
      throw new Error('No delivery adapters registered');
    }

    // For MVP, return Uber Direct if available, otherwise first registered
    const uberAdapter = this.adapters.get('UBER_DIRECT');
    if (uberAdapter) {
      return uberAdapter;
    }

    return Array.from(this.adapters.values())[0];
  }

  /**
   * Check if an adapter is registered
   * @param providerName - Provider name
   * @returns true if adapter exists, false otherwise
   */
  hasAdapter(providerName: string): boolean {
    return this.adapters.has(providerName);
  }

  /**
   * Get all registered provider names
   * @returns Array of provider names
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all adapters in priority order for fallback: default adapter first,
   * then remaining adapters in registration order.
   */
  getAdaptersByPriority(): DeliveryAdapter[] {
    if (this.adapters.size === 0) return [];
    const defaultAdapter = this.getDefaultAdapter();
    const rest = Array.from(this.adapters.values()).filter(
      (a) => a.getProviderName() !== defaultAdapter.getProviderName(),
    );
    return [defaultAdapter, ...rest];
  }
}
