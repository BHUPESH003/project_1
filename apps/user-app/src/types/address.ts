/**
 * Canonical Address model – single source of truth across the entire app.
 * Every screen, component, and store references this type.
 */

export interface Address {
  /** Unique identifier. For device-detected addresses, a generated UUID. For saved, the backend ID. */
  id: string;
  /** User-facing label: Home, Work, Other, or custom string. */
  label: string;
  /** Human-readable full address string. */
  fullAddress: string;
  /** Latitude coordinate. */
  lat: number;
  /** Longitude coordinate. */
  lng: number;
  /** Optional landmark for delivery context. */
  landmark?: string;
}

export type AddressLabel = 'Home' | 'Work' | 'Other';
