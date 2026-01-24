/**
 * Queue Configuration
 *
 * Centralized configuration for all queues.
 * Defines retry strategies, backoff policies, and job options.
 */

import { JobsOptions } from 'bullmq';

/**
 * Default job options
 * Applied to all jobs unless overridden
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds, exponential backoff
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

/**
 * Order Queue Job Options
 * For order-related jobs (delivery assignment, timeouts)
 */
export const ORDER_QUEUE_CONFIG = {
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 5, // More retries for critical order operations
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds for order jobs
    },
  } as JobsOptions,
};

/**
 * Notification Queue Job Options
 * For notification jobs (push, SMS, email)
 */
export const NOTIFICATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 3, // Standard retries for notifications
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second for notifications
    },
  } as JobsOptions,
};
