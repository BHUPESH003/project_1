# Backend Roadmap — Hyperlocal Commerce Platform

## Purpose

This document is the single source of truth for completing the backend of a hyperlocal commerce marketplace. It is designed to be used as context for Claude Code sessions. Each phase is self-contained with enough context to execute without re-reading the entire document.

---

## Repo & Architecture Context

**Repo:** `github.com/BHUPESH003/project_1`
**Backend path:** `services/api/`
**Stack:** NestJS 11 + Prisma 7 + PostgreSQL + BullMQ + Redis + AWS S3
**Shared types:** `packages/types/` (workspace package `@repo/types`)

### Key Architecture Patterns Already Established

- **Provider/Adapter abstraction:** Payment providers (Razorpay, Paytm), delivery adapters (Uber Direct, Porter, Dunzo), OTP providers (Twilio), notification providers (Firebase, Twilio SMS) — all follow registry pattern. New providers implement an interface and register.
- **Order state machine:** `src/orders/state-machine/` — all order state transitions go through `OrderStateMachineService`. State history is immutable audit log. Never mutate order status directly.
- **Category handler pattern:** `src/categories/handlers/` — category-specific logic (validation, pricing) handled via `CategoryRegistry`. Printing handler exists. Generic handler as fallback. No if/else by category anywhere.
- **BullMQ queues:** `src/queue/` — async jobs for notifications, delivery assignment, order timeout. Exponential backoff configured.
- **Prisma repositories:** Most modules use a repository layer between service and Prisma client.
- **Transform interceptor:** Consistent API response format `{ success, data, message }`.
- **JWT auth guards:** Role-based access (USER, SELLER, ADMIN).

### Database Schema Summary (Prisma)

Core models: User, Seller, Category, SellerCategory, Product, Order, OrderStateHistory, Payment, Delivery, DeliveryPartner, DeliveryQuotation, File, Cart, CartItem, CartItemFile, UserAddress, UserFavorite, Banner, Otp, UserProductWishlist, UserProductNotify.

Order has `orderPayload: Json` for category-agnostic data. Cart items have `payload: Json` for category-specific config. CartItem has `sellerId` — cart is multi-seller by design.

### Order State Flow

```
CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
                                  ↘ SELLER_REJECTED (can → SELLER_SELECTED for reassignment)
                                  ↘ USER_CANCELLED (from any pre-PICKED_UP state)
                            ↘ ORDER_EXPIRED
                                                                                        ↘ DELIVERY_FAILED
```

### Existing Endpoints (~55 total)

Auth: POST request-otp, verify-otp, refresh-token
Users: GET/PATCH me, CRUD addresses, notification preferences
Sellers: GET available/trending/new/:id, POST status, GET :id/products, :id/products/diff
Categories: GET all
Products: deals, wishlist CRUD, notify-me CRUD
Cart: GET cart, POST/PATCH/DELETE items, file attachment, calculate-price
Checkout: GET summary, POST place-order
Orders: POST create/batch, PATCH update, GET list/:id, select-seller, delivery-quotes, create-payment-intent, verify-payment, confirm. Seller: GET orders, POST accept/reject/ready
Payments: POST webhook, verify
Delivery: POST quotations, pickup-drop, internal/assign, internal/webhook
Files: POST presigned-url, validate
Search: GET global search
Location: GET address (reverse geocode), autocomplete
Banners: GET active
Favorites: GET list, POST/DELETE toggle
Admin: GET orders, POST cancel/reassign-seller/reassign-delivery, banner CRUD
Health: GET health

---

## Phase 1: Critical Fixes (Trust & Money)

**Why first:** These are the things that will break user trust or lose money if not working on day one. A user pays, seller rejects, and there's no refund path — that's a lawsuit, not a bug.

### 1.1 Refund Processing

**Context:** Payment model has `refundAmount`, `refundStatus`, `refundedAt` fields. PaymentProvider interface has NO refund method. No refund logic exists anywhere.

**Tasks:**

1. Add `refundPayment` method to `PaymentProvider` interface in `src/payments/providers/payment-provider.interface.ts`:
   ```typescript
   interface RefundPaymentRequest {
     gatewayPaymentId: string;
     amount: number; // In rupees — partial or full
     reason?: string;
   }
   interface RefundPaymentResponse {
     refundId: string;
     status: 'PENDING' | 'PROCESSED' | 'FAILED';
     amount: number;
   }
   refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse>;
   ```

2. Implement `refundPayment` in Razorpay provider (`src/payments/providers/razorpay/razorpay.provider.ts`). Razorpay refund API: `POST /v1/payments/{payment_id}/refund`.

3. Implement `refundPayment` in Paytm provider (`src/payments/providers/paytm/paytm.provider.ts`).

4. Add `initiateRefund(orderId: string, reason: string)` method to `PaymentsService`:
   - Find payment by orderId
   - Verify payment status is SUCCESS
   - Call provider's refundPayment
   - Update Payment record: refundAmount, refundStatus, refundedAt
   - Log the refund

5. Wire refund into order state machine side effects:
   - When order transitions to SELLER_REJECTED and payment exists with status SUCCESS → auto-trigger refund via a new BullMQ job `process-refund.job.ts`
   - When order transitions to USER_CANCELLED and payment exists with status SUCCESS → auto-trigger refund
   - When DELIVERY_FAILED → auto-trigger refund

6. Add refund webhook handling (Razorpay sends refund status updates).

**Files to modify:**
- `src/payments/providers/payment-provider.interface.ts`
- `src/payments/providers/razorpay/razorpay.provider.ts`
- `src/payments/providers/paytm/paytm.provider.ts`
- `src/payments/payments.service.ts`
- `src/queue/jobs/order/` (new: `process-refund.job.ts`)
- `src/orders/state-machine/order-state-machine.service.ts` (add side effect hooks)

### 1.2 User Cancellation Flow

**Context:** USER_CANCELLED state exists in state machine. Transitions are defined (allowed from CREATED through READY_FOR_PICKUP). But there's no cancel endpoint or cancel logic.

**Tasks:**

1. Add `POST /orders/:id/cancel` endpoint to `orders.controller.ts` (user-facing, not admin).
   - Auth: USER role, must own the order
   - Body: `{ reason?: string }`

2. Implement `cancelOrder(orderId: string, userId: string, reason: string)` in `OrdersService`:
   - Verify user owns the order
   - Verify order is in a cancellable state (pre-PICKED_UP)
   - Transition to USER_CANCELLED via state machine
   - If payment exists and status SUCCESS → enqueue refund job
   - If delivery exists and status is ASSIGNED or IN_TRANSIT → call delivery adapter's `cancelTask`
   - Send notification to seller

3. Add cancellation reason to `OrderStateHistory` via the `reason` field.

**Files to modify:**
- `src/orders/orders.controller.ts`
- `src/orders/orders.service.ts`
- `src/orders/dto/` (new: `cancel-order.dto.ts`)

### 1.3 Seller Rejection → Auto Refund

**Context:** Seller can reject via `POST /orders/seller/orders/:id/reject`. The state machine transitions to SELLER_REJECTED. But post-rejection, nothing happens — no refund, no notification to user, no re-routing.

**Tasks:**

1. In `OrdersService.rejectOrder()`, after state transition:
   - Enqueue refund job if payment exists with SUCCESS status
   - Send push notification to user: "Your order was not accepted by {sellerName}. Refund initiated."
   - Optionally: enqueue a "suggest alternative sellers" job (Phase 3 feature — skip for now, just notify)

**Files to modify:**
- `src/orders/orders.service.ts` (the existing reject handler)

---

## Phase 2: Multi-Seller Checkout Orchestration

**Why second:** This is the strategic differentiator. The cart already stores items per-seller. The checkout currently works for one seller at a time. We need the orchestration layer.

### 2.1 Multi-Seller Checkout Summary

**Context:** Current `GET /checkout?sellerId=X&deliveryAddressId=Y` returns summary for ONE seller. We need an endpoint that returns summaries for ALL sellers in the cart.

**Tasks:**

1. Add `GET /checkout/multi` endpoint:
   - Auth: USER role
   - Query: `{ deliveryAddressId: string }`
   - Returns: array of per-seller checkout summaries (same structure as existing single-seller summary), plus a combined total

2. Implement `getMultiSellerCheckoutSummary(userId, addressId)` in `CheckoutService`:
   - Get cart with all items
   - Group items by sellerId
   - For each seller group: calculate pricing, fetch delivery quotes
   - Run all seller groups in parallel (Promise.all)
   - Return combined response with per-seller breakdowns and aggregate total

**Response shape:**
```typescript
{
  sellers: [
    {
      seller: { id, shopName, address },
      items: [...],
      bill: { subtotal, discountAmount, total },
      deliveryOptions: [...],
      recommendations: { cheapest, fastest, recommended }
    }
  ],
  deliveryAddress: { id, label, addressLine, latitude, longitude },
  combinedTotal: number, // Sum of all seller totals (not including delivery)
}
```

**Files to modify:**
- `src/checkout/checkout.controller.ts`
- `src/checkout/checkout.service.ts`
- `src/checkout/dto/` (new: `get-multi-checkout.dto.ts`)

### 2.2 Multi-Seller Place Order

**Context:** Current `POST /checkout/place-order` creates one order for one seller. We need a batch version that creates orders for all sellers in one call.

**Tasks:**

1. Add `POST /checkout/place-order/multi` endpoint:
   - Auth: USER role
   - Body:
     ```typescript
     {
       deliveryAddressId: string;
       sellers: [
         {
           sellerId: string;
           quotationId?: string; // Selected delivery quote
           deliveryFeeRupees?: number;
           estimatedMinutes?: number;
           vehicleType?: string;
         }
       ]
     }
     ```

2. Implement `placeMultiSellerOrder(userId, body)` in `CheckoutService`:
   - Validate all sellers have items in cart
   - Validate delivery address
   - For each seller: create order (reuse existing `placeOrder` logic)
   - Wrap in a Prisma transaction — all orders succeed or none
   - Clear all purchased items from cart after success
   - Return array of created order IDs

3. **Important:** Each seller order is independent after creation. They have their own payment, their own delivery, their own state machine. The "multi" part is only at checkout — after that, each order lives its own life.

**Files to modify:**
- `src/checkout/checkout.controller.ts`
- `src/checkout/checkout.service.ts`
- `src/checkout/dto/` (new: `place-multi-order.dto.ts`)

### 2.3 Cart Cleanup After Order

**Context:** Currently, placing an order does NOT remove items from the cart. Cart items accumulate.

**Tasks:**

1. After successful order placement (single or multi), remove the ordered items from cart:
   - Single seller: remove items for that seller only
   - Multi seller: remove items for all ordered sellers
   - Also clean up CartItemFile records and S3 files (move to order, not delete)

2. Add `removeItemsBySeller(userId, sellerIds: string[])` method to `CartService`.

**Files to modify:**
- `src/cart/cart.service.ts`
- `src/checkout/checkout.service.ts`

---

## Phase 3: Seller Onboarding & Management

**Why third:** You can't scale supply with admin-only seller creation. Sellers need to self-register.

### 3.1 Seller Self-Registration

**Context:** Currently, a seller is created only through seed data or admin. The auth flow creates a User with a role, but there's no flow for a user to register AS a seller and create their shop profile.

**Tasks:**

1. Add `POST /sellers/register` endpoint:
   - Auth: SELLER role (user must have registered with role=SELLER via OTP)
   - Body:
     ```typescript
     {
       shopName: string;
       address: string;
       description?: string;
       latitude: number;
       longitude: number;
       categoryIds: string[]; // Categories this seller supports
       pricePerPage?: number; // For printing sellers
       prepTimeMinutes?: number;
     }
     ```
   - Creates Seller record linked to authenticated user
   - Creates SellerCategory records
   - Default status: OFFLINE (must explicitly go online)

2. Add `PATCH /sellers/me` endpoint for sellers to update their profile:
   - Update shop details, pricing, prep time, description
   - Upload shop image (use existing presigned URL flow)

3. Add `GET /sellers/me` for seller to view their own profile with stats.

**Files to modify:**
- `src/sellers/sellers.controller.ts`
- `src/sellers/sellers.service.ts`
- `src/sellers/dto/` (new: `register-seller.dto.ts`, `update-seller.dto.ts`)

### 3.2 Seller Product Management

**Context:** Product model exists. No CRUD endpoints for sellers to manage their own products.

**Tasks:**

1. Add seller-facing product endpoints:
   - `POST /sellers/me/products` — create product
   - `PATCH /sellers/me/products/:id` — update product
   - `DELETE /sellers/me/products/:id` — delete product (or mark out of stock)
   - `GET /sellers/me/products` — list own products

2. Validate seller owns the product on all mutations.

3. Product creation DTO:
   ```typescript
   {
     name: string;
     description?: string;
     category: string;
     unit?: string;
     price: number;
     mrp?: number;
     image?: string; // S3 path from presigned upload
     inStock?: boolean;
     isBestSeller?: boolean;
   }
   ```

**Files to modify:**
- `src/sellers/sellers.controller.ts` (or create `src/sellers/seller-products.controller.ts`)
- `src/products/products.service.ts`
- `src/products/dto/` (new: `create-product.dto.ts`, `update-product.dto.ts`)

### 3.3 Admin Seller Management

**Context:** Admin module exists but has no seller management endpoints.

**Tasks:**

1. Add admin seller endpoints:
   - `GET /admin/sellers` — list all sellers with filters (status, category, location)
   - `GET /admin/sellers/:id` — seller detail with orders, revenue stats
   - `PATCH /admin/sellers/:id` — update seller (approve, suspend, edit)
   - `POST /admin/sellers/:id/verify` — mark seller as verified (vs Maps API discovery)
   - `POST /admin/sellers/:id/suspend` — suspend seller (set OFFLINE, block status changes)

2. Add `isVerified: Boolean @default(false)` and `isSuspended: Boolean @default(false)` fields to Seller model in Prisma schema.

**Files to modify:**
- `prisma/schema.prisma` (add fields)
- `src/admin/admin.controller.ts`
- `src/admin/admin.service.ts`

---

## Phase 4: WhatsApp Bot Communication Layer

**Why fourth:** This is the planned primary communication channel between users and sellers. Critical for pre-purchase communication and seller onboarding of unverified shops.

### 4.1 WhatsApp Business API Integration

**Context:** The platform will use a WhatsApp bot as relay — all messages between user and seller flow through the bot. This gives visibility into conversations and enables future automation.

**Tasks:**

1. Create `src/messaging/` module:
   - `messaging.module.ts`
   - `messaging.service.ts`
   - `messaging.controller.ts` (webhook receiver)
   - `providers/whatsapp/whatsapp.provider.ts`
   - `providers/messaging-provider.interface.ts`

2. Define `MessagingProvider` interface:
   ```typescript
   interface MessagingProvider {
     sendMessage(to: string, message: string, metadata?: any): Promise<SendResult>;
     sendTemplate(to: string, templateName: string, params: any): Promise<SendResult>;
     parseWebhook(payload: any): Promise<IncomingMessage>;
   }
   ```

3. Implement WhatsApp Cloud API provider:
   - Use Meta's WhatsApp Business Cloud API
   - Webhook verification (GET challenge)
   - Incoming message webhook (POST)
   - Send text messages
   - Send template messages (for initiating conversations — WhatsApp requires templates for first message)

4. Create `Conversation` model in Prisma:
   ```prisma
   model Conversation {
     id          String   @id @default(cuid())
     userId      String
     sellerId    String
     orderId     String?  // Optional link to order
     status      String   @default("active") // active, closed, archived
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     user        User     @relation(fields: [userId], references: [id])
     seller      Seller   @relation(fields: [sellerId], references: [id])
     messages    Message[]
     @@index([userId])
     @@index([sellerId])
     @@map("conversations")
   }

   model Message {
     id              String   @id @default(cuid())
     conversationId  String
     senderType      String   // "user" | "seller" | "system"
     senderId        String
     content         String
     contentType     String   @default("text") // text, image, file, template
     whatsappMessageId String? // External message ID for tracking
     status          String   @default("sent") // sent, delivered, read, failed
     createdAt       DateTime @default(now())
     conversation    Conversation @relation(fields: [conversationId], references: [id])
     @@index([conversationId])
     @@map("messages")
   }
   ```

5. Add messaging endpoints:
   - `POST /messaging/conversations` — start conversation with a seller
   - `GET /messaging/conversations` — list user's conversations
   - `GET /messaging/conversations/:id/messages` — get messages
   - `POST /messaging/conversations/:id/send` — send message (relayed via WhatsApp bot)
   - `POST /messaging/webhook` — WhatsApp webhook receiver

6. Message relay logic:
   - User sends message via app → API receives → stores in DB → sends to seller's WhatsApp via bot
   - Seller replies on WhatsApp → webhook receives → bot identifies conversation → stores in DB → sends push notification to user

**Files to create:**
- `src/messaging/` (entire module)
- Update `prisma/schema.prisma` (Conversation, Message models)
- Update `src/app.module.ts`

### 4.2 File Sharing via WhatsApp

**Tasks:**

1. Support sending files (PDFs, images) through WhatsApp relay:
   - User uploads file to S3 (existing flow)
   - Generate temporary public URL
   - Send via WhatsApp media message API

2. Support receiving files from seller's WhatsApp:
   - Download media from WhatsApp
   - Upload to S3
   - Store as Message with contentType "file"

---

## Phase 5: Maps API Seller Discovery (Unverified Sellers)

**Why fifth:** This is the supply-side growth hack — show more sellers while onboarded supply is small.

### 5.1 Google Places Integration for Seller Discovery

**Context:** The platform will display Maps API sellers alongside onboarded sellers, with lower priority and a "not verified" tag. Purpose is early liquidity, with the goal of converting them to onboarded sellers.

**Tasks:**

1. Create `src/discovery/` module:
   - `discovery.module.ts`
   - `discovery.service.ts`
   - `discovery.controller.ts`

2. Implement Google Places API integration:
   - Search nearby places by category (e.g., "print shop near lat,lng")
   - Cache results in Redis (TTL: 24 hours) to avoid excessive API calls
   - Use H3 geospatial indexing (already a dependency: `h3-js`) for efficient caching

3. Add `GET /discovery/sellers` endpoint that combines:
   - Onboarded sellers (from DB, existing query) — marked as `verified: true`
   - Google Places sellers (from API/cache) — marked as `verified: false`
   - Onboarded sellers always rank higher
   - Deduplicate by `googlePlaceId` (onboarded sellers can have this field)

4. Response shape for unverified sellers:
   ```typescript
   {
     source: "google_places",
     verified: false,
     placeId: string,
     name: string,
     address: string,
     latitude: number,
     longitude: number,
     rating: number,
     photoUrl?: string,
     openNow?: boolean,
     // No pricing, no products, no ordering — messaging only
     actions: ["message"] // Can only message, not order directly
   }
   ```

5. Unverified sellers can only be contacted via messaging (WhatsApp relay). No cart/checkout for unverified sellers.

**Files to create:**
- `src/discovery/` (entire module)
- Update `src/app.module.ts`

---

## Phase 6: Hardening & Production Readiness

### 6.1 Input Validation & Error Handling

**Tasks:**

1. Add phone number validation with proper Indian format (+91XXXXXXXXXX):
   - Use a regex or `libphonenumber-js` library
   - Validate in auth DTOs and address DTOs

2. Audit all DTOs for proper class-validator decorators:
   - Every endpoint should have validated input
   - Check for missing `@IsString()`, `@IsNumber()`, `@IsOptional()`, etc.

3. Add global exception filter for consistent error responses:
   - Prisma errors (unique constraint, not found) → proper HTTP status codes
   - Validation errors → 400 with field-level details
   - Internal errors → 500 with generic message (no stack traces in production)

**Files to modify:**
- `src/common/` (new: `filters/global-exception.filter.ts`)
- Various DTOs across all modules

### 6.2 Background Jobs Completion

**Tasks:**

1. **Abandoned cart cleanup:** Create `src/queue/jobs/cart/cleanup-abandoned-carts.job.ts`
   - Run every 24 hours
   - Delete carts with status "active" and updatedAt > 7 days ago
   - Clean up associated S3 files

2. **Google Places rating sync:** Create `src/queue/jobs/seller/sync-ratings.job.ts`
   - Run daily
   - For sellers with `googlePlaceId`: fetch latest rating from Google Places API
   - Update `rating` and `ratingUpdatedAt` fields

3. **Order timeout tuning:**
   - Review existing `order-timeout.job.ts`
   - Configure timeout: 30 minutes for seller to accept after payment
   - If PAID and no SELLER_ACCEPTED within timeout → transition to ORDER_EXPIRED → trigger refund

**Files to create/modify:**
- `src/queue/jobs/cart/cleanup-abandoned-carts.job.ts`
- `src/queue/jobs/seller/sync-ratings.job.ts`
- `src/queue/queue.module.ts` (register new processors)

### 6.3 Testing

**Tasks:**

1. **Unit tests for critical paths:**
   - Order state machine transitions (all valid + all invalid)
   - Refund processing logic
   - Multi-seller checkout orchestration
   - Cart price calculation

2. **Integration tests:**
   - Auth flow (request OTP → verify → get token → access protected route)
   - Order lifecycle (create → pay → accept → prepare → ready → deliver)
   - Cancellation + refund flow

3. **E2E test for payment webhook:**
   - Simulate Razorpay webhook payload
   - Verify order state transition
   - Verify idempotency (same webhook twice)

**Files to create:**
- `src/orders/state-machine/__tests__/`
- `src/payments/__tests__/`
- `src/checkout/__tests__/`
- `src/cart/__tests__/`

### 6.4 Delivery Adapter Validation

**Tasks:**

1. Pick ONE delivery provider for MVP (recommend Porter — good sandbox, common in India).

2. Test against sandbox/staging API:
   - Get quote (real coordinates in a major Indian city)
   - Create task
   - Cancel task
   - Webhook parsing

3. Add integration test that hits sandbox API.

4. Add fallback logic: if primary delivery provider fails, try next by priority.

**Files to modify:**
- Relevant adapter in `src/delivery/adapters/`
- `src/delivery/delivery.service.ts` (fallback logic)

### 6.5 Security & Monitoring

**Tasks:**

1. Add request logging middleware (method, path, status, duration — no body logging for PII).

2. Add Sentry or equivalent error tracking:
   - `npm install @sentry/nestjs`
   - Initialize in `main.ts`
   - Add to global exception filter

3. Add API key rotation support for delivery partners (admin endpoint to update keys).

4. Rate limiting review:
   - Current: 10 req/60s global — too aggressive for a consumer app
   - Adjust: 100 req/60s for authenticated users, 10 req/60s for unauthenticated (OTP requests)

5. Add CORS configuration for mobile app origins.

**Files to modify:**
- `src/main.ts`
- `src/common/` (new: `middleware/request-logger.middleware.ts`)
- `src/app.module.ts` (throttler config)

---

## Phase 7: Admin Analytics & Dashboard APIs

### 7.1 Analytics Endpoints

**Tasks:**

1. Add `GET /admin/analytics/overview`:
   - Total orders (by status)
   - Revenue (today, this week, this month)
   - Active sellers count
   - Active users count (placed at least one order)

2. Add `GET /admin/analytics/orders`:
   - Orders over time (daily/weekly/monthly)
   - Average order value
   - Cancellation rate
   - Seller rejection rate

3. Add `GET /admin/analytics/sellers`:
   - Top sellers by revenue
   - Top sellers by order count
   - Average fulfillment time per seller
   - Seller acceptance rate

**Files to create:**
- `src/admin/analytics/` (new sub-module)

### 7.2 Category Management

**Tasks:**

1. Add admin endpoints:
   - `POST /admin/categories` — create category
   - `PATCH /admin/categories/:id` — update (name, status, icon, displayOrder)
   - Currently categories are seed-only

**Files to modify:**
- `src/admin/admin.controller.ts`
- `src/admin/admin.service.ts`

---

## Execution Order Summary

| Phase | Focus | Dependencies | Estimated Effort |
|-------|-------|-------------|-----------------|
| 1 | Refunds + Cancellation | None | 2-3 days |
| 2 | Multi-seller checkout | Phase 1 (refund on rejection) | 2-3 days |
| 3 | Seller onboarding + management | None (parallel-safe) | 2-3 days |
| 4 | WhatsApp messaging | Schema migration | 3-4 days |
| 5 | Maps API discovery | Phase 4 (messaging for unverified) | 2 days |
| 6 | Hardening + testing | Phases 1-2 | 3-4 days |
| 7 | Admin analytics | All phases | 2 days |

**Total estimated: ~18-22 days of focused development.**

Phases 1-2 are sequential (2 depends on 1). Phase 3 can run in parallel with 1-2. Phase 4-5 are sequential. Phase 6 should run after 1-2 are stable. Phase 7 is lowest priority.

---

## Notes for Claude Code Sessions

- Always run `npx prisma generate` after schema changes.
- Migration command: `DATABASE_URL="..." npx prisma migrate dev --name <migration_name>`
- The project uses path aliases: `@/` maps to `src/`. Check `tsconfig.json`.
- Shared enums are in `packages/types/`. When adding new enums, add them there and re-export.
- Every new module needs to be imported in `src/app.module.ts`.
- Follow existing patterns: DTO validation with class-validator, repository pattern, service layer, controller with Swagger decorators.
- Never mutate order status directly — always use `OrderStateMachineService.transition()`.
- Payment and delivery webhooks must be idempotent.
