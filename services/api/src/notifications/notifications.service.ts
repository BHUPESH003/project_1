/**
 * Notifications Service
 *
 * Service for sending notifications via registered providers.
 * Depends ONLY on NotificationProvider interface (not concrete providers).
 *
 * CRITICAL RULES:
 * - Notifications are best-effort, not critical path
 * - Failures are logged, not thrown
 * - Order state must NEVER change due to notifications
 * - All notifications are async (queue-based)
 */

import { Injectable, Logger } from '@nestjs/common';
import { NotificationProviderRegistry } from './providers/notification-provider.registry';
import {
  PushNotificationRequest,
  SmsNotificationRequest,
} from './providers/notification-provider.interface';
import { UserRepository } from '@/users/repositories/user.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly providerRegistry: NotificationProviderRegistry,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Send push notification to user
   *
   * @param userId - User ID
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Optional data payload
   * @returns Whether notification was sent successfully
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const provider = this.providerRegistry.getDefaultPushProvider();

      const request: PushNotificationRequest = {
        userId,
        title,
        body,
        data,
      };

      const response = await provider.sendPush(request);

      if (response.success) {
        this.logger.log(
          `Push notification sent to user ${userId} via ${provider.getProviderName()}`,
        );
        return true;
      } else {
        this.logger.warn(
          `Failed to send push notification to user ${userId}: ${response.error}`,
        );
        return false;
      }
    } catch (error) {
      // Log error but don't throw - notifications are non-critical
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error sending push notification to user ${userId}:`,
        errorMessage,
      );
      return false;
    }
  }

  /**
   * Send SMS notification to user
   *
   * @param userId - User ID
   * @param message - SMS message
   * @returns Whether SMS was sent successfully
   */
  async sendSmsNotification(userId: string, message: string): Promise<boolean> {
    try {
      // Get user phone number
      const user = await this.userRepository.findById(userId);
      if (!user || !user.phone) {
        this.logger.warn(
          `Cannot send SMS to user ${userId}: user not found or no phone number`,
        );
        return false;
      }

      const provider = this.providerRegistry.getDefaultSmsProvider();

      const request: SmsNotificationRequest = {
        phoneNumber: user.phone,
        message,
      };

      const response = await provider.sendSms(request);

      if (response.success) {
        this.logger.log(
          `SMS sent to user ${userId} (${user.phone}) via ${provider.getProviderName()}`,
        );
        return true;
      } else {
        this.logger.warn(
          `Failed to send SMS to user ${userId}: ${response.error}`,
        );
        return false;
      }
    } catch (error) {
      // Log error but don't throw - notifications are non-critical
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending SMS to user ${userId}:`, errorMessage);
      return false;
    }
  }

  /**
   * Send notification based on intent
   * Handles both push and SMS based on intent type
   *
   * @param intent - Notification intent
   * @returns Whether notification was sent successfully
   */
  async sendNotificationIntent(intent: {
    type: 'PUSH' | 'SMS' | 'BOTH';
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<boolean> {
    let success = false;

    // Send push notification if requested
    if (intent.type === 'PUSH' || intent.type === 'BOTH') {
      const pushSuccess = await this.sendPushNotification(
        intent.userId,
        intent.title,
        intent.body,
        intent.data,
      );
      success = success || pushSuccess;
    }

    // Send SMS if requested
    if (intent.type === 'SMS' || intent.type === 'BOTH') {
      const smsSuccess = await this.sendSmsNotification(
        intent.userId,
        intent.body, // Use body as SMS message
      );
      success = success || smsSuccess;
    }

    return success;
  }
}
