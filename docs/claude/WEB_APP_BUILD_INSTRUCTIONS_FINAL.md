# Web App Build Instructions — Claude Code Context Document

> **Paste this entire document into Claude Code as project context.**
> Claude Code handles ALL setup and building. The user only needs to place Claude Design exports into `designs/` at the repo root before starting Phase 1.

---

## Project Overview

Build a mobile-first responsive web app for a hyperlocal commerce marketplace. The backend (NestJS) is already built and running. This web app replaces a React Native build that was abandoned after 1.5 weeks of unresolvable native build toolchain issues.

**App location in monorepo:** `apps/user-web/`
**Package manager:** pnpm (monorepo uses pnpm workspaces)

---

## Monorepo Context

This project lives in a pnpm workspace monorepo. Before building, read these files for full context:

| File | What it tells you |
|------|-------------------|
| `pnpm-workspace.yaml` | Workspace members — add `apps/user-web` here |
| `packages/types/src/enums.ts` | **All shared enums** — OrderStatus, PaymentStatus, SellerStatus, DeliveryStatus, etc. Import from `@repo/types` |
| `services/api/prisma/schema.prisma` | Complete DB schema — every model, field, relation. Use this to derive API response types |
| `docs/claude/BACKEND_ROADMAP.md` | All API endpoints with request/response shapes |
| `docs/claude/CLAUDE_DESIGN_PROMPTS.md` | Design intent for every screen (read for UX understanding) |
| `docs/claude/USER_APP_BUILD_PLAN.md` | Original RN build plan — business logic reference (ignore RN-specific parts) |
| `services/api/src/common/dto/RESPONSE_FORMAT.md` | API response wrapper format: `{ code, data, message }` |

---

## Step 0: Project Scaffolding (Claude Code Does This)

### 0.1 Create the Vite project

```bash
cd apps/
pnpm create vite user-web --template react-ts
cd user-web
```

### 0.2 Add to pnpm workspace

Edit root `pnpm-workspace.yaml` — ensure `apps/*` is already listed (it is). The new `apps/user-web` is auto-included.

### 0.3 Install dependencies

```bash
cd apps/user-web

# Core
pnpm add react-router-dom zustand @tanstack/react-query axios

# UI & Styling
pnpm add tailwindcss @tailwindcss/vite framer-motion lucide-react
pnpm add @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-toast
pnpm add @radix-ui/react-accordion @radix-ui/react-switch
pnpm add clsx tailwind-merge

# Forms & Validation
pnpm add react-hook-form zod @hookform/resolvers

# Utilities
pnpm add dayjs

# Shared types from monorepo
pnpm add @repo/types --workspace

# Dev
pnpm add -D @types/react @types/react-dom @tanstack/react-query-devtools
```

### 0.4 Configure Vite

Replace `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // backend port
        changeOrigin: true,
      },
    },
  },
})
```

### 0.5 Configure TypeScript paths

Update `tsconfig.json` and `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 0.6 Create project structure

```
apps/user-web/src/
├── api/
│   ├── client.ts              # Axios instance with auth interceptor
│   ├── types.ts               # API response/request types (derived from Prisma schema)
│   └── hooks/                 # React Query hooks per domain
│       ├── useAuth.ts
│       ├── useSellers.ts
│       ├── useCart.ts
│       ├── useOrders.ts
│       ├── useCheckout.ts
│       ├── useSearch.ts
│       └── useLocation.ts
├── stores/
│   ├── authStore.ts           # token, user, isAuthenticated (persist to localStorage)
│   ├── addressStore.ts        # selectedAddress (persist)
│   └── toastStore.ts          # toast queue
├── components/
│   ├── ui/                    # Atoms — Button, Input, Badge, Skeleton, etc.
│   ├── cards/                 # SellerCard, ProductCard, OrderCard
│   ├── sheets/                # BottomSheet (Radix Dialog styled), AddressSheet
│   └── layout/                # AppShell, Header, BottomNav, FloatingCartBar
├── pages/                     # Route-level components (one per screen)
│   ├── auth/
│   ├── home/
│   ├── search/
│   ├── seller/
│   ├── cart/
│   ├── checkout/
│   ├── payment/
│   ├── orders/
│   └── profile/
├── hooks/                     # useDebounce, useMediaQuery
├── lib/
│   ├── theme.ts               # Design tokens extracted from designs
│   ├── cn.ts                  # clsx + tailwind-merge helper
│   └── constants.ts
├── types/
│   └── index.ts               # App-specific types
├── App.tsx                    # Routes + providers
├── main.tsx                   # Entry point
└── index.css                  # Tailwind + CSS variables
```

### 0.7 Setup index.css with Tailwind v4

```css
@import "tailwindcss";

/* Theme tokens injected here after design extraction — Phase 1 step 1 */
```

### 0.8 Verify it runs

```bash
pnpm dev
```

---

## Critical: How to Match Designs

The `/designs/` folder at the repo root contains exported code from Claude Design sessions. These are the **VISUAL SOURCE OF TRUTH**.

### Before building ANY screen:

1. Open the corresponding file in `/designs/` (e.g., `designs/home.html`, `designs/auth.tsx`)
2. **Extract exact values** — do NOT interpret or approximate:
   - Hex colors → CSS variables + tailwind theme
   - Pixel spacing (padding, gap, margin) → tailwind classes or CSS vars
   - Font sizes, weights, line heights
   - Border radius values
   - Shadow values (box-shadow strings)
   - Gradient definitions
   - Layout structure (flex directions, alignment, gap)
3. The built screen must be **visually indistinguishable** from the design export when placed side by side
4. If a design file doesn't exist for a screen, use the design system tokens established from the design system export

### What NEVER to do:

- Use default Tailwind colors (blue-500, gray-100, etc.) instead of the custom palette
- Guess spacing when the design file has exact values
- Add visual elements not present in the design
- Change the visual hierarchy (prominence, sizing, weight)
- Use generic component libraries that override the design language

### Design Token Extraction (FIRST thing in Phase 1):

Read `designs/design-system.html` (or whatever the design system export is named) and create `src/lib/theme.ts`:

```typescript
// Extract these EXACTLY from the design system export
export const colors = {
  primary: '#EXACT_HEX',
  primaryDark: '#EXACT_HEX',
  primaryLight: '#EXACT_HEX',
  accent: '#EXACT_HEX',
  background: '#EXACT_HEX',
  surface: '#EXACT_HEX',
  surfaceSecondary: '#EXACT_HEX',
  textPrimary: '#EXACT_HEX',
  textSecondary: '#EXACT_HEX',
  textTertiary: '#EXACT_HEX',
  success: '#EXACT_HEX',
  error: '#EXACT_HEX',
  warning: '#EXACT_HEX',
} as const

export const shadows = { /* exact box-shadow strings */ } as const
export const radii = { /* exact border-radius values */ } as const
```

Then wire into `index.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #EXACT;
  --color-primary-dark: #EXACT;
  /* ... all tokens ... */
}
```

Also read `docs/claude/CLAUDE_DESIGN_PROMPTS.md` — it describes the design intent for every screen: aesthetic direction, animation specs, layout structure, interaction patterns.

---

## Mobile-First Strategy

The app renders inside a `max-w-[430px]` centered container. Design exports (at 393px iPhone width) transfer pixel values 1:1.

```tsx
// App.tsx root wrapper
<div className="mx-auto max-w-[430px] min-h-dvh bg-background relative shadow-xl">
  {/* Routes */}
</div>
```

---

## Routing

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-otp" element={<OtpPage />} />

    <Route element={<AppShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/sellers/:id" element={<SellerDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:id" element={<OrderDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/edit" element={<EditProfilePage />} />
      <Route path="/profile/addresses" element={<AddressesPage />} />
      <Route path="/profile/favorites" element={<FavoritesPage />} />
    </Route>

    <Route path="/payment/success" element={<PaymentSuccessPage />} />
    <Route path="/payment/failure" element={<PaymentFailurePage />} />
  </Routes>
</BrowserRouter>
```

---

## AppShell Layout

```tsx
function AppShell() {
  return (
    <div className="flex flex-col min-h-dvh">
      <Header />              {/* Address pill + icons */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <FloatingCartBar />     {/* shows when cart has items */}
      <BottomNav />           {/* Home | Orders | Profile — fixed bottom */}
    </div>
  )
}
```

---

## Core Patterns

### API Client

```typescript
// api/client.ts
const api = axios.create({ baseURL: '/api', timeout: 15000 })

// Attach JWT
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Unwrap { code, data, message } + handle 401 refresh
api.interceptors.response.use(
  res => res.data,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh-token', { refreshToken })
          const { accessToken } = res.data.data
          useAuthStore.getState().setToken(accessToken)
          error.config.headers.Authorization = `Bearer ${accessToken}`
          return axios(error.config)
        } catch { useAuthStore.getState().logout() }
      }
    }
    return Promise.reject(error)
  }
)
```

### React Query Hooks

```typescript
export function useAvailableSellers(params: { lat?: number; lng?: number; category?: string }) {
  return useQuery({
    queryKey: ['sellers', 'available', params],
    queryFn: () => api.get('/sellers', { params }),
    enabled: !!params.lat && !!params.lng,
    staleTime: 30_000,
  })
}
```

### Zustand Stores (persist with localStorage)

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null, refreshToken: null, user: null, isAuthenticated: false,
      setToken: (token) => set({ token }),
      login: (token, refreshToken, user) => set({ token, refreshToken, user, isAuthenticated: true }),
      logout: () => set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
```

### Bottom Sheet (Web) — Radix Dialog styled as bottom sheet

- Fixed bottom, full width (within 430px container), rounded top corners
- Backdrop blur overlay, Framer Motion slide-up spring animation
- Close via overlay click or button

### cn() Utility

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

---

## Web-Specific Adaptations

| Mobile (React Native) | Web Equivalent |
|----------------------|----------------|
| Bottom tab navigator | Fixed `<nav>` at bottom |
| Stack navigator | `react-router-dom` navigate + Framer Motion page transitions |
| @gorhom/bottom-sheet | Radix Dialog + Framer Motion slide-up |
| MMKV storage | localStorage via zustand/persist |
| react-native-razorpay | Razorpay Web Checkout JS (`checkout.razorpay.com/v1/checkout.js`) |
| Document picker | `<input type="file">` |
| Geolocation service | `navigator.geolocation` |
| Push notifications | Not in web MVP — poll active orders every 30s |
| Reanimated springs | Framer Motion springs |

### Razorpay Web

Add to `index.html`: `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`

```typescript
function openRazorpay(orderId: string, paymentIntent: any) {
  const options = {
    key: paymentIntent.paymentData.keyId,
    amount: paymentIntent.paymentData.amount,
    currency: 'INR',
    order_id: paymentIntent.paymentData.orderId,
    prefill: paymentIntent.paymentData.prefill,
    theme: { color: colors.primary },
    handler: async (response: any) => {
      await api.post(`/orders/${orderId}/verify-payment`, {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      })
      navigate('/payment/success', { state: { orderId } })
    },
  }
  new (window as any).Razorpay(options).open()
}
```

### File Upload

```tsx
<input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={async (e) => {
  const files = Array.from(e.target.files || [])
  for (const file of files) {
    const { data } = await api.post('/internal/files/presigned-url', {
      fileName: file.name, mimeType: file.type, fileSize: file.size,
    })
    await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    const validated = await api.post('/internal/files/validate', {
      fileKey: data.fileKey, originalName: file.name, mimeType: file.type, sizeBytes: file.size,
    })
    // validated.data.fileId → attach to cart item
  }
}} />
```

---

## Backend API Endpoints Reference

All endpoints prefixed with `/api/` (Vite proxy).

**Auth:** `POST /auth/request-otp` · `POST /auth/verify-otp` · `POST /auth/refresh-token`

**Users:** `GET /users/me` · `PATCH /users/me` · `GET|POST|DELETE /users/me/addresses` · `GET|PATCH /users/me/notification-preferences`

**Location:** `GET /location/address?lat=X&lng=Y` · `GET /location/autocomplete?query=X`

**Sellers:** `GET /sellers?category&lat&lng&maxDistanceKm&limit&offset` · `GET /sellers/trending` · `GET /sellers/new` · `GET /sellers/:id?lat&lng` · `GET /sellers/:id/products?filter&limit&offset`

**Categories:** `GET /categories`

**Search:** `GET /search?q=X&limit=20`

**Banners:** `GET /banners`

**Favorites:** `GET /favorites` · `POST /favorites/:sellerId` · `DELETE /favorites/:sellerId`

**Cart:** `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:id` · `DELETE /cart/items/:id` · `POST /cart/items/:id/files` · `PATCH /cart/items/:id/files/:fileId` · `DELETE /cart/items/:id/files/:fileId` · `GET /cart/calculate-price`

**Files:** `POST /internal/files/presigned-url` · `POST /internal/files/validate`

**Checkout:** `GET /checkout?sellerId&deliveryAddressId` · `GET /checkout/multi?deliveryAddressId` · `POST /checkout/place-order` · `POST /checkout/place-order/multi`

**Orders:** `GET /orders` · `GET /orders/:id` · `POST /orders/:id/cancel` · `GET /orders/:id/delivery-quotes` · `POST /orders/:id/create-payment-intent?provider=razorpay` · `POST /orders/:id/verify-payment`

---

## Business Requirements Checklist

Every feature below MUST work in the final app.

### Address-First Discovery
- [ ] First launch → address selection immediately
- [ ] Address pill always in header — tap opens sheet
- [ ] Changing address invalidates seller queries
- [ ] "Use current location" (browser Geolocation → reverse geocode)
- [ ] Autocomplete search via `/location/autocomplete`
- [ ] Saved addresses from API

### Home Screen
- [ ] Banner carousel (auto-scroll) from `/banners`
- [ ] Category pills from `/categories` — active vs coming soon
- [ ] Seller list with sort pills (Nearest, Top rated, Newest)
- [ ] Infinite scroll pagination
- [ ] Skeleton loading states
- [ ] Empty state: "No shops in your area"

### Seller Cards
- [ ] Image, name, online dot, rating, distance, prep time, starting price, categories
- [ ] Favorite heart toggle (optimistic)
- [ ] Press animation

### Search
- [ ] Full-screen, auto-focus, debounced (300ms)
- [ ] Results: Shops + Products sections
- [ ] No results state

### Seller Detail
- [ ] Hero with parallax, info section, products by category
- [ ] Simple products: Add → quantity stepper
- [ ] Printing: Upload & Configure flow
- [ ] Sticky cart bar when items from this seller in cart
- [ ] Offline seller handling

### Printing Config
- [ ] File upload, progress, per-file config (color/size/copies/pages)
- [ ] Live price calculation
- [ ] Multiple files with tabs
- [ ] Add to cart with file IDs + payload

### Cart (Multi-Seller — Strategic Differentiator)
- [ ] Items grouped by seller
- [ ] Printing: filename, config summary, edit link
- [ ] Simple: quantity stepper
- [ ] Remove items
- [ ] Per-seller subtotals + combined total
- [ ] Floating cart bar on all pages

### Checkout
- [ ] Address bar with change
- [ ] Per-seller delivery option selection (radio cards)
- [ ] Recommended/Cheapest/Fastest badges
- [ ] "Pay ₹XXX" — disabled until delivery selected for all sellers
- [ ] Multi-seller and single-seller both work

### Payment
- [ ] Razorpay Web Checkout
- [ ] create-payment-intent → Razorpay → verify-payment → success/failure
- [ ] Success: animation + order IDs + "Track Orders"
- [ ] Failure: retry + cancel
- [ ] Cart clears on success

### Orders
- [ ] Active (prominent) + past (compact), status pills color-coded
- [ ] Poll active orders every 30s
- [ ] Order detail: status banner, timeline, delivery, items, pricing, cancel

### Profile
- [ ] Edit profile, addresses CRUD, favorites, notification prefs
- [ ] Dark/light/system appearance toggle
- [ ] Logout clears all state

### Cross-Cutting
- [ ] Every data screen: skeleton + empty + error states
- [ ] Toast system
- [ ] 401 auto-logout
- [ ] Page transition animations
- [ ] Dark mode first-class

---

## Animation Patterns (Framer Motion)

```tsx
// Page transition
initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
transition={{ type: 'spring', stiffness: 300, damping: 30 }}

// Staggered list
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

// Bottom sheet
initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}

// Button press
whileTap={{ scale: 0.97 }}

// Skeleton shimmer (CSS)
@keyframes shimmer { to { background-position: -200% 0 } }
```

---

## Enum Types (from `@repo/types`)

```typescript
import { OrderStatus, PaymentStatus, SellerStatus, DeliveryStatus, CategoryStatus } from '@repo/types'
```

Status pill color mapping:
- Blue: PAID, SELLER_ACCEPTED
- Amber: PREPARING
- Teal: READY_FOR_PICKUP, PICKED_UP
- Green: DELIVERED
- Red: SELLER_REJECTED, USER_CANCELLED, DELIVERY_FAILED, ORDER_EXPIRED

---

## Build Phases

### Phase 1: Foundation + Auth + Home
Design tokens → UI atoms → API client → auth store → auth pages → AppShell → address sheet → home (banners, categories, sellers) → connect real APIs.

**Done when:** Login → OTP → home with real sellers → change address → refresh.

### Phase 2: Search + Seller Detail + Cart
Search → seller detail → products → printing config → cart system → floating cart bar → favorites.

**Done when:** Search → browse → add items (printing + simple) → multi-seller cart.

### Phase 3: Checkout + Payment
Checkout page → delivery selection → Razorpay → success/failure → cart clear.

**Done when:** Full purchase flow end-to-end with real payment.

### Phase 4: Orders + Profile + Polish
Orders list + detail → profile CRUD → dark mode → animations → skeletons → empty states → error handling.

**Done when:** Complete app, all screens match designs, all states handled.

---

## Pitfalls

1. Don't use default Tailwind colors — custom palette only
2. Don't build without checking the design file first
3. Don't skip loading/empty/error states
4. Don't put API calls in components — React Query hooks only
5. Don't store server data in Zustand — that's React Query's job
6. Don't hardcode API URLs — Vite proxy
7. Don't forget the 430px container
8. Don't import from `@prisma/client` — derive types from API shapes
9. Don't use npm — pnpm only
10. API responses are `{ code, data, message }` — access `.data` for payload
