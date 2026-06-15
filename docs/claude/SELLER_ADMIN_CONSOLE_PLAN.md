# Seller & Admin Console — Complete Design & Build Plan

## Decisions Locked In

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Two separate Vite apps: `apps/seller-web/` + `apps/admin-web/` | Clean separation, different form factors, independent deploys |
| Seller form factor | Mobile-first 430px (like user app) | Sellers use phones at shop counter |
| Admin form factor | Desktop-optimized with sidebar nav | Admin (you) uses laptop |
| Seller persona | Start simple, add complexity later | Mix of tech-savvy and non-tech shop owners |
| Onboarding | Admin-approved | Seller registers → admin verifies → seller can go online |
| Order alerts | Audio + visual (Swiggy-style) | Critical for seller adoption — missed orders = platform failure |
| Admin priority | Operations first, analytics second | Need to manage sellers, handle order issues from day one |
| Payouts | Show earnings + withdrawal requests (manual processing) | Gives sellers transparency without payment rail complexity |
| Build order | Both in parallel | Seller is MVP-critical (orders need someone to accept), admin is ops-critical |

---

# PART 1: SELLER CONSOLE (`apps/seller-web/`)

## Seller Journey Map

```
New Seller:
  Phone+OTP (role=SELLER) → Registration Form → "Pending Approval" screen → [Admin approves] → Dashboard

Returning Seller:
  Phone+OTP → Dashboard (if approved) OR "Pending Approval" (if still pending)

Daily Flow:
  Open app → Go Online → Receive order alert 🔔 → Review → Accept/Reject
  → If accepted: Prepare → Mark Ready → Delivery picks up → Done
  → Check earnings → Manage products → Go Offline → Close app
```

## Seller States

A seller account has three lifecycle states that drive what the app shows:

1. **PENDING** — Registered but not yet verified by admin. Can only see: pending approval screen + edit profile.
2. **APPROVED (OFFLINE)** — Verified but not accepting orders. Can access everything, toggle to ONLINE.
3. **APPROVED (ONLINE)** — Actively receiving orders. Full dashboard with live order management.
4. **SUSPENDED** — Admin-blocked. Shows suspension notice, no actions available.

The backend already has `isVerified` and `isSuspended` flags on the Seller model. The seller app checks these on login and routes accordingly.

## Screen Inventory

### Auth (shared pattern with user app)
1. **LoginPage** — Phone input (+91), "Continue" button. Identical to user app but with seller branding.
2. **OtpPage** — 6-digit OTP verification. On success → check seller profile exists.

### Onboarding (first-time sellers only)
3. **RegistrationPage** — Multi-step form to create seller profile:
   - Step 1: Shop basics — shop name, description, shop photo upload
   - Step 2: Location — address input with autocomplete, map pin (use same location APIs as user app)
   - Step 3: Category & pricing — select categories (printing, hardware, etc.), set per-page price if printing, prep time estimate
   - Submit → "Application Submitted" confirmation screen
4. **PendingApprovalPage** — Shows after registration, before admin approves. "Your shop is being reviewed. We'll notify you when approved." Edit profile link available.

### Dashboard & Orders (core of the app)
5. **DashboardPage** — The home screen. Everything a seller needs at a glance:
   - **Top bar:** Shop name + ONLINE/OFFLINE toggle (large, prominent, green/gray)
   - **Stats row:** Today's orders (count), Today's revenue (₹), Pending orders (count with badge)
   - **New Orders section** (amber/attention state) — Orders waiting for accept/reject:
     - Order card: customer first name, items summary (e.g., "2 files, 48 pages color A4"), total ₹, time since placed
     - Auto-decline countdown timer on each card
     - **ACCEPT** (green, large) / **REJECT** (red outline, smaller) buttons directly on card
   - **In Progress section** — Accepted orders being prepared:
     - Order card: items summary, time since accepted, "Mark Ready" button
   - **Ready for Pickup section** — Waiting for delivery:
     - Order card: items summary, delivery partner info (when assigned), "Delivery arriving in ~X min"
   - **Completed Today section** (collapsed) — finished orders with totals

6. **OrderDetailPage** (seller view) — Full order details:
   - Order number, timestamp, customer first name
   - **Items list with FULL detail:**
     - Printing: filename, page count, color/BW indicator (colored dot), paper size, copies, total pages to print, **"View File" button** (opens file in new tab or in-app viewer)
     - Products: name, quantity, price
   - Price breakdown
   - Delivery info (address area, distance estimate)
   - **Context-dependent actions:**
     - New: Accept (green) + Reject (red outline)
     - Accepted: "Start Preparing" button
     - Preparing: "Mark Ready for Pickup" button
     - Ready: waiting state, delivery partner info

7. **NewOrderAlertOverlay** — Full-screen overlay that appears on new order (highest priority UX):
   - Can't be accidentally dismissed (no tap-outside-to-close)
   - Audio alert plays (repeating chime until interacted with)
   - Shows: order summary, item count, total, countdown timer
   - "View & Accept" primary CTA + "Reject" secondary
   - Timer bar: teal → amber (5 min left) → red (1 min left)
   - If app is in background: browser Notification API + tab title flashes "🔔 New Order!"

### Products
8. **ProductListPage** — Grid/list of seller's products:
   - Each product: image thumbnail, name, price, in-stock toggle (switch)
   - Quick price edit: tap price → inline edit → save
   - "Add Product" FAB or button
   - Filter: All / In Stock / Out of Stock
   - Search bar for own products

9. **AddEditProductPage** — Form:
   - Product image upload (presigned URL flow)
   - Name, description, category (dropdown from seller's categories)
   - Unit (e.g., "per page", "per piece")
   - Price (₹) + MRP (₹, optional for discount display)
   - In Stock toggle
   - Best Seller toggle
   - Save / Delete (mark out of stock)

### Earnings
10. **EarningsPage** — Revenue overview:
    - Period selector: Today / This Week / This Month / All Time
    - Total earnings for period (large number)
    - Breakdown: completed orders count, average order value
    - Order-level list: date, order #, items summary, amount
    - **Withdrawal section:**
      - Available balance (total earnings - already withdrawn)
      - "Request Withdrawal" button → bottom sheet with amount input + bank details
      - Withdrawal history: date, amount, status (Pending/Processing/Completed)

### Shop Settings
11. **ShopSettingsPage** — Edit shop profile:
    - Shop name, description
    - Shop image (change photo)
    - Address (edit with map)
    - Categories (add/remove)
    - Pricing: per-page rates for B&W and Color (if printing category)
    - Prep time estimate (minutes)
    - Operating hours (future — placeholder)

12. **ProfilePage** — Account settings:
    - Phone number (read-only)
    - Name, email
    - Notification preferences (order alerts sound on/off)
    - Appearance (light/dark/system)
    - Help & Support
    - Logout

### Order History
13. **OrderHistoryPage** — Past orders:
    - Filter by status: All, Completed, Rejected, Cancelled
    - Date range filter
    - Order cards: date, customer name, items, total, status pill
    - Tap → OrderDetailPage (read-only)

## Seller Navigation Structure

```
Bottom Nav (3 tabs):
├── Tab 1: Orders (DashboardPage)
│   ├── → OrderDetailPage (push)
│   │   └── → File Viewer (new tab / modal)
│   └── → OrderHistoryPage (push)
│
├── Tab 2: Products (ProductListPage)
│   ├── → AddEditProductPage (push)
│   └── → (inline stock toggle, price edit)
│
├── Tab 3: Shop (ShopSettingsPage)
│   ├── → Edit Shop Details (push)
│   ├── → EarningsPage (push)
│   ├── → ProfilePage (push)
│   └── → Logout

Global Overlays:
├── NewOrderAlertOverlay (highest z-index, audio alert)
├── Toast notifications
└── Online/Offline toggle confirmation
```

## Seller API Endpoints Used

```
Auth:     POST /auth/request-otp, /auth/verify-otp, /auth/refresh-token
Seller:   POST /sellers/register, GET /sellers/me, PATCH /sellers/me, POST /sellers/status
Products: GET /sellers/me/products, POST /sellers/me/products, PATCH /sellers/me/products/:id, DELETE /sellers/me/products/:id
Orders:   GET /orders/seller/orders?status=X, POST /orders/seller/orders/:id/accept, POST /orders/seller/orders/:id/reject, POST /orders/seller/orders/:id/ready
Files:    POST /internal/files/presigned-url, POST /internal/files/validate
Location: GET /location/address, GET /location/autocomplete
User:     GET /users/me, PATCH /users/me
```

## Real-Time Order Alerts (Technical Approach)

Since we're building a web app (not native), real-time alerts work via:

1. **Polling** (simplest, MVP): Poll `GET /orders/seller/orders?status=PAID` every 5 seconds when seller is ONLINE. Compare with previous response — new order IDs trigger the alert.

2. **Audio**: Use Web Audio API to play an alert sound. The sound loops until the seller interacts. `new Audio('/alert.mp3').play()` — requires user gesture to unlock audio (show a one-time "Enable alerts" button on first visit).

3. **Browser Notifications**: `Notification.requestPermission()` → show system notification when tab is in background. Tab title flashes: `🔔 New Order! | Shop Name`.

4. **Tab visibility**: Use `document.visibilitychange` to detect background/foreground. In background → browser notification. In foreground → full-screen overlay + audio.

5. **Future**: WebSocket or SSE for true real-time. Not needed for MVP — 5-second polling is fast enough.

---

# PART 2: ADMIN CONSOLE (`apps/admin-web/`)

## Admin Journey Map

```
Admin login:
  Phone+OTP (role=ADMIN) → Admin Dashboard

Daily Flow:
  Open dashboard → Check pending seller approvals → Review & approve/reject
  → Monitor live orders → Handle escalations (reassign, cancel, refund)
  → Check analytics → Manage banners/categories → Log out
```

## Screen Inventory

### Auth
1. **LoginPage** — Phone + OTP (role=ADMIN). Same pattern, admin branding.

### Dashboard (Home)
2. **DashboardPage** — Operations overview:
   - **KPI Cards row:**
     - Total orders today (with trend arrow vs yesterday)
     - Revenue today (₹)
     - Active sellers (online count / total)
     - Pending seller approvals (count, with alert badge if > 0)
   - **Attention Required section** (top of page, always visible):
     - Seller approvals pending (count → link to seller list filtered)
     - Orders in failed states (DELIVERY_FAILED, ORDER_EXPIRED) → link to orders filtered
     - Stale orders (PAID but no seller action for >15 min) → link
   - **Recent Orders feed** — Last 10 orders with status, seller, user, amount, timestamp
   - **Quick Actions:** "View all orders", "View sellers", "Manage banners"

### Order Management
3. **OrdersListPage** — Full order management:
   - **Filters bar:** Status dropdown (all statuses), seller search, date range, user search
   - **Data table:** Order ID, Status (pill), User, Seller, Category, Amount, Created, Actions
   - **Sortable columns:** click header to sort
   - **Pagination:** 20 per page with page numbers
   - **Row click** → OrderDetailPage
   - **Bulk actions** (future): select multiple → cancel, etc.

4. **OrderDetailPage** (admin view) — Full order detail with admin actions:
   - Everything the user sees: status, timeline, items, pricing, delivery info
   - PLUS admin-only sections:
     - **State History timeline** — every transition with timestamps, who triggered it
     - **Payment details** — gateway info, payment ID, refund status
     - **Delivery details** — provider, task ID, tracking URL
   - **Admin Actions panel** (context-dependent):
     - "Reassign Seller" → seller search dropdown → confirm
     - "Reassign Delivery" → provider dropdown + tracking ID → confirm
     - "Cancel Order" → reason input + optional refund amount → confirm
     - "Initiate Refund" → amount input → confirm
   - **Audit log** — all admin actions taken on this order

### Seller Management
5. **SellersListPage** — All sellers:
   - **Filter tabs:** All | Pending Approval | Online | Offline | Suspended
   - **Data table:** Shop Name, Owner Phone, Status (pill), Verified (badge), Categories, Orders, Revenue, Joined Date, Actions
   - **Search:** by shop name or phone
   - **Quick actions per row:**
     - Pending: "Approve" (green) / "Reject" (red)
     - Active: "Suspend" / "View"
     - Suspended: "Unsuspend" / "View"
   - **Row click** → SellerDetailPage

6. **SellerDetailPage** (admin view):
   - **Profile card:** shop name, image, address, description, categories, pricing, status badges (verified/suspended/trending)
   - **Stats cards:** Total orders, Completed orders, Total revenue, Acceptance rate, Avg fulfillment time
   - **Recent orders table** (last 20 orders for this seller)
   - **Admin Actions:**
     - "Verify" / "Unverify" toggle
     - "Suspend" / "Unsuspend" toggle
     - "Mark Trending" toggle
     - "Edit Profile" → modal with shop name, address, pricing overrides
   - **Products list** — all products with prices (read-only view)

### Banner Management
7. **BannersListPage** — Banner CRUD:
   - **List:** drag-to-reorder (displayOrder), image preview, title, badge, active toggle, date range
   - **Actions:** Edit, Delete, Toggle Active
   - **"Add Banner" button** → form

8. **BannerFormPage** (create/edit):
   - Image upload (presigned URL)
   - Badge text, Title, Subtitle
   - CTA text, CTA link
   - Display order (number)
   - Active toggle
   - Schedule: start date, end date (optional)
   - Preview card showing how it'll look

### Category Management
9. **CategoriesPage** — Category list with inline edit:
   - Table: ID (slug), Name, Status (Active/Coming Soon/Inactive), Display Order, Icon
   - Inline status toggle
   - "Add Category" → form modal
   - "Edit" → form modal (name, status, description, display order, icon upload)

### Analytics
10. **AnalyticsPage** — Business intelligence (secondary priority, but build the shell):
    - **Overview tab:**
      - Revenue chart (line/bar) — daily/weekly/monthly toggle
      - Orders chart — volume over time
      - KPI cards: AOV, cancellation rate, seller rejection rate
    - **Sellers tab:**
      - Top sellers by revenue (table)
      - Top sellers by order count (table)
      - Avg fulfillment time ranking
      - Acceptance rate ranking
    - **Date range picker** for all analytics (default: this month)

### Settings
11. **SettingsPage** — Admin settings:
    - Profile (name, phone)
    - Appearance (light/dark/system)
    - Rate limiting config (future)
    - Logout

## Admin Navigation Structure

```
Sidebar Nav (desktop):
├── Dashboard (home icon)
├── Orders (list icon) → OrdersListPage
│   └── → OrderDetailPage
├── Sellers (store icon) → SellersListPage
│   └── → SellerDetailPage
├── Banners (image icon) → BannersListPage
│   └── → BannerFormPage
├── Categories (grid icon) → CategoriesPage
├── Analytics (chart icon) → AnalyticsPage
├── Settings (gear icon) → SettingsPage
└── Logout

Top bar:
├── Search (global: orders by ID, sellers by name)
├── Notification bell (pending approvals count)
└── Admin avatar + name
```

## Admin API Endpoints Used

```
Auth:       POST /auth/request-otp, /auth/verify-otp, /auth/refresh-token
Orders:     GET /admin/orders, POST /admin/orders/:id/cancel, POST /admin/orders/:id/reassign-seller, POST /admin/orders/:id/reassign-delivery
Sellers:    GET /admin/sellers, GET /admin/sellers/:id, PATCH /admin/sellers/:id, POST /admin/sellers/:id/verify, POST /admin/sellers/:id/suspend
Banners:    GET /admin/banners, GET /admin/banners/:id, POST /admin/banners, PATCH /admin/banners/:id, DELETE /admin/banners/:id
Categories: POST /admin/categories, PATCH /admin/categories/:id, GET /categories
Analytics:  GET /admin/analytics/overview, GET /admin/analytics/orders, GET /admin/analytics/sellers
User:       GET /users/me
```

## Admin Design Direction

The admin console has a fundamentally different aesthetic from the consumer and seller apps:

- **Layout:** Sidebar navigation (collapsible), top bar with search and notifications, main content area
- **Components:** Data tables with sorting/filtering, form modals, stat cards, charts (use Recharts)
- **Typography:** Clean, readable, information-dense — not flashy
- **Color:** Same teal primary for brand consistency, but used sparingly. Mostly neutral grays, white surfaces, semantic colors for status
- **No animations** except subtle transitions — admin tools should feel fast and responsive, not playful
- **Dark mode:** Yes, but secondary priority. Admin tools are often used in well-lit offices.

---

# PART 3: WHAT'S MISSING FROM THE BACKEND

Before building the frontends, these backend additions are needed:

### For Seller Console:
1. **Seller approval status check** — `GET /sellers/me` already returns `isVerified`. Frontend uses this to gate access. ✅ Already exists.
2. **Order polling optimization** — `GET /orders/seller/orders` with `?status=PAID&since=<timestamp>` for efficient polling. May need a `since` query param added to avoid fetching all orders every 5 seconds.
3. **Payout/Earnings model** — New Prisma model:
   ```prisma
   model PayoutRequest {
     id           String   @id @default(cuid())
     sellerId     String
     amount       Decimal  @db.Decimal(10, 2)
     status       String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, REJECTED
     bankDetails  Json?    // { accountNumber, ifscCode, accountHolder }
     processedAt  DateTime?
     processedBy  String?  // Admin user ID
     note         String?
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
     seller       Seller   @relation(fields: [sellerId], references: [id])
     @@index([sellerId])
     @@index([status])
     @@map("payout_requests")
   }
   ```
   Plus endpoints: `POST /sellers/me/payouts` (request), `GET /sellers/me/payouts` (history), `GET /sellers/me/earnings` (summary).
4. **File download for sellers** — Sellers need to view/download files attached to printing orders. The `orderPayload` has file references, but sellers need a way to access S3 files. Backend may need a `GET /orders/seller/orders/:id/files/:fileId/download` endpoint that generates a presigned GET URL.

### For Admin Console:
1. **Payout management** — `GET /admin/payouts?status=PENDING`, `POST /admin/payouts/:id/process`, `POST /admin/payouts/:id/reject`. New endpoints needed.
2. **Seller approval endpoint** — `POST /admin/sellers/:id/verify` ✅ already exists.
3. **Global search** — Optional for MVP. Can use existing `/search` endpoint or add `/admin/search` for cross-entity search.

---

# PART 4: BUILD PHASES

Both apps share the same monorepo, same tech stack (Vite + React + TS + Tailwind + Zustand + React Query), and same auth pattern. They differ in form factor and design language.

## Seller Console Phases

### Phase S1: Foundation + Auth + Onboarding
- Project scaffold at `apps/seller-web/`
- Shared auth (login + OTP) with seller branding
- Registration multi-step form
- Pending approval screen
- Seller status check on login (route to correct screen based on isVerified/isSuspended)
- Online/offline toggle component
- **Done when:** New seller can register → see pending screen. Existing seller can login → see empty dashboard.

### Phase S2: Dashboard + Order Management (THE critical phase)
- Dashboard layout with stats cards
- Order sections: New / In Progress / Ready / Completed
- Order cards with Accept/Reject/Mark Ready buttons
- Order detail page with full item rendering (including printing config display)
- File viewer (presigned URL → open in new tab)
- **Real-time alerts:** 5-second polling + audio alert + full-screen overlay + browser notifications
- **Done when:** Seller can go online → receive order alert → accept → mark preparing → mark ready. This completes the user app's order flow.

### Phase S3: Products + Settings
- Product list with inline stock toggle and price edit
- Add/edit product form with image upload
- Shop settings (profile, pricing, categories)
- Account settings, appearance, logout
- **Done when:** Seller can manage their full catalog and shop profile.

### Phase S4: Earnings + History + Polish
- Earnings page with period selector
- Withdrawal request flow (bottom sheet)
- Order history with filters
- Loading/empty/error states on all screens
- Animations (order card transitions, alert overlay spring)
- **Done when:** Complete seller experience.

## Admin Console Phases

### Phase A1: Foundation + Auth + Dashboard
- Project scaffold at `apps/admin-web/`
- Desktop layout: sidebar nav + top bar + main content area
- Auth (login + OTP with admin role)
- Dashboard with KPI cards + attention required section + recent orders
- **Done when:** Admin can login → see dashboard with live data.

### Phase A2: Order + Seller Management (THE critical phase)
- Orders list with filters, sorting, pagination
- Order detail with admin actions (reassign seller, reassign delivery, cancel, refund)
- Sellers list with filter tabs (pending/online/offline/suspended)
- Seller detail with stats + admin actions (verify, suspend, edit, mark trending)
- **Seller approval flow:** pending sellers list → review → approve/reject
- **Done when:** Admin can manage all orders and sellers, approve new sellers.

### Phase A3: Content Management
- Banner CRUD with image upload, ordering, scheduling
- Category management with inline edit
- **Done when:** Admin can manage all user-facing content.

### Phase A4: Analytics + Polish
- Analytics page with charts (Recharts)
- Revenue, orders, seller performance dashboards
- Date range picker
- Payout management (view requests, process/reject)
- Global search
- Loading/error states everywhere
- **Done when:** Complete admin experience.

---

# PART 5: TECH STACK DIFFERENCES

| | User App | Seller App | Admin App |
|---|---|---|---|
| Location | `apps/user-web/` | `apps/seller-web/` | `apps/admin-web/` |
| Form factor | Mobile 430px | Mobile 430px | Desktop responsive |
| Layout | Bottom nav tabs | Bottom nav tabs | Sidebar + top bar |
| Design language | Futuristic, glassmorphism | Utilitarian, high-contrast, big buttons | Clean dashboard, information-dense |
| Charts | None | Earnings chart (simple) | Recharts (line, bar, pie) |
| Real-time | Poll orders 30s | Poll orders 5s + audio alerts | Poll dashboard 30s |
| Extra deps | Razorpay SDK | Web Audio API | Recharts, possibly react-table |
| Shared | Tailwind, Zustand, React Query, Radix UI, Framer Motion, Lucide, `@repo/types` |
