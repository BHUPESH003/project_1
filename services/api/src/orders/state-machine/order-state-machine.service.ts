/**
 * Order State Machine Service
 *
 * SINGLE SOURCE OF TRUTH for order state transitions.
 * All order state changes MUST go through this service.
 *
 * CRITICAL RULES:
 * - Invalid transitions MUST throw explicit errors (no silent failures)
 * - Every successful transition writes OrderStateHistory
 * - No state mutation outside this module
 * - State machine is enforced server-side
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';
import { QueueService } from '@/queue/queue.service';
import {
  isValidTransition,
  isTerminalState,
  isFailureState,
  getValidNextStates,
} from './order-state-machine.types';

/**
 * Options for state transition
 */
export interface TransitionOptions {
  /** Order ID */
  orderId: string;
  /** Target state */
  toState: OrderStatus;
  /** Who/what triggered the transition (userId or "system") */
  triggeredBy: string;
  /** Optional reason for transition */
  reason?: string;
}

/**
 * Result of state transition
 */
export interface TransitionResult {
  /** Order ID */
  orderId: string;
  /** Previous state */
  fromState: OrderStatus;
  /** New state */
  toState: OrderStatus;
  /** Whether transition was successful */
  success: boolean;
}

@Injectable()
export class OrderStateMachineService {
  private readonly logger = new Logger(OrderStateMachineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Validate if a state transition is allowed
   *
   * @param currentState - Current order state
   * @param nextState - Target state
   * @returns true if transition is valid, false otherwise
   */
  validateTransition(
    currentState: OrderStatus,
    nextState: OrderStatus,
  ): boolean {
    return isValidTransition(currentState, nextState);
  }

  /**
   * Assert that a state transition is allowed
   * Throws BadRequestException if transition is invalid
   *
   * @param currentState - Current order state
   * @param nextState - Target state
   * @throws BadRequestException if transition is invalid
   */
  assertTransitionAllowed(
    currentState: OrderStatus,
    nextState: OrderStatus,
  ): void {
    if (!this.validateTransition(currentState, nextState)) {
      const validNextStates = getValidNextStates(currentState);
      throw new BadRequestException(
        `Invalid state transition from ${currentState} to ${nextState}. ` +
          `Valid next states: ${validNextStates.join(', ') || 'none (terminal state)'}`,
      );
    }
  }

  /**
   * Check if a state is terminal (no further transitions allowed)
   *
   * @param state - Order state to check
   * @returns true if state is terminal, false otherwise
   */
  isTerminalState(state: OrderStatus): boolean {
    return isTerminalState(state);
  }

  /**
   * Check if a state is a failure state
   *
   * @param state - Order state to check
   * @returns true if state is a failure state, false otherwise
   */
  isFailureState(state: OrderStatus): boolean {
    return isFailureState(state);
  }

  /**
   * Get all valid next states for a given current state
   *
   * @param currentState - Current order state
   * @returns Array of valid next states
   */
  getValidNextStates(currentState: OrderStatus): OrderStatus[] {
    return getValidNextStates(currentState);
  }

  /**
   * Execute a state transition
   *
   * This is the ONLY method that should be used to change order state.
   * It:
   * 1. Validates the transition
   * 2. Updates the order status
   * 3. Records state history
   * 4. Handles terminal states (e.g., sets completedAt for DELIVERED)
   *
   * @param options - Transition options
   * @returns Transition result
   * @throws BadRequestException if transition is invalid
   */
  async transition(options: TransitionOptions): Promise<TransitionResult> {
    const { orderId, toState, triggeredBy, reason } = options;

    // Get current order state
    const order = await this.prisma.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const fromState = order.status as OrderStatus;

    // Validate transition
    this.assertTransitionAllowed(fromState, toState);

    // Check if already in target state (idempotent)
    if (fromState === toState) {
      this.logger.warn(
        `Order ${orderId} is already in state ${toState}. Transition skipped.`,
      );
      return {
        orderId,
        fromState,
        toState,
        success: true,
      };
    }

    // Execute transition in a transaction
    const result = await this.prisma.prisma.$transaction(async (tx: any) => {
      // Update order status
      const updateData: {
        status: OrderStatus;
        completedAt?: Date;
      } = {
        status: toState,
      };

      // Set completedAt timestamp when order reaches DELIVERED state
      if (toState === OrderStatus.DELIVERED) {
        updateData.completedAt = new Date();
      }

      await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // Record state history
      await tx.orderStateHistory.create({
        data: {
          orderId,
          fromStatus: fromState,
          toStatus: toState,
          triggeredBy,
          reason: reason || null,
        },
      });

      return {
        orderId,
        fromState,
        toState,
        success: true,
      };
    });

    this.logger.log(
      `Order ${orderId} transitioned from ${fromState} to ${toState} by ${triggeredBy}`,
    );

    return result;
  }

  /**
   * Record state history without changing order state
   * Useful for initial state recording (CREATED state)
   *
   * @param orderId - Order ID
   * @param state - Initial state
   * @param triggeredBy - Who/what triggered the creation
   */
  async recordInitialState(
    orderId: string,
    state: OrderStatus,
    triggeredBy: string,
  ): Promise<void> {
    await this.prisma.prisma.orderStateHistory.create({
      data: {
        orderId,
        fromStatus: null, // No previous state for initial state
        toStatus: state,
        triggeredBy,
        reason: 'Order created',
      },
    });

    this.logger.log(
      `Recorded initial state ${state} for order ${orderId} by ${triggeredBy}`,
    );
  }

  /**
   * Get state history for an order
   *
   * @param orderId - Order ID
   * @returns Array of state history records, ordered by creation time
   */
  async getStateHistory(orderId: string) {
    return this.prisma.prisma.orderStateHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Emit domain events and enqueue jobs based on state transition
   *
   * CRITICAL: This is the ONLY place where state transitions trigger jobs.
   * Controllers and services must NOT enqueue jobs directly.
   *
   * @param orderId - Order ID
   * @param fromState - Previous state
   * @param toState - New state
   * @param triggeredBy - Who triggered the transition
   */
  private async emitStateChangeEvents(
    orderId: string,
    fromState: OrderStatus,
    toState: OrderStatus,
    triggeredBy: string,
  ): Promise<void> {
    try {
      // Get order details for job data
      const order = await this.prisma.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          userId: true,
          sellerId: true,
          createdAt: true,
        },
      });

      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found when emitting state change events`,
        );
        return;
      }

      // Enqueue state change notification job
      // This job will send notifications to user and seller (if applicable)
      await this.queueService.enqueueStateChangeNotification(
        orderId,
        fromState,
        toState,
        order.userId,
        order.sellerId || undefined,
        triggeredBy,
      );

      // Enqueue delivery assignment job when order reaches READY_FOR_PICKUP
      if (toState === OrderStatus.READY_FOR_PICKUP) {
        await this.queueService.enqueueAssignDelivery(orderId, triggeredBy);
      }

      // Note: Order timeout job is enqueued when order is created (in OrdersService.create)
      // Not enqueued here to avoid duplicate jobs
    } catch (error) {
      // Log error but don't fail the state transition
      // Job enqueue failures shouldn't block state changes
      this.logger.error(
        `Error emitting state change events for order ${orderId}:`,
        error,
      );
    }
  }
}
