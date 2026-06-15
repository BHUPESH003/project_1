# MASTER PROMPT — Admin Console (`apps/admin-web/`)

You are building the admin console for a hyperlocal commerce marketplace. This is a desktop-optimized React web app with a sidebar layout — used by the platform admin (you) to manage sellers, orders, banners, categories, and payouts. It is responsive but desktop-first.

---

## Step 0: Read These Files Before Writing a Single Line of Code

Do this in order. Do not skip any file.

1. `docs/claude/SELLER_ADMIN_CONSOLE_PLAN.md`
   → Complete spec for this app. Screen inventory (11 screens), navigation structure (sidebar), API endpoints, all 4 build phases, admin actions per entity. This is your primary reference.

2. `docs/claude/WEB_APP_BUILD_INSTRUCTIONS.md`
   → Base build instructions. Read it for: monorepo setup, shared packages, Tailwind v4 config pattern, React Query + Zustand patterns, axios interceptor with `{ code, data, message }` wrapper. The admin app follows the same patterns but with a desktop layout.

3. `designs/admin/` folder (if it exists)
   → Visual exports. If present, extract exact colors, spacing, and component specs. If empty, use the design system tokens below.

4. `packages/types/src/enums.ts`
   → Shared enums: `OrderStatus`, `SellerStatus`, `PaymentStatus`, `DeliveryStatus`. Import from `@repo/types`. Never redefine.

5. `services/api/prisma/schema.prisma`
   → Source of truth for data shapes. Derive TypeScript types from Order, Seller, User, Product, PayoutRequest, Banner, Category models.

6. `services/api/src/modules/admin/` — all admin endpoints and their DTOs.

---

## What You're Building

**Location in monorepo:** `apps/admin-web/`

**Tech stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router v7 + Zustand + React Query + Recharts + Framer Motion + Radix UI + Lucide icons + pnpm

**Form factor:** Desktop-first. Full viewport width. Sidebar (240px) + top bar (64px) + main content area. On smaller screens (< 1024px), sidebar collapses to icon-only (60px). No mobile-specific breakpoints needed — admin will be used on laptop/desktop.

**Authentication:** Phone + OTP, role=ADMIN. On login success, verify the user has admin role. If not admin, redirect to `/unauthorized`.

---

## Design System

The admin console uses the same teal primary as the user and seller apps, but with a clean, information-dense dashboard aesthetic. No glassmorphism, no heavy animations — fast, readable, professional.

Extract exact values from `designs/admin/` if available. If not, use:

```css
/* Base palette */
--color-primary: #0D9488;
--color-primary-hover: #0F766E;
--color-primary-light: #CCFBF1;
--color-danger: #EF4444;
--color-warning: #F59E0B;
--color-success: #22C55E;
--color-info: #3B82F6;

/* Surfaces */
--color-bg: #F1F5F9;            /* slate-100 — main background */
--color-sidebar: #0F172A;       /* slate-900 — dark sidebar */
--color-card: #FFFFFF;
--color-border: #E2E8F0;

/* Text */
--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-text-sidebar: #CBD5E1;  /* text on dark sidebar */
--color-text-sidebar-active: #FFFFFF;

/* Status pills */
--color-status-pending: #FEF3C7;    /* bg + --color-warning text */
--color-status-active: #DCFCE7;     /* bg + --color-success text */
--color-status-suspended: #FEE2E2;  /* bg + --color-danger text */
--color-status-completed: #F1F5F9;  /* bg + --color-text-secondary text */

/* Charts: use these in order */
/* #0D9488, #3B82F6, #F59E0B, #EF4444, #8B5CF6 */
```

---

## Architecture Rules

**1. File structure:**
```
apps/admin-web/src/
├── api/
│   ├── client.ts              # axios instance, interceptors
│   └── hooks/                 # React Query hooks organized by domain
│       ├── useOrders.ts
│       ├── useSellers.ts
│       ├── useBanners.ts
│       ├── useCategories.ts
│       ├── useAnalytics.ts
│       └── usePayouts.ts
├── stores/
│   └── authStore.ts           # token, user profile, admin role check
├── components/
│   ├── ui/                    # atoms: Button, Input, Badge, Table, Modal, Select, DatePicker, Tabs
│   ├── layout/
│   │   ├── AdminShell.tsx     # sidebar + top bar + content area wrapper
│   │   ├── Sidebar.tsx        # nav links, collapse toggle
│   │   └── TopBar.tsx         # search, notification bell, user avatar
│   ├── orders/                # OrdersTable, OrderStatusBadge, AdminOrderActions
│   ├── sellers/               # SellersTable, SellerStatusBadge, AdminSellerActions
│   ├── banners/               # BannerCard, BannerForm
│   ├── categories/            # CategoryRow, CategoryForm
│   ├── analytics/             # RevenueChart, OrdersChart, SellerPerformanceTable
│   └── shared/                # StatCard, EmptyState, LoadingTable, ConfirmModal
├── pages/
│   ├── auth/                  # LoginPage, OtpPage
│   ├── DashboardPage.tsx
│   ├── orders/                # OrdersListPage, OrderDetailPage
│   ├── sellers/               # SellersListPage, SellerDetailPage
│   ├── banners/               # BannersListPage, BannerFormPage
│   ├── CategoriesPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── PayoutsPage.tsx
│   └── SettingsPage.tsx
├── lib/
│   └── formatters.ts          # ₹ currency, date, % formatters
└── types/
    └── api.ts                 # API response types
```

**2. Same React Query + Zustand + axios interceptor pattern** as user and seller apps (see `WEB_APP_BUILD_INSTRUCTIONS.md`).

**3. Table component:** Build a reusable `Table` component that supports sortable columns (click header → toggle asc/desc), pagination (page number + prev/next), and row click. This will be used on every list page.

**4. Confirmation modals:** All destructive admin actions (cancel order, suspend seller, reject payout, delete banner) must show a `ConfirmModal` before the API call fires. Modal must show: action name, entity ID, and any required reason input field.

**5. pnpm only.**

---

## Layout: AdminShell

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px, dark)      │ TOP BAR (full width, 64px, white)  │
│                            │ [Search] _________ [🔔 3] [Avatar] │
│ 🏪 ShopOS Admin           ├────────────────────────────────────│
│                            │                                    │
│ ▸ Dashboard               │  PAGE CONTENT AREA                 │
│ ▸ Orders                  │  (scrollable)                      │
│ ▸ Sellers                 │                                    │
│ ▸ Banners                 │                                    │
│ ▸ Categories              │                                    │
│ ▸ Analytics               │                                    │
│ ▸ Payouts                 │                                    │
│ ▸ Settings                │                                    │
│                            │                                    │
│ [Logout]                  │                                    │
└────────────────────────────┴────────────────────────────────────┘
```

- Active nav item: teal text + teal left border + slightly lighter background
- Sidebar collapse: icon-only mode at < 1024px, hover tooltip shows label
- Notification bell: shows red badge with count of pending seller approvals
- Top bar search: global search — placeholder in Phase A1, wire up in Phase A4

---

## Screen-by-Screen Build Instructions

### Auth
- `LoginPage`: Phone + OTP, same pattern as other apps. After OTP verify, check `user.role === 'ADMIN'`. If not, redirect to `/unauthorized`.
- `OtpPage`: standard 6-digit OTP input.

### Dashboard (`/`)
**KPI Cards row (4 cards):**
- Orders today (number + trend arrow vs yesterday, e.g., "↑ 12%")
- Revenue today (₹ + trend)
- Active sellers (online count / total, e.g., "8 / 23")
- Pending approvals (red badge if > 0)

Data: `GET /admin/analytics/overview?period=today`

**Attention Required section** (amber background, only shown if there are items):
- Sellers awaiting approval: "3 sellers pending" → link → `/sellers?tab=pending`
- Stale orders: "2 orders PAID for >15 min with no seller action" (compute client-side from order createdAt) → link → `/orders?status=PAID`
- Failed deliveries: count of `DELIVERY_FAILED` orders → link

**Recent Orders table** (last 10, no pagination on dashboard):
- Columns: Order ID (short), Status (badge), Seller, Category, Amount, Created (relative time)
- Clickable rows → `/orders/:id`

Data: `GET /admin/orders?limit=10&sort=createdAt:desc`

### Orders List (`/orders`)
**Filter bar:**
- Status dropdown (All + every OrderStatus value)
- Seller search (debounced autocomplete)
- Date range: preset buttons (Today / Last 7 days / Last 30 days) + custom date picker
- Clear filters button

**Data table** (use reusable `Table` component):
- Columns: Order ID, Status (pill), Seller, User, Items Summary, Amount, Created, Actions
- Sortable: Created (default desc), Amount
- Pagination: 20 per page
- Actions: "View" → `/orders/:id`

Data: `GET /admin/orders?status=X&sellerId=Y&from=Z&to=W&page=N&limit=20`

### Order Detail (`/orders/:id`)
Layout: two-column on desktop (main content left, admin actions panel right/sticky).

**Left — 6 sections:**

1. **Items** — full item list with print config for printing orders. Price breakdown.
2. **Status Timeline** — vertical timeline, every state transition. Each: status badge + timestamp + actor (USER / SELLER / SYSTEM / ADMIN).
3. **Seller** — name, shop, phone. "View Seller →" link.
4. **Customer** — first name, masked phone (show last 4 digits only), delivery area.
5. **Payment** — Razorpay payment ID, amount, method, timestamp. Refund details if any.
6. **Delivery** — provider, task ID, status, tracking URL link.

**Right — Admin Actions (sticky panel):**

Context-based — show only relevant actions:
```
PAID or ACCEPTED → "Reassign Seller" button
Any active status → "Cancel Order" button  
DELIVERED, no refund yet → "Issue Refund" button
DELIVERY_FAILED → "Retry Delivery" + "Cancel Order" buttons
```

Every button → `ConfirmModal`:
- "Reassign Seller": seller search input + reason (required) → `POST /admin/orders/:id/reassign-seller`
- "Cancel Order": reason input (required) + refund amount (auto-filled, editable) → `POST /admin/orders/:id/cancel`
- "Issue Refund": amount input (max = order total) + reason → `POST /admin/orders/:id/refund`
- "Retry Delivery": provider dropdown → `POST /admin/orders/:id/reassign-delivery`

**Audit log** (bottom): timestamp, admin user, action taken, any notes.

### Sellers List (`/sellers`)
**Filter tabs:** All | Pending (N) | Online | Offline | Suspended

**Data table:**
- Columns: Shop Name, Owner Phone, Status (pill), Verified (✓/✗ icon), Categories (tags), Orders, Revenue (₹), Joined, Actions
- Quick actions:
  - Pending tab: "Approve" (green button, no confirm needed — low risk) → `POST /admin/sellers/:id/verify`
  - All tabs: "Suspend" → confirm modal with reason → `POST /admin/sellers/:id/suspend`
  - Suspended: "Unsuspend" → confirm → `POST /admin/sellers/:id/unsuspend`
- Row click → `/sellers/:id`

**Search:** debounced input filtering by shop name or phone

### Seller Detail (`/sellers/:id`)
**Header card:** shop image (avatar if none), shop name, owner name + phone, joined date, categories as pills, full address.

**Status badges:** Verified/Unverified • Online/Offline • Active/Suspended • Trending/Not Trending

**Stats row (4 cards):** Total orders, Completed orders, Total revenue (₹), Acceptance rate (%).

**Admin Actions:**
- Verify / Unverify toggle → `POST /admin/sellers/:id/verify` or `/unverify`
- Suspend (if active) → confirm with reason → `POST /admin/sellers/:id/suspend`
- Unsuspend (if suspended) → confirm → `POST /admin/sellers/:id/unsuspend`
- Mark Trending / Remove Trending toggle → `PATCH /admin/sellers/:id { isTrending }`
- Edit Profile → modal with all seller profile fields → `PATCH /admin/sellers/:id`

**Recent Orders table:** last 20, same columns as orders list, clickable rows.

**Products list (read-only):** grid or list of seller's products with name, price, stock status.

### Banners (`/banners`)
**List view:** grid of banner cards (3 columns desktop).
Each card: image preview (16:9), badge text pill, title, active toggle (Switch), date range if scheduled, "Edit" + "Delete" icon buttons.

Display order controls: ↑ / ↓ arrow buttons on each card (swaps `displayOrder` values).

"Add Banner" button (top right) → `/banners/new`

### Banner Form (`/banners/new`, `/banners/:id/edit`)
Left column: form fields. Right column: live preview card (updates as user types).

Fields:
- Image upload (tap/click area → file picker → presigned URL upload → preview)
- Badge text (optional, short, e.g., "New")
- Title (required)
- Subtitle (optional)
- CTA text + CTA link
- Display order (number input)
- Active toggle
- Start date (optional) + End date (optional)

Preview card shows: image, badge pill, title, subtitle, CTA button — exactly as it will appear in the user app.

Save → `POST /admin/banners` or `PATCH /admin/banners/:id` → redirect to `/banners`.

### Categories (`/categories`)
Single page, inline editing — no separate route for edit.

**Table:** Slug (read-only), Name, Status dropdown (Active/Coming Soon/Inactive inline), Display Order (editable number), Icon (image preview + upload button), Save (per row).

"Add Category" button → new blank row at top of table.

On row save: `POST /admin/categories` (new) or `PATCH /admin/categories/:id` (existing).

### Analytics (`/analytics`)
Tab navigation: Overview | Sellers

**Date range picker** (top, drives all data): Last 7 days / Last 30 days / This month / Custom range.

**Overview tab:**
- `RevenueChart` (Recharts `AreaChart`): dates on x-axis, ₹ on y-axis. Gradient fill. Toggle daily/weekly/monthly grouping.
- `OrdersChart` (Recharts `BarChart`): order volume over same period.
- KPI row: AOV (₹), Cancellation rate (%), Seller rejection rate (%).

**Sellers tab:**
- Top 10 sellers by revenue — table (rank, shop name, orders, revenue, acceptance rate).
- Top 10 sellers by order count — separate table.
- Avg fulfillment time ranking — table (shop name, avg mins, orders).

Empty state for each chart/table: "No data for this period" with icon.

Data: `GET /admin/analytics/overview?from=X&to=Y&groupBy=day|week|month`, `GET /admin/analytics/sellers?from=X&to=Y`

### Payouts (`/payouts`)
**Filter tabs:** Pending | Processing | Completed | Rejected

**Table:**
- Columns: Date, Seller Name, Amount (₹), Bank Details (masked account: "HDFC •••• 4521"), Status pill, Actions
- Pending actions: "Process" (green) + "Reject" (red outline)
  - Process → `ConfirmModal` showing full bank details (account number, IFSC, account holder) + optional note → `POST /admin/payouts/:id/process`
  - Reject → `ConfirmModal` with required reason → `POST /admin/payouts/:id/reject`
- Completed/rejected: "Details" → modal showing processing timestamp, who processed it, note.

### Settings (`/settings`)
- Name, email (editable) → `PATCH /users/me`
- Phone (read-only)
- Appearance: Light / Dark / System
- Logout (with confirm)

---

## API Endpoint Reference

```
Auth:
  POST /auth/request-otp          { phone, role: 'ADMIN' }
  POST /auth/verify-otp           { phone, otp }
  POST /auth/refresh-token

Orders:
  GET  /admin/orders              ?status, sellerId, from, to, page, limit
  GET  /admin/orders/:id
  POST /admin/orders/:id/cancel            { reason, refundAmount? }
  POST /admin/orders/:id/reassign-seller   { sellerId, reason }
  POST /admin/orders/:id/reassign-delivery { provider, reason }
  POST /admin/orders/:id/refund            { amount, reason }

Sellers:
  GET  /admin/sellers             ?status, search, page, limit
  GET  /admin/sellers/:id
  PATCH /admin/sellers/:id
  POST /admin/sellers/:id/verify
  POST /admin/sellers/:id/unverify
  POST /admin/sellers/:id/suspend    { reason }
  POST /admin/sellers/:id/unsuspend

Banners:
  GET  /admin/banners
  GET  /admin/banners/:id
  POST /admin/banners
  PATCH /admin/banners/:id
  DELETE /admin/banners/:id

Categories:
  GET  /categories
  POST /admin/categories
  PATCH /admin/categories/:id

Analytics:
  GET  /admin/analytics/overview  ?from, to, groupBy
  GET  /admin/analytics/orders    ?from, to, groupBy
  GET  /admin/analytics/sellers   ?from, to

Payouts:
  GET  /admin/payouts             ?status, page, limit
  POST /admin/payouts/:id/process { note? }
  POST /admin/payouts/:id/reject  { reason }

Files:
  POST /internal/files/presigned-url  { filename, mimeType, purpose: 'BANNER' }

User:
  GET  /users/me
  PATCH /users/me
```

---

## Build Phases — Do These Strictly In Order

### Phase A1: Foundation + Auth + Dashboard
1. Scaffold `apps/admin-web/`. Add to pnpm workspace.
2. Configure Tailwind tokens (from `designs/admin/` or tokens above).
3. Build `AdminShell`: dark sidebar (collapsible) + top bar + scrollable content area.
4. Build `Sidebar` with all nav links, active state, collapse behavior.
5. Build UI atoms: `Button`, `Input`, `Select`, `Badge`, `StatCard`, `ConfirmModal`, `Spinner`, `Skeleton`.
6. Build reusable `Table` component (sort + pagination + loading + empty states).
7. Create `api/client.ts` with interceptors + `authStore`.
8. Build `LoginPage` → `OtpPage` → role check → redirect.
9. Build `DashboardPage` (KPI cards + Attention Required + Recent Orders).
10. Build `formatters.ts` (Indian currency, relative time, percentage).

**Verification:** Login as admin → dashboard shows live data.

---

### Phase A2: Order + Seller Management (HIGHEST PRIORITY)
1. Build `OrdersListPage` (filter bar + sortable/paginated table).
2. Build `OrderDetailPage` (all 6 sections + admin actions panel + confirm modals).
3. Build `SellersListPage` (filter tabs + table + quick approve/suspend).
4. Build `SellerDetailPage` (profile + stats + admin actions + recent orders + products).
5. Wire all mutation hooks to backend endpoints.

**Verification:** Approve a seller. Cancel an order with a reason. Issue a refund. All show in UI correctly.

---

### Phase A3: Content Management
1. Build `BannersListPage` (grid, active toggle, display order controls).
2. Build `BannerFormPage` (form + live preview, image upload).
3. Build `CategoriesPage` (inline editable table, add row).
4. Wire all CRUD operations.

**Verification:** Add a banner → visible in user app. Change category to "Coming Soon" → shows correct state.

---

### Phase A4: Analytics + Payouts + Polish
1. Build `AnalyticsPage` (Recharts charts + date range picker + seller tables).
2. Build `PayoutsPage` (filter tabs + process/reject flow).
3. Build `SettingsPage`.
4. Wire top bar global search (orders by ID, sellers by name).
5. Add loading skeletons everywhere.
6. Add error boundaries + retry UI.
7. Keyboard: `Escape` closes any open modal.
8. Final cross-browser and responsive check.

**Verification:** Full operational flow from login through payout processing.

---

## Critical Rules

1. **Confirm before every destructive action.** Cancel order, suspend seller, delete banner, reject payout — all require `ConfirmModal`. No one-click destructive operations.

2. **`Table` is foundational — build it well in Phase A1.** Sortable headers, pagination, loading skeletons, empty state, row click. All list pages depend on it.

3. **Role guard is non-negotiable.** Every route behind `AdminShell` checks `user.role === 'ADMIN'`. The axios interceptor handles token refresh, but role must be re-validated on the frontend too.

4. **Indian number formatting everywhere.** `₹1,23,456` — not `₹123,456`. Use `formatters.ts`. Consistency matters for credibility.

5. **Attention Required must be accurate.** The stale orders calculation is client-side: filter PAID orders where `(now - createdAt) > 15 minutes`. Don't hardcode — compute from real timestamps.

6. **Charts need graceful empty states.** Empty chart area = "No data for this period" centered with an icon. Not a blank Recharts canvas with empty axes.

7. **Every API mutation error surfaces as a toast.** Never silently swallow errors. Use a global toast provider.

8. **No layout shifts.** Skeleton components match exact dimensions of loaded content. Fixed column widths in all tables.
