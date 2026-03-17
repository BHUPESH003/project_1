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

import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ORDER_QUEUE_CONFIG, NOTIFICATION_QUEUE_CONFIG } from './queue.config';
import { QueueService } from './queue.service';
import { AssignDeliveryJob } from './jobs/order/assign-delivery.job';
import { OrderTimeoutJob } from './jobs/order/order-timeout.job';
import { StateChangeNotificationJob } from './jobs/notification/state-change-notification.job';
import { OrderStateMachineModule } from '@/orders/state-machine/order-state-machine.module';
import { OrdersModule } from '@/orders/orders.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    // Redis connection for BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Always use host/port/password approach (no REDIS_URL)
        const baseConfig = {
          enableOfflineQueue: true, // Allow commands to queue while connecting
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          maxRetries: 3, // Match cache module for consistency
          connectTimeout: 10000,
          commandTimeout: 10000,
          retryStrategy: (retries: number) => {
            // Use exponential backoff - matches cache module for consistency
            const delay = Math.min(Math.pow(2, Math.min(retries, 5)) * 100, 5000);
            if (retries % 5 === 0) {
              console.warn(`⚠️ Redis queue connection attempt ${retries}, retry in ${delay}ms`);
            }
            return delay; // Indefinite retries with backoff
          },
        };

        // Use host/port/password for connection
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
    // Order Queue - for order-related jobs (delivery assignment, timeouts)
    BullModule.registerQueueAsync({
      name: 'order',
      imports: [ConfigModule],
      useFactory: () => ORDER_QUEUE_CONFIG,
    }),
    // Notification Queue - for notification jobs (push, SMS, email)
    BullModule.registerQueueAsync({
      name: 'notification',
      imports: [ConfigModule],
      useFactory: () => NOTIFICATION_QUEUE_CONFIG,
    }),
    // Import modules needed by job processors
    // Note: Using forwardRef to break circular dependency
    // OrderStateMachineModule → QueueModule → OrderStateMachineModule
    forwardRef(() => OrderStateMachineModule), // For OrderTimeoutJob
    NotificationsModule, // For StateChangeNotificationJob
    // Note: OrdersModule and DeliveryModule not imported here to avoid circular dependencies
    // Job processors use ModuleRef to lazy-load services
  ],
  providers: [
    QueueService,
    // Job processors
    // Note: AssignDeliveryJob uses ModuleRef to avoid circular dependency with DeliveryModule
    AssignDeliveryJob,
    OrderTimeoutJob,
    StateChangeNotificationJob,
  ],
  exports: [BullModule, QueueService], // Export for use in other modules
})
export class QueueModule {}
