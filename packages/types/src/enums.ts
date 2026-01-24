/**
 * Shared Enums - Single Source of Truth
 *
 * All enums used across the application are defined here.
 * These enums are synchronized with Prisma schema enums.
 *
 * IMPORTANT: When adding new enum values, update both:
 * 1. This file (packages/types/src/enums.ts)
 * 2. Prisma schema (services/api/prisma/schema.prisma)
 */

/**
 * User Role Enum
 * Defines user roles in the system
 */
export enum UserRole {
  USER = 'USER', // End users placing orders
  SELLER = 'SELLER', // Shop owners fulfilling orders
  ADMIN = 'ADMIN', // Internal operations team
}

/**
 * Seller Status Enum
 * Defines seller availability status
 */
export enum SellerStatus {
  ONLINE = 'ONLINE', // Actively accepting orders
  OFFLINE = 'OFFLINE', // Not accepting orders (default after login)
}

/**
 * Order Status Enum
 * Defines order state machine states
 */
export enum OrderStatus {
  // Happy path states
  CREATED = 'CREATED', // Order draft created, no seller selected
  SELLER_SELECTED = 'SELLER_SELECTED', // User selected a seller
  PAID = 'PAID', // Payment successful
  SELLER_ACCEPTED = 'SELLER_ACCEPTED', // Seller accepted the order
  PREPARING = 'PREPARING', // Seller is preparing the order
  READY_FOR_PICKUP = 'READY_FOR_PICKUP', // Order ready, delivery assignment triggered
  PICKED_UP = 'PICKED_UP', // Delivery partner picked up
  DELIVERED = 'DELIVERED', // Order completed successfully

  // Failure states
  SELLER_REJECTED = 'SELLER_REJECTED', // Seller rejected the order
  ORDER_EXPIRED = 'ORDER_EXPIRED', // Order expired (timeout)
  DELIVERY_FAILED = 'DELIVERY_FAILED', // Delivery partner failed
  USER_CANCELLED = 'USER_CANCELLED', // User cancelled (pre-pickup only)
}

/**
 * Category Status Enum
 * Defines category visibility and functionality
 */
export enum CategoryStatus {
  ACTIVE = 'ACTIVE', // Category is live
  COMING_SOON = 'COMING_SOON', // Category visible but not functional
  INACTIVE = 'INACTIVE', // Category hidden
}

/**
 * Payment Status Enum
 * Defines payment transaction states
 */
export enum PaymentStatus {
  PENDING = 'PENDING', // Payment initiated
  SUCCESS = 'SUCCESS', // Payment successful
  FAILED = 'FAILED', // Payment failed
  REFUNDED = 'REFUNDED', // Payment refunded
}

/**
 * Payment Method Enum
 * Defines payment methods supported
 */
export enum PaymentMethod {
  UPI = 'UPI', // UPI payment (MVP only method)
  CASH = 'CASH', // Cash on delivery (future)
  CARD = 'CARD', // Card payment (future)
}

/**
 * Delivery Status Enum
 * Defines delivery state machine states
 */
export enum DeliveryStatus {
  PENDING = 'PENDING', // Delivery not yet assigned
  ASSIGNED = 'ASSIGNED', // Delivery partner assigned
  PICKED_UP = 'PICKED_UP', // Item picked up from seller
  IN_TRANSIT = 'IN_TRANSIT', // On the way to customer
  DELIVERED = 'DELIVERED', // Successfully delivered
  FAILED = 'FAILED', // Delivery failed
  CANCELLED = 'CANCELLED', // Delivery cancelled
}

/**
 * OTP Purpose Enum
 * Defines the purpose of OTP generation
 */
export enum OtpPurpose {
  LOGIN = 'LOGIN', // OTP for user login/authentication
  // Future: PASSWORD_RESET, PHONE_VERIFICATION, etc.
}

/**
 * File Type Enum
 * Defines file types supported
 */
export enum FileType {
  IMAGE = 'IMAGE', // Image files
  PDF = 'PDF', // PDF documents
  DOCUMENT = 'DOCUMENT', // Other documents
}

/**
 * File Status Enum
 * Defines file upload/processing states
 */
export enum FileStatus {
  UPLOADING = 'UPLOADING', // File is being uploaded
  PROCESSING = 'PROCESSING', // File is being processed
  READY = 'READY', // File is ready for use
  FAILED = 'FAILED', // File upload/processing failed
}

/**
 * Delivery Provider Enum
 * Defines delivery aggregator providers
 */
export enum DeliveryProvider {
  DUNZO = 'DUNZO', // Dunzo delivery service
  PORTER = 'PORTER', // Porter delivery service
  // Future providers can be added here
}
