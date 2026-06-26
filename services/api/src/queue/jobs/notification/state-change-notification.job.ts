/**
 * State Change Notification Job
 *
 * Job processor for sending notifications on order state changes.
 * Triggered when order state transitions successfully.
 *
 * CRITICAL RULES:
 * - Only emits notification intent (no provider logic yet)
 * - Must be idempotent (safe to retry)
 * - Does NOT mutate order state
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrderStatus } from '@repo/types';
import { NotificationsService } from '@/notifications/notifications.service';
import { getNotificationIntents } from '@/notifications/templates/notification-templates';

/**
 * State Change Notification Job Data
 */
export interface StateChangeNotificationJobData {
  orderId: string;
  fromState: OrderStatus | null;
  toState: OrderStatus;
  userId: string; // Order owner
  sellerId?: string; // Seller (if applicable)
  triggeredBy: string; // Who triggered the state change
}

/**
 * State Change Notification Job Processor
 *
 * Emits notification intent for order state changes.
 * Sprint 3: MVP - only logs notification intent.
 * Future: Will integrate with notification providers (Firebase, Twilio, etc.)
 */
@Processor('notification', {
  concurrency: 20, // Process up to 20 notifications concurrently
})
export class StateChangeNotificationJob extends WorkerHost {
  private readonly logger = new Logger(StateChangeNotificationJob.name);
  private notificationService?: NotificationsService;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  /**
   * Lazy load NotificationsService to avoid circular dependency
   */
  private async getNotificationService(): Promise<NotificationsService> {
    if (!this.notificationService) {
      this.notificationService = await this.moduleRef.get(
        NotificationsService,
        {
          strict: false,
        },
      );
    }
    return this.notificationService;
  }

  async process(job: Job<StateChangeNotificationJobData>): Promise<void> {
    const { orderId, fromState, toState, userId, sellerId, triggeredBy } =
      job.data;

    this.logger.log(
      `Processing notification for order ${orderId} (job: ${job.id}): ${fromState || 'CREATED'} → ${toState}`,
    );

    try {
      // Get notification intents from templates
      const intents = getNotificationIntents(
        orderId,
        fromState,
        toState,
        userId,
        sellerId,
      );

      if (intents.length === 0) {
        this.logger.log(
          `No notifications required for order ${orderId} state transition to ${toState} (job: ${job.id})`,
        );
        return;
      }

      // Get NotificationService (lazy load to avoid circular dependency)
      const notificationService = await this.getNotificationService();

      // Persist to DB + send push/SMS for each intent
      const results = await Promise.allSettled(
        intents.map(async (intent) => {
          // Only persist user-facing (non-seller) notifications for the inbox
          await notificationService.persistNotification(
            intent.userId,
            'ORDER_UPDATE',
            intent.title,
            intent.body,
            { orderId, data: intent.data },
          );
          return notificationService.sendNotificationIntent(intent);
        }),
      );

      // Log results
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value === true,
      ).length;
      const failureCount = results.length - successCount;

      this.logger.log(
        `Notifications sent for order ${orderId}: ${successCount} succeeded, ${failureCount} failed (job: ${job.id})`,
      );

      // Log any failures (but don't throw)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Notification ${index + 1} failed for order ${orderId}:`,
            result.reason,
          );
        }
      });
    } catch (error) {
      // Log error but don't fail the job
      // Notifications are non-critical - order state change already happened
      this.logger.error(
        `Error processing notification for order ${orderId} (job: ${job.id}):`,
        error,
      );
      // Don't throw - notification failures shouldn't block order flow
    }
  }
}
