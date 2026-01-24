/**
 * Notification Provider Interface
 *
 * Defines the contract for all notification providers.
 * All providers (Firebase, OneSignal, Twilio, etc.) must implement this interface.
 *
 * CRITICAL RULES:
 * - Providers must be replaceable
 * - No provider-specific logic outside adapters
 * - Failures must be logged, not thrown (notifications are non-critical)
 */

/**
 * Push Notification Request
 */
export interface PushNotificationRequest {
  /** Recipient user ID */
  userId: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Optional data payload */
  data?: Record<string, unknown>;
  /** Optional image URL */
  imageUrl?: string;
}

/**
 * Push Notification Response
 */
export interface PushNotificationResponse {
  /** Whether notification was sent successfully */
  success: boolean;
  /** Provider message ID (if available) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * SMS Notification Request
 */
export interface SmsNotificationRequest {
  /** Recipient phone number (E.164 format) */
  phoneNumber: string;
  /** SMS message body */
  message: string;
}

/**
 * SMS Notification Response
 */
export interface SmsNotificationResponse {
  /** Whether SMS was sent successfully */
  success: boolean;
  /** Provider message ID (if available) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Notification Provider Interface
 *
 * All notification providers must implement this interface.
 * Providers are responsible for:
 * - Sending push notifications
 * - Sending SMS notifications
 * - Handling provider-specific errors gracefully
 */
export interface NotificationProvider {
  /**
   * Get provider name (e.g., "FIREBASE", "ONESIGNAL", "TWILIO")
   */
  getProviderName(): string;

  /**
   * Send push notification
   *
   * @param request - Push notification request
   * @returns Push notification response
   * @throws Never throws - failures are logged and returned in response
   */
  sendPush(request: PushNotificationRequest): Promise<PushNotificationResponse>;

  /**
   * Send SMS notification
   *
   * @param request - SMS notification request
   * @returns SMS notification response
   * @throws Never throws - failures are logged and returned in response
   */
  sendSms(request: SmsNotificationRequest): Promise<SmsNotificationResponse>;
}
