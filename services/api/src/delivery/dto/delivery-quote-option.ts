/**
 * Delivery Quote Option DTO
 *
 * Represents a single delivery provider option with quote details.
 * Users can choose from multiple options with different pricing and ETAs.
 */

export interface DeliveryQuoteOption {
  provider: string; // 'UBER_DIRECT', 'DUNZO', 'PORTER', etc.
  displayName: string; // 'Uber Direct', 'Dunzo', 'Porter', etc.
  estimatedFee: number; // Delivery fee in rupees
  estimatedDurationMinutes: number; // Estimated delivery time in minutes
  estimatedPickupTime?: string; // ISO 8601 timestamp
  estimatedDeliveryTime?: string; // ISO 8601 timestamp
  currency: string; // 'INR'
  features?: string[]; // ['Real-time tracking', 'Insured delivery', etc.]
  logo?: string; // URL to provider logo
  rating?: number; // Provider rating (1-5)
  quoteId?: string; // Provider-specific quote ID for later reference
  expiresAt?: string; // ISO 8601 timestamp when quote expires
}

/**
 * Delivery Quotes Response
 *
 * Response containing all available delivery options for an order.
 */
export interface DeliveryQuotesResponse {
  order_id: string;
  options: DeliveryQuoteOption[];
  selected_provider?: string; // Currently selected provider (if any)
  message: string;
}

/**
 * Select Delivery Provider Request
 *
 * User selection of preferred delivery provider.
 */
export interface SelectDeliveryProviderDto {
  provider: string; // Provider name
  quoteId?: string; // Optional: provider-specific quote ID
}
