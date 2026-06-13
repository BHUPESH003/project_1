/**
 * Response adapters: translate raw backend shapes → frontend types.
 *
 * The backend and frontend were designed independently with different field
 * names (snake_case vs camelCase, flat vs nested) and different pagination
 * conventions. All mapping lives here so hooks stay clean and components
 * never see the raw backend data.
 */

import type {
  Seller,
  Category,
  Order,
  Address,
  SearchResult,
  SearchProduct,
  User,
  CartItemApi,
  PaginatedSellers,
  CreateAddressDto,
} from './types';

// ─── Seller ──────────────────────────────────────────────────────────────────

export function mapSeller(raw: any): Seller {
  const cats: any[] = raw.categories ?? [];
  const priceRaw = raw.price_breakdown?.per_page ?? raw.pricePerPage;
  return {
    id: raw.seller_id ?? raw.id ?? '',
    name: raw.shop_name ?? raw.shopName ?? raw.name ?? '',
    description: raw.description,
    imageUrl: raw.image_url ?? raw.imageUrl ?? raw.imagePath ?? undefined,
    coverImageUrl: raw.cover_image_url ?? raw.coverImageUrl ?? undefined,
    rating: raw.rating ?? 0,
    reviewCount: raw.review_count ?? raw.reviewCount ?? 0,
    distance: raw.distanceKm ?? raw.distance_km ?? raw.distance ?? undefined,
    prepTime: raw.prep_time_min ?? raw.prepTimeMinutes ?? raw.prepTime ?? undefined,
    isOnline: raw.status === 'ONLINE' || raw.isOnline === true,
    isVerified: raw.is_verified ?? raw.isVerified ?? false,
    isFavorited: raw.is_favorited ?? raw.isFavorited ?? raw.isFavorite ?? false,
    categories: cats.map((c) => (typeof c === 'string' ? c : (c.name ?? ''))),
    startingPrice: priceRaw != null ? `₹${priceRaw}` : raw.startingPrice ?? undefined,
    address: raw.address != null
      ? {
          line1: typeof raw.address === 'string'
            ? raw.address
            : raw.address.line1 ?? raw.address.addressLine ?? String(raw.address),
          city: (typeof raw.address === 'object' && raw.address.city) ?? '',
          lat: raw.latitude ?? raw.lat ?? (typeof raw.address === 'object' ? raw.address.lat : 0) ?? 0,
          lng: raw.longitude ?? raw.lng ?? (typeof raw.address === 'object' ? raw.address.lng : 0) ?? 0,
        }
      : undefined,
  };
}

/** Maps the backend `{ sellers, pagination }` page to the frontend PaginatedSellers shape. */
export function mapSellerPage(raw: any): PaginatedSellers {
  const sellers: Seller[] = (raw.sellers ?? raw.data ?? []).map(mapSeller);
  const pg = raw.pagination ?? {};
  const total: number = pg.total ?? 0;
  const limit: number = pg.limit ?? sellers.length;
  const offset: number = pg.offset ?? 0;
  return {
    data: sellers,
    total,
    page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
    pageSize: limit,
    hasNextPage: offset + limit < total,
  };
}

// ─── Category ────────────────────────────────────────────────────────────────

export function mapCategory(raw: any): Category {
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    slug: raw.slug ?? (raw.name ?? '').toLowerCase().replace(/\s+/g, '-'),
    iconUrl: raw.iconUrl ?? raw.iconPath ?? undefined,
    isActive: raw.isActive ?? raw.status === 'ACTIVE',
    isComingSoon: raw.isComingSoon ?? raw.status === 'COMING_SOON',
  };
}

// ─── Order ───────────────────────────────────────────────────────────────────

function mapOrderItem(raw: any): CartItemApi {
  return {
    id: raw.cartItemId ?? raw.id ?? '',
    productId: raw.productId ?? raw.product_id ?? '',
    sellerId: raw.sellerId ?? raw.seller_id ?? '',
    sellerName: raw.sellerName ?? raw.seller_name ?? '',
    productName: raw.productName ?? raw.name ?? '',
    price: raw.price ?? 0,
    quantity: raw.quantity ?? 1,
    isPrinting: raw.isPrinting ?? false,
    printConfig: raw.printConfig ?? undefined,
    fileKeys: raw.fileKeys ?? undefined,
  };
}

export function mapOrder(raw: any): Order {
  return {
    id: raw.order_id ?? raw.id ?? '',
    sellerId: raw.seller?.id ?? raw.sellerId ?? '',
    sellerName: raw.seller?.shopName ?? raw.seller?.name ?? raw.sellerName ?? '',
    sellerPhone: raw.seller?.phone ?? raw.sellerPhone ?? undefined,
    status: raw.status ?? 'PENDING_PAYMENT',
    items: Array.isArray(raw.items) ? raw.items.map(mapOrderItem) : [],
    total: raw.pricing?.totalAmount ?? raw.pricing?.total ?? raw.total ?? 0,
    deliveryAddress: mapAddress(raw.deliveryAddress ?? raw.delivery?.address ?? {}),
    deliveryProvider: raw.delivery?.providerName ?? raw.deliveryProvider ?? undefined,
    deliveryEta: raw.delivery?.eta != null ? String(raw.delivery.eta) : raw.deliveryEta ?? undefined,
    deliveryPrice: raw.pricing?.deliveryFee ?? raw.deliveryPrice ?? undefined,
    trackingUrl: raw.delivery?.trackingUrl ?? raw.trackingUrl ?? undefined,
    stateHistory: raw.stateHistory ?? [],
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
}

// ─── Address ─────────────────────────────────────────────────────────────────

export function mapAddress(raw: any): Address {
  return {
    id: raw.id ?? '',
    label: raw.label ?? 'OTHER',
    line1: raw.line1 ?? raw.addressLine ?? '',
    line2: raw.line2 ?? undefined,
    city: raw.city ?? '',
    state: raw.state ?? undefined,
    pincode: raw.pincode ?? undefined,
    lat: raw.lat ?? raw.latitude ?? 0,
    lng: raw.lng ?? raw.longitude ?? 0,
    receiverName: raw.receiverName ?? undefined,
    receiverPhone: raw.receiverPhone ?? undefined,
  };
}

/**
 * Map the frontend CreateAddressDto (line1/lat/lng) to the backend-accepted
 * payload (addressLine/latitude/longitude). Backend uses forbidNonWhitelisted
 * so unrecognised keys cause 400.
 */
export function toCreateAddressPayload(dto: CreateAddressDto): Record<string, unknown> {
  const addressLine = [dto.line1, dto.line2, dto.city].filter(Boolean).join(', ');
  return {
    label: dto.label,
    addressLine,
    latitude: dto.lat,
    longitude: dto.lng,
    ...(dto.receiverName && { receiverName: dto.receiverName }),
    ...(dto.receiverPhone && { receiverPhone: dto.receiverPhone }),
  };
}

// ─── User ────────────────────────────────────────────────────────────────────

export function mapUser(raw: any): User {
  return {
    id: raw.id ?? '',
    phone: raw.phone ?? '',
    role: raw.role ?? 'USER',
    name: raw.name ?? undefined,
    email: raw.email ?? undefined,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export function mapSearchResult(raw: any): SearchResult {
  const shops: any[] = raw.shops ?? raw.sellers ?? [];
  const prods: any[] = raw.products ?? [];
  return {
    sellers: shops.map(mapSeller),
    products: prods.map((p: any): SearchProduct => ({
      id: p.product_id ?? p.id ?? '',
      name: p.name ?? '',
      description: p.description ?? undefined,
      price: p.price ?? 0,
      mrp: p.mrp ?? undefined,
      imageUrl: p.image ?? p.image_url ?? p.imageUrl ?? undefined,
      isPrinting: p.isPrinting ?? false,
      isBestSeller: p.isBestSeller ?? undefined,
      isPopular: p.isPopular ?? undefined,
      categoryId: p.category_id ?? p.categoryId ?? '',
      categoryName: p.category ?? p.categoryName ?? undefined,
      inStock: p.inStock ?? true,
      sellerId: p.seller_id ?? p.sellerId ?? '',
      sellerName: p.shop_name ?? p.shopName ?? p.sellerName ?? '',
    })),
  };
}

// ─── Favorites ───────────────────────────────────────────────────────────────

/** Backend returns `{ sellerId, createdAt, seller: { ... } }` per favourite. */
export function mapFavorite(raw: any): Seller {
  return mapSeller(raw.seller ?? raw);
}
