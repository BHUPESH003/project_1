// Mirrors backend DTOs

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RequestOtpResponse {
  message: string;
  expiresInSeconds?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode?: string;
  lat: number;
  lng: number;
  receiverName?: string;
  receiverPhone?: string;
}

export interface CreateAddressDto {
  label: 'HOME' | 'WORK' | 'OTHER';
  line1: string;
  line2?: string;
  city: string;
  lat: number;
  lng: number;
  receiverName?: string;
  receiverPhone?: string;
}

export interface AutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// ─── Seller ───────────────────────────────────────────────────────────────────

export interface Seller {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  prepTime?: number;
  isOnline: boolean;
  isVerified: boolean;
  isFavorited?: boolean;
  categories: string[];
  startingPrice?: string;
  address?: {
    line1: string;
    city: string;
    lat: number;
    lng: number;
  };
}

export interface PaginatedSellers {
  data: Seller[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ─── Category / Banner ────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  isActive: boolean;
  isComingSoon: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  targetUrl?: string;
  bgColor?: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  mrp?: number;
  imageUrl?: string;
  isPrinting: boolean;
  isBestSeller?: boolean;
  isPopular?: boolean;
  categoryId: string;
  categoryName?: string;
  inStock: boolean;
}

export interface ProductsByCategory {
  categoryId: string;
  categoryName: string;
  products: Product[];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchProduct extends Product {
  sellerName: string;
  sellerId: string;
}

export interface SearchResult {
  sellers: Seller[];
  products: SearchProduct[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItemApi {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  price: number;
  quantity: number;
  isPrinting: boolean;
  printConfig?: PrintConfig;
  fileKeys?: string[];
}

// ─── Printing ─────────────────────────────────────────────────────────────────

export interface PrintConfig {
  colorMode: 'color' | 'bw';
  paperSize: 'A4' | 'A3' | 'Letter';
  copies: number;
  pages: 'all' | string;
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  url: string;
  key: string;
}

export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  sizeBytes: number;
  pageCount?: number;
}

export interface PrintingAddToCartPayload {
  productId: string;
  sellerId: string;
  quantity: number;
  fileKeys: string[];
  printConfig: PrintConfig;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Order {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  status: OrderStatus;
  items: CartItemApi[];
  total: number;
  deliveryAddress: Address;
  deliveryProvider?: string;
  deliveryEta?: string;
  deliveryPrice?: number;
  trackingUrl?: string;
  stateHistory?: OrderStateHistory[];
  createdAt: string;
  updatedAt: string;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface DeliveryQuote {
  id: string;
  provider: string;
  eta: string;
  price: number;
  isRecommended?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
}

export interface CheckoutSellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItemApi[];
  subtotal: number;
  deliveryQuotes: DeliveryQuote[];
}

export interface CheckoutSummary {
  sellers: CheckoutSellerGroup[];
  itemTotal: number;
}

export interface PlaceOrderPayload {
  deliveryAddressId: string;
  sellerDeliveryChoices: { sellerId: string; deliveryQuoteId: string }[];
}

export interface MultiOrderResponse {
  orders: Order[];
}

// ─── Order state history (timeline) ──────────────────────────────────────────

export interface OrderStateHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ─── User update ──────────────────────────────────────────────────────────────

export interface UpdateUserDto {
  name?: string;
  email?: string;
  fcmToken?: string;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  newSellers: boolean;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentIntent {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}
