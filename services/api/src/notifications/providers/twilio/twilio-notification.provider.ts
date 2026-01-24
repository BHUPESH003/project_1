/**
 * Twilio SMS Notification Provider
 *
 * SMS notification provider using Twilio API.
 * Handles sending SMS notifications to phone numbers.
 *
 * CRITICAL RULES:
 * - Failures are logged, not thrown (notifications are non-critical)
 * - Provider-specific logic is isolated here
 * - No Twilio-specific fields leak outside this adapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationProvider,
  PushNotificationRequest,
  PushNotificationResponse,
  SmsNotificationRequest,
  SmsNotificationResponse,
} from '../notification-provider.interface';

/**
 * Twilio Configuration
 */
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Twilio phone number
}

@Injectable()
export class TwilioNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(TwilioNotificationProvider.name);
  private readonly config: TwilioConfig;
  private twilioClient: any; // Twilio client (lazy loaded)

  constructor(private readonly configService: ConfigService) {
    // Load Twilio configuration from environment
    this.config = {
      accountSid:
        this.configService.get<string>('TWILIO_ACCOUNT_SID') || 'stub-sid',
      authToken:
        this.configService.get<string>('TWILIO_AUTH_TOKEN') || 'stub-token',
      fromNumber:
        this.configService.get<string>('TWILIO_FROM_NUMBER') ||
        '+1234567890',
    };

    this.logger.log(
      `TwilioNotificationProvider initialized (account: ${this.config.accountSid.substring(0, 8)}...)`,
    );
  }

  getProviderName(): string {
    return 'TWILIO';
  }

  async sendPush(
    request: PushNotificationRequest,
  ): Promise<PushNotificationResponse> {
    // Twilio does not support push notifications - return failure
    this.logger.warn(
      `TwilioNotificationProvider does not support push notifications. Requested push to user ${request.userId}`,
    );

    return {
      success: false,
      error: 'Twilio does not support push notifications',
    };
  }

  async sendSms(
    request: SmsNotificationRequest,
  ): Promise<SmsNotificationResponse> {
    this.logger.log(
      `Sending SMS via Twilio to ${request.phoneNumber}`,
    );

    try {
      // Lazy load Twilio client
      if (!this.twilioClient) {
        // For MVP, use stubbed implementation
        // TODO: Sprint 4 - Integrate with real Twilio SDK
        // const twilio = require('twilio');
        // this.twilioClient = twilio(this.config.accountSid, this.config.authToken);
        this.twilioClient = { stub: true };
      }

      // TODO: Sprint 4 - Real Twilio API call
      // const message = await this.twilioClient.messages.create({
      //   body: request.message,
      //   from: this.config.fromNumber,
      //   to: request.phoneNumber,
      // });

      // Stubbed implementation for MVP
      this.logger.log(
        `[STUB] Twilio SMS sent to ${request.phoneNumber}: ${request.message.substring(0, 50)}...`,
      );

      return {
        success: true,
        messageId: `twilio-${Date.now()}-${request.phoneNumber}`,
      };
    } catch (error) {
      // Log error but don't throw - notifications are non-critical
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send Twilio SMS to ${request.phoneNumber}:`,
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
