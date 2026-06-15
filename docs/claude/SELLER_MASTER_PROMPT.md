# MASTER PROMPT — Seller Console (`apps/seller-web/`)

You are building the seller-facing console for a hyperlocal commerce marketplace. This is a mobile-first React web app (430px max-width) running inside an existing pnpm monorepo. Sellers use this on their phones at shop counters to receive orders, manage products, and track earnings.

---

## Step 0: Read These Files Before Writing a Single Line of Code

Do this in order. Do not skip any file.

1. `docs/claude/SELLER_ADMIN_CONSOLE_PLAN.md`
   → Complete spec for this app. Screen inventory (13 screens), navigation structure, API endpoints, seller state machine (PENDING → APPROVED → ONLINE/OFFLINE → SUSPENDED), real-time alert approach, all 4 build phases. This is your primary reference.

2. `docs/claude/WEB_APP_BUILD_INSTRUCTIONS.md`
   → Base build instructions written for the user app. Read it for: monorepo setup, shared packages, Tailwind v4 config pattern, React Query + Zustand patterns, axios interceptor with `{ code, data, message }` wrapper, file upload flow (presigned URL), pnpm workspace commands. The seller app follows the same patterns.

3. `designs/seller/` folder (if it exists)
   → Visual exports from design sessions. If present, open every file, extract exact hex colors, px spacing, border-radius, font-size/weight. The built UI must match the designs visually. If this folder is empty, derive the design system from the tokens below (see Design System section).

4. `packages/types/src/enums.ts`
   → Shared enums: `OrderStatus`, `SellerStatus`, `PaymentStatus`, `DeliveryStatus`. Import from `@repo/types`. Never redefine locally.

5. `services/api/prisma/schema.prisma`
   → Source of truth for data shapes. Derive TypeScript types from Seller, Order, Product, OrderItem, PayoutRequest models.

6. `services/api/src/` — specifically:
   - `modules/sellers/` — seller endpoints (register, me, status, products)
   - `modules/orders/` — seller order endpoints (list by status, accept, reject, ready)
   - `modules/files/` — presigned URL endpoints for printing file access

---

## What You're Building

**Location in monorepo:** `apps/seller-web/`

**Tech stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router v7 + Zustand + React Query + Framer Motion + Radix UI + Lucide icons + pnpm

**Form factor:** `max-w-[430px]` centered container. Mobile-first. Sellers use this on phones. Every tap target minimum 48px height. Large, high-contrast buttons. No hover-only interactions.

**Authentication:** Phone + OTP, role=SELLER. On login success, check seller profile:
- No seller profile → redirect to `/register` (registration flow)
- Profile exists, `isVerified: false` → `/pending` (pending approval screen)
- Profile exists, `isSuspended: true` → `/suspended` (suspension notice)
- Profile exists, `isVerified: true`, not suspended → `/dashboard`

---

## Design System

The seller app uses the same teal primary (`#0D9488`) as the user app but with a more utilitarian feel — high contrast, bigger tap targets, less decoration. The primary goal is speed and clarity under pressure (seller accepting an order while talking to a customer).

Extract exact values from `designs/seller/` if available. If not, use these as your token source:

```css
/* Base palette */
--color-primary: #0D9488;       /* teal-600 */
--color-primary-light: #CCFBF1; /* teal-100 */
--color-danger: #EF4444;        /* red-500 */
--color-warning: #F59E0B;       /* amber-500 */
--color-success: #22C55E;       /* green-500 */

/* Surfaces */
--color-bg: #F8FAFC;            /* off-white background */
--color-card: #FFFFFF;
--color-border: #E2E8F0;

/* Text */
--color-text-primary: #0F172A;
--color-text-secondary: #64748B;
--color-text-muted: #94A3B8;

/* Order status colors (critical for at-a-glance reading) */
--color-order-new: #F59E0B;       /* amber — needs action */
--color-order-preparing: #3B82F6; /* blue — in progress */
--color-order-ready: #22C55E;     /* green — ready */
--color-order-completed: #94A3B8; /* gray — done */

/* Online/Offline toggle */
--color-online: #22C55E;
--color-offline: #94A3B8;
```

---

## Architecture Rules

These are non-negotiable. Follow them exactly.

**1. File structure:**
```
apps/seller-web/src/
├── api/
│   ├── client.ts          # axios instance, interceptors, token refresh
│   └── hooks/             # all React Query hooks (useSellerOrders, useAcceptOrder, etc.)
├── stores/
│   ├── authStore.ts       # phone, token, user/seller profile
│   └── alertStore.ts      # new order alert state (isAlerting, alertOrderId, audio control)
├── components/
│   ├── ui/                # atoms: Button, Card, Badge, Switch, Skeleton, BottomSheet
│   ├── orders/            # OrderCard, OrderDetail, NewOrderAlert
│   ├── products/          # ProductCard, ProductForm
│   └── layout/            # AppShell, BottomNav, TopBar
├── pages/
│   ├── auth/              # LoginPage, OtpPage
│   ├── onboarding/        # RegistrationPage (multi-step), PendingApprovalPage, SuspendedPage
│   ├── dashboard/         # DashboardPage
│   ├── orders/            # OrderDetailPage, OrderHistoryPage
│   ├── products/          # ProductListPage, AddEditProductPage
│   ├── shop/              # ShopSettingsPage, EarningsPage, ProfilePage
│   └── index.tsx          # route definitions
├── lib/
│   ├── audio.ts           # Web Audio API alert system
│   └── notifications.ts   # Browser Notification API wrapper
└── types/
    └── api.ts             # API response types (derived from Prisma schema)
```

**2. React Query for all server state:**
- Hooks in `src/api/hooks/` only. No raw axios in components.
- Mutation hooks return `{ mutate, isPending, error }`.
- Query hooks return `{ data, isLoading, error, refetch }`.

**3. Zustand for client-only state:**
- `authStore`: `{ token, seller, user, setAuth, clearAuth }`
- `alertStore`: `{ isAlerting, alertOrderId, triggerAlert, dismissAlert, audio }`
- Never store server data (orders, products) in Zustand — that's React Query cache.

**4. Axios interceptor:**
- Attach `Authorization: Bearer <token>` on every request.
- Unwrap `{ code, data, message }` response — return `.data` to hooks.
- On 401: attempt token refresh → retry → if fails, clear auth + redirect to `/login`.

**5. Types:**
- Import `OrderStatus`, `SellerStatus` from `@repo/types`.
- For Seller, Order, Product shapes, write TypeScript interfaces in `src/types/api.ts` derived from the Prisma schema.

**6. pnpm only.** `pnpm add`, `pnpm dev`, `pnpm build`. Never npm or yarn.

---

## Real-Time Order Alert System

This is the most critical UX feature of the seller app. A missed order notification = direct revenue loss. Build this carefully.

### How it works:
1. When seller is ONLINE, poll `GET /orders/seller/orders?status=PAID` every **5 seconds**.
2. On each poll response, compare returned order IDs with previously known IDs (store in a ref, not state).
3. If new order IDs appear: call `alertStore.triggerAlert(newOrderId)`.
4. Alert state triggers:
   - `NewOrderAlertOverlay` renders full-screen over everything (z-index: 9999)
   - Audio chime starts playing (loop until dismissed)
   - If tab is backgrounded: `Notification.requestPermission()` → send browser notification
   - Tab title changes to `🔔 New Order! | Your Shop`

### Audio implementation (`src/lib/audio.ts`):
```typescript
// Use Web Audio API — NOT <audio> tag (blocked by autoplay policy)
// Unlock audio context on first user gesture in the app
// Play a generated chime or load /public/alert.mp3

let audioCtx: AudioContext | null = null;

export function unlockAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function playAlertChime(loop = true) {
  // Implement repeating chime using AudioContext oscillator or load alert.mp3
  // Return a stop() function so caller can silence it
}

export function stopAlertChime() { /* ... */ }
```

### `NewOrderAlertOverlay` component:
- Full-screen dark overlay (rgba(0,0,0,0.85))
- Centered card with:
  - 🔔 icon + "New Order!" heading (large, white)
  - Items summary: "2 files • 48 pages • ₹240"
  - Countdown timer bar (5 minutes — matches backend auto-decline)
    - Green → Amber at 2min → Red at 30sec
  - "View & Accept" button (large, full-width, green)
  - "Reject" button (smaller, red outline)
- NO tap-outside-to-dismiss. Must use explicit buttons.
- Stop audio and clear alertStore when either button is tapped.
- `data-testid="new-order-alert"` for testing.

### Polling setup:
```typescript
// In DashboardPage or a global SellerAlertProvider component
const { data: newOrders } = useQuery({
  queryKey: ['seller-orders-paid'],
  queryFn: () => fetchSellerOrders({ status: 'PAID' }),
  refetchInterval: isOnline ? 5000 : false, // only poll when ONLINE
  enabled: isOnline,
});

// Compare with previousOrderIds ref to detect new arrivals
```

---

## Screen-by-Screen Build Instructions

### Auth Screens (use same pattern as user app)
- `LoginPage`: phone input with `+91` prefix, validation, "Continue" CTA. On submit → `POST /auth/request-otp`.
- `OtpPage`: 6-box OTP input, auto-advance, resend timer (30s). On verify → `POST /auth/verify-otp` with `role: 'SELLER'`. On success → fetch `/sellers/me` → routing logic above.

### Registration (`/register`) — Multi-step form
3 steps with a progress indicator (1/3, 2/3, 3/3):

**Step 1 — Shop basics:**
- Shop name (required, min 3 chars)
- Description (optional, max 200 chars)
- Shop photo upload: tap to upload → presigned URL flow → show preview

**Step 2 — Location:**
- Address search input with autocomplete (`GET /location/autocomplete`)
- Show map pin preview (use static map image from Maps API, or just show address text if map is complex)
- Confirm address button

**Step 3 — Category & Pricing:**
- Category selection: multi-select pills (Printing, Stationery, Gifts, etc. from `GET /categories`)
- If "Printing" selected: show price fields:
  - B&W price per page (₹)
  - Color price per page (₹)
- Prep time estimate: slider or dropdown (5 min / 10 min / 15 min / 30 min)

On final submit: `POST /sellers/register` → show success screen → redirect to `/pending`.

### Pending Approval (`/pending`)
- Status card: "Your shop is under review" with clock illustration
- Estimated time: "Usually takes 24-48 hours"
- "Edit Profile" button → registration form in edit mode
- Poll `GET /sellers/me` every 60 seconds — if `isVerified` becomes true, show a toast and redirect to `/dashboard`

### Dashboard (`/dashboard`) — THE main screen
**Top section:**
- Shop name (left)
- ONLINE / OFFLINE toggle (right) — large, prominent
  - ONLINE: green background, pulsing dot
  - OFFLINE: gray, no pulse
  - Tapping OFFLINE → calls `POST /sellers/status { isOnline: false }` → stops polling
  - Tapping ONLINE → calls `POST /sellers/status { isOnline: true }` → starts polling

**Stats row (3 cards):**
- Orders today (count from completed + in-progress)
- Revenue today (₹)
- Pending (new orders awaiting accept)

**Order sections (vertical list, each collapsible):**

1. **New Orders** (amber header with count badge) — highest urgency
   - Each `OrderCard`:
     - Customer first name + order time ago ("Raj • 3 min ago")
     - Items summary ("2 files, 48 pages • A4 Color")
     - Total (₹, bold)
     - Countdown timer (5 min bar, auto-ticks)
     - **ACCEPT** button (green, large, full-width) + **REJECT** (red outline, smaller)
   - Auto-declined orders fade out with animation

2. **Preparing** (blue header)
   - OrderCard with: summary, time since accepted
   - "Mark Ready" button

3. **Ready for Pickup** (green header)
   - OrderCard with: summary, delivery partner info if assigned
   - Read-only, informational

4. **Completed Today** (gray header, collapsed by default)
   - Compact list, tap to expand

**Empty state:** When no active orders: illustration + "You're all set. Orders will appear here."

### Order Detail Page
Accessible by tapping any OrderCard. Full order information:

- **Header:** Order # (short), timestamp, status badge
- **Items section:**
  - For printing items: file icon + filename + "48 pages • A4 • Color • 2 copies = 96 pages" + "📄 View File" button
    - "View File" → `GET /orders/seller/orders/:id/files/:fileId/download` → open presigned URL in new tab
  - For product items: image + name + quantity + unit price
- **Price breakdown:** subtotal, delivery fee, total
- **Delivery:** area name + "~2.3km away" (don't show full customer address)
- **Action buttons** based on status:
  - PAID: Accept + Reject (same as card)
  - ACCEPTED: "Start Preparing" → PREPARING
  - PREPARING: "Mark Ready for Pickup" → READY_FOR_PICKUP
  - READY_FOR_PICKUP / beyond: read-only

### Product List Page (`/products`)
- Search bar (filters local list)
- Filter tabs: All / In Stock / Out of Stock
- Product grid (2 columns on 430px):
  - Image, name, price, stock toggle (Switch)
  - Tap card → edit. Long-press price → inline edit.
- FAB "+" button → AddEditProductPage

### Add/Edit Product Page
Form fields:
- Image upload (presigned URL, show preview)
- Name (required)
- Description (optional)
- Category (dropdown from seller's categories)
- Unit (per page / per piece / per kg)
- Price ₹ (required)
- MRP ₹ (optional — shows strikethrough if set)
- In Stock toggle
- Best Seller toggle

On save: `POST /sellers/me/products` or `PATCH /sellers/me/products/:id`.
On delete (edit mode only): "Remove Product" → confirm bottom sheet → `DELETE`.

### Earnings Page (`/shop/earnings`)
- Period selector tabs: Today / Week / Month / All Time
- Large total earnings number (₹)
- Sub-stats: X orders • Avg ₹Y per order
- Orders breakdown list: date, order #, amount
- **Withdrawal section:**
  - Available balance (total - withdrawn)
  - "Request Withdrawal" button (only shown if balance > ₹100)
  - Bottom sheet: amount input + bank details (account number, IFSC, account holder name)
  - Withdrawal history: date, amount, status pill (Pending/Processing/Completed)

API: `GET /sellers/me/earnings?period=today|week|month|all`, `GET /sellers/me/payouts`, `POST /sellers/me/payouts`

### Shop Settings Page (`/shop/settings`)
- Edit all registration fields: name, description, photo, address, categories, pricing, prep time
- Same form as registration but all pre-filled
- Save → `PATCH /sellers/me`

### Profile Page (`/shop/profile`)
- Name, email fields (editable)
- Phone (read-only, shown as reference)
- Notification settings: "Alert sound" toggle (persisted in localStorage)
- Appearance: Light / Dark / System
- Logout button (with confirmation)

### Order History Page (`/orders/history`)
- Filter by status: All / Completed / Rejected / Cancelled
- Date range picker (Today / Last 7 days / Last 30 days / Custom)
- Order list: date, order #, items summary, amount, status pill
- Tap → OrderDetailPage (read-only state)

---

## API Endpoint Reference

```
Auth:
  POST /auth/request-otp          { phone, role: 'SELLER' }
  POST /auth/verify-otp           { phone, otp, role: 'SELLER' }
  POST /auth/refresh-token

Seller Profile:
  POST /sellers/register          { shopName, description, imageUrl, address, categories, pricing, prepTime }
  GET  /sellers/me                returns Seller with isVerified, isSuspended, isOnline
  PATCH /sellers/me               partial update of profile
  POST /sellers/status            { isOnline: boolean }

Orders:
  GET  /orders/seller/orders      ?status=PAID|ACCEPTED|PREPARING|READY_FOR_PICKUP|COMPLETED
  GET  /orders/seller/orders/:id  full order detail
  POST /orders/seller/orders/:id/accept
  POST /orders/seller/orders/:id/reject   { reason? }
  POST /orders/seller/orders/:id/ready    (marks READY_FOR_PICKUP)

Products:
  GET    /sellers/me/products
  POST   /sellers/me/products
  PATCH  /sellers/me/products/:id
  DELETE /sellers/me/products/:id

Files:
  POST /internal/files/presigned-url   { filename, mimeType, purpose: 'PRODUCT_IMAGE' }
  GET  /orders/seller/orders/:id/files/:fileId/download   → { url } presigned GET URL

Earnings:
  GET  /sellers/me/earnings       ?period=today|week|month|all
  GET  /sellers/me/payouts
  POST /sellers/me/payouts        { amount, bankDetails }

Shared:
  GET  /categories                all active categories
  GET  /location/autocomplete     ?q=...
  GET  /users/me                  logged-in user profile
  PATCH /users/me                 update name/email
```

---

## Navigation Structure

```
Bottom Navigation (3 tabs — visible only when authenticated + approved):
  Tab 1: Orders    → /dashboard
  Tab 2: Products  → /products
  Tab 3: Shop      → /shop/settings

Stack routes (push from orders tab):
  /orders/:id          → OrderDetailPage
  /orders/history      → OrderHistoryPage

Stack routes (push from shop tab):
  /shop/earnings       → EarningsPage
  /shop/profile        → ProfilePage

Auth routes (no bottom nav):
  /login
  /otp
  /register
  /pending
  /suspended

Global overlay (above everything):
  NewOrderAlertOverlay (renders in root, above bottom nav)
```

---

## Build Phases — Do These Strictly In Order

### Phase S1: Foundation + Auth + Onboarding
**Goal:** Any seller can go from installing the app to seeing the pending approval screen.

1. Scaffold `apps/seller-web/` with Vite + React + TS + Tailwind v4. Add to pnpm workspace.
2. Configure Tailwind with the design tokens above (or from `designs/seller/`).
3. Build UI atoms: `Button` (variants: primary, danger, outline, ghost), `Input`, `Badge`, `Switch`, `Spinner`, `Skeleton`, `Card`, `BottomSheet`.
4. Create `api/client.ts`: axios instance, `{ code, data, message }` unwrapping interceptor, auth header injection, 401 refresh logic.
5. Create `authStore` (Zustand): token, seller profile, user profile.
6. Build `LoginPage` → `OtpPage` → post-auth routing logic.
7. Build `RegistrationPage` (3-step form with presigned image upload).
8. Build `PendingApprovalPage` (with 60s polling to detect approval).
9. Build `SuspendedPage`.
10. Implement `AppShell` with `BottomNav` (renders only when approved).

**Verification:** `pnpm dev` → seller can register → see pending screen. Existing verified seller logs in and reaches an empty dashboard.

---

### Phase S2: Dashboard + Order Management (HIGHEST PRIORITY)
**Goal:** Seller can receive, accept, and fulfill orders end-to-end.

1. Implement `useSellerOrders` hook (React Query, polls by status).
2. Build real-time alert system:
   - `src/lib/audio.ts` with Web Audio API chime
   - `alertStore` (Zustand)
   - Polling logic comparing IDs
   - `NewOrderAlertOverlay` component (full-screen, audio, countdown timer, no tap-outside-dismiss)
   - Browser Notification API integration
3. Build `DashboardPage`:
   - Online/Offline toggle (calls `POST /sellers/status`)
   - Stats row (today's orders + revenue + pending count)
   - Order sections: New → Preparing → Ready → Completed Today
   - `OrderCard` component with inline Accept/Reject/Mark Ready buttons
   - Countdown timer on new order cards (5-minute countdown from order created time)
4. Build `OrderDetailPage`:
   - Full item rendering (printing config display + "View File" button)
   - Presigned URL fetch for file access
   - Status-dependent action buttons
5. Build `OrderHistoryPage`.

**Verification:** Go online → new PAID order from test user app → alert fires (sound + overlay) → accept → mark ready. File view works. History shows completed orders.

---

### Phase S3: Products + Shop Settings
**Goal:** Seller can manage their full product catalog and shop profile.

1. Build `ProductListPage` with search, filter tabs, stock toggle, inline price edit.
2. Build `AddEditProductPage` with image upload.
3. Implement product CRUD hooks (useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct).
4. Build `ShopSettingsPage` (edit all registration fields, same form components reused).
5. Build `ProfilePage` (name/email, notification sound toggle, appearance).

**Verification:** Add product → see in list → toggle stock → edit price → save settings.

---

### Phase S4: Earnings + Polish
**Goal:** Sellers have full visibility into earnings and can request payouts.

1. Build `EarningsPage` with period selector, totals, per-order breakdown.
2. Build withdrawal request bottom sheet.
3. Build withdrawal history list.
4. Add loading skeletons to every page.
5. Add empty states with illustrations to every list.
6. Add error states with retry to every data-dependent screen.
7. Smooth page transitions (Framer Motion).
8. Test on actual mobile viewport (Chrome DevTools + real phone).
9. Fix any tap target size issues (minimum 48px).

**Verification:** Full flow test — register (or use approved account) → go online → receive order → accept → prepare → ready → check earnings → request withdrawal.

---

## Critical Rules

1. **Alert system is non-negotiable.** If a seller misses a new order because the alert didn't fire, the platform loses money. Test on a real phone. Test with the tab in the background. Test audio unlock (requires prior user gesture).

2. **Online/Offline toggle must be accurate.** If seller goes offline, polling must stop. ONLINE state must persist across page refreshes (store in Zustand + persist to localStorage, then re-sync with server on load).

3. **Every screen needs 3 states:** loading skeleton, empty state, error with retry.

4. **Printing order items must show all config.** Filename, page count, color/BW, paper size, copies, calculated total pages. The seller needs this to prepare the order correctly. It's the core use case.

5. **"View File" must work.** Sellers can't prepare print orders without seeing the file. This requires the backend presigned URL endpoint. If the endpoint doesn't exist, create a placeholder that shows the order payload's fileUrl directly.

6. **No layout shifts.** Use skeleton components that match the exact dimensions of the loaded content.

7. **Forms must validate.** All forms show inline errors on blur. Submit buttons disabled while request is in flight.
