/**
 * Assign Delivery Job
 *
 * Job processor for assigning delivery to an order.
 * Triggered when order reaches READY_FOR_PICKUP state.
 *
 * CRITICAL RULES:
 * - Does NOT mutate order state directly
 * - Calls DeliveryService to assign delivery
 * - Must be idempotent (safe to retry)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { DeliveryService } from '@/delivery/delivery.service';
import { ModuleRef } from '@nestjs/core';

/**
 * Assign Delivery Job Data
 */
export interface AssignDeliveryJobData {
  orderId: string;
  triggeredBy?: string; // Who triggered the job (for logging)
}

/**
 * Assign Delivery Job Processor
 *
 * Processes jobs that assign delivery to orders.
 * Idempotent - safe to retry if delivery already assigned.
 */
@Processor('order', {
  concurrency: 5, // Process up to 5 jobs concurrently
})
export class AssignDeliveryJob extends WorkerHost {
  private readonly logger = new Logger(AssignDeliveryJob.name);
  private deliveryService?: DeliveryService;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  /**
   * Lazy load DeliveryService to avoid circular dependency
   */
  private async getDeliveryService(): Promise<DeliveryService> {
    if (!this.deliveryService) {
      this.deliveryService = await this.moduleRef.get(DeliveryService, {
        strict: false,
      });
    }
    return this.deliveryService!;
  }

  async process(job: Job<AssignDeliveryJobData>): Promise<void> {
    const { orderId, triggeredBy } = job.data;

    this.logger.log(
      `Processing assign delivery job for order ${orderId} (job: ${job.id}, triggered by: ${triggeredBy || 'system'})`,
    );

    try {
      // Get DeliveryService (lazy load to avoid circular dependency)
      const deliveryService = await this.getDeliveryService();

      // Call DeliveryService to assign delivery
      // DeliveryService handles:
      // - Order state validation
      // - Delivery creation via adapter
      // - Persistence of delivery record
      // - Does NOT mutate order state (webhook handles that)
      await deliveryService.assignDelivery(orderId);

      this.logger.log(
        `Delivery assigned successfully for order ${orderId} (job: ${job.id})`,
      );
    } catch (error) {
      // Log error but don't throw - job will retry automatically
      // If delivery already assigned, this is idempotent (safe to ignore)
      if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        this.logger.log(
          `Delivery already assigned for order ${orderId} (job: ${job.id}) - idempotent`,
        );
        return; // Success - already assigned
      }

      this.logger.error(
        `Failed to assign delivery for order ${orderId} (job: ${job.id}):`,
        error,
      );
      throw error; // Re-throw to trigger retry
    }
  }
}
