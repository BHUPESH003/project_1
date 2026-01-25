import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OtpProvider,
  OtpProviderType,
  OtpResult,
} from '../interfaces/otp-provider.interface';

/**
 * Infobip OTP Provider
 *
 * Implements OtpProvider interface for Infobip SMS service.
 * Uses Infobip HTTP API (REST) for sending SMS.
 *
 * Configuration required:
 * - INFOBIP_BASE_URL
 * - INFOBIP_API_KEY
 * - INFOBIP_SENDER
 */
@Injectable()
export class InfobipProvider implements OtpProvider {
  private readonly logger = new Logger(InfobipProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sender: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('INFOBIP_BASE_URL', '');
    this.apiKey = this.configService.get<string>('INFOBIP_API_KEY', '');
    this.sender = this.configService.get<string>('INFOBIP_SENDER', '');

    this.logger.log(
      `InfobipProvider initialized (baseUrl: ${this.baseUrl}, sender: ${this.sender})`,
    );
  }

  /**
   * Send OTP via Infobip SMS API
   * @param phone - Phone number in E.164 format
   * @param code - OTP code (6 digits)
   * @returns Promise resolving to OtpResult
   */
  async sendOtp(phone: string, code: string): Promise<OtpResult> {
    try {
      // Validate configuration
      if (!this.baseUrl || !this.apiKey || !this.sender) {
        throw new Error(
          'Infobip configuration missing: INFOBIP_BASE_URL, INFOBIP_API_KEY, and INFOBIP_SENDER are required',
        );
      }

      // Format OTP message
      const message = `Your OTP is ${code}. Valid for 5 minutes.`;

      // Prepare Infobip API payload
      const payload = {
        messages: [
          {
            from: this.sender,
            destinations: [{ to: phone }],
            text: message,
          },
        ],
      };

      // Send SMS via Infobip HTTP API
      const response = await fetch(`${this.baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Infobip API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const responseData = await response.json();

      // Extract message ID from response
      const messageId = responseData.messages?.[0]?.messageId || `infobip-${Date.now()}`;

      this.logger.log(
        `OTP sent to ${phone} via Infobip. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP via Infobip to ${phone}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get provider name
   * @returns OtpProviderType.INFOBIP
   */
  getName(): OtpProviderType {
    return OtpProviderType.INFOBIP;
  }
}