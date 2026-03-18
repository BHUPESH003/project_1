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

export interface SellerCategoryTag {
  id: string;
  name: string;
}

export interface NearbySeller {
  id: string;
  shopName: string;
  address: string;
  description?: string | null;
  distance: number;
  rating: number;
  imageUrl?: string | null;
  isOpen: boolean;
  isFavorited: boolean;
  prepTimeMinutes?: number;
  categories: SellerCategoryTag[];
}

export interface NearbySellersPage {
  sellers: NearbySeller[];
  total: number;
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
    const payload = unwrap<any>(res);
    if (Array.isArray(payload)) return payload as SellerListItem[];
    if (Array.isArray(payload?.sellers)) return payload.sellers as SellerListItem[];
    if (Array.isArray(payload?.data?.sellers)) return payload.data.sellers as SellerListItem[];
    return [];
  },

  async getSeller(id: string): Promise<SellerDetail> {
    const res = await client.get(`/sellers/${id}`);
    return unwrap(res) as SellerDetail;
  },

  async getNearbySellers(params: {
    lat: number;
    lng: number;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<NearbySellersPage> {
    const res = await client.get('/sellers', {
      params: {
        lat: params.lat,
        lng: params.lng,
        category: params.categoryId,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      },
    });
    const payload = unwrap<{ sellers?: unknown[]; total?: number; pagination?: { total?: number } }>(res);
    const sellersRaw = Array.isArray(payload) ? payload : payload?.sellers ?? [];
    const total =
      typeof payload?.total === 'number'
        ? payload.total
        : typeof payload?.pagination?.total === 'number'
          ? payload.pagination.total
          : sellersRaw.length;

    const sellers = (sellersRaw as Array<Record<string, unknown>>).map((seller) => ({
      id: String(seller.id ?? seller.seller_id ?? ''),
      shopName: String(seller.shopName ?? seller.shop_name ?? 'Unknown Shop'),
      address: String(seller.address ?? ''),
      description: typeof seller.description === 'string' ? seller.description : null,
      distance: Number(seller.distance ?? seller.distance_km ?? 0),
      rating: Number(seller.rating ?? 0),
      imageUrl: (() => {
        const img = seller.imageUrl ?? seller.image_url;
        return img !== null && img !== undefined && typeof img === 'string' ? img : null;
      })(),
      isOpen: Boolean(seller.isOpen ?? (seller.status ? String(seller.status).toUpperCase() === 'ONLINE' : true)),
      isFavorited: Boolean(seller.isFavorited ?? false),
      prepTimeMinutes: Number(seller.prepTimeMinutes ?? seller.prep_time_min ?? 15),
      categories: Array.isArray(seller.categories)
        ? (seller.categories as Array<{ id?: string; name?: string }>).map((c) => ({ id: String(c.id ?? ''), name: String(c.name ?? '') }))
        : [],
    }));

    return { sellers, total };
  },
};
