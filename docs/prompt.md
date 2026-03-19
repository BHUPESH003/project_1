@workspace I'm building a hyperlocal delivery app (NestJS + PostgreSQL + 
React Native). I need to implement a MULTI-CART system where products from 
different sellers live in separate carts, with smart UX to manage, view, 
and checkout them independently or combined.

---

### CORE CONCEPT

- Each seller has its own isolated cart
- Active cart = the cart belonging to the seller page the user is currently on
- Inactive carts = all other seller carts, accessible from home/dashboard
- User can checkout one cart OR combine multiple carts into one checkout flow
- Combined checkout = multiple orders created silently in parallel, one per 
  seller, each with its own delivery selection

---

### 1. ZUSTAND MULTI-CART STORE (React Native)

Create a `useCartStore` using Zustand with this shape:
```ts
{
  carts: {
    [sellerId: string]: {
      sellerId: string,
      sellerName: string,
      sellerLogo: string,
      items: CartItem[],
      updatedAt: number
    }
  },
  activeCartSellerId: string | null,

  // Actions
  setActiveCart(sellerId)
  addItem(sellerId, item)
  removeItem(sellerId, itemId)
  updateQty(sellerId, itemId, qty)
  clearCart(sellerId)
  clearAllCarts()
  getCartTotal(sellerId) => number
  getCartCount(sellerId) => number
  getAllCartsWithItems() => Cart[]  // returns only carts with items
}
```

- Persist carts to AsyncStorage so they survive app restarts
- When user opens a seller page, call setActiveCart(sellerId)
- When user leaves seller page (navigation blur), keep activeCartSellerId 
  as is — only reset on explicit action

---

### 2. SELLER PAGE — ACTIVE CART BEHAVIOR (React Native)

On the SellerDetailScreen / ProductListingScreen:

- On mount: call setActiveCart(sellerId)
- Add to cart button: calls addItem(sellerId, item) → optimistic UI update
- Bottom of screen: show a sticky "View Cart" bar ONLY for this seller's cart
  - Shows: item count + total price + "View Cart →" button
  - Tapping it opens CartScreen with activeCartSellerId context
- If user already has items from OTHER sellers in other carts, show a subtle 
  banner at top: "You have active carts from X other sellers" with a 
  "View All" link → navigates to dashboard

---

### 3. CART SCREEN (React Native)

CartScreen should accept a `sellerId` param from navigation:

- If sellerId is passed → show only that seller's cart (normal single cart UX)
- If sellerId is null (accessed from dashboard) → show all carts grouped by 
  seller in a scrollable list

For single seller cart view:
- List items with qty controls, remove option
- Show delivery address selector
- Show available delivery partners for this seller (Uber Direct, Porter, 
  Delhivery) with ETA + price
- "Place Order" button at bottom

For multi-cart view (accessed from dashboard):
- Each seller's cart is a collapsible card showing item count + total
- Checkbox on each cart card to select for combined checkout
- "Checkout Selected (X carts)" CTA at bottom — only visible when 2+ selected
- Also show individual "Checkout" button per cart card for single checkout

---

### 4. FLOATING CART BUTTON — HOME / DASHBOARD (React Native)

- Show a floating action button (FAB) on HomeScreen and DashboardScreen 
  whenever getAllCartsWithItems() returns length > 0
- FAB design: cart icon + badge showing total number of active carts 
  (not items — number of sellers)
- Tapping FAB navigates to CartScreen with sellerId = null (all carts view)
- Animate FAB in/out smoothly using Reanimated 2
- Position: bottom-right, above bottom tab bar, z-index above all content
- If only 1 active cart, FAB badge shows item count instead of cart count

---

### 5. COMBINED CHECKOUT FLOW (React Native)

When user taps "Checkout Selected (X carts)":

Step 1 — Delivery Address
- Single shared address selector (assume same drop location for all orders)
- User confirms address once

Step 2 — Delivery Partner Selection PER SELLER
- Show a list, one row per selected seller cart
- Each row: seller name + their items summary + delivery partner selector 
  (radio: Uber Direct / Porter / Delhivery) + ETA + price
- User must select a delivery partner for each seller before proceeding
- "Confirm All & Place Orders" CTA at bottom

Step 3 — Order Placement (Silent Parallel)
- Show a loading screen: "Placing your orders..."
- Call POST /orders for each seller cart simultaneously using Promise.all()
- Each order payload includes: sellerId, items, deliveryAddress, 
  selectedDeliveryPartner
- On all success: navigate to OrdersConfirmationScreen showing all order IDs
- On partial failure: show which orders succeeded and which failed, with 
  retry option for failed ones
- Clear only the successfully placed carts from Zustand store

---

### 6. NESTJS API CHANGES

#### Update POST /orders endpoint

Accept a batch order creation mode:
```ts
// Single order (existing)
POST /orders
{ sellerId, items[], deliveryAddress, deliveryPartner }

// Batch mode (new)
POST /orders/batch
{
  orders: [
    { sellerId, items[], deliveryAddress, deliveryPartner },
    { sellerId, items[], deliveryAddress, deliveryPartner }
  ]
}
```

- /orders/batch should process each order independently in parallel using 
  Promise.all() internally
- Each sub-order goes through the same validation, inventory check, and 
  delivery partner API call as a single order
- Return response:
```ts
{
  results: [
    { sellerId, orderId, status: 'success' | 'failed', error?: string }
  ]
}
```
- Even if one fails, process the rest — do NOT use a DB transaction across 
  all orders (they are independent)
- Each order gets its own DB transaction

#### Update GET /delivery-partners/availability

Accept sellerId as a query param so frontend can fetch delivery availability 
per seller independently:

GET /delivery-partners/availability?sellerId=X&lat=Y&lng=Z

Returns: available partners with ETA + price for that specific seller's 
pickup location.

---

### 7. POSTGRESQL SCHEMA CHANGES

Add a `seller_id` column to the `cart_items` table if not already present:
```sql
ALTER TABLE cart_items ADD COLUMN seller_id UUID REFERENCES sellers(id);
CREATE INDEX idx_cart_items_seller ON cart_items(user_id, seller_id);
```

If cart is stored server-side, add a `carts` table:
```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  status VARCHAR DEFAULT 'active', -- active | checked_out | abandoned
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, seller_id, status)  -- one active cart per user per seller
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  qty INTEGER DEFAULT 1,
  price_at_add DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```
---

### 8. DATABASE SCHEMA CHANGES — USE EXISTING SEED FILE

IMPORTANT: Do NOT create new migration files or standalone SQL scripts.

- Find the existing seed file in the project (likely at `prisma/seed.ts`, 
  `src/database/seed.ts`, or `db/seeds/index.ts` — check the project 
  structure)
- All schema changes must be applied by updating THAT seed file only
- After updating the seed file, run it to apply changes to the database

#### Steps to follow:

1. Locate the existing seed file using @workspace context
2. Add any new tables (carts, cart_items updates) as raw SQL or Prisma 
   upsert calls within the seed file, placed BEFORE the data seeding section
3. Use CREATE TABLE IF NOT EXISTS for new tables — safe to re-run
4. Use ALTER TABLE ... ADD COLUMN IF NOT EXISTS for new columns — safe 
   to re-run
5. Add CREATE INDEX IF NOT EXISTS for all new indexes — safe to re-run
6. After schema block, seed realistic dummy data for the new tables:
   - 2–3 dummy carts per test user (different sellers)
   - 2–5 cart items per cart
   - Use existing user IDs and seller IDs already present in the seed file

#### Exact schema changes to add in seed file:
```sql
-- New carts table
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, seller_id, status)
);

-- Update cart_items to reference carts table
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS cart_id UUID 
  REFERENCES carts(id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS seller_id UUID 
  REFERENCES sellers(id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS price_at_add 
  DECIMAL(10,2);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_seller ON carts(user_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller ON cart_items(seller_id);
```

7. After updating the seed file, run it using whichever command is already 
   configured in package.json (e.g. `npm run seed`, `npx prisma db seed`, 
   or `ts-node src/database/seed.ts`) — check package.json scripts first 
   and use the existing command, do not create a new one
8. Confirm the seed ran successfully and log the new tables + row counts

Do NOT use prisma migrate for these changes. Seed file only.
---

### General Constraints

- React Native: hooks only, no class components
- Zustand cart store must be the single source of truth — no local useState 
  for cart data
- All delivery partner calls (Uber Direct, Porter, Delhivery) happen in 
  parallel per seller, with 3s timeout fallback per partner
- NestJS: use DTOs + class-validator for all new endpoints
- No cross-seller cart merging — each seller cart is always independent 
  until user explicitly selects combined checkout
- On combined checkout screen, if user deselects a cart, remove it from 
  checkout flow but keep it active in store