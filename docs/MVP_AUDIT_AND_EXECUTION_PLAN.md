# MVP AUDIT & EXECUTION PLAN
## Senior PM + Tech Lead Assessment

**Date:** 2026-01-24  
**Stage:** Pre-Implementation (Scaffold Complete)  
**Team:** Backend-first MVP development

---

## PART 1: DOCUMENT AUDIT

### 📄 BRD v1 - Business Requirements Document

**Intent:** Define business context, market gap, success metrics, and stakeholder alignment for local commerce coordination platform.

**Status:** ✅ **SOLID**

**Core Requirements:**
- North Star: Daily Completed Orders (DCO)
- City: Gurgaon, semi-open launch
- Category: Printing only (live), others "Coming Soon"
- Revenue: User pays item + delivery, Seller pays 5-8% commission
- Asset-light: No owned inventory or delivery fleet

**Non-Negotiable Constraints:**
- Seller availability MUST control order routing
- Manual admin intervention required (ops before automation)
- Category-agnostic architecture mandatory
- Separate User & Seller apps (not unified)

**MVP Scope Boundaries:**
- ✅ IN: Printing, basic order flow, manual admin tools
- ❌ OUT: Discounts, reviews, analytics, subscriptions, multiple live categories

**Issues Found:**
- ⚠️ **Missing:** Explicit timeout handling requirements (mentioned in Tech Arch but not BRD)
- ⚠️ **Missing:** OTP provider requirements (mentioned in API Contract but not sourcing strategy)
- ✅ Seller availability correctly emphasized as business-critical

---

### 📘 PRD v1 - Product Requirements Document

**Intent:** Define functional requirements, user flows, acceptance criteria for User App, Seller App, and Admin tool.

**Status:** ✅ **COMPREHENSIVE**

**Core Requirements:**
- User App: Category → Order → Select Seller → Payment → Track
- Seller App: Toggle Online/Offline, Accept/Reject orders, Mark Ready
- Admin: View all orders, reassign seller/delivery, cancel/refund
- Real-time seller notifications (<5s), order creation (<30s)

**Non-Negotiable Constraints:**
- Seller default state = OFFLINE after login
- Only ONLINE sellers receive orders
- State must be recoverable (no silent failures)
- Payment BEFORE order moves to PAID state

**MVP Scope Boundaries:**
- ✅ Order tracking with 6 user-visible states
- ✅ File upload with auto page detection
- ❌ No seller analytics, no loyalty, no reviews

**Issues Found:**
- ⚠️ **Inconsistency:** PRD says state machine is `CREATED → PAID → SELLER_ACCEPTED` but API Contract has `CREATED → SELLER_SELECTED → PAID`
  - **Resolution:** API Contract is correct (user must select seller BEFORE payment)
  - **Action:** PRD line 371 needs correction
- ⚠️ **Missing:** No PRD mention of payment webhook handling (in API Contract)
- ⚠️ **Missing:** File validation requirements (format, size limits, virus scan)
- ✅ Seller availability requirements clear and consistent

---

### 📜 API Contract v1

**Intent:** Define exact REST endpoints, request/response shapes, state machine, and non-negotiable contract rules.

**Status:** ✅ **AUTHORITATIVE** (but needs PRD sync)

**Core Requirements:**
- 25 endpoints across auth, categories, sellers, orders, admin, internal
- OTP-based auth with JWT
- Role-based access (USER, SELLER, ADMIN)
- State machine: CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED

**Non-Negotiable Constraints:**
- Frontend cannot invent fields
- Backend cannot change response shape
- Any change = API v2 (strict versioning)
- Seller availability is authoritative for routing

**MVP Scope Boundaries:**
- ✅ All user flow endpoints defined
- ✅ Internal delivery/payment webhooks defined
- ✅ Admin override endpoints defined

**Issues Found:**
- ❌ **CRITICAL:** State machine has `ORDER_EXPIRED` in Tech Arch but NOT in API Contract failure states
  - **Action:** Add ORDER_EXPIRED to API Contract or remove from Tech Arch
- ⚠️ **Missing:** No timeout values specified (Tech Arch mentions timeouts but no durations)
- ⚠️ **Missing:** No rate limiting spec (critical for OTP abuse prevention)
- ✅ Seller status endpoint properly defined (`POST /v1/seller/status`)

---

### 🏗️ Technical Architecture v1

**Intent:** Lock technology choices, module structure, data storage, and non-functional requirements.

**Status:** ⚠️ **MOSTLY SOLID** (but has gaps)

**Core Requirements:**
- Modular monolith (NestJS)
- PostgreSQL primary DB
- S3-compatible file storage
- Lightweight queue (Bull/SQS) for async tasks
- Adapter pattern for delivery aggregation

**Non-Negotiable Constraints:**
- Order = central aggregate
- Seller availability = hard gate (enforced backend)
- Category-agnostic order payload (opaque JSON)
- No microservices, no Kafka, no real-time streaming

**MVP Scope Boundaries:**
- ✅ UPI-only payments
- ✅ Push notifications (no sockets)
- ✅ Manual admin fallback for delivery
- ❌ No scheduling, no inventory, no analytics

**Issues Found:**
- ❌ **CRITICAL MISSING:** Database schema not defined anywhere
  - Tables: User, Seller, Category, Order, Payment, Delivery, File?
  - Indexes, relationships, constraints?
- ❌ **CRITICAL MISSING:** Queue/job definitions
  - What jobs? Timeout handling? Notification delivery? Delivery assignment?
- ⚠️ **Missing:** Prisma vs TypeORM decision (says "PostgreSQL + Prisma planned" in context)
- ⚠️ **Missing:** S3 bucket strategy (one bucket? per-user folders? CDN?)
- ⚠️ **Inconsistency:** Says "ORDER_EXPIRED" failure state but not in API Contract
- ⚠️ **Missing:** Authentication JWT expiry, refresh token strategy
- ⚠️ **Missing:** Seller location storage strategy (lat/lng precision? PostGIS?)
- ✅ Module structure matches current codebase

---

## PART 2: CROSS-DOCUMENT CONSISTENCY VALIDATION

### BRD ↔ PRD
**Status:** ✅ **ALIGNED**
- North Star (DCO) consistent
- Seller availability emphasized in both
- Scope boundaries match

### PRD ↔ API Contract
**Status:** ⚠️ **NEEDS SYNC**
- ❌ State machine mismatch (PRD missing SELLER_SELECTED state)
- ✅ All user flows map to endpoints
- ✅ Seller flows properly defined

### API Contract ↔ Technical Architecture
**Status:** ⚠️ **GAPS**
- ❌ ORDER_EXPIRED in Tech Arch, not in API Contract
- ⚠️ Timeout handling mentioned but not specified
- ✅ Module structure matches

### Overall Consistency Score: **7/10**
- Strong alignment on vision and scope
- Critical state machine inconsistency
- Missing implementation details (DB schema, timeouts, queues)

---

## PART 3: GAP ANALYSIS (DOCS → CODE)

### ✅ CORRECTLY IMPLEMENTED

**Modules Present & Justified:**
- ✅ `auth/` - OTP endpoints scaffolded
- ✅ `users/` - Gutted (correct, users created via auth)
- ✅ `sellers/` - Availability + discovery endpoints
- ✅ `categories/` - Read-only list endpoint
- ✅ `orders/` - State-machine command endpoints
- ✅ `admin/` - Oversight & manual control endpoints
- ✅ `delivery/` - Internal coordination endpoints
- ✅ `payments/` - Internal webhook endpoints
- ✅ `files/` - Internal presigned URL endpoints
- ✅ `notifications/` - Service-only (no REST endpoints)
- ✅ `common/` - Filters, guards, interceptors
- ✅ `health/` - Health check endpoint

**Structural Decisions:**
- ✅ Monorepo with pnpm workspace
- ✅ Shared `/packages/types` for DTOs
- ✅ Controllers trimmed to API Contract
- ✅ NestJS with latest stable versions

### ❌ MISSING (REQUIRED BY DOCS)

**Critical Missing Implementations:**

1. **Database Layer** ⚠️ **BLOCKER**
   - No Prisma schema defined
   - No database migrations
   - No models: User, Seller, Category, Order, Payment, Delivery
   - No indexes, no relationships
   - **Impact:** Cannot implement ANY business logic

2. **Order State Machine** ⚠️ **BLOCKER**
   - `orders/state-machine/` directory exists but empty
   - No state transition validation
   - No state guards
   - No timeout handling
   - **Impact:** Core business rule unenforceable

3. **Seller Availability Logic** ⚠️ **BLOCKER**
   - `sellers/availability/` directory exists but empty
   - No ONLINE/OFFLINE state management
   - No real-time propagation logic
   - **Impact:** Order routing cannot work

4. **Authentication Implementation**
   - No OTP generation/verification logic
   - No OTP provider integration (Twilio/AWS SNS?)
   - No JWT generation/validation
   - No role-based guards
   - **Impact:** No security, no auth

5. **Payment Integration**
   - No payment gateway integration
   - No UPI handling
   - No webhook verification
   - No refund logic
   - **Impact:** Cannot accept payments

6. **Delivery Integration**
   - `delivery/providers/` directory exists but empty
   - No adapter implementations
   - No quote fetching
   - No task creation
   - **Impact:** Cannot coordinate delivery

7. **File Handling**
   - No S3 integration
   - No presigned URL generation
   - No file validation
   - No virus scanning
   - **Impact:** Cannot upload files

8. **Queue/Background Jobs**
   - No job queue setup (Bull/BullMQ?)
   - No timeout handlers
   - No notification jobs
   - No delivery assignment jobs
   - **Impact:** No async processing

9. **DTOs & Validation**
   - All endpoints use `Record<string, unknown>`
   - No class-validator DTOs
   - No request validation
   - **Impact:** No input validation, security risk

10. **Location/Distance Logic**
    - No geospatial queries
    - No distance calculation
    - No seller proximity sorting
    - **Impact:** Cannot filter by distance

11. **Pricing Logic**
    - No pricing calculations
    - No per-category pricing
    - No delivery fee logic
    - **Impact:** Cannot show prices

12. **Notification Infrastructure**
    - No push notification setup (Firebase/OneSignal)
    - No SMS provider (Twilio)
    - No notification templates
    - **Impact:** No user/seller communication

### 🔄 PENDING (EXPECTED BUT NOT IMPLEMENTED)

**Correctly Not Implemented Yet:**
- Frontend apps (React Native + Expo) - Backend-first approach
- Admin panel - Can use API directly via Postman initially
- Monitoring/logging infrastructure - Post-MVP
- Analytics pipeline - Explicitly out of scope
- Load testing - Post-implementation

### ➕ EXTRA (PRESENT BUT NOT JUSTIFIED)

**Potentially Unnecessary:**
- ✅ `health/` module - Good practice, not in docs but justified
- ✅ Swagger integration - Good practice, aids development
- ✅ Rate limiting (Throttler) - Security best practice
- ✅ Helmet security - Security best practice

**Verdict:** Extra items are justified best practices, keep them.

---

## PART 4: CRITICAL BUSINESS RULES NOT REPRESENTED

### 🚨 HIGH PRIORITY (Must exist before any order flow works)

1. **Order State Machine Enforcement**
   - Current: No validation
   - Required: State transition guards
   - Location: `orders/state-machine/`
   - Complexity: Medium

2. **Seller Availability Gate**
   - Current: No enforcement
   - Required: Filter sellers by ONLINE status
   - Location: `sellers/availability/`
   - Complexity: Low

3. **Order Timeout Handling**
   - Current: No timeouts
   - Required: Auto-expire orders, notify users
   - Location: Queue jobs + state machine
   - Complexity: Medium

4. **Payment Verification**
   - Current: No payment gateway
   - Required: UPI integration + webhook handling
   - Location: `payments/`
   - Complexity: High

5. **Delivery Assignment Logic**
   - Current: No aggregator integration
   - Required: Fetch quotes, assign best option
   - Location: `delivery/providers/`
   - Complexity: High

6. **File Upload Security**
   - Current: No S3 integration
   - Required: Presigned URLs, virus scan, validation
   - Location: `files/`
   - Complexity: Medium

7. **Location-Based Discovery**
   - Current: No geospatial logic
   - Required: Distance calculation, proximity filter
   - Location: `sellers/` service
   - Complexity: Medium

8. **Notification Delivery**
   - Current: Service stubs only
   - Required: Push/SMS integration
   - Location: `notifications/`
   - Complexity: Medium

---

## PART 5: SPRINT SHEET (4 SPRINTS TO MVP)

### 🏁 Sprint 0 (Already Done) ✅

**Completed:**
- ✅ Monorepo scaffolding with pnpm
- ✅ NestJS backend with all modules
- ✅ Controllers trimmed to API Contract
- ✅ Common utilities (filters, guards, interceptors)
- ✅ TypeScript strict mode enabled
- ✅ Swagger documentation setup
- ✅ Health check endpoint
- ✅ Security headers (Helmet)
- ✅ Rate limiting (Throttler)
- ✅ Global validation pipe
- ✅ Environment configuration

**Duration:** 1 week  
**Status:** Complete

---

### 🎯 Sprint 1: Foundation & Auth (CRITICAL PATH)

**Goal:** Establish database schema, authentication, and basic seller management

**Deliverables:**

**Backend Modules:**
1. **Database Setup** (Day 1-2)
   - Install Prisma
   - Define complete schema (User, Seller, Category, Order, Payment, Delivery)
   - Create initial migration
   - Seed categories (Printing=ACTIVE, others=COMING_SOON)
   - Add indexes for performance

2. **Auth Module** (Day 2-3)
   - Integrate OTP provider (Twilio/AWS SNS)
   - Implement OTP generation/verification
   - JWT generation with role claims
   - Create AuthGuard for JWT validation
   - Create RolesGuard for role-based access

3. **Sellers Module - Availability** (Day 3-4)
   - Implement ONLINE/OFFLINE toggle
   - Add availability state to database
   - Add real-time availability check
   - Default state = OFFLINE on login

4. **Categories Module** (Day 4)
   - Connect to database
   - Return seeded categories
   - Filter by status

5. **DTOs & Validation** (Day 5)
   - Create DTOs for all endpoints
   - Add class-validator decorators
   - Replace all `Record<string, unknown>`

**APIs to Complete:**
- ✅ `POST /v1/auth/request-otp`
- ✅ `POST /v1/auth/verify-otp`
- ✅ `GET /v1/categories`
- ✅ `POST /v1/seller/status`
- ✅ `GET /v1/sellers` (basic, no location yet)

**Acceptance Criteria:**
- [ ] User can receive OTP and get JWT token
- [ ] JWT validation works across all endpoints
- [ ] Seller can toggle ONLINE/OFFLINE
- [ ] Only ONLINE sellers appear in discovery
- [ ] Categories endpoint returns seeded data
- [ ] All endpoints validate input with DTOs
- [ ] Database schema supports all MVP requirements
- [ ] Migrations run successfully

**Dependencies:** None

---

### 🎯 Sprint 2: Order Flow & State Machine (CRITICAL PATH)

**Goal:** Implement order creation, state machine, and seller interaction

**Deliverables:**

**Backend Modules:**
1. **Order State Machine** (Day 1-2)
   - Create state machine implementation
   - Define all states and transitions
   - Add state guards (prevent invalid transitions)
   - Add state history tracking
   - Implement timeout logic

2. **Orders Module - User Flow** (Day 2-3)
   - Create order (CREATED state)
   - Select seller (CREATED → SELLER_SELECTED)
   - Get delivery quote (pricing logic)
   - Confirm order (SELLER_SELECTED → PAID, stub payment)
   - Track order (GET order by ID)

3. **Orders Module - Seller Flow** (Day 3-4)
   - List incoming orders (status filter)
   - Accept order (PAID → SELLER_ACCEPTED)
   - Reject order (PAID → SELLER_REJECTED)
   - Mark ready (PREPARING → READY_FOR_PICKUP)

4. **Sellers Module - Location & Pricing** (Day 4)
   - Add location storage (lat/lng)
   - Implement distance calculation
   - Add per-page pricing logic
   - Sort sellers by distance

5. **Files Module** (Day 5)
   - S3 integration setup
   - Presigned URL generation
   - File validation (type, size)
   - Connect to order creation

**APIs to Complete:**
- ✅ `POST /v1/orders`
- ✅ `POST /v1/orders/:id/select-seller`
- ✅ `POST /v1/orders/:id/delivery-quote`
- ✅ `POST /v1/orders/:id/confirm` (payment stubbed)
- ✅ `GET /v1/orders/:id`
- ✅ `GET /v1/seller/orders`
- ✅ `POST /v1/seller/orders/:id/accept`
- ✅ `POST /v1/seller/orders/:id/reject`
- ✅ `POST /v1/seller/orders/:id/ready`
- ✅ `GET /v1/sellers` (with location filter)
- ✅ `POST /v1/internal/files/presigned-url`

**Acceptance Criteria:**
- [ ] User can create draft order with file upload
- [ ] User can see nearby sellers with prices and distance
- [ ] User can select seller (state transitions)
- [ ] User can get delivery quote
- [ ] State machine prevents invalid transitions
- [ ] Seller sees incoming orders when ONLINE
- [ ] Seller can accept/reject orders
- [ ] Seller can mark order ready
- [ ] Order state history is tracked
- [ ] File upload works via S3 presigned URLs
- [ ] All state transitions are validated
- [ ] Timeouts are defined (not yet enforced)

**Dependencies:** Sprint 1 complete

---

### 🎯 Sprint 3: Payments, Delivery & Notifications (INTEGRATION)

**Goal:** Integrate external services and enable end-to-end order fulfillment

**Deliverables:**

**Backend Modules:**
1. **Payments Integration** (Day 1-2)
   - Integrate UPI payment gateway (Razorpay/Paytm)
   - Implement payment initiation
   - Implement payment webhook handling
   - Connect to order confirm flow
   - Add payment verification
   - Stub refund logic (manual admin)

2. **Delivery Integration** (Day 2-3)
   - Create delivery adapter interface
   - Implement Dunzo/Porter adapter
   - Fetch delivery quotes
   - Create delivery task
   - Handle delivery webhooks
   - Update order state on delivery events

3. **Queue Setup** (Day 3)
   - Setup Bull/BullMQ
   - Create job: Assign delivery (triggered on READY_FOR_PICKUP)
   - Create job: Timeout handler (check ORDER_EXPIRED)
   - Create job: Send notification

4. **Notifications** (Day 4)
   - Integrate Firebase/OneSignal for push
   - Integrate Twilio for SMS
   - Create notification templates
   - Trigger on state changes
   - Connect to queue jobs

5. **Admin Safety Tools** (Day 5)
   - Complete admin order listing
   - Implement reassign seller logic
   - Implement reassign delivery logic
   - Implement cancel/refund flow

**APIs to Complete:**
- ✅ `POST /v1/orders/:id/confirm` (real payment)
- ✅ `POST /v1/internal/delivery/assign`
- ✅ `POST /v1/internal/delivery/webhook`
- ✅ `POST /v1/internal/payments/webhook`
- ✅ `GET /v1/admin/orders`
- ✅ `POST /v1/admin/orders/:id/reassign-seller`
- ✅ `POST /v1/admin/orders/:id/reassign-delivery`
- ✅ `POST /v1/admin/orders/:id/cancel`

**Acceptance Criteria:**
- [ ] User can pay via UPI
- [ ] Payment webhook updates order state
- [ ] Delivery is auto-assigned when seller marks ready
- [ ] Delivery webhooks update order state
- [ ] Users receive push notifications on state changes
- [ ] Sellers receive notifications for new orders
- [ ] SMS fallback works for critical updates
- [ ] Admin can view all orders with filters
- [ ] Admin can manually reassign seller
- [ ] Admin can manually reassign delivery
- [ ] Admin can cancel order and initiate refund
- [ ] Timeout jobs run and expire stale orders
- [ ] Queue jobs retry on failure

**Dependencies:** Sprint 2 complete

---

### 🎯 Sprint 4: Polish, Testing & Launch Prep (STABILIZATION)

**Goal:** End-to-end testing, error handling, monitoring, and launch readiness

**Deliverables:**

**Backend Work:**
1. **Comprehensive Error Handling** (Day 1)
   - Add proper error messages for all failure cases
   - Add validation error details
   - Add state machine error messages
   - Test all unhappy paths

2. **Integration Testing** (Day 2)
   - E2E test: Complete user order flow
   - E2E test: Seller accept/reject flow
   - E2E test: Admin intervention flow
   - E2E test: Payment failure handling
   - E2E test: Delivery failure handling

3. **Monitoring & Logging** (Day 3)
   - Add structured logging
   - Add request tracing
   - Add error alerting
   - Add state machine transition logging
   - Add performance metrics

4. **Security Hardening** (Day 3)
   - Rate limiting on OTP endpoints
   - Payment webhook signature verification
   - Delivery webhook signature verification
   - Admin endpoint additional security
   - SQL injection prevention audit

5. **Launch Prep** (Day 4-5)
   - Database backup strategy
   - Deployment scripts
   - Environment variable documentation
   - API documentation finalization
   - Seller onboarding checklist
   - Admin runbook for manual intervention
   - Rollback plan

**Acceptance Criteria:**
- [ ] All happy path flows work end-to-end
- [ ] All unhappy paths return proper errors
- [ ] State machine edge cases handled
- [ ] Payment failures don't lose money
- [ ] Delivery failures trigger admin alerts
- [ ] Seller going offline doesn't break in-flight orders
- [ ] Rate limiting prevents OTP abuse
- [ ] Webhooks verify signatures
- [ ] Logs are searchable and structured
- [ ] Errors are alerted to ops team
- [ ] Database can be restored from backup
- [ ] Deployment is automated
- [ ] Admin team trained on manual tools
- [ ] Rollback tested and documented

**Dependencies:** Sprint 3 complete

---

## SPRINT DEPENDENCIES & CRITICAL PATH

```
Sprint 0 (Done)
    ↓
Sprint 1 (Foundation) ← BLOCKER for all
    ↓
Sprint 2 (Order Flow) ← BLOCKER for payments/delivery
    ↓
Sprint 3 (Integrations) ← BLOCKER for launch
    ↓
Sprint 4 (Polish)
    ↓
MVP LAUNCH READY
```

**Critical Path Items:**
1. Database schema (Sprint 1, Day 1) - Everything depends on this
2. Auth implementation (Sprint 1, Day 2) - Security depends on this
3. State machine (Sprint 2, Day 1) - Core business logic
4. Payment integration (Sprint 3, Day 1) - Revenue depends on this

**Parallel Work Opportunities:**
- DTOs can be created in parallel with implementation
- Monitoring setup can happen in Sprint 3
- Admin tools can be developed in parallel with delivery integration

---

## RISK ASSESSMENT & MITIGATION

### 🚨 HIGH RISK

**Risk 1: Payment Gateway Integration Complexity**
- Impact: Can't accept money
- Mitigation: Choose well-documented gateway (Razorpay), allocate 2 days, have manual fallback

**Risk 2: Delivery Aggregator API Instability**
- Impact: Orders stuck at READY_FOR_PICKUP
- Mitigation: Build adapter pattern, manual admin override MUST work

**Risk 3: State Machine Edge Cases**
- Impact: Orders in invalid states
- Mitigation: Exhaustive state transition tests, state history logging

**Risk 4: Database Schema Changes Mid-Sprint**
- Impact: Migrations break, data loss
- Mitigation: Complete schema design upfront, peer review before implementation

### ⚠️ MEDIUM RISK

**Risk 5: Real-time Notification Delays**
- Impact: Sellers miss orders
- Mitigation: SMS fallback, queue retry logic, monitoring

**Risk 6: Geospatial Query Performance**
- Impact: Slow seller discovery
- Mitigation: Database indexes on location, limit search radius

**Risk 7: File Upload Size/Speed**
- Impact: Poor UX
- Mitigation: Presigned URLs (direct to S3), file size limits

---

## DEFINITION OF DONE (MVP LAUNCH)

The MVP is ready to launch when:

- [ ] User can place printing order end-to-end
- [ ] Payment via UPI works
- [ ] Seller receives notification and can accept
- [ ] Delivery gets assigned automatically
- [ ] Order reaches DELIVERED state
- [ ] Admin can intervene in any failure scenario
- [ ] Seller availability toggle works in real-time
- [ ] State machine prevents invalid transitions
- [ ] All webhooks (payment, delivery) are verified
- [ ] Error handling covers all failure cases
- [ ] Monitoring alerts on critical failures
- [ ] Database backup works
- [ ] Deployment is repeatable
- [ ] 5 test orders complete successfully in production

---

## FINAL NOTES

**Document Consistency Score: 7/10**
- Strong vision alignment
- Critical state machine mismatch needs immediate fix
- Missing implementation details (DB schema, timeouts, queue jobs)

**Code Readiness: 30%**
- Excellent scaffolding and structure
- Controllers properly trimmed
- Zero business logic implemented
- No database, no auth, no integrations

**Estimated Time to MVP: 4 weeks (4 sprints)**

**Blocker Items (Must be resolved before Sprint 1):**
1. Fix PRD state machine to match API Contract
2. Decide on Prisma schema (needs full design)
3. Choose OTP provider (Twilio vs AWS SNS vs local dev mock)
4. Choose payment gateway (Razorpay vs Paytm)
5. Choose delivery aggregator (Dunzo vs Porter vs both)
6. Define timeout values (order expiry, payment timeout, etc.)

**Recommendation:**
✅ Documents are solid enough to proceed  
✅ Team should focus on Sprint 1 immediately  
✅ Database schema design is THE critical blocker  
⚠️ Fix state machine inconsistency before any order code  
⚠️ Document timeout values before Sprint 2  

**Next Immediate Actions:**
1. [ ] Fix PRD line 371 state machine
2. [ ] Design complete Prisma schema
3. [ ] Add ORDER_EXPIRED to API Contract
4. [ ] Document timeout values in Tech Arch
5. [ ] Start Sprint 1 Day 1: Database setup
