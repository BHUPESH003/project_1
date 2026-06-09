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
    // Redis connection for BullMQ — reuse the shared REDIS_CLIENT to avoid
    // opening extra connections (each BullMQ queue/worker creates its own
    // connection by default, which exhausts managed Redis client limits).
    BullModule.forRootAsync({
      useFactory: (redisClient: any) => ({
        connection: redisClient,
      }),
      inject: ['REDIS_CLIENT'],
    }),
    // Order Queue - delivery assignment, timeouts
    BullModule.registerQueue({ name: 'order', ...ORDER_QUEUE_CONFIG }),
    // Notification Queue - push, SMS, email
    BullModule.registerQueue({ name: 'notification', ...NOTIFICATION_QUEUE_CONFIG }),
    // Payment Queue - refund processing (dedicated consumer)
    BullModule.registerQueue({ name: 'payment', ...PAYMENT_QUEUE_CONFIG }),
    // Delivery Queue - delivery assignment (dedicated consumer)
    BullModule.registerQueue({ name: 'delivery', ...DELIVERY_QUEUE_CONFIG }),
    // Cart Queue - abandoned cart cleanup (daily cron)
    BullModule.registerQueue({ name: CART_QUEUE_NAME, ...CART_QUEUE_CONFIG }),
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
