# Multi-Cart Implementation - Complete Analysis Report
**Status**: 🔴 CRITICAL ISSUES IDENTIFIED  
**Date**: March 17, 2026  
**Analysis Scope**: apps/user-app multi-cart system (Phase 2/3)

---

# EXECUTIVE SUMMARY

The multi-cart system has a **fundamental architectural flaw**: **TWO SEPARATE CART STORE IMPLEMENTATIONS ARE COEXISTING AND MIXED** throughout the codebase.

- ✗ **OLD**: `useCartStore` (cart.store.ts) - Single-seller only
- ✓ **NEW**: `useMultiCartStore` (multiCartStore.ts) - Multi-seller support
- ❌ **Problem**: Screens use OLD store, components use NEW store → DATA LOSS

**Result**: Items added in shop-detail don't appear in multi-cart view. Users experience broken UX.

---

# 1. CRITICAL ARCHITECTURE CONFLICT

## Two Cart Systems Running in Parallel

### System A: OLD STORE - `useCartStore` (cart.store.ts)
**Purpose**: Single-seller-only cart (pre-multi-cart)  
**Structure**:
```typescript
{
  items: CartItem[]           // All items from ONE seller
  selectedSellerId: string    // Only one seller allowed
  selectedShopName: string
  orderId: string | null
}

// Add item from different shop → ERROR:
// "You can only order from X at a time. Clear your cart to order from another shop."
```

**Used By** (7 locations):
1. [app/shop-detail.tsx](app/shop-detail.tsx#L28-L55) - Add/update/remove items
2. [app/checkout.tsx](app/checkout.tsx#L27) - Checkout screen
3. [app/payment-selection.tsx](app/payment-selection.tsx#L12) - Payment method
4. [app/pickup-delivery.tsx](app/pickup-delivery.tsx#L22) - Delivery options
5. [app/(tabs)/orders.tsx](app/(tabs)/orders.tsx#L17) - Orders history
6. [app/booking-confirmed.tsx](app/booking-confirmed.tsx#L12) - Confirmation
7. [app/order/\*](app/order/) - Order related screens

---

### System B: NEW STORE - `useMultiCartStore` (multiCartStore.ts)
**Purpose**: Multi-seller cart with batch operations  
**Structure**:
```typescript
{
  carts: Record<sellerId, Cart>           // Per-seller carts
  activeCartSellerId: string | null
  selectedForCheckout: Set<string>        // Multiple sellers for batch
  sharedDeliveryAddress: { lat, lng, address }
  checkoutSelections: Record<sellerId, CheckoutSelection>
}

// Multiple sellers allowed:
addItem('seller-1', ...)  → carts['seller-1'].items.push(...)
addItem('seller-2', ...)  → carts['seller-2'].items.push(...)
```

**Used By** (7 components):
1. [app/cart.tsx](app/cart.tsx) - Multi-cart view screen
2. [components/MultiCartView.tsx](src/components/MultiCartView.tsx) - Cart list display
3. [components/StickyCartBar.tsx](src/components/StickyCartBar.tsx) - Bottom bar on shop pages
4. [components/FloatingCartButton.tsx](src/components/FloatingCartButton.tsx) - FAB on home
5. [components/CartModal.tsx](src/components/CartModal.tsx) - Cart preview modal
6. [components/SingleCheckoutFlow.tsx](src/components/SingleCheckoutFlow.tsx) - Single seller checkout
7. [components/CombinedCheckoutFlow.tsx](src/components/CombinedCheckoutFlow.tsx) - Multi seller checkout

---

## Why This Is Broken

### The Data Loss Problem

```
┌─────────────────────────────────────────────────────────────────┐
│ USER FLOW: Add Item to Cart                                     │
└─────────────────────────────────────────────────────────────────┘

1. HOME SCREEN
   FloatingCartButton → useMultiCartStore ✓
   Subscribes to: carts = { seller1: {items: 2}, seller2: {items: 1} }
   Shows badge: "2 carts"
   ↓

2. TAP SELLER 1 LINK → shop-detail.tsx
   Uses: useCartStore ✗ (NOT multiCartStore)
   Component code (Line 28-55):
   │
   const cartItems = useCartStore((state) => state.items);
   const addItem = useCartStore((state) => state.addItem);  ← WRONG
   ↓

3. ADD PRODUCT "Print Project"
   addItem({id: 'print-1', name: 'Print Project', price: 100})
   
   Result:
   useCartStore.items = [{id: 'print-1', ...}]  ← Updates OLD store
   
   useMultiCartStore.carts['seller-1'] = {items: []}  ← NOT updated!
   ↓

4. CLICK "VIEW CART" (StickyCartBar)
   CartModal opens, reads from multiCartStore:
   
   const cart = useMultiCartStore((state) => state.carts['seller-1']);
   
   Result: cart = {items: []}  ← EMPTY! ✗
   
   Item was added to wrong store!
   ↓

5. USER SEES
   ❌ "Your cart is empty"
   Even though they just added an item
```

---

# 2. DETAILED ISSUE BREAKDOWN

## ISSUE #1: Shop Detail Screen Uses Wrong Store
**File**: [app/shop-detail.tsx](app/shop-detail.tsx)  
**Severity**: 🔴 **CRITICAL**  
**Lines**: 28-55  
**Impact**: All items added here are invisible in multi-cart view

### Current Code
```typescript
import { useCartStore } from '@/store/cart.store';  // ✗ WRONG

export default function ShopDetailScreen() {
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);        // ✗
  const removeItem = useCartStore((state) => state.removeItem);  // ✗
  const updateQuantity = useCartStore((state) => state.updateQuantity);  // ✗
  const setSelectedSeller = useCartStore((state) => state.setSelectedSeller);  // ✗
  const cartOrderId = useCartStore((state) => state.orderId);  // ✗

  // Every operation: useCartStore.addItem()
  const handleAddToCart = (product) => {
    addItem({...product});  // ✗ Goes to useCartStore
  };
}
```

### Should Be
```typescript
import { useMultiCartStore } from '@/store/multiCartStore';  // ✓

export default function ShopDetailScreen() {
  const { shopId } = useLocalSearchParams();
  const shopInfo = ...;  // From API
  
  // Subscribe to this seller's cart
  const cart = useMultiCartStore((state) => state.carts[shopId]);
  const addItem = useMultiCartStore((state) => state.addItem);  // ✓

  const handleAddToCart = (product) => {
    addItem(shopId, shopInfo.name, {  // ✓ To multiCartStore
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      // ...
    }, shopInfo.logo);
  };
}
```

### Consequences
- User adds 3 items → not visible in FloatingCartButton or multi-cart view
- StickyCartBar shows empty
- Only visible if user stays on seller page
- Navigation to home → items disappear

---

## ISSUE #2: StickyCartBar Shows Empty Cart

**File**: [src/components/StickyCartBar.tsx](src/components/StickyCartBar.tsx)  
**Lines**: 50-85  
**Severity**: 🟡 **MEDIUM** (Symptom of Issue #1)  
**Impact**: Users can't see their cart on seller detail pages

### Current Code
```typescript
export const StickyCartBar: React.FC<StickyCartBarProps> = ({
  sellerId,
  sellerName,
  // ...
}) => {
  // Subscribe to this seller's cart from multiCartStore
  const cart = useMultiCartStore((state) => state.carts[sellerId]);
  
  const cartCount = cart 
    ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  
  const cartTotal = cart ? /* calculation */ : 0;
  
  // ✗ ALWAYS SHOWS EMPTY because shop-detail added items to useCartStore!
  if (cartCount === 0) return null;  // ← Item was lost above
  
  return (
    <View style={styles.bar}>
      <Text>{cartCount} items • ₹{cartTotal}</Text>
      <TouchableOpacity onPress={() => setCartModalVisible(true)}>
        <Text>View Cart</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### UX Problem
1. User taps shop → Goes to shop-detail.tsx
2. User adds item to cart → useCartStore updated, not multiCartStore
3. StickyCartBar reads multiCartStore (empty) → Shows nothing
4. User thinks item wasn't added
5. Adds item again (or leaves frustrated)

---

## ISSUE #3: Checkout Screen Orphaned

**File**: [app/checkout.tsx](app/checkout.tsx)  
**Severity**: 🔴 **CRITICAL**  
**Lines**: 27, 65-75  
**Impact**: Old checkout is completely disconnected from multi-cart system

### Current State
```typescript
import { useCartStore } from '@/store/cart.store';  // ✗ OLD store

export default function CheckoutScreen() {
  const cartItems = useCartStore((state) => state.items);
  const selectedSellerId = useCartStore((state) => state.selectedSellerId);
  const selectedProvider = useCartStore((state) => state.selectedDeliveryProvider);
  
  // This entire checkout flow is for single-cart only
  // Not integrated with multi-cart flow
}
```

### Why It's Broken
- No component navigates to `/checkout` from multi-cart screen
- Only reachable from OLD single-seller flow (shop-detail)
- Uses useCartStore instead of useMultiCartStore
- If user somehow reaches it with multi-cart items, will only process ONE seller

### Consequences
- Two parallel checkout systems
- User confusion: Which checkout flow should they use?
- Old checkout partially broken (missing screens)

---

## ISSUE #4: API Service Created But Not Used

**File**: [src/api/multiCart.api.ts](src/api/multiCart.api.ts)  
**Severity**: 🟡 **MEDIUM**  
**Lines**: 200-350 (API methods)  
**Impact**: Proper error handling and validation not being used

### Service Exists
```typescript
export const multiCartApi = {
  async createBatchOrders(orders: BatchOrderInput[]): Promise<CreateBatchOrdersResponse> {
    try {
      const res = await client.post('/orders/batch', { orders });
      return unwrap(res) as CreateBatchOrdersResponse;
    } catch (error) {
      throw { message: 'Failed to create batch orders', error, ... };
    }
  },

  async getDeliveryQuotes(sellers, lat, lng, address): Promise<GetDeliveryQuotesResponse> {
    // ...
  },

  validateBatchOrders(orders): { isValid: boolean; errors: string[] } {
    // Validation logic here
  }
};
```

### But NOT Called
Instead, components use raw fetch:

```typescript
// ✗ In CombinedCheckoutFlow.tsx (line ~150):
const response = await fetch('/api/v1/orders/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orders: orderPayloads }),
});

// Should use:
// const response = await multiCartApi.createBatchOrders(orders);  ✓
```

### Consequences
- No validation before sending requests
- No consistent error handling
- No proper TypeScript types for responses
- Manual JSON serialization → room for bugs

---

## ISSUE #5: FloatingCartButton Badge Is Confusing

**File**: [src/components/FloatingCartButton.tsx](src/components/FloatingCartButton.tsx)  
**Severity**: 🟡 **MEDIUM**  
**Lines**: 45-57  
**Impact**: User doesn't know if badge shows item count or seller count

### Current Logic
```typescript
export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  tabBarHeight = 60,
}) => {
  const rawCarts = useMultiCartStore((state) => state.carts);
  
  const activeCarts = useMemo(() => {
    return Object.keys(rawCarts).filter(
      (sellerId) => rawCarts[sellerId].items.length > 0
    );
  }, [rawCarts]);

  const singleCartCount = useMemo(() => {
    if (activeCarts.length === 1) {
      const cart = rawCarts[activeCarts[0]];
      return cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    }
    return 0;
  }, [activeCarts, rawCarts]);

  // ✗ CONFUSING LOGIC:
  const badgeValue = activeCarts.length === 1 
    ? singleCartCount      // If 1 seller: show item count
    : activeCarts.length;  // If 2+ sellers: show seller count

  // User sees "2" - but means:
  // - 2 items? (if 1 seller)
  // - 2 sellers? (if 2+ sellers)
```

### UX Problem
User sees badge "2" but doesn't know if it means:
- 2 items from one seller?
- 2 sellers with items?

### Better Approach
```typescript
// Always consistent:
const badgeValue = activeCarts.reduce((sum, carts, cart) => {
  return sum + cart.items.reduce((s, item) => s + item.quantity, 0);
}, 0);  // Total items across ALL sellers

// Or keep current but make label clear:
<Text style={styles.label}>
  {activeCarts.length === 1 
    ? `${badgeValue} items`
    : `${badgeValue} sellers`
  }
</Text>
```

---

## ISSUE #6: Delivery Quotes Cached Outside Store

**File**: [src/components/StickyCartBar.tsx](src/components/StickyCartBar.tsx)  
**Lines**: 30-50  
**Severity**: 🟡 **MEDIUM**  
**Impact**: Inconsistent delivery option availability

### Current Code
```typescript
useEffect(() => {
  const silentlyFetchDeliveryQuotes = async () => {
    try {
      const userLocation = locationService.getUserLocation();  // ✗ External service
      if (userLocation && sellerLat && sellerLng) {
        await deliveryQuotesCacheService.getDeliveryQuotes(  // ✗ External cache
          // ...
        );
      }
    } catch (error) {
      console.warn('Error silently fetching delivery quotes:', error);
      // Silently fail
    }
  };
  silentlyFetchDeliveryQuotes();
}, [sellerId, sellerName, sellerLat, sellerLng]);
```

### Problems
- Quotes cached in `deliveryQuotesCacheService` (not in Zustand)
- Zustand store not updated → components can't subscribe to quote updates
- No guarantee quotes are available when checkout starts
- If StickyCartBar fetch fails, quotes never cached
- Checkout must fetch again → delays, duplicate requests

### Better Approach
```typescript
// Store delivery quotes in multiCartStore:
interface SellerInCheckout {
  sellerId: string;
  items: CartItem[];
  deliveryQuotes?: DeliveryQuoteOption[];  // ← Store here
  selectedDeliveryOption?: DeliveryQuoteOption;
}

// When StickyCartBar fetches, update store:
const setDeliveryQuotes = useMultiCartStore((s) => s.setDeliveryQuotes);

useEffect(() => {
  setDeliveryQuotes(sellerId, quotes);  // ← Zustand subscribes
}, []);
```

---

## ISSUE #7: Cart Screen (cart.tsx) Not Fully Integrated

**File**: [app/cart.tsx](app/cart.tsx)  
**Severity**: 🟡 **MEDIUM**  
**Lines**: 1-250  
**Impact**: Multi-cart checkout incomplete

### Current Implementation
```typescript
export default function CartScreen() {
  const [viewMode, setViewMode] = useState<'carts' | 'checkout'>('carts');

  if (viewMode === 'carts') {
    // Show list of all seller carts
    return (
      <SafeAreaView>
        <MultiCartView />
      </SafeAreaView>
    );
  }

  if (viewMode === 'checkout') {
    // Combined checkout flow
    return (
      <SafeAreaView>
        <CombinedCheckoutFlow />  // ← Not fully implemented
      </SafeAreaView>
    );
  }
}
```

### Missing Features
1. **Error states** - What if batch order fails?
2. **Partial success** - Some orders succeed, others fail?
3. **Retry logic** - How to retry failed orders?
4. **Progress tracking** - Show which orders are being placed
5. **Validation** - Check data before sending

### Example: No Error Handling
```typescript
// In CombinedCheckoutFlow (not shown but referenced):
const handlePlaceOrders = async () => {
  // No try-catch shown in provided code
  const response = await fetch('/api/v1/orders/batch', {...});
  const result = await response.json();
  
  // What if response.ok is false?
  // What if some orders in batch failed?
  // What if network fails mid-request?
  
  // Neither shown above
};
```

---

## ISSUE #8: Navigation Routes Not Connected

**File**: [app/_layout.tsx](app/_layout.tsx)  
**Severity**: 🟡 **MEDIUM**  
**Impact**: Some screens unreachable or navigation breaks

### Current Routes
```
(tabs)/
  home/
    index.tsx        ← FloatingCartButton shown
    
  orders.tsx         ← Uses useCartStore (OLD)

(auth)/              ← Authentication routes

(root)/              ← Root group

(system)/            ← System routes

Direct routes:
  /index.tsx         ← App entry
  /cart.tsx          ← Multi-cart screen ✓
  /checkout.tsx      ← OLD single checkout (orphaned)
  /payment-selection.tsx  ← Payment (orphaned)
  /booking-confirmed.tsx   ← Confirmation (orphaned)
  /shop-detail.tsx   ← Shop detail (uses OLD store)
```

### Navigation Issues
1. **shop-detail** uses useCartStore → items lost
2. **checkout.tsx** unreachable from multi-cart screen
3. **payment-selection** only for OLD flow
4. **No clear path** for multi-seller checkout

### Current Flow Broken
```
Multi-cart screen (/cart)
  └─ "Checkout" button
      └─ Goes to: ??? 
         Problem: CombinedCheckoutFlow embedded in cart.tsx
         Not reachable via navigation
```

---

## ISSUE #9: Order Draft Store Conflicts

**File**: [src/store/order-draft.store.ts](src/store/order-draft.store.ts)  
**Severity**: 🟡 **MEDIUM**  
**Impact**: Duplicate order state management

### Exists But Orphaned
```typescript
export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  orderId: string | null;
  orderItems: OrderDraftItem[];
  // ... more fields
}));
```

### Uses This Store
- OLD checkout.tsx only (line 45)
- Why separate from useCartStore?
- Why separate from useMultiCartStore?

### Consequence
- THREE store systems managing order-related state
- Sync issues between stores
- Confusion about which store to use

---

## ISSUE #10: Price Calculation Inconsistency

**Files**: Multiple  
**Severity**: 🟡 **MEDIUM**  
**Impact**: Incorrect totals displayed/charged

### The Problem
```typescript
// In multiCartStore.ts (line 375):
getCartTotal: (sellerId) => {
  const cart = state.carts[sellerId];
  return cart.items.reduce((sum, item) => {
    const itemTotal = item.totalPrice 
      ? item.totalPrice * item.quantity  // ← What is totalPrice?
      : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);
};
```

### CartItem Interface
```typescript
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;          // Unit/base price
  quantity: number;
  image?: string;
  category?: string;
  totalPrice?: number;    // ← Optional, but meaning unclear
}
```

### Ambiguity
- **For printing services**: 
  - price = ₹5 per page
  - totalPrice = ₹50 (for 10 page document)
  - quantity = 2 copies
  - Total = ? Is it 50 × 2 = ₹100? Or (5 × 10) × 2?

- **For regular products**:
  - price = ₹199 (unit price)
  - totalPrice = undefined
  - quantity = 2
  - Total = 199 × 2 = ₹398

### Result
- Different screens calculate totals differently
- Users see different amounts on different screens
- Charges don't match displayed totals

---

# 3. COMPONENT HIERARCHY ISSUES

## Cart Component Structure

```
MultiCartView (shows all carts, OLD from Phase 2)
├─ CartCard (per seller)
│  ├─ Header (name, count, total, expand toggle)
│  └─ Items section (when expanded)
│     ├─ ItemRow (per item)
│     └─ ["Checkout" button] - Navigates where?
└─ Checkout button (selected count) - When 2+ selected

CartModal (seller detail cart modal)
├─ Items list (for ONE seller)
├─ Quantity adjusters
└─ "Proceed to checkout" button

SingleCheckoutFlow (single seller)
├─ Step 1: Address selection
├─ Step 2: Delivery partner
└─ Step 3: Order placement

CombinedCheckoutFlow (multiple sellers)
├─ Step 1: Shared address
├─ Step 2: Per-seller delivery partner
└─ Step 3: Batch order placement (INCOMPLETE)
```

### Issues
- **MultiCartView** references undefined checkout behavior
- **SingleCheckoutFlow** path unclear from multi-cart view
- **CombinedCheckoutFlow** has no error handling
- Components embedded in screens (not reusable routes)

---

# 4. DATA FLOW ISSUES

## Current (Broken) Data Flow

### Shop Detail → Add Item
```
shop-detail.tsx
  ├─ Uses: useCartStore ✗
  ├─ Calls: addItem({...})
  ├─ Target: useCartStore.items[]
  └─ Result: Item in useCartStore ONLY ✗

StickyCartBar
  ├─ Uses: useMultiCartStore ✓
  ├─ Reads: carts[sellerId].items
  └─ Result: EMPTY! ✗
```

### Expected (Correct) Data Flow
```
shop-detail.tsx
  ├─ Uses: useMultiCartStore ✓
  ├─ Calls: addItem(sellerId, sellerName, item)
  ├─ Target: useMultiCartStore.carts[sellerId].items[]
  └─ Result: Item in multiCartStore ✓

StickyCartBar
  ├─ Uses: useMultiCartStore ✓
  ├─ Reads: carts[sellerId].items
  └─ Result: Shows item! ✓
```

---

# 5. API INTEGRATION ISSUES

## API Service Layer Gap

### Services Available
```typescript
// ✓ Defined (but not used):
multiCartApi.createBatchOrders(orders)     // POST /orders/batch
multiCartApi.getDeliveryQuotes(sellers, ...)  // POST /delivery/quotations-batch
multiCartApi.validateBatchOrders(orders)   // Local validation
```

### Services Being Used
```typescript
// ✗ Used instead (raw fetch):
fetch('/api/v1/orders/batch', {...})       // In CombinedCheckoutFlow
fetch('/api/v1/orders/single-checkout', ...)  // In SingleCheckoutFlow
```

### Issues
1. No centralized API error handling
2. No request validation before sending
3. No response shape guarantee
4. No retry logic
5. Hardcoded URLs instead of typed API calls

---

# 6. SUMMARY TABLE

| Component | Issue | Store Used | Status | Impact |
|-----------|-------|-----------|--------|--------|
| **shop-detail.tsx** | Uses OLD store | useCartStore | ✗ Broken | Items lost |
| **StickyCartBar** | Empty cart display | useMultiCartStore (right) | ~ Broken | Shows nothing |
| **checkout.tsx** | Orphaned | useCartStore | ✗ Broken | Can't checkout |
| **MultiCartView** | Incomplete checkout | useMultiCartStore | ~ Partial | Can't complete flow |
| **CombinedCheckoutFlow** | No error handling | useMultiCartStore | ~ Partial | Silent failures |
| **multiCart.api.ts** | Not called | - | ✗ Unused | Validation bypassed |
| **FloatingCartButton** | Confusing badge | useMultiCartStore | ✓ Works | UX issue |
| **StickyCartBar** | Cache outside store | external service | ~ Partial | Stale data |
| **order-draft.store.ts** | Conflicts | separate | ✗ Unused | 3 store systems |
| **CartModal** | Referenced but unclear | useMultiCartStore | ✓ Works | Limited functionality |

---

# 7. RECOMMENDATIONS

## Immediate Fixes (Critical Path)

### PRIORITY 1: Fix shop-detail.tsx
**Impact**: Restores basic multi-cart functionality

1. Remove: `import { useCartStore }`
2. Add: `import { useMultiCartStore }`
3. Update all add/remove/update calls to use multiCartStore
4. Update StickyCartBar props to include seller info

### PRIORITY 2: Connect Checkout Flows
**Impact**: Enable multi-cart purchases

1. Update MultiCartView's checkout button to navigate properly
2. Clean up CombinedCheckoutFlow error handling
3. Add progress tracking for batch orders
4. Add retry logic for failures

### PRIORITY 3: Integrate API Service
**Impact**: Proper error handling, validation

1. Replace all `fetch()` with `multiCartApi` service calls
2. Add validation before submit
3. Add request/response logging
4. Handle partial failures in batch orders

### PRIORITY 4: Remove OLD Flows
**Impact**: Simplify codebase

1. Delete useCartStore usage from:
   - checkout.tsx (move to legacy folder or archive)
   - payment-selection.tsx
   - booking-confirmed.tsx
   - OLD order-related screens

2. Consolidate to:
   - useMultiCartStore ONLY
   - Delete order-draft.store.ts

---

# 8. FILES REQUIRING IMMEDIATE ATTENTION

### 🔴 CRITICAL - Must Fix
1. [app/shop-detail.tsx](app/shop-detail.tsx) - Switch to useMultiCartStore
2. [src/components/CombinedCheckoutFlow.tsx](src/components/CombinedCheckoutFlow.tsx) - Add error handling, use API service
3. [app/cart.tsx](app/cart.tsx) - Complete checkout integration

### 🟡 IMPORTANT - Should Fix Soon
4. [app/checkout.tsx](app/checkout.tsx) - Archive or integrate with multi-cart
5. [src/api/multiCart.api.ts](src/api/multiCart.api.ts) - Start using service layer
6. [src/components/FloatingCartButton.tsx](src/components/FloatingCartButton.tsx) - Clarify badge label
7. [src/components/StickyCartBar.tsx](src/components/StickyCartBar.tsx) - Move quotes to Zustand
8. [src/store/order-draft.store.ts](src/store/order-draft.store.ts) - Remove or consolidate

### ℹ️ INFORMATIONAL - Document
- Price calculation rules (for printing vs products)
- Multi-cart checkout flow documentation
- API contract expectations

---

# 9. ARCHITECTURAL DECISION NEEDED

## Question: Single Site or Parallel Checkout?

### Current State
- Two checkout systems developing in parallel
- Unclear if both will coexist or one will be main
- Code comments mention "Old checkout vs new checkout"

### Decision Required
Before fixing, team should decide:

**Option A: Multi-Cart Only**
- Remove all single-cart flows
- Archive everything that uses useCartStore
- DURATION: 1-2 days. RISK: Low

**Option B: Parallel Support**
- Keep both flows working independently
- DURATION: 3-4 days. RISK: Higher maintenance burden

**Option C: Gradual Migration**
- Single-cart → Multi-cart with single item
- Remove old store after Period of parallel support
- DURATION: 2-3 days. RISK: Medium (temporary complexity)

**RECOMMENDATION**: Option A (Multi-cart only) - Simpler, clearer code, easier to maintain.

---

# Files Analyzed

## Store Files
- [src/store/multiCartStore.ts](src/store/multiCartStore.ts) - ✓ NEW multi-seller
- [src/store/cart.store.ts](src/store/cart.store.ts) - ✗ OLD single-seller
- [src/store/order-draft.store.ts](src/store/order-draft.store.ts) - ✗ ORPHANED

## API Files
- [src/api/multiCart.api.ts](src/api/multiCart.api.ts) - ✓ Defined but NOT used
- [src/api/orders.api.ts](src/api/orders.api.ts) - ✓ Single order methods

## Screen Files
- [app/shop-detail.tsx](app/shop-detail.tsx) - ✗ Uses wrong store
- [app/checkout.tsx](app/checkout.tsx) - ✗ Orphaned
- [app/cart.tsx](app/cart.tsx) - ~ Incomplete
- [app/payment-selection.tsx](app/payment-selection.tsx) - ✗ OLD flow
- [app/booking-confirmed.tsx](app/booking-confirmed.tsx) - ✗ OLD flow

## Component Files
- [src/components/MultiCartView.tsx](src/components/MultiCartView.tsx) - ✓ But checkout incomplete
- [src/components/StickyCartBar.tsx](src/components/StickyCartBar.tsx) - ~ Shows empty cart
- [src/components/FloatingCartButton.tsx](src/components/FloatingCartButton.tsx) - ✓ Works but confusing badge
- [src/components/CartModal.tsx](src/components/CartModal.tsx) - ✓ Works
- [src/components/SingleCheckoutFlow.tsx](src/components/SingleCheckoutFlow.tsx) - ~ Path unclear
- [src/components/CombinedCheckoutFlow.tsx](src/components/CombinedCheckoutFlow.tsx) - ~ Error handling missing

---

**Analysis Complete**  
**Generated**: March 17, 2026  
**Version**: 1.0  
**Status**: Ready for remediation
