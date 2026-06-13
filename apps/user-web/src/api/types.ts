/**
 * API request/response types — derived from services/api/prisma/schema.prisma
 * and BACKEND_ROADMAP.md. Enums come from @repo/types (never redefined here).
 *
 * NOTE: Prisma `Decimal` fields are serialized to JSON as strings by Nest's
 * default serializer. Money/lat/lng fields are typed `number | string` and
 * must be passed through `toNum()` / `money()` before display or math.
 */
import type {
  OrderStatus,
  PaymentStatus,
  SellerStatus,
  DeliveryStatus,
  CategoryStatus,
  PaymentMethod,
} from '@repo/types'

export type Numeric = number | string
export type ID = string

/* ---- Auth ---- */
export interface AuthUser {
  id: ID
  phone: string
  role: 'USER' | 'SELLER' | 'ADMIN'
  name: string | null
  email: string | null
  notificationOrderUpdates?: boolean
  notificationPromotions?: boolean
  createdAt?: string
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken?: string
}

/* ---- Addresses ---- */
export interface UserAddress {
  id: ID
  userId?: ID
  label: string
  addressLine: string
  receiverName: string | null
  receiverPhone: string | null
  latitude: Numeric | null
  longitude: Numeric | null
  createdAt?: string
}

export interface CreateAddressInput {
  label: string
  addressLine: string
  receiverName?: string
  receiverPhone?: string
  latitude?: number
  longitude?: number
}

/* ---- Location ---- */
export interface ReverseGeocodeResult {
  addressLine: string
  area?: string
  city?: string
  state?: string
  pincode?: string
  latitude: number
  longitude: number
}

export interface AutocompleteResult {
  placeId: string
  description: string
  mainText?: string
  secondaryText?: string
  latitude?: number
  longitude?: number
}

/* ---- Categories ---- */
export interface Category {
  id: ID
  name: string
  status: CategoryStatus
  description: string | null
  displayOrder: number
  iconPath: string | null
  iconUrl?: string | null
}

/* ---- Banners ---- */
export interface Banner {
  id: ID
  badge: string | null
  title: string
  subtitle: string | null
  imagePath: string
  imageUrl?: string | null
  ctaText: string | null
  ctaLink: string | null
  displayOrder: number
}

/* ---- Sellers ---- */
export interface SellerCategoryRef {
  id?: ID
  categoryId: ID
  name?: string
}

export interface Seller {
  id: ID
  shopName: string
  address: string
  description: string | null
  latitude: Numeric
  longitude: Numeric
  status: SellerStatus
  isTrending: boolean
  isVerified: boolean
  pricePerPage: Numeric | null
  discountThreshold: number | null
  discountPercent: Numeric | null
  prepTimeMinutes: number | null
  imagePath: string | null
  imageUrl?: string | null
  rating: Numeric | null
  categories?: SellerCategoryRef[]
  /** Computed by API when lat/lng provided */
  distanceKm?: number
  /** Computed by API: lowest product / starting price */
  startingPrice?: Numeric | null
  isFavorite?: boolean
  createdAt?: string
}

export interface SellersQuery {
  category?: string
  lat?: number
  lng?: number
  maxDistanceKm?: number
  limit?: number
  offset?: number
  sort?: 'nearest' | 'rating' | 'newest'
}

export interface Product {
  id: ID
  sellerId: ID
  name: string
  description: string | null
  category: string
  unit: string | null
  price: Numeric
  mrp: Numeric | null
  image: string | null
  imageUrl?: string | null
  inStock: boolean
  isBestSeller: boolean
}

/* ---- Files ---- */
export interface PresignedUrlResponse {
  uploadUrl: string
  fileKey: string
  bucket?: string
}

export interface ValidatedFile {
  fileId: ID
  originalName: string
  mimeType: string
  sizeBytes: number
  pageCount: number | null
  storageUrl?: string
}

/* ---- Cart ---- */
export interface CartItemFile {
  id: ID
  fileId: ID
  originalName?: string
  pageCount?: number | null
  payload: Record<string, unknown>
}

export interface CartItem {
  id: ID
  sellerId: ID
  productId: ID | null
  quantity: number
  payload: Record<string, unknown>
  priceAtAdd: Numeric
  product?: Product | null
  /** Some endpoints nest minimal seller info on the item. */
  seller?: Pick<Seller, 'id' | 'shopName' | 'imagePath' | 'imageUrl' | 'status'> | null
  files?: CartItemFile[]
  /** computed line total */
  lineTotal?: Numeric
}

export interface CartSellerGroup {
  seller: Pick<Seller, 'id' | 'shopName' | 'imagePath' | 'imageUrl' | 'status'>
  items: CartItem[]
  subtotal: Numeric
}

export interface Cart {
  id: ID
  status: string
  items: CartItem[]
  /** Convenience grouping (computed client-side if absent) */
  sellers?: CartSellerGroup[]
  subtotal?: Numeric
}

export interface AddCartItemInput {
  sellerId: ID
  productId?: ID
  quantity?: number
  payload?: Record<string, unknown>
}

/* ---- Checkout ---- */
export interface DeliveryOption {
  quotationId: ID
  deliveryPartnerId: ID
  providerName: string
  displayName: string
  feeRupees: Numeric
  estimatedMinutes: number
  vehicleType?: string
}

export interface CheckoutBill {
  subtotal: Numeric
  discountAmount: Numeric
  total: Numeric
}

export interface CheckoutSellerSummary {
  seller: Pick<Seller, 'id' | 'shopName' | 'address' | 'imageUrl' | 'imagePath'>
  items: CartItem[]
  bill: CheckoutBill
  deliveryOptions: DeliveryOption[]
  recommendations?: {
    cheapest?: ID
    fastest?: ID
    recommended?: ID
  }
}

export interface MultiCheckoutSummary {
  sellers: CheckoutSellerSummary[]
  deliveryAddress: UserAddress
  combinedTotal: Numeric
}

export interface PlaceMultiOrderInput {
  deliveryAddressId: ID
  sellers: Array<{
    sellerId: ID
    quotationId?: ID
    deliveryFeeRupees?: number
    estimatedMinutes?: number
    vehicleType?: string
  }>
}

export interface PlaceOrderResult {
  orderIds: ID[]
}

/* ---- Orders ---- */
export interface OrderStateHistoryEntry {
  id: ID
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  reason: string | null
  createdAt: string
}

export interface OrderDelivery {
  id: ID
  status: DeliveryStatus
  providerName: string | null
  providerTrackingUrl: string | null
  partnerName: string | null
  partnerPhone: string | null
  estimatedMinutes?: number | null
}

export interface OrderPayment {
  id: ID
  amount: Numeric
  method: PaymentMethod
  status: PaymentStatus
}

export interface OrderLineItem {
  name: string
  quantity: number
  price?: Numeric
  totalPrice?: Numeric
  productId?: ID
}

export interface Order {
  id: ID
  status: OrderStatus
  categoryId?: ID
  /** Resolved line items (API returns `items`); printing orders also carry payload. */
  items?: OrderLineItem[]
  orderPayload?: Record<string, unknown>
  itemCost: Numeric | null
  deliveryFee: Numeric | null
  totalAmount: Numeric | null
  dropAddress?: string | null
  failureReason?: string | null
  createdAt: string
  updatedAt?: string
  completedAt?: string | null
  seller?: Pick<Seller, 'id' | 'shopName' | 'imageUrl' | 'imagePath' | 'address'> | null
  payment?: OrderPayment | null
  delivery?: OrderDelivery | null
  stateHistory?: OrderStateHistoryEntry[]
}

export interface PaymentIntent {
  paymentData: {
    keyId: string
    amount: number
    currency: string
    orderId: string
    prefill?: { name?: string; email?: string; contact?: string }
    notes?: Record<string, string>
  }
}

/* ---- Search ---- */
export interface SearchResults {
  sellers: Seller[]
  products: (Product & { seller?: Pick<Seller, 'id' | 'shopName'> })[]
}
