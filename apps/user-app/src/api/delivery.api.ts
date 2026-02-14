/**
 * Delivery API – standalone pickup/drop location booking
 * For ad-hoc deliveries without creating an order
 */

import client from './client';
import { unwrap } from './unwrap';

/** Pickup/Drop location details request */
export interface PickupDropBookingRequest {
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  itemDescription?: string;
  pickupContactPhone?: string;
  dropContactPhone?: string;
}

/** Delivery provider option */
export interface DeliveryProviderOption {
  provider: string; // 'UBER_DIRECT', 'DUNZO', 'PORTER'
  displayName: string; // 'Uber Direct', 'Dunzo', 'Porter'
  estimatedFee: number; // Fee in rupees
  estimatedDurationMinutes: number; // ETA in minutes
  currency: string; // 'INR'
  rating: number; // Provider rating
  quoteId: string; // Quote ID
}

/** Response from POST /delivery/pickup-drop */
export interface PickupDropBookingResponse {
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  providers: DeliveryProviderOption[];
  cheapest?: {
    provider: string;
    displayName: string;
    estimatedFee: number;
  };
  fastest?: {
    provider: string;
    displayName: string;
    estimatedDurationMinutes: number;
  };
  totalOptions: number;
  distanceKm: number;
  message: string;
}

export const deliveryApi = {
  /**
   * Get available delivery options for pickup/drop locations
   * Standalone feature - no order required
   * 
   * @param booking - Pickup and drop location details with coordinates
   * @returns Available delivery provider options
   */
  async getPickupDropOptions(
    booking: PickupDropBookingRequest,
  ): Promise<PickupDropBookingResponse> {
    const res = await client.post('/delivery/pickup-drop', booking);
    return unwrap(res) as PickupDropBookingResponse;
  },
};
