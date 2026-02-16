/**
 * Order Timeout Job
 *
 * Job processor for checking and expiring orders.
 * Scheduled on order creation to check if order has expired.
 *
 * CRITICAL RULES:
 * - Only transitions order state via Order State Machine
 * - Must be idempotent (safe to retry)
 * - Checks order state before transitioning
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrderStatus } from '@repo/types';
import { OrderStateMachineService } from '@/orders/state-machine';
import { OrderRepository } from '@/orders/repositories/order.repository';

/**
 * Order Timeout Job Data
 */
export interface OrderTimeoutJobData {
  orderId: string;
  timeoutMinutes: number; // Timeout duration in minutes
  createdAt: string; // ISO timestamp of order creation
}

/**
 * Order Timeout Job Processor
 *
 * Checks if order has expired and transitions to ORDER_EXPIRED if needed.
 * Idempotent - safe to retry, won't transition if already expired or in different state.
 */
@Processor('order', {
  concurrency: 10, // Process up to 10 timeout checks concurrently
})
export class OrderTimeoutJob extends WorkerHost {
  private readonly logger = new Logger(OrderTimeoutJob.name);
  private orderRepository?: OrderRepository;

  constructor(
    private readonly stateMachine: OrderStateMachineService,
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  /**
   * Lazy load OrderRepository to avoid circular dependency
   */
  private async getOrderRepository(): Promise<OrderRepository> {
    if (!this.orderRepository) {
      this.orderRepository = await this.moduleRef.get(OrderRepository, {
        strict: false,
      });
    }
    return this.orderRepository;
  }

  async process(job: Job<OrderTimeoutJobData>): Promise<void> {
    const { orderId, timeoutMinutes, createdAt } = job.data;

    this.logger.log(
      `Processing timeout check for order ${orderId} (job: ${job.id}, timeout: ${timeoutMinutes}min)`,
    );

    try {
      // Get OrderRepository (lazy load to avoid circular dependency)
      const orderRepository = await this.getOrderRepository();

      // Get current order state
      const order = await orderRepository.findById(orderId, false);
      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found for timeout check (job: ${job.id})`,
        );
        return; // Order doesn't exist - job complete
      }

      // Only expire orders in CREATED or SELLER_SELECTED state
      // Orders in other states have progressed and should not expire
      if (
        order.status !== OrderStatus.CREATED &&
        order.status !== OrderStatus.SELLER_SELECTED
      ) {
        this.logger.log(
          `Order ${orderId} is in state ${order.status}, skipping timeout (job: ${job.id}) - idempotent`,
        );
        return; // Order has progressed - no need to expire
      }

      // Check if order has expired
      const orderCreatedAt = new Date(createdAt);
      const now = new Date();
      const elapsedMinutes =
        (now.getTime() - orderCreatedAt.getTime()) / (1000 * 60);

      if (elapsedMinutes >= timeoutMinutes) {
        // Order has expired - transition to ORDER_EXPIRED via state machine
        this.logger.log(
          `Order ${orderId} has expired (elapsed: ${elapsedMinutes.toFixed(2)}min, timeout: ${timeoutMinutes}min) - transitioning to ORDER_EXPIRED`,
        );

        await this.stateMachine.transition({
          orderId,
          toState: OrderStatus.ORDER_EXPIRED,
          triggeredBy: 'system',
          reason: `Order expired after ${timeoutMinutes} minutes`,
        });

        this.logger.log(
          `Order ${orderId} transitioned to ORDER_EXPIRED (job: ${job.id})`,
        );
      } else {
        // Order not yet expired - reschedule job for remaining time
        const remainingMinutes = timeoutMinutes - elapsedMinutes;
        this.logger.log(
          `Order ${orderId} not yet expired (remaining: ${remainingMinutes.toFixed(2)}min) - will check again`,
        );
        // Note: In production, you might want to reschedule the job
        // For MVP, we rely on the initial scheduled job
      }
    } catch (error) {
      // Log error
      this.logger.error(
        `Error processing timeout for order ${orderId} (job: ${job.id}):`,
        error,
      );

      // If order already in ORDER_EXPIRED or terminal state, this is idempotent
      if (
        error instanceof Error &&
        error.message.includes('Invalid state transition')
      ) {
        this.logger.log(
          `Order ${orderId} already in terminal state - timeout check idempotent (job: ${job.id})`,
        );
        return; // Success - already expired or in different state
      }

      throw error; // Re-throw to trigger retry
    }
  }
}
