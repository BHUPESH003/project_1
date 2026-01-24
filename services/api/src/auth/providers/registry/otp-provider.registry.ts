import { Injectable } from '@nestjs/common';
import {
  OtpProvider,
  OtpProviderType,
} from '../interfaces/otp-provider.interface';

/**
 * OTP Provider Registry
 *
 * Factory/Registry pattern for OTP providers.
 * Allows easy swapping of providers without changing AuthService.
 *
 * Usage:
 * - Register provider in auth.module.ts
 * - AuthService uses getProvider() to get the configured provider
 * - Adding new provider = register in module, no code changes elsewhere
 */
@Injectable()
export class OtpProviderRegistry {
  private provider: OtpProvider | null = null;

  /**
   * Register an OTP provider
   * @param provider - Provider instance implementing OtpProvider interface
   */
  register(provider: OtpProvider): void {
    this.provider = provider;
  }

  /**
   * Get the registered OTP provider
   * @returns OtpProvider instance
   * @throws Error if no provider is registered
   */
  getProvider(): OtpProvider {
    if (!this.provider) {
      throw new Error(
        'OTP provider not configured. Please register a provider in auth.module.ts',
      );
    }
    return this.provider;
  }

  /**
   * Get the current provider type
   * @returns OtpProviderType or null if no provider registered
   */
  getProviderType(): OtpProviderType | null {
    return this.provider?.getName() ?? null;
  }
}
