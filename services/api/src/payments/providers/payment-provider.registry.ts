/**
 * Payment Provider Registry
 *
 * Factory/Registry pattern for Payment Providers.
 * Allows easy registration and retrieval of payment providers.
 *
 * Similar to CategoryRegistry pattern.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly logger = new Logger(PaymentProviderRegistry.name);
  private readonly providers = new Map<string, PaymentProvider>();

  /**
   * Register a payment provider
   * @param provider - Payment provider instance
   */
  register(provider: PaymentProvider): void {
    const providerName = provider.getProviderName();
    this.providers.set(providerName, provider);
    this.logger.log(`Registered payment provider: ${providerName}`);
  }

  /**
   * Get provider by name
   * @param providerName - Provider name (e.g., "paytm", "razorpay")
   * @returns Payment provider instance
   * @throws Error if provider not found
   */
  getProvider(providerName: string): PaymentProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(
        `No payment provider registered: ${providerName}. Available providers: ${Array.from(this.providers.keys()).join(', ') || 'none'}`,
      );
    }
    return provider;
  }

  /**
   * Get default provider (razorpay preferred, falls back to paytm or first registered)
   * @returns Payment provider instance
   */
  getDefaultProvider(): PaymentProvider {
    if (this.providers.size === 0) {
      throw new Error('No payment providers registered');
    }

    // For MVP, prefer Razorpay, fallback to Paytm, then first registered
    const razorpayProvider = this.providers.get('razorpay');
    if (razorpayProvider) {
      return razorpayProvider;
    }

    const paytmProvider = this.providers.get('paytm');
    if (paytmProvider) {
      return paytmProvider;
    }

    return Array.from(this.providers.values())[0];
  }

  /**
   * Check if a provider is registered
   * @param providerName - Provider name
   * @returns true if provider exists, false otherwise
   */
  hasProvider(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get all registered provider names
   * @returns Array of provider names
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
