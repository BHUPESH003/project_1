/**
 * Notification Provider Registry
 *
 * Central registry for managing notification providers.
 * Follows the same pattern as PaymentProviderRegistry and DeliveryAdapterRegistry.
 *
 * CRITICAL RULES:
 * - Core services depend ONLY on this registry
 * - Providers are registered at module initialization
 * - Adding a new provider requires only a new adapter implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';

@Injectable()
export class NotificationProviderRegistry {
  private readonly logger = new Logger(NotificationProviderRegistry.name);
  private readonly providers = new Map<string, NotificationProvider>();

  /**
   * Register a notification provider
   *
   * @param provider - Provider to register
   */
  register(provider: NotificationProvider): void {
    const providerName = provider.getProviderName();
    if (this.providers.has(providerName)) {
      this.logger.warn(
        `Provider ${providerName} is already registered. Overwriting.`,
      );
    }
    this.providers.set(providerName, provider);
    this.logger.log(`Registered notification provider: ${providerName}`);
  }

  /**
   * Get a notification provider by name
   *
   * @param providerName - Provider name
   * @returns Notification provider
   * @throws Error if provider not found
   */
  getProvider(providerName: string): NotificationProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      const available = Array.from(this.providers.keys()).join(', ') || 'none';
      throw new Error(
        `Notification provider '${providerName}' not found. Available providers: ${available}`,
      );
    }
    return provider;
  }

  /**
   * Get default push notification provider
   * Falls back to first registered provider if no default configured
   *
   * @returns Default push notification provider
   */
  getDefaultPushProvider(): NotificationProvider {
    // Try Firebase first, then OneSignal, then first available
    const preferredProviders = ['FIREBASE', 'ONESIGNAL'];
    for (const name of preferredProviders) {
      if (this.providers.has(name)) {
        return this.providers.get(name)!;
      }
    }
    // Fallback to first registered provider
    const firstProvider = Array.from(this.providers.values())[0];
    if (!firstProvider) {
      throw new Error('No notification providers registered');
    }
    return firstProvider;
  }

  /**
   * Get default SMS provider
   * Falls back to Twilio if available
   *
   * @returns Default SMS provider
   */
  getDefaultSmsProvider(): NotificationProvider {
    // Try Twilio first
    if (this.providers.has('TWILIO')) {
      return this.providers.get('TWILIO')!;
    }
    // Fallback to first registered provider that supports SMS
    const firstProvider = Array.from(this.providers.values())[0];
    if (!firstProvider) {
      throw new Error('No SMS notification providers registered');
    }
    return firstProvider;
  }

  /**
   * Check if a provider is registered
   *
   * @param providerName - Provider name
   * @returns true if provider is registered
   */
  hasProvider(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get all registered provider names
   *
   * @returns Array of provider names
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
