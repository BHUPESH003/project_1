import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * Notifications Controller - MVP Scope
 *
 * ⚠️ NO NOTIFICATION ENDPOINTS IN API CONTRACT v1
 *
 * Notifications in MVP:
 * - Real-time updates via WebSocket/SSE (not REST)
 * - Push notifications via Firebase/OneSignal
 * - SMS notifications for critical updates
 *
 * This module handles:
 * - Sending notifications (internal service)
 * - Notification delivery status tracking (internal)
 * - NOT a user-facing REST API
 *
 * Notification triggers:
 * - Order status changes → notify user
 * - New order → notify seller
 * - Delivery updates → notify user
 *
 * Removed:
 * - All REST CRUD operations
 * - Notification inbox (not in MVP, handled by apps natively)
 * - Mark as read (not in MVP)
 * - Notification history (not in MVP)
 */
@Controller('internal/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ❌ ALL ENDPOINTS REMOVED
  // Notifications are event-driven, triggered by order state changes
  // Handled internally via NotificationsService
  // No REST API exposure in MVP

  // TODO: In future, may add:
  // - GET /v1/notifications (user inbox)
  // - POST /v1/notifications/:id/read (mark as read)
  // - WebSocket endpoint for real-time updates
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: N/A - No REST endpoints. Notifications are internal service calls only.
 *
 * Notifications are triggered by:
 * - OrderService on state transitions
 * - PaymentService on payment events
 * - DeliveryService on delivery updates
 */
