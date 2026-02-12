## Complete Data Flow Architecture

### Overview
All app pages now fetch data from API with intelligent fallback to dummy data, ensuring consistency across the platform. Data flows through the Zustand cart store, maintaining state across navigation.

---

## 1. HOME PAGE (`/app/(tabs)/home/index.tsx`)
**API Calls:**
- `categoriesApi.getCategories()` → Categories list
- `sellersApi.getAvailableSellers(params: { category, lat, lng })` → Nearby sellers
- `ordersApi.getMyOrders?.()` → Last service info

**Data Processing:**
```
API Data → Normalize → Use Dummy if Error → Display
```

**Data Passed to Next Page:**
- Shop Click → `/shop-detail?shopId={shop.id}`

---

## 2. SHOP DETAIL PAGE (`/app/shop-detail.tsx`)
**API Calls:**
- `sellersApi.getSeller(shopId)` → Seller profile
- `productsApi.getSellerProducts(shopId)` → Products for seller

**Data Format:**
```typescript
Product {
  id: string;
  sellerId: string;
  shopName: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
}
```

**Cart Store Update (on add item):**
```typescript
useCartStore.addItem({
  id: product.id,
  sellerId: shopInfo.id,        // ← Tracks which shop
  shopName: shopInfo.name,       // ← Shop metadata
  name: product.name,
  description: product.description,
  price: product.price,
  category: product.category,
  image: product.image,
})

useCartStore.setSelectedSeller(shopInfo.id, shopInfo.name)
```

**Navigation to Checkout:**
- Cart Bar Click → `/checkout`
- All item data + seller metadata in store

---

## 3. PICKUP DELIVERY PAGE (`/app/pickup-delivery.tsx`)
**API Calls:**
- `sellersApi.getAvailableSellers(lat, lng)` → Delivery partners

**Data Processing:**
- User selects pickup/drop locations
- User selects delivery partner
- User confirms booking

**Cart Store Update (on confirm):**
```typescript
storeSetDeliveryProvider(selectedPartner)
storeSetDeliveryFee(selectedPartnerData.price)
storeSetPickupLocation({ lat, lng, label })
storeSetDropLocation({ lat, lng, address })
```

**Navigation:**
- Confirm Button → `/checkout`

---

## 4. CHECKOUT PAGE (`/app/checkout.tsx`)
**Data Source:** Cart Store (no new API calls)

**Displays:**
```
Shop Header (from cart.selectedShopName)
  ↓
Items List (from cart.items with seller metadata)
  ↓
Delivery Partners (from cart.dropLocation OR new selection)
  ↓
Payment Method Selection
  ↓
Pricing Breakdown
  ├─ Items Subtotal (calculated from cart)
  ├─ Delivery Fee (from cart or selected partner)
  └─ Total
```

**Data Retrieved from Cart Store:**
```typescript
selectedSellerId      // Shop that owns items
selectedShopName      // Display shop name
items[]               // All cart items with seller info
selectedDeliveryProvider  // Chosen delivery provider
deliveryFee          // Associated fee
pickupLocation       // From pickup-delivery page
dropLocation         // From pickup-delivery page
```

**Flow Variations:**

**Path 1: Shopping Flow**
```
Home → Click Shop → Shop Detail → Add Items → Checkout
```
- Cart filled with products + shop metadata
- Cart: selectedShopName = "Shop Name"
- Checkout displays: "FROM Shop Name"

**Path 2: Pick & Drop Flow**
```
Home → Click "Create Order" → Pick & Drop → Confirm → Checkout
```
- Cart empty initially
- Delivery locations in cart
- Checkout shows pickup/drop details
- Checkout: selectedShopName = null (for delivery service)

---

## 5. CART STORE STRUCTURE (`/src/store/cart.store.ts`)

```typescript
interface CartItem {
  id: string;
  sellerId: string;              // ← Links to shop
  shopName: string;              // ← Metadata for display
  name: string;
  description: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface CartState {
  // Items
  items: CartItem[]

  // Seller tracking
  selectedSellerId?: string | null
  selectedShopName?: string | null
  
  // Delivery info (from Pickup & Drop OR selected at checkout)
  pickupLocation?: { lat, lng, label } | null
  dropLocation?: { lat, lng, address } | null
  selectedDeliveryProvider?: string | null
  deliveryFee?: number | null
  
  // Payment
  paymentMethod?: 'prepay' | 'postpay'
  deliveryAddress?: string | null
}
```

---

## 6. API SERVICES

### Categories API
```typescript
categoriesApi.getCategories() 
→ Category[]
```

### Sellers API  
```typescript
sellersApi.getAvailableSellers(params)
→ SellerListItem[]
  {
    seller_id: string
    shop_name: string
    address: string
    price_breakdown: { per_page: number }
    prep_time_min: number
    distance_km?: number
  }

sellersApi.getSeller(id)
→ SellerListItem
```

### Products API (NEW)
```typescript
productsApi.getSellerProducts(sellerId)
→ Product[]
  {
    id: string
    sellerId: string
    category: string
    name: string
    description: string
    price: number
    image?: string
  }
```

### Orders API
```typescript
ordersApi.getMyOrders()
→ OrderListItem[]
```

---

## 7. FALLBACK STRATEGY

Each page implements:
```typescript
const data = useMemo(() => {
  if (isError || !apiData) return DUMMY_DATA
  return apiData
}, [apiData, isError])
```

**Fallback Data Available:**
- Home: DUMMY_QUICK_SERVICES, DUMMY_SHOPS
- Shop Detail: DEMO_PRODUCTS
- Pickup Delivery: DUMMY_DELIVERY_PARTNERS
- Orders: demo order structure

---

## 8. DATA VALIDATION CHECKLIST

✅ Home → Shop Detail: Shop ID passed as param  
✅ Shop Detail → Checkout: Items with seller metadata in store  
✅ Checkout displays: Shop name from cart.selectedShopName  
✅ Pickup Delivery → Checkout: Locations stored in cart  
✅ Checkout displays: Correct totals + seller info  
✅ All currency: ₹ INR (consistent across pages)  
✅ All images: Proper URLs with fallback  
✅ Error states: Fallback to dummy data  
✅ Loading states: Loader component shown  

---

## 9. COMPLETE USER JOURNEYS

### Journey A: Shopping
```
1. Home Page
   - API: Get categories, sellers
   - Display: Services, nearby shops
   
2. Click on Shop
   - Navigate: /shop-detail?shopId=X
   
3. Shop Detail Page  
   - API: Get seller profile, products for seller X
   - Set: cart.setSelectedSeller(X, shopName)
   - Action: Add items → cart.addItem(product + sellerId + shopName)
   
4. Click Cart / Go to Checkout
   - Navigate: /checkout
   
5. Checkout Page
   - Display:
     * "FROM {cart.selectedShopName}"
     * Items from cart (with seller metadata)
     * Delivery partner selection UI
     * Payment method UI
   - Action: Select delivery + payment
   - Store: cart.setDeliveryProvider()
   - Action: Confirm → Submit order
```

### Journey B: Instant Delivery  
```
1. Home Page
   - API: Get categories, sellers
   
2. Click "Create Order" 
   - Navigate: /pickup-delivery
   
3. Pickup Delivery Page
   - API: Get delivery partners for location
   - Action: Select locations, package, partner
   - Store:
     * storeSetPickupLocation()
     * storeSetDropLocation()
     * storeSetDeliveryProvider()
     * storeSetDeliveryFee()
   - Action: Confirm → Navigate /checkout
   
4. Checkout Page  
   - Display:
     * No shop header (cart.selectedShopName = null)
     * Pickup/Drop location details
     * Selected delivery partner info
     * Pricing (just delivery fee)
   - Action: Select payment method
   - Action: Confirm → Submit order
```

---

## 10. ENVIRONMENT NOTES

**Currencies:** All amounts shown in INR (₹)  
**Images:** Placeholder URLs for demo, will use real CDN in production  
**Locations:** Coordinates from location store or user input  
**Authentication:** Not yet implemented (Phase 4G)  
**Real-time Updates:** Not yet implemented (future via WebSocket)  

---

## 11. NEXT IMPLEMENTATION STEPS

1. **Backend API Implementation:**
   - GET `/products?sellerId=X` endpoint
   - GET `/sellers/:id/products` endpoint  
   - Proper validation + error handling

2. **Type Safety:**
   - Generate types from backend OpenAPI spec
   - Use Zod validation  

3. **Caching:**
   - Persist seller/products data locally
   - Cache product list per seller

4. **A/B Testing:**
   - Track user journey paths
   - Measure conversion (shopping vs delivery booking)

5. **Performance:**
   - Pagination for products
   - Lazy load images
   - Debounce search input
