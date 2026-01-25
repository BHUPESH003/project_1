import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import {
  OtpProvider,
  OtpProviderType,
  OtpResult,
} from '../interfaces/otp-provider.interface';

/**
 * Twilio OTP Provider
 *
 * Implements OtpProvider interface for Twilio SMS service.
 * All Twilio-specific logic is isolated in this class.
 *
 * Configuration required:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (from number)
 */
@Injectable()
export class TwilioProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio | null = null; // Twilio client (lazy initialization)
  private fromNumber: string = '';

  constructor(private configService: ConfigService) {
    // Don't throw in constructor - allow app to start without config
    // Config will be checked when sendOtp is called
    this.logger.warn(
      'TwilioProvider initialized. Configuration will be validated when sending OTP.',
    );
  }

  /**
   * Initialize Twilio client if not already initialized
   * @throws Error if configuration is missing
   */
  private initializeClient(): void {
    if (this.client) {
      return; // Already initialized
    }

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
    if (!accountSid || !authToken) {
      throw new Error(
        'Twilio configuration missing: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required',
      );
    }

    if (!this.fromNumber) {
      throw new Error(
        'Twilio configuration missing: TWILIO_PHONE_NUMBER is required',
      );
    }

    this.client = new Twilio(accountSid, authToken);
    this.logger.log('Twilio provider initialized');
  }

  /**
   * Send OTP via Twilio SMS
   * @param phone - Phone number in E.164 format
   * @param code - OTP code (6 digits)
   * @returns Promise resolving to OtpResult
   */
  async sendOtp(phone: string, code: string): Promise<OtpResult> {
    try {
      // Initialize client (will throw if config is missing)
      this.initializeClient();

      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      // Format OTP message
      const message = `Your OTP code is ${code}. Valid for 10 minutes.`;

      // Send SMS via Twilio
      const messageResponse = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phone,
      });

      this.logger.log(
        `OTP sent to ${phone} via Twilio. Message SID: ${messageResponse.sid}`,
      );

      return {
        success: true,
        messageId: messageResponse.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP via Twilio to ${phone}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get provider name
   * @returns OtpProviderType.TWILIO
   */
  getName(): OtpProviderType {
    return OtpProviderType.TWILIO;
  }
}
