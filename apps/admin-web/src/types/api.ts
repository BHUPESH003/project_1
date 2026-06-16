/**
 * API response/request types for the admin console, derived from the NestJS
 * backend serializers (services/api/src/admin) and the Prisma schema.
 *
 * IMPORTANT — casing is inconsistent across admin endpoints (a known backend
 * quirk): the orders endpoints return snake_case, while sellers/analytics/
 * categories return camelCase. Each hook normalises its endpoint into the clean
 * camelCase types below, so pages never touch raw wire fields.
 *
 * Money / lat-lng may arrive as numbers (service coerces with Number()) or as
 * raw Prisma Decimal strings — keep them `Numeric` and pass through toNum().
 */
import type {
  OrderStatus,
  SellerStatus,
  PaymentStatus,
  PaymentMethod,
  DeliveryStatus,
  CategoryStatus,
  DeliveryProvider,
} from '@repo/types'

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

/* ── Pagination ───────────────────────────────────────────────────────── */

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/* ── Analytics ────────────────────────────────────────────────────────── */

export interface AnalyticsOverview {
  orders: { total: number; byStatus: Record<string, number> }
  revenue: { today: number; thisWeek: number; thisMonth: number }
  sellers: { active: number; total: number }
  users: { withOrders: number }
}

export type AnalyticsGranularity = 'daily' | 'weekly' | 'monthly'

export interface OrdersAnalytics {
  ordersOverTime: { period: string; count: number; revenue: number }[]
  averageOrderValue: number
  cancellationRate: number
  sellerRejectionRate: number
}

export interface SellersAnalytics {
  byRevenue: { sellerId: string | null; shopName: string | null; revenue: number }[]
  byOrderCount: { sellerId: string | null; shopName: string | null; orderCount: number }[]
  fulfillmentTime: { sellerId: string; shopName: string | null; avgMinutes: number }[]
  acceptanceRate: {
    sellerId: string
    shopName: string | null
    rate: number
    totalAssigned: number
    rejected: number
  }[]
}

/* ── Orders ───────────────────────────────────────────────────────────── */

export interface OrderCustomer {
  id: string
  phone: string
  name: string | null
}

export interface OrderSellerRef {
  id: string
  shopName: string
  address: string
}

/** Normalised order row (from snake_case GET /admin/orders). */
export interface AdminOrderRow {
  orderId: string
  status: OrderStatus
  user: OrderCustomer
  seller: OrderSellerRef | null
  category: { id: string; name: string }
  itemCost: number | null
  deliveryFee: number | null
  totalAmount: number | null
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

export interface OrderPaymentDetail {
  id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  gatewayName: string | null
  gatewayPaymentId: string | null
  refundAmount: number | null
  refundStatus: string | null
  refundedAt: string | null
  paidAt: string | null
}

export interface OrderDeliveryDetail {
  id: string
  providerName: string | null
  providerTaskId: string | null
  providerTrackingUrl: string | null
  status: DeliveryStatus
  partnerName: string | null
  partnerPhone: string | null
  failureReason: string | null
}

export interface OrderFile {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  storageUrl: string
  pageCount: number | null
}

/** Normalised order detail (from snake_case GET /admin/orders/:id). */
export interface AdminOrderDetail extends AdminOrderRow {
  orderPayload: Record<string, unknown>
  dropAddress: string | null
  failureReason: string | null
  completedAt: string | null
  payment: OrderPaymentDetail | null
  delivery: OrderDeliveryDetail | null
  files: OrderFile[]
  stateHistory: OrderStateHistoryEntry[]
}

/* ── Sellers (camelCase from backend) ─────────────────────────────────── */

export interface SellerCategoryJoin {
  category: { id: string; name: string; status?: CategoryStatus }
}

export interface AdminSeller {
  id: string
  userId: string
  shopName: string
  address: string
  description: string | null
  latitude: Numeric
  longitude: Numeric
  status: SellerStatus
  statusUpdatedAt: string | null
  isTrending: boolean
  isVerified: boolean
  isSuspended: boolean
  pricePerPage: Numeric | null
  prepTimeMinutes: number | null
  imagePath: string | null
  rating: Numeric | null
  createdAt: string
  updatedAt: string
  user?: OrderCustomer
  categories?: SellerCategoryJoin[]
}

export interface AdminSellerDetail extends AdminSeller {
  stats: {
    totalOrders: number
    completedOrders: number
    totalRevenue: number
  }
}

export interface UpdateAdminSellerInput {
  shopName?: string
  address?: string
  status?: SellerStatus
  isTrending?: boolean
}

/* ── Banners ──────────────────────────────────────────────────────────── */

export interface Banner {
  id: string
  badge: string | null
  title: string
  subtitle: string | null
  imagePath: string
  ctaText: string | null
  ctaLink: string | null
  displayOrder: number
  isActive: boolean
  startAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BannerInput {
  badge?: string | null
  title: string
  subtitle?: string | null
  imagePath: string
  ctaText?: string | null
  ctaLink?: string | null
  displayOrder?: number
  isActive?: boolean
  startAt?: string | null
  endAt?: string | null
}

/* ── Categories ───────────────────────────────────────────────────────── */

export interface Category {
  id: string
  name: string
  status: CategoryStatus
  description: string | null
  displayOrder: number
  iconPath: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryInput {
  id: string
  name: string
  status?: CategoryStatus
  description?: string
  displayOrder?: number
  iconPath?: string
}

export interface UpdateCategoryInput {
  name?: string
  status?: CategoryStatus
  description?: string
  displayOrder?: number
  iconPath?: string
}

/* ── Payouts ──────────────────────────────────────────────────────────── */

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

export interface BankDetails {
  accountHolder: string
  accountNumber: string
  ifscCode: string
}

export interface AdminPayout {
  id: string
  seller: { id: string; shopName: string }
  amount: number
  status: PayoutStatus
  bankDetails: BankDetails | null
  note: string | null
  processedAt: string | null
  processedBy: string | null
  createdAt: string
}

/* ── Products (read-only on seller detail) ────────────────────────────── */

export interface Product {
  id: string
  sellerId: string
  name: string
  description: string | null
  category: string
  unit: string | null
  price: Numeric
  mrp: Numeric | null
  image: string | null
  inStock: boolean
  isBestSeller: boolean
}

/* ── User (settings) ──────────────────────────────────────────────────── */

export interface UserProfile {
  id: string
  phone: string
  name: string | null
  email: string | null
  role: string
}

/* ── Files ────────────────────────────────────────────────────────────── */

export interface PresignedUrlResponse {
  uploadUrl: string
  fileKey: string
  publicUrl?: string
  expiresIn?: number
}

export type { DeliveryProvider }
