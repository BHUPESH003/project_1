/**
 * Order State Machine Types
 *
 * Defines the order state machine structure.
 * This is the authoritative definition of order states and valid transitions.
 *
 * CRITICAL: State transitions are enforced server-side.
 * Invalid transitions MUST throw errors.
 */

import { OrderStatus } from '@repo/types';

/**
 * Valid state transitions
 * Maps from current state to array of allowed next states
 */
export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Success flow states
  CREATED: [OrderStatus.SELLER_SELECTED, OrderStatus.USER_CANCELLED],
  SELLER_SELECTED: [
    OrderStatus.SELLER_SELECTED,
    OrderStatus.PAID,
    OrderStatus.USER_CANCELLED,
  ],
  PAID: [
    OrderStatus.SELLER_ACCEPTED,
    OrderStatus.SELLER_REJECTED,
    OrderStatus.USER_CANCELLED,
  ],
  SELLER_ACCEPTED: [OrderStatus.PREPARING, OrderStatus.USER_CANCELLED],
  PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.USER_CANCELLED],
  READY_FOR_PICKUP: [OrderStatus.PICKED_UP, OrderStatus.USER_CANCELLED],
  PICKED_UP: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  DELIVERED: [], // Terminal state

  // Failure states (terminal)
  SELLER_REJECTED: [OrderStatus.SELLER_SELECTED], // Allow fallback to different seller
  ORDER_EXPIRED: [], // Terminal state
  DELIVERY_FAILED: [], // Terminal state
  USER_CANCELLED: [], // Terminal state
};

/**
 * Check if a state transition is valid
 * @param fromState - Current state
 * @param toState - Target state
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(
  fromState: OrderStatus,
  toState: OrderStatus,
): boolean {
  const allowedTransitions = ORDER_STATE_TRANSITIONS[fromState];
  return allowedTransitions.includes(toState);
}

/**
 * Get all valid next states for a given current state
 * @param currentState - Current order state
 * @returns Array of valid next states
 */
export function getValidNextStates(currentState: OrderStatus): OrderStatus[] {
  return ORDER_STATE_TRANSITIONS[currentState] || [];
}

/**
 * Check if a state is terminal (no further transitions allowed)
 * @param state - Order state to check
 * @returns true if state is terminal, false otherwise
 */
export function isTerminalState(state: OrderStatus): boolean {
  return ORDER_STATE_TRANSITIONS[state].length === 0;
}

/**
 * Check if a state is a failure state
 * @param state - Order state to check
 * @returns true if state is a failure state, false otherwise
 */
export function isFailureState(state: OrderStatus): boolean {
  return [
    OrderStatus.SELLER_REJECTED,
    OrderStatus.ORDER_EXPIRED,
    OrderStatus.DELIVERY_FAILED,
    OrderStatus.USER_CANCELLED,
  ].includes(state);
}
