/**
 * Notification Templates
 *
 * Defines notification templates for different order state transitions.
 * Templates are simple placeholders that can be customized later.
 *
 * CRITICAL RULES:
 * - Templates are best-effort, not critical path
 * - Failures in template rendering don't block notifications
 * - Templates can be extended with user preferences later
 */

import { OrderStatus } from '@repo/types';

/**
 * Notification Intent
 * Represents what notification should be sent
 */
export interface NotificationIntent {
  /** Delivery method */
  type: 'PUSH' | 'SMS' | 'BOTH';
  /** Notification category — used to gate against user preferences */
  category: 'ORDER_UPDATE' | 'MARKETING' | 'SYSTEM';
  /** Recipient user ID */
  userId: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Optional data payload */
  data?: Record<string, unknown>;
}

/**
 * Get notification intent for order state transition
 *
 * @param orderId - Order ID
 * @param fromState - Previous state
 * @param toState - New state
 * @param userId - Order owner
 * @param sellerId - Seller (if applicable)
 * @returns Array of notification intents
 */
export function getNotificationIntents(
  orderId: string,
  fromState: OrderStatus | null,
  toState: OrderStatus,
  userId: string,
  sellerId?: string,
): NotificationIntent[] {
  const intents: NotificationIntent[] = [];

  switch (toState) {
    case OrderStatus.PAID:
      // Notify seller: New order received
      if (sellerId) {
        intents.push({
          type: 'PUSH',
          category: 'ORDER_UPDATE',
          userId: sellerId,
          title: 'New Order Received',
          body: `You have a new order #${orderId.substring(0, 8)}. Please accept or reject.`,
          data: {
            orderId,
            type: 'NEW_ORDER',
            action: 'accept_or_reject',
          },
        });
      }
      // Notify user: Order confirmed
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Confirmed',
        body: `Your order #${orderId.substring(0, 8)} has been confirmed. Waiting for seller acceptance.`,
        data: {
          orderId,
          type: 'ORDER_CONFIRMED',
        },
      });
      break;

    case OrderStatus.SELLER_ACCEPTED:
      // Notify user: Order accepted
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Accepted',
        body: `Your order #${orderId.substring(0, 8)} has been accepted by the seller.`,
        data: {
          orderId,
          type: 'ORDER_ACCEPTED',
        },
      });
      break;

    case OrderStatus.PREPARING:
      // Notify user: Seller is preparing the order
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Being Prepared',
        body: `Your order #${orderId.substring(0, 8)} is being prepared. We'll notify you when it's ready.`,
        data: {
          orderId,
          type: 'ORDER_PREPARING',
        },
      });
      break;

    case OrderStatus.SELLER_REJECTED:
      // Notify user: Order rejected
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Rejected',
        body: `Your order #${orderId.substring(0, 8)} was rejected. You can select a different seller.`,
        data: {
          orderId,
          type: 'ORDER_REJECTED',
          action: 'select_seller',
        },
      });
      break;

    case OrderStatus.READY_FOR_PICKUP:
      // Notify user: Order ready
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Ready',
        body: `Your order #${orderId.substring(0, 8)} is ready for pickup. Delivery has been assigned.`,
        data: {
          orderId,
          type: 'ORDER_READY',
        },
      });
      break;

    case OrderStatus.PICKED_UP:
      // Notify user: Order picked up
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Picked Up',
        body: `Your order #${orderId.substring(0, 8)} has been picked up and is on the way.`,
        data: {
          orderId,
          type: 'ORDER_PICKED_UP',
        },
      });
      break;

    case OrderStatus.DELIVERED:
      // Notify user: Order delivered
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Delivered',
        body: `Your order #${orderId.substring(0, 8)} has been delivered successfully.`,
        data: {
          orderId,
          type: 'ORDER_DELIVERED',
        },
      });
      // Notify seller: Order completed
      if (sellerId) {
        intents.push({
          type: 'PUSH',
          category: 'ORDER_UPDATE',
          userId: sellerId,
          title: 'Order Completed',
          body: `Order #${orderId.substring(0, 8)} has been delivered successfully.`,
          data: {
            orderId,
            type: 'ORDER_COMPLETED',
          },
        });
      }
      break;

    case OrderStatus.ORDER_EXPIRED:
      // Notify user: Order expired
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Order Expired',
        body: `Your order #${orderId.substring(0, 8)} has expired. You can create a new order.`,
        data: {
          orderId,
          type: 'ORDER_EXPIRED',
          action: 'create_new_order',
        },
      });
      break;

    case OrderStatus.USER_CANCELLED:
      // Notify seller: Order was cancelled by the customer.
      // NOTE: sellerId here is the Seller entity ID, not the seller's User ID.
      // For MVP with stubbed FCM tokens this is fine; a future fix should pass
      // the seller's userId so push tokens resolve correctly.
      if (sellerId) {
        intents.push({
          type: 'PUSH',
          category: 'ORDER_UPDATE',
          userId: sellerId,
          title: 'Order Cancelled',
          body: `Order #${orderId.substring(0, 8)} was cancelled by the customer.`,
          data: {
            orderId,
            type: 'ORDER_CANCELLED_BY_USER',
          },
        });
      }
      break;

    case OrderStatus.DELIVERY_FAILED:
      // Notify user: Delivery failed
      intents.push({
        type: 'PUSH',
          category: 'ORDER_UPDATE',
        userId,
        title: 'Delivery Failed',
        body: `Delivery for order #${orderId.substring(0, 8)} failed. Please contact support.`,
        data: {
          orderId,
          type: 'DELIVERY_FAILED',
          action: 'contact_support',
        },
      });
      // Notify seller too
      if (sellerId) {
        intents.push({
          type: 'PUSH',
          category: 'ORDER_UPDATE',
          userId: sellerId,
          title: 'Delivery Failed',
          body: `Delivery for order #${orderId.substring(0, 8)} failed.`,
          data: {
            orderId,
            type: 'DELIVERY_FAILED_SELLER',
          },
        });
      }
      break;

    default:
      // No notification for other states
      break;
  }

  return intents;
}
