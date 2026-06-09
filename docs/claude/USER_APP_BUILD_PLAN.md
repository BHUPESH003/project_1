# User App Build Plan — React Native

## Overview

Build the consumer-facing React Native app from scratch in 5 phases. Each phase delivers a fully functional slice of the product.

**Stack:** React Native CLI (bare) · Zustand · React Navigation · React Query · TypeScript
**Backend:** NestJS API (already running) — see `BACKEND_ROADMAP.md` for endpoint reference
**Designs:** Exported Claude Design code in `/designs/` folder — use as visual reference for colors, spacing, layout

---

## Pre-Build: Project Setup Checklist

Before Phase 1 begins, scaffold the project:

```bash
npx @react-native-community/cli init LocalApp --template react-native-template-typescript
```

### Install core dependencies upfront (all phases need these):

```
# Navigation
@react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# State & data
zustand @tanstack/react-query axios

# Storage
@react-native-async-storage/async-storage react-native-mmkv

# UI essentials
react-native-svg react-native-linear-gradient react-native-fast-image
react-native-keyboard-aware-scroll-view

# Forms & validation
react-hook-form zod @hookform/resolvers

# Utilities
react-native-config dayjs
```

### Project structure (create this skeleton):

```
src/
├── api/                    # API client, endpoint functions, React Query hooks
│   ├── client.ts           # Axios instance with interceptors, token refresh
│   ├── hooks/              # useAuth, useSellers, useCart, useOrders, etc.
│   └── types.ts            # API response types (mirror backend DTOs)
├── stores/                 # Zustand stores
│   ├── authStore.ts        # token, user, isAuthenticated
│   ├── addressStore.ts     # selectedAddress, savedAddresses
│   ├── cartStore.ts        # optimistic cart state (synced with server)
│   └── appStore.ts         # theme, onboarding seen, misc
├── navigation/             # React Navigation setup
│   ├── RootNavigator.tsx   # Auth check → AuthStack or MainTabs
│   ├── AuthStack.tsx
│   ├── HomeStack.tsx
│   ├── OrdersStack.tsx
│   └── ProfileStack.tsx
├── screens/                # Screen components (one file per screen)
├── components/             # Shared components
│   ├── ui/                 # Atoms: Button, Text, Input, Badge, etc.
│   ├── cards/              # Seller card, product card, order card
│   ├── sheets/             # Bottom sheets
│   └── layout/             # Header, TabBar, FloatingCartBar
├── theme/                  # Design tokens
│   ├── colors.ts           # Light + dark palette
│   ├── typography.ts       # Font sizes, weights, families
│   ├── spacing.ts          # 8px grid values
│   └── index.ts            # useTheme hook, ThemeProvider
├── hooks/                  # Shared hooks (useLocation, useDebounce, etc.)
├── utils/                  # Formatters, validators, constants
└── types/                  # Shared TypeScript types
```

### Design token extraction

Before coding screens, extract tokens from the Claude Design exports into `src/theme/`:
- Colors (primary, secondary, surface, text, semantic — both light and dark)
- Typography scale (sizes, weights, line heights)
- Spacing values
- Border radii
- Shadow definitions

This is the single source of truth. Every component references theme tokens, never hardcoded values.

### API client setup (`src/api/client.ts`)

```typescript
// Axios instance with:
// - baseURL from react-native-config (API_URL)
// - Request interceptor: attach JWT from authStore
// - Response interceptor: 401 → try refresh token → retry, else logout
// - Response interceptor: transform to { data, error } shape
```

---

## Phase 1: Auth + Navigation Shell

**What the user gets:** They can open the app, log in with phone + OTP, and land on an empty home screen with working tab navigation. The foundation everything else plugs into.

### Build list:

**1. Theme provider + core UI atoms**
- `ThemeProvider` with light/dark mode (reads system preference, stores override in MMKV)
- `useTheme()` hook that returns current colors, typography, spacing
- Core atoms — build only these, style them properly, everything else composes from them:
  - `AppText` — themed text with variants (h1, h2, body, caption, price)
  - `Button` — primary, secondary, ghost, danger variants with press animation (Reanimated scale to 0.97)
  - `TextInput` — themed input with label, error state, focus animation
  - `Badge` — status pill (color variants)
  - `IconButton` — circular icon tap target
  - `Skeleton` — shimmer loading placeholder (reusable, takes width/height/borderRadius)
  - `Toast` — slide-in notification (success/error/info) using a Zustand toast store

**2. Navigation skeleton**
- `RootNavigator`: checks `authStore.isAuthenticated`
  - `false` → `AuthStack` (Login → OTP)
  - `true` + no address → `AddressSelectionModal`
  - `true` + has address → `MainTabs`
- `MainTabs`: 3 tabs (Home, Orders, Profile) — use bottom tab navigator with custom tab bar component (style from design system)
- Each tab has its own stack navigator (HomeStack, OrdersStack, ProfileStack) — just placeholder screens for now
- Screen transition: default stack slide animation

**3. Auth store + API**
- `authStore` (Zustand + MMKV persist): `{ token, refreshToken, user, isAuthenticated, login(), logout(), refreshSession() }`
- API hooks:
  - `useRequestOtp()` — `POST /auth/request-otp` — mutation
  - `useVerifyOtp()` — `POST /auth/verify-otp` — mutation, on success stores tokens + user
  - Token refresh logic in axios interceptor

**4. Auth screens**
- `LoginScreen`: phone input (+91 prefix), "Continue" button, terms text. Reference the exported design.
  - Phone validation: exactly 10 digits after +91
  - Button disabled until valid
  - Loading state on submit
  - Keyboard-aware layout
- `OtpScreen`: 6-box OTP input with auto-advance, resend timer (30s), back button
  - Auto-read from SMS on Android (`react-native-otp-verify` or similar — optional, skip if complex)
  - Error state: shake animation on boxes
  - Success: auto-navigate to home (or address selection if first time)

**5. Address store (minimal)**
- `addressStore`: `{ selectedAddress, setAddress() }`
- Persist selected address in MMKV
- For now, just check if address exists to gate navigation. Full address selection screen comes in Phase 2.

### Backend endpoints used:
- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /auth/refresh-token`
- `GET /users/me`

### Definition of done:
- Cold open → splash → login → OTP → lands on empty home tab
- Token persists across app restarts (auto-login)
- Tab navigation works (3 tabs, placeholder content)
- Light/dark mode toggles correctly
- All text uses AppText, all buttons use Button component

---

## Phase 2: Home + Discovery

**What the user gets:** Full home screen with address selection, nearby sellers, categories, search, and seller detail with product browsing. They can discover and explore everything — just can't buy yet.

### Build list:

**1. Address selection**
- `AddressBottomSheet` component (using `@gorhom/bottom-sheet`):
  - "Use current location" option (uses `react-native-geolocation-service`)
  - Google Places autocomplete search (use `react-native-google-places-autocomplete` or direct API call)
  - Saved addresses list (from API)
  - Recent addresses (from MMKV local storage)
- `addressStore` expanded: `{ selectedAddress, savedAddresses, fetchAddresses(), setSelected() }`
- Tapping address pill on any screen opens this sheet
- On address change: invalidate seller queries (React Query `queryClient.invalidateQueries`)
- API hooks:
  - `useAddresses()` — `GET /users/me/addresses`
  - `useCreateAddress()` — `POST /users/me/addresses`
  - `useReverseGeocode()` — `GET /location/address?lat=X&lng=Y`
  - `useAutocomplete()` — `GET /location/autocomplete?query=X`
- Location permission flow: request on "Use current location" tap, handle denial gracefully

**2. Home screen**
- `HomeScreen` with these sections (each a separate component for lazy rendering):
  - `HomeHeader` — address pill (left) + favorites icon + notification bell (right). Address pill tappable → opens AddressBottomSheet.
  - `SearchBar` — tappable fake input → navigates to SearchScreen (not a real input here)
  - `BannerCarousel` — horizontal FlatList with auto-scroll (use `useRef` + `setInterval`), pagination dots. Data from `GET /banners/active`
  - `CategoryScroller` — horizontal FlatList of category pills. Active category highlighted. "Coming Soon" badge. Data from `GET /categories`
  - `SellerList` — vertical FlatList with sort pills (Nearest, Top Rated, Newest). Pull-to-refresh. Infinite scroll pagination. Data from `GET /sellers/available?lat=X&lng=Y&page=N&sort=distance`
  - `FloatingCartBar` — shows when `cartStore.itemCount > 0`. Fixed position above tab bar. Taps to CartScreen.
- Skeleton loading state: render `Skeleton` components matching the layout of each section while queries load
- Empty state: "No shops nearby" with illustration + "Try a different location" CTA

**3. Seller cards**
- `SellerCard` component — used on home, search results, favorites
  - Image (FastImage with placeholder), name, online dot, rating (star + number), distance, prep time, starting price, category tags, favorite heart
  - Heart toggle: optimistic update via `useFavoriteToggle()` mutation
  - Unverified variant: "Not verified" amber badge, no online dot, slightly muted
  - Press animation: scale 0.98 with Reanimated

**4. Search screen**
- `SearchScreen` — full-screen push from home
  - Auto-focus text input with debounced API call (300ms)
  - Results split: "Shops" section + "Products" section
  - Recent searches stored in MMKV
  - `useSearch()` — `GET /search?q=X&lat=Y&lng=Z`
  - Empty query: show recent searches + popular categories
  - No results: illustration + suggestion text

**5. Seller detail screen**
- `SellerDetailScreen` — pushed from seller card tap
  - Hero image area (parallax scroll with Reanimated — `scrollY` drives image translateY at 0.5x rate)
  - Info section: name, status badge, rating, distance, prep time, description (collapsible), price chips
  - Sticky tab bar: "Products" | "Info" — use `@react-navigation/material-top-tabs` or manual implementation with `Animated`
  - Product list grouped by category with section headers
  - `ProductCard`: name, description, price/MRP, "Add" button or quantity stepper
  - For printing products: "Upload" button instead of "Add" (navigates to PrintingConfig in Phase 3, for now show toast "Coming soon")
  - Sticky bottom cart bar when items from this seller exist in cart
- API hooks:
  - `useSeller(id)` — `GET /sellers/:id`
  - `useSellerProducts(id)` — `GET /sellers/:id/products`
  - `useFavoriteToggle()` — `POST /favorites` / `DELETE /favorites/:sellerId`

### Backend endpoints used:
- `GET /sellers/available`, `GET /sellers/trending`, `GET /sellers/new`
- `GET /sellers/:id`, `GET /sellers/:id/products`
- `GET /categories`
- `GET /banners/active`
- `GET /search`
- `GET /location/address`, `GET /location/autocomplete`
- `GET /users/me/addresses`, `POST /users/me/addresses`
- `POST /favorites`, `DELETE /favorites/:sellerId`, `GET /favorites`

### Definition of done:
- Home screen loads with real sellers from API based on selected address
- Address change refreshes entire seller list
- Search returns real results
- Seller detail shows products grouped by category
- Simple products can be added to cart (optimistic + synced)
- Favorites toggle works
- Pull-to-refresh and pagination work on seller list
- Skeleton loading on all data-dependent screens

---

## Phase 3: Cart → Payment

**What the user gets:** Complete purchase flow — add items (including printing with file upload), review cart, checkout with delivery selection, pay via UPI. Money flows.

### Build list:

**1. Cart system**
- `cartStore` (Zustand): local optimistic state synced with server
  ```typescript
  {
    items: CartItem[],        // grouped by sellerId
    isLoading: boolean,
    fetchCart(),               // GET /cart → hydrate
    addItem(sellerId, productId, payload?),
    updateQuantity(itemId, qty),
    removeItem(itemId),
    getSellerGroups(),         // derived: items grouped by seller
    getTotalCount(),
    getTotalPrice(),
  }
  ```
- Server sync: every mutation calls API, updates local state optimistically, reverts on error
- API hooks:
  - `useCart()` — `GET /cart`
  - `useAddToCart()` — `POST /cart/items`
  - `useUpdateCartItem()` — `PATCH /cart/items/:id`
  - `useRemoveCartItem()` — `DELETE /cart/items/:id`
  - `useCalculatePrice()` — `GET /cart/calculate-price`

**2. Printing config flow**
- `PrintingConfigScreen` — modal/push screen when user taps "Upload" on a printing product
  - Step 1 — File upload:
    - "Upload PDF or images" area
    - Use `react-native-document-picker` for file selection
    - Upload flow: pick file → `POST /files/presigned-url` → upload to S3 → `POST /files/validate` → show in list
    - File card: icon, filename, page count, size, delete (X)
    - Multiple files supported
  - Step 2 — Configure per file:
    - Horizontal file selector tabs (if multiple)
    - Color mode: segmented control (Color / B&W)
    - Paper size: segmented control (A4 / A3 / Letter)
    - Copies: quantity stepper
    - Pages: "All" toggle, custom range inputs if off
    - Live price calculation: `pages × copies × pricePerPage` — update on every change with animated counter
  - "Add to cart — ₹{total}" button → calls `POST /cart/items` with file IDs + JSON payload → navigates back to seller detail
- This is the most complex screen. Build it as a self-contained flow with its own local state, only calling the cart API on final submit.

**3. Cart screen**
- `CartScreen` — accessible from floating cart bar or direct navigation
  - Items grouped by seller (use `getSellerGroups()` from store)
  - Seller group header: avatar, name, status
  - Printing items: show filename, config summary, price. "Edit" link → reopens config
  - Simple items: name, quantity stepper, price
  - Swipe-to-delete: use `react-native-gesture-handler` Swipeable with red "Remove" reveal
  - Cart summary: per-seller subtotals + combined total
  - "Proceed to checkout" button (disabled if cart empty)
  - Empty state with illustration + "Explore shops" CTA

**4. Checkout screen**
- `CheckoutScreen` — pushed from cart
  - Delivery address bar (selected address + "Change" to open address sheet)
  - Per-seller sections:
    - Seller name + item count + subtotal (collapsible item list)
    - Delivery options: radio-select cards from `GET /orders/delivery-quotes` per seller
    - Each card: provider name, ETA, price, badges (Recommended/Cheapest/Fastest)
  - Order summary: item total + delivery note ("Delivery paid directly to partner")
  - "Pay ₹XXX" button — disabled until delivery selected for all sellers
- Checkout flow:
  1. Screen loads → fetch checkout summary (`GET /checkout/multi?deliveryAddressId=X`)
  2. User selects delivery per seller
  3. Tap "Pay" → `POST /checkout/place-order/multi` → creates orders → initiate payment
  4. Payment screen

**5. Payment integration**
- Install `react-native-razorpay`
- Payment flow:
  1. After order creation, call `POST /orders/:id/create-payment-intent` to get Razorpay order ID
  2. Open Razorpay checkout with UPI preference
  3. On success: call `POST /orders/:id/verify-payment` → navigate to PaymentSuccessScreen
  4. On failure: show PaymentFailureScreen with retry option
  5. On dismiss: show pending state, poll for status
- `PaymentSuccessScreen`: checkmark animation + order IDs + "Track Orders" CTA
- `PaymentFailureScreen`: error message + "Retry" + "Cancel Order" options
- For multi-seller: loop payment creation per order (each seller order has independent payment)

### Backend endpoints used:
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`
- `GET /cart/calculate-price`
- `POST /files/presigned-url`, `POST /files/validate`
- `GET /checkout/multi`, `POST /checkout/place-order/multi`
- `GET /orders/:id/delivery-quotes`
- `POST /orders/:id/create-payment-intent`, `POST /orders/:id/verify-payment`

### Definition of done:
- User can add printing items (upload file, configure, add to cart)
- User can add simple items with quantity controls
- Cart shows multi-seller grouping correctly
- Checkout shows delivery options per seller from real API
- Payment via Razorpay UPI completes successfully
- Success/failure screens work
- Cart clears after successful order

---

## Phase 4: Orders + Profile

**What the user gets:** Full post-purchase experience (order list, tracking, status updates) and complete profile management. The app is now fully functional end-to-end.

### Build list:

**1. Orders list screen**
- `OrdersScreen` (Tab 2) with two sections:
  - Active orders: prominent cards with status pill, seller name, items, total, ETA
  - Past orders: compact cards with date, seller, total, status
  - Active sorted by most recent, past sorted by date descending
  - Pull-to-refresh
  - Infinite scroll on past orders
  - Empty state
- `OrderCard` component with status-colored pill (map status → color in theme)
- API: `useOrders()` — `GET /orders?status=active` and `GET /orders?status=past&page=N`
- Real-time: poll active orders every 30s (`refetchInterval` in React Query) for status updates. Push notifications handled natively (see below).

**2. Order detail screen**
- `OrderDetailScreen` — pushed from order card tap
  - Status banner: icon + status text + description (color-coded by state)
  - Timeline: vertical stepper with completed/active/future states. Map `OrderStateHistory` entries to timeline items with timestamps.
  - Delivery section: provider info, ETA, "Track delivery" button (opens `Linking.openURL(trackingUrl)`)
  - Seller section: name, address, call button (`Linking.openURL('tel:...')`)
  - Items section: full list with prices
  - Price breakdown: subtotal, delivery note, total paid
  - "Cancel Order" button (visible when order is in cancellable state): confirmation sheet → `POST /orders/:id/cancel` → refund info toast
- API: `useOrder(id)` — `GET /orders/:id`

**3. Push notifications**
- Install `@react-native-firebase/app` + `@react-native-firebase/messaging`
- On auth: register FCM token with backend (add `PATCH /users/me` with `fcmToken` field — may need backend addition)
- Handle notification types:
  - Order status updates → navigate to order detail
  - Promotions → navigate to home or deep link
- Foreground: show in-app toast
- Background/killed: standard system notification, tap opens relevant screen
- Deep linking setup: `localapp://orders/:id`, `localapp://sellers/:id`

**4. Profile screen**
- `ProfileScreen` (Tab 3) — menu list:
  - User info card at top (name, phone)
  - Edit Profile → `EditProfileScreen` (name, email inputs, save → `PATCH /users/me`)
  - My Addresses → `AddressesScreen` (list + swipe delete + add new, reuse AddressBottomSheet)
  - Favorites → `FavoritesScreen` (seller cards list, `GET /favorites`)
  - Notification Preferences → toggles (`PATCH /users/me/notification-preferences`)
  - Appearance → light/dark/system toggle (updates `appStore`, persists in MMKV)
  - About → static screen (app version, links)
  - Logout → confirmation → `authStore.logout()` → navigate to auth

**5. Notification preferences screen**
- Toggle switches for order updates + promotions
- API: `GET /users/me/notification-preferences`, `PATCH /users/me/notification-preferences`

### Backend endpoints used:
- `GET /orders`, `GET /orders/:id`
- `POST /orders/:id/cancel`
- `GET /users/me`, `PATCH /users/me`
- `GET /users/me/addresses`, `POST /users/me/addresses`, `DELETE /users/me/addresses/:id`
- `GET /users/me/notification-preferences`, `PATCH /users/me/notification-preferences`
- `GET /favorites`

### Definition of done:
- Order list shows real orders with correct status colors
- Order detail shows full timeline with timestamps
- Delivery tracking link opens external page
- Cancel order works with confirmation + refund toast
- Push notifications arrive and navigate to correct screen
- Profile section fully functional (edit, addresses, favorites, preferences, theme, logout)
- Logout clears all state and navigates to auth

---

## Phase 5: Polish + Production

**What the user gets:** The app goes from "works" to "feels great." Animations, error handling, performance, and the finishing touches that make it production-ready.

### Build list:

**1. Animations & micro-interactions**
- Button press: `useAnimatedStyle` → scale 0.97 on pressIn, spring back on pressOut (apply to all Button + Card components)
- Favorite heart: scale overshoot 1.2 → 1.0 + fill transition
- Floating cart bar: `entering={SlideInDown.springify()}` / `exiting={SlideOutDown}`
- Tab bar: active icon morphs (outline → filled), sliding indicator
- Skeleton shimmer: `LinearGradient` animated translateX loop
- Price counter: animated number roll using `react-native-reanimated`
- Swipe-to-delete: elastic overscroll feel via gesture handler
- Pull-to-refresh: custom component replacing default RefreshControl
- Screen transitions: configure React Navigation stack with `animation: 'slide_from_right'`, bottom sheets with `presentation: 'transparentModal'`
- Add all animations referenced in the design system exports

**2. Error handling & edge cases**
- Network error boundary: global component wrapping app, shows "No internet" banner when offline (use `@react-native-community/netinfo`)
- API error handling: standardize in axios interceptor → show toast for user-facing errors
- Retry logic: React Query `retry: 2` with exponential backoff on queries
- Empty states: add illustrations + CTAs for every list screen (orders, favorites, cart, search, sellers)
- Offline cache: React Query `cacheTime` + `staleTime` tuning — show cached sellers/orders when offline with "Offline — showing cached data" indicator
- Form validation: proper error messages on auth inputs, address inputs
- Seller went offline during browse: handle 404/unavailable gracefully in seller detail
- Payment edge cases: app killed during payment → check pending orders on next launch

**3. Performance**
- FlatList optimization: `getItemLayout` for fixed-height items, `removeClippedSubviews`, `windowSize` tuning
- Image optimization: FastImage with `priority: 'normal'`, `resizeMode: 'cover'`, placeholder shimmer
- Bundle size: check with `react-native-bundle-visualizer`, remove unused dependencies
- Hermes engine: ensure enabled (default in RN 0.73+)
- Query deduplication: React Query handles this, but verify no duplicate fetches on re-renders
- Reduce re-renders: `React.memo` on card components, `useCallback` on event handlers
- Splash screen: `react-native-splash-screen` — show until initial data loads (auth check + address + first seller fetch)

**4. Deep linking & app links**
- Universal links (iOS) + App Links (Android) configuration
- Handle: `localapp://orders/:id`, `localapp://sellers/:id`
- Notification tap → deep link to order detail
- Share seller: generate shareable URL

**5. Production readiness**
- App icons + splash screen assets (extract from design exports)
- App Store / Play Store metadata preparation
- Error tracking: Sentry (`@sentry/react-native`) — initialize in App.tsx, capture unhandled JS + native crashes
- Analytics: basic event tracking (screen views, order placed, search performed) — use a lightweight solution or roll your own with API calls
- Environment configs: `.env.development`, `.env.staging`, `.env.production` via `react-native-config`
- Code signing setup (iOS + Android)
- CI: basic GitHub Actions workflow — lint + typecheck + build APK/IPA

### Definition of done:
- Every interaction has appropriate animation (press, transition, loading)
- App handles offline/error states gracefully everywhere
- No janky scrolls or dropped frames
- Push notification deep links work end-to-end
- Sentry captures errors
- Builds successfully for both iOS and Android
- Ready for TestFlight / Internal testing track

---

## Phase-Level Dependencies

```
Phase 1 (Auth + Shell)
  └── Phase 2 (Home + Discovery)  ← needs auth + navigation + address store
       └── Phase 3 (Cart → Payment) ← needs seller detail + product cards + add-to-cart
            └── Phase 4 (Orders + Profile) ← needs orders from completed payments
                 └── Phase 5 (Polish) ← needs all screens built to polish them
```

Strictly sequential. Each phase builds on the previous. No phase can be skipped.

## Key Libraries Reference

| Purpose | Library | Why |
|---------|---------|-----|
| Navigation | @react-navigation/native + stacks + tabs | Industry standard for RN |
| State | zustand + react-native-mmkv | Lightweight, fast persist |
| Server state | @tanstack/react-query | Cache, refetch, pagination |
| HTTP | axios | Interceptors for auth |
| Animations | react-native-reanimated 3 | 60fps, spring physics |
| Gestures | react-native-gesture-handler | Swipe, drag, press |
| Bottom sheets | @gorhom/bottom-sheet | Best RN bottom sheet lib |
| Images | react-native-fast-image | Cached, performant images |
| File picker | react-native-document-picker | PDF/image selection |
| Payments | react-native-razorpay | UPI-first payments |
| Push | @react-native-firebase/messaging | FCM push notifications |
| Location | react-native-geolocation-service | GPS coordinates |
| Network | @react-native-community/netinfo | Offline detection |
| Errors | @sentry/react-native | Crash reporting |

## Notes for Claude Code Sessions

- Reference `UI_UX_DESIGN_CONTEXT.md` for screen specs and component hierarchy
- Reference exported design code in `/designs/` for visual styling
- Reference `BACKEND_ROADMAP.md` for API endpoint details and response shapes
- Every screen should have: loading state (skeleton), error state (retry), empty state (illustration + CTA)
- Never hardcode colors/spacing — always use theme tokens from `src/theme/`
- All API calls go through React Query hooks in `src/api/hooks/` — no raw axios in screens
- All local state in Zustand stores — no scattered `useState` for shared state
- TypeScript strict mode — no `any` types
- Test on Android first (primary market), iOS second
