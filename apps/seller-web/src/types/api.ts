/**
 * API response/request types for the seller console, derived from the NestJS
 * backend serializers (services/api/src) and the Prisma schema.
 *
 * Money / lat-lng fields arrive as numbers from the seller endpoints (the
 * service layer coerces Prisma Decimals with Number()), but we keep them
 * `number | string` defensively where a raw Decimal might leak through.
 */
import type { OrderStatus, SellerStatus } from '@repo/types'

export type Numeric = number | string

/* ── Auth ─────────────────────────────────────────────────────────────── */

export interface AuthUser {
  id: string
  phone: string
  role: 'USER' | 'SELLER' | 'ADMIN'
  name?: string | null
  email?: string | null
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  refreshTokenExpiresIn: number
  user: AuthUser
}

/* ── Categories / location ────────────────────────────────────────────── */

export interface Category {
  id: string
  name: string
  status: string
  description?: string | null
  iconPath?: string | null
}

export interface AutocompleteResult {
  placeId: string
  description: string
  latitude?: number
  longitude?: number
}

/* ── Seller profile ───────────────────────────────────────────────────── */

export interface SellerCategoryRef {
  id: string
  name: string
  status?: string
}

export interface SellerStats {
  totalOrders: number
  completedOrders: number
  totalRevenue: number
}

export interface SellerProfile {
  id: string
  shopName: string
  address: string
  description: string | null
  latitude: Numeric
  longitude: Numeric
  pricePerPage: Numeric | null
  prepTimeMinutes: number | null
  status: SellerStatus
  statusUpdatedAt: string | null
  isTrending: boolean
  isVerified: boolean
  isSuspended: boolean
  imagePath: string | null
  imageUrl?: string | null
  rating: Numeric | null
  categories: SellerCategoryRef[]
  stats: SellerStats
}

export interface RegisterSellerInput {
  shopName: string
  address: string
  description?: string
  latitude: number
  longitude: number
  categoryIds: string[]
  pricePerPage?: number
  prepTimeMinutes?: number
}

export interface UpdateSellerInput {
  shopName?: string
  address?: string
  description?: string
  latitude?: number
  longitude?: number
  pricePerPage?: number
  prepTimeMinutes?: number
  imagePath?: string
}

/* ── Products ─────────────────────────────────────────────────────────── */

export interface Product {
  id: string
  sellerId: string
  name: string
  description: string | null
  category: string
  unit: string | null
  price: number
  mrp: number | null
  discountPercent: number | null
  image: string | null
  inStock: boolean
  isBestSeller: boolean
}

export interface ProductListResponse {
  items: Product[]
  pagination: { total: number; limit: number; offset: number }
}

export interface ProductInput {
  name: string
  description?: string
  category: string
  unit?: string
  price: number
  mrp?: number
  image?: string
  inStock?: boolean
  isBestSeller?: boolean
}

/* ── Orders ───────────────────────────────────────────────────────────── */

export interface OrderCustomer {
  id: string
  phone: string
  name: string | null
}

/** A single line in orderPayload.items (products) or printing config. */
export interface OrderItem {
  productId?: string
  name?: string
  quantity?: number
  price?: Numeric
  totalPrice?: Numeric
  // Printing config (category-agnostic payload may carry these)
  pages?: number
  copies?: number
  color?: boolean | string
  paperSize?: string
  notes?: string
}

export interface OrderFile {
  id: string
  url: string
  type: string
  originalName: string | null
  pageCount: number | null
}

export interface OrderPricing {
  itemCost: Numeric | null
  deliveryFee: Numeric | null
  totalAmount: Numeric | null
}

/** Shape returned by GET /orders/seller/orders (list). */
export interface SellerOrderSummary {
  order_id: string
  status: OrderStatus
  user: OrderCustomer | null
  category: { id: string; name: string } | null
  orderPayload: { items?: OrderItem[]; notes?: string } & Record<string, unknown>
  pricing: OrderPricing
  createdAt: string
  updatedAt: string
}

export interface OrderStateHistoryEntry {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  triggeredBy: string | null
  reason: string | null
  createdAt: string
}

/** Shape returned by GET /orders/:id (detail). */
export interface SellerOrderDetail {
  order_id: string
  status: OrderStatus
  items: OrderItem[]
  orderPayload: { items?: OrderItem[]; notes?: string } & Record<string, unknown>
  files: OrderFile[]
  seller: { id: string; shopName: string; address: string } | null
  drop: { address: string | null; latitude: Numeric | null; longitude: Numeric | null }
  delivery: {
    status: string
    providerName: string | null
    trackingUrl: string | null
  } | null
  pricing: OrderPricing
  createdAt: string
  updatedAt: string
  stateHistory: OrderStateHistoryEntry[]
}

/* ── Earnings & payouts ───────────────────────────────────────────────── */

export type EarningsPeriod = 'today' | 'week' | 'month' | 'all'

export interface EarningsOrderRow {
  orderId: string
  amount: number
  itemsSummary: string
  date: string
}

export interface EarningsSummary {
  period: EarningsPeriod
  total: number
  orderCount: number
  averageOrderValue: number
  availableBalance: number
  lifetimeRevenue: number
  orders: EarningsOrderRow[]
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

export interface BankDetails {
  accountHolder: string
  accountNumber: string
  ifscCode: string
}

export interface PayoutRequest {
  id: string
  amount: number
  status: PayoutStatus
  bankDetails: BankDetails | null
  note: string | null
  processedAt: string | null
  createdAt: string
}

export interface CreatePayoutInput {
  amount: number
  bankDetails?: BankDetails
}

/* ── Files ────────────────────────────────────────────────────────────── */

export interface PresignedUrlResponse {
  uploadUrl: string
  fileKey: string
  publicUrl?: string
  expiresIn?: number
}
