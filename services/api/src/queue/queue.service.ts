/**
 * Queue Service
 *
 * Service for enqueueing jobs.
 * Provides type-safe methods for adding jobs to queues.
 *
 * CRITICAL RULES:
 * - Controllers must NOT enqueue jobs directly
 * - Only services should enqueue jobs
 * - Jobs are enqueued based on domain events, not controller actions
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus } from '@repo/types';
import { AssignDeliveryJobData } from './jobs/order/assign-delivery.job';
import { OrderTimeoutJobData } from './jobs/order/order-timeout.job';
import { StateChangeNotificationJobData } from './jobs/notification/state-change-notification.job';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('order') private readonly orderQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Enqueue assign delivery job
   *
   * Called when order reaches READY_FOR_PICKUP state.
   * Job will assign delivery via DeliveryService.
   *
   * @param orderId - Order ID
   * @param triggeredBy - Who triggered the job (for logging)
   */
  async enqueueAssignDelivery(
    orderId: string,
    triggeredBy?: string,
  ): Promise<void> {
    const jobData: AssignDeliveryJobData = {
      orderId,
      triggeredBy: triggeredBy || 'system',
    };

    await this.orderQueue.add('assign-delivery', jobData, {
      jobId: `assign-delivery-${orderId}`, // Unique job ID for idempotency
      removeOnComplete: true, // Remove completed jobs immediately
    });

    this.logger.log(
      `Enqueued assign delivery job for order ${orderId} (triggered by: ${triggeredBy || 'system'})`,
    );
  }

  /**
   * Enqueue order timeout job
   *
   * Called when order is created.
   * Job will check if order has expired after timeout period.
   *
   * @param orderId - Order ID
   * @param timeoutMinutes - Timeout duration in minutes
   * @param createdAt - Order creation timestamp
   */
  async enqueueOrderTimeout(
    orderId: string,
    timeoutMinutes: number,
    createdAt: Date,
  ): Promise<void> {
    const jobData: OrderTimeoutJobData = {
      orderId,
      timeoutMinutes,
      createdAt: createdAt.toISOString(),
    };

    // Schedule job to run after timeout period
    await this.orderQueue.add('order-timeout', jobData, {
      jobId: `order-timeout-${orderId}`, // Unique job ID for idempotency
      delay: timeoutMinutes * 60 * 1000, // Delay in milliseconds
      removeOnComplete: true,
    });

    this.logger.log(
      `Enqueued timeout job for order ${orderId} (timeout: ${timeoutMinutes}min, scheduled for: ${new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString()})`,
    );
  }

  /**
   * Enqueue state change notification job
   *
   * Called when order state transitions successfully.
   * Job will send notifications to relevant parties.
   *
   * @param orderId - Order ID
   * @param fromState - Previous state
   * @param toState - New state
   * @param userId - Order owner
   * @param sellerId - Seller (if applicable)
   * @param triggeredBy - Who triggered the state change
   */
  async enqueueStateChangeNotification(
    orderId: string,
    fromState: OrderStatus | null,
    toState: OrderStatus,
    userId: string,
    sellerId: string | undefined,
    triggeredBy: string,
  ): Promise<void> {
    const jobData: StateChangeNotificationJobData = {
      orderId,
      fromState,
      toState,
      userId,
      sellerId,
      triggeredBy,
    };

    // Use orderId + toState as job ID for idempotency
    // Same state change won't create duplicate notifications
    await this.notificationQueue.add('state-change-notification', jobData, {
      jobId: `notification-${orderId}-${toState}`, // Unique job ID for idempotency
      removeOnComplete: true,
    });

    this.logger.log(
      `Enqueued notification job for order ${orderId} (${fromState || 'CREATED'} → ${toState})`,
    );
  }
}
