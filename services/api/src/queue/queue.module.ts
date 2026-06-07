/**
 * Queue Module
 *
 * Centralized queue management using BullMQ.
 * Provides OrderQueue and NotificationQueue for async job processing.
 *
 * CRITICAL RULES:
 * - Queues orchestrate work, they do NOT contain business logic
 * - Jobs must be idempotent and retry-safe
 * - Failed jobs are logged and retried with backoff
 */

import { Module, forwardRef, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  ORDER_QUEUE_CONFIG,
  NOTIFICATION_QUEUE_CONFIG,
  PAYMENT_QUEUE_CONFIG,
  DELIVERY_QUEUE_CONFIG,
  CART_QUEUE_CONFIG,
} from './queue.config';
import { QueueService } from './queue.service';
import { AssignDeliveryJob } from './jobs/order/assign-delivery.job';
import { OrderTimeoutJob } from './jobs/order/order-timeout.job';
import { ProcessRefundJob } from './jobs/order/process-refund.job';
import { StateChangeNotificationJob } from './jobs/notification/state-change-notification.job';
import {
  CleanupAbandonedCartsJob,
  CART_QUEUE_NAME,
  CLEANUP_ABANDONED_CARTS_JOB,
} from './jobs/cart/cleanup-abandoned-carts.job';
import { OrderStateMachineModule } from '@/orders/state-machine/order-state-machine.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    // Redis connection for BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const baseConfig = {
          enableOfflineQueue: true,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          maxRetries: 3,
          connectTimeout: 15000,
          commandTimeout: 30000,
          retryStrategy: (retries: number) => {
            const delay = Math.min(
              Math.pow(2, Math.min(retries, 5)) * 100,
              5000,
            );
            if (retries % 5 === 0) {
              console.warn(
                `⚠️ Redis queue connection attempt ${retries}, retry in ${delay}ms`,
              );
            }
            return delay;
          },
        };

        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            ...baseConfig,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Order Queue - delivery assignment, timeouts
    BullModule.registerQueueAsync({
      name: 'order',
      imports: [ConfigModule],
      useFactory: () => ORDER_QUEUE_CONFIG,
    }),
    // Notification Queue - push, SMS, email
    BullModule.registerQueueAsync({
      name: 'notification',
      imports: [ConfigModule],
      useFactory: () => NOTIFICATION_QUEUE_CONFIG,
    }),
    // Payment Queue - refund processing (dedicated consumer)
    BullModule.registerQueueAsync({
      name: 'payment',
      imports: [ConfigModule],
      useFactory: () => PAYMENT_QUEUE_CONFIG,
    }),
    // Delivery Queue - delivery assignment (dedicated consumer)
    BullModule.registerQueueAsync({
      name: 'delivery',
      imports: [ConfigModule],
      useFactory: () => DELIVERY_QUEUE_CONFIG,
    }),
    // Cart Queue - abandoned cart cleanup (daily cron)
    BullModule.registerQueueAsync({
      name: CART_QUEUE_NAME,
      imports: [ConfigModule],
      useFactory: () => CART_QUEUE_CONFIG,
    }),
    // Module dependencies for job processors
    forwardRef(() => OrderStateMachineModule),
    NotificationsModule,
  ],
  providers: [
    QueueService,
    AssignDeliveryJob,
    OrderTimeoutJob,
    ProcessRefundJob,
    StateChangeNotificationJob,
    CleanupAbandonedCartsJob,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule implements OnModuleInit {
  private readonly logger = new Logger(QueueModule.name);

  constructor(
    @InjectQueue(CART_QUEUE_NAME) private readonly cartQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // Register the daily abandoned-cart cleanup as a repeatable job.
      // The fixed jobId prevents duplicate schedules across restarts.
      await this.cartQueue.add(
        CLEANUP_ABANDONED_CARTS_JOB,
        {},
        {
          repeat: { pattern: '0 2 * * *' }, // Every day at 02:00 UTC
          jobId: 'cleanup-abandoned-carts-daily',
        },
      );
      this.logger.log(
        'Abandoned cart cleanup job scheduled (daily at 02:00 UTC)',
      );
    } catch (err: any) {
      // Non-fatal: Redis might not be available yet in dev; job will be registered on reconnect
      this.logger.warn(`Failed to schedule cart cleanup job: ${err?.message}`);
    }
  }
}
