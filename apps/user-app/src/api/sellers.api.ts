/**
 * Sellers API – backend GET /sellers (ONLINE only).
 * Query: category, lat, lng. Backend does not expose sort; client can sort by price/distance.
 */

import client from './client';
import { unwrap } from './unwrap';

export interface SellerListItem {
  seller_id: string;
  shop_name: string;
  address: string;
  price_breakdown: { per_page: number };
  prep_time_min: number;
  status: string;
  distance_km?: number;
}

/** Response from GET /sellers/:id - seller profile details */
export interface SellerDetail {
  id: string;
  shopName: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerPage: number;
  prepTimeMinutes: number;
  status: string;
  statusUpdatedAt: string | null;
  user?: {
    id: string;
    phone: string;
    name: string | null;
  };
  categories?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

const DEFAULT_SERVICE_RADIUS_KM = 50;

export const sellersApi = {
  async getAvailableSellers(params: {
    category?: string;
    lat?: number;
    lng?: number;
    maxDistanceKm?: number;
  }): Promise<SellerListItem[]> {
    const { lat, lng, ...rest } = params;
    const maxDistanceKm = params.maxDistanceKm ?? (lat != null && lng != null ? DEFAULT_SERVICE_RADIUS_KM : undefined);
    const res = await client.get('/sellers', { params: { ...rest, lat, lng, maxDistanceKm } });
    return unwrap(res) as SellerListItem[];
  },

  async getSeller(id: string): Promise<SellerDetail> {
    const res = await client.get(`/sellers/${id}`);
    return unwrap(res) as SellerDetail;
  },
};
