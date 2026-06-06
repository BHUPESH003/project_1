/**
 * Process Refund Job
 *
 * Job processor for issuing refunds when an order fails after payment.
 * Triggered by the Order State Machine when an order transitions to
 * SELLER_REJECTED, USER_CANCELLED, or DELIVERY_FAILED.
 *
 * CRITICAL RULES:
 * - Does NOT mutate order state directly
 * - Delegates all refund logic to PaymentsService (single source of truth)
 * - Must be idempotent (safe to retry) — PaymentsService.initiateRefund() is
 *   idempotent and only re-calls the gateway when no refund is in flight
 *
 * Runs on a DEDICATED 'payment' queue (not 'order') so this worker is the sole
 * consumer of refund jobs. BullMQ workers on a shared queue are competing
 * consumers with no job-name routing, so co-locating refunds with order jobs
 * would risk a refund being picked up — and silently dropped — by the timeout
 * or delivery worker.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PaymentsService } from '@/payments/payments.service';

/**
 * Process Refund Job Data
 */
export interface ProcessRefundJobData {
  orderId: string;
  reason: string;
  triggeredBy?: string; // Who triggered the refund (for logging)
}

/**
 * Process Refund Job Processor
 *
 * Idempotent - safe to retry. Re-running for an already-refunded order is a
 * no-op handled inside PaymentsService.initiateRefund().
 */
@Processor('payment', {
  concurrency: 5, // Process up to 5 refunds concurrently
})
export class ProcessRefundJob extends WorkerHost {
  private readonly logger = new Logger(ProcessRefundJob.name);
  private paymentsService?: PaymentsService;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  /**
   * Lazy load PaymentsService to avoid a circular dependency between
   * QueueModule and PaymentsModule.
   */
  private async getPaymentsService(): Promise<PaymentsService> {
    if (!this.paymentsService) {
      this.paymentsService = await this.moduleRef.get(PaymentsService, {
        strict: false,
      });
    }
    return this.paymentsService;
  }

  async process(job: Job<ProcessRefundJobData>): Promise<void> {
    const { orderId, reason, triggeredBy } = job.data;

    this.logger.log(
      `Processing refund for order ${orderId} (job: ${job.id}, triggered by: ${triggeredBy || 'system'})`,
    );

    try {
      const paymentsService = await this.getPaymentsService();

      const result = await paymentsService.initiateRefund(
        orderId,
        reason || 'Order failed after payment',
      );

      if (result.refunded) {
        this.logger.log(
          `Refund completed for order ${orderId} (job: ${job.id}, status: ${result.refundStatus}, amount: ₹${result.amount ?? 'n/a'})`,
        );
      } else {
        // Not refundable (no payment / not SUCCESS). This is a terminal,
        // expected outcome — do NOT throw, or BullMQ would retry forever.
        this.logger.log(
          `No refund issued for order ${orderId} (job: ${job.id}): ${result.message}`,
        );
      }
    } catch (error) {
      // Transient/gateway errors reach here. Re-throw so BullMQ retries with
      // exponential backoff.
      this.logger.error(
        `Failed to process refund for order ${orderId} (job: ${job.id}):`,
        error,
      );
      throw error;
    }
  }
}
