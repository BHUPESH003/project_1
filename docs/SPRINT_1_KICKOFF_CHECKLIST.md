# SPRINT 1 KICKOFF CHECKLIST

**Sprint:** 1 of 4  
**Duration:** 5 days (Jan 27 - Jan 31, 2026)  
**Goal:** Foundation - Database, Auth, Seller Availability  
**Team Status:** ⚠️ BLOCKED - Complete pre-sprint tasks first

---

## 🚦 PRE-SPRINT TASKS (MUST COMPLETE FIRST)

### PM Tasks
- [ ] Fix PRD line 371 state machine sequence
  - Current: `CREATED → PAID → SELLER_ACCEPTED`
  - Correct: `CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED`
  - File: `docs/PRD_v1.md`

- [ ] Add ORDER_EXPIRED to API Contract
  - Section 7: Order State Machine
  - Add to failure states list
  - File: `docs/API_Contract_v1.md`

- [ ] Document timeout values in Tech Arch
  - Order expiry: ??? minutes
  - Payment timeout: ??? minutes
  - Seller acceptance timeout: ??? minutes
  - Add to section 6 (State Machine)
  - File: `docs/Technical_architecure.md`

### Tech Lead Tasks
- [ ] Design complete Prisma schema
  - Tables: User, Seller, Category, Order, OrderItem, Payment, Delivery, File
  - Relationships, indexes, constraints
  - Location storage strategy (lat/lng columns)
  - Approval: Required before Sprint 1 starts

- [ ] Decide on providers
  - [ ] OTP: Twilio vs AWS SNS vs Dev Mock
  - [ ] Payment: Razorpay vs Paytm
  - [ ] Delivery: Dunzo vs Porter (or both)
  - [ ] File Storage: AWS S3 vs DigitalOcean Spaces
  - [ ] Push Notifications: Firebase vs OneSignal
  - [ ] SMS: Twilio vs AWS SNS

- [ ] Set up development infrastructure
  - [ ] PostgreSQL instance (local/Docker)
  - [ ] S3 bucket (or equivalent)
  - [ ] Environment variables template
  - [ ] API keys for dev/staging

### Team Tasks
- [ ] Review and approve Prisma schema (1-hour meeting)
- [ ] Read API Contract v1 thoroughly
- [ ] Review CONTROLLER_AUDIT_REPORT.md
- [ ] Understand state machine flow

**STATUS:** ⛔ DO NOT START SPRINT 1 UNTIL ALL ABOVE COMPLETE

---

## 📅 SPRINT 1 DAILY BREAKDOWN

### Day 1 (Monday): Database Setup ⚡ CRITICAL

**Goal:** Prisma schema implemented, migrations working, seeds loaded

**Tasks:**
1. [ ] Install Prisma: `pnpm add prisma @prisma/client`
2. [ ] Initialize Prisma: `npx prisma init`
3. [ ] Implement approved schema in `prisma/schema.prisma`
4. [ ] Create initial migration: `npx prisma migrate dev --name init`
5. [ ] Create seed script: `prisma/seed.ts`
   - Seed categories (Printing=ACTIVE, others=COMING_SOON)
   - Seed 2-3 test sellers for development
6. [ ] Run seed: `npx prisma db seed`
7. [ ] Generate Prisma Client: `npx prisma generate`
8. [ ] Update `services/api/src/app.module.ts` to include PrismaModule
9. [ ] Create `PrismaService` as global provider
10. [ ] Test database connection with health check

**Acceptance:**
- [ ] `npx prisma studio` opens and shows tables
- [ ] Categories table has 5+ entries
- [ ] Sellers table has test data
- [ ] Health check connects to database

**Blocker Resolution:** If schema issues found, fix same day. No delays.

---

### Day 2 (Tuesday): Authentication Part 1

**Goal:** OTP generation and verification working

**Tasks:**
1. [ ] Create OTP provider service
   - Option A: Integrate Twilio
   - Option B: Integrate AWS SNS
   - Option C: Mock service for development
2. [ ] Implement `auth.service.ts`:
   - `requestOtp()`: Generate 6-digit OTP, store in DB/cache with TTL
   - `verifyOtp()`: Check OTP validity, return user data
3. [ ] Create OTP storage (Redis or DB table)
4. [ ] Add rate limiting specifically for OTP endpoints (5 requests/hour)
5. [ ] Create User in database on OTP verification (if not exists)
6. [ ] Add phone number validation (Indian format: +91XXXXXXXXXX)
7. [ ] Test OTP flow end-to-end

**Acceptance:**
- [ ] Can request OTP via API
- [ ] Receive OTP (SMS or logged in console for dev)
- [ ] Can verify OTP and get user ID
- [ ] Rate limiting prevents abuse
- [ ] User created in database on first login

---

### Day 3 (Wednesday): Authentication Part 2 + Seller Availability

**Goal:** JWT working, role-based guards active, seller status toggle works

**Tasks:**

**Auth (Morning):**
1. [ ] Install JWT: `pnpm add @nestjs/jwt`
2. [ ] Create JWT strategy and auth guard
3. [ ] Generate JWT token in `verifyOtp()` with user ID and role
4. [ ] Create `JwtAuthGuard` using `@nestjs/passport`
5. [ ] Create `RolesGuard` for USER/SELLER/ADMIN checks
6. [ ] Add `@UseGuards(JwtAuthGuard)` to protected endpoints
7. [ ] Test JWT validation

**Seller Availability (Afternoon):**
1. [ ] Add `status` enum to Seller model (ONLINE/OFFLINE)
2. [ ] Add `statusUpdatedAt` timestamp to Seller
3. [ ] Implement `sellers.service.setStatus()`:
   - Update status in database
   - Log status change
   - Return updated seller
4. [ ] Add guard to ensure only SELLER role can call status endpoint
5. [ ] Add default status=OFFLINE in seed data
6. [ ] Test status toggle via API

**Acceptance:**
- [ ] All endpoints reject requests without valid JWT
- [ ] Role-based access works (seller can't call user endpoints)
- [ ] Seller can toggle ONLINE/OFFLINE
- [ ] Status updates persist in database
- [ ] Status has timestamp

---

### Day 4 (Thursday): Categories + Sellers Discovery

**Goal:** Categories endpoint returns real data, sellers can be discovered by location

**Tasks:**

**Categories (Morning):**
1. [ ] Update `categories.service.ts` to use Prisma
2. [ ] Query categories from database
3. [ ] Return with status (ACTIVE/COMING_SOON)
4. [ ] Add caching (optional but recommended)
5. [ ] Test endpoint

**Sellers Discovery (Afternoon):**
1. [ ] Update Seller model to include:
   - `latitude`, `longitude` (decimal)
   - `shopName`, `address`
   - `categories` (relation to Category)
   - `pricePerPage` (for printing category)
2. [ ] Implement `sellers.service.findAvailableSellers()`:
   - Filter by status=ONLINE
   - Filter by category
   - Calculate distance from user location
   - Sort by distance
   - Limit to 20 results
3. [ ] Add query validation DTO:
   - Required: category, lat, lng
   - Validation: lat/lng valid ranges
4. [ ] Add `@UseGuards(JwtAuthGuard)` to seller discovery
5. [ ] Test with different locations

**Acceptance:**
- [ ] Categories endpoint returns seeded categories
- [ ] Only ACTIVE categories marked as available
- [ ] Seller discovery filters by ONLINE status
- [ ] Distance calculation works
- [ ] Results sorted by proximity
- [ ] Only sellers supporting requested category returned

---

### Day 5 (Friday): DTOs + Testing + Sprint Review

**Goal:** All endpoints have proper DTOs, validation working, sprint demo ready

**Tasks:**

**DTOs (Morning):**
1. [ ] Create DTOs in each module:
   - `auth/dto/request-otp.dto.ts`
   - `auth/dto/verify-otp.dto.ts`
   - `sellers/dto/set-status.dto.ts`
   - `sellers/dto/query-sellers.dto.ts`
2. [ ] Add class-validator decorators:
   - `@IsPhoneNumber('IN')` for phone
   - `@IsEnum()` for status/role
   - `@IsLatitude()`, `@IsLongitude()` for location
3. [ ] Replace all `Record<string, unknown>` in controllers
4. [ ] Test validation errors return 400 with details

**Testing (Afternoon):**
1. [ ] Test complete auth flow:
   - Request OTP → Verify → Get JWT → Call protected endpoint
2. [ ] Test seller status:
   - Login as seller → Toggle status → Verify in DB
3. [ ] Test seller discovery:
   - Login as user → Query nearby sellers → Verify only ONLINE returned
4. [ ] Test categories endpoint
5. [ ] Test all validation errors
6. [ ] Test all auth guards

**Sprint Review Prep:**
1. [ ] Update API_README.md with Sprint 1 progress
2. [ ] Document any blockers or issues
3. [ ] Demo script:
   - Show database with seed data
   - Show OTP flow (console or SMS)
   - Show JWT validation
   - Show seller status toggle
   - Show seller discovery
4. [ ] Create Sprint 2 ticket list

**Acceptance:**
- [ ] All Sprint 1 APIs work end-to-end
- [ ] All DTOs validated
- [ ] No `Record<string, unknown>` remains
- [ ] Authentication flow complete
- [ ] Database has real data
- [ ] Demo runs successfully

---

## 📊 SPRINT 1 SUCCESS CRITERIA

At end of Sprint 1, the following MUST work:

✅ **Database:**
- [ ] Prisma schema implemented
- [ ] Migrations run successfully
- [ ] Seed data loaded (categories + test sellers)

✅ **Authentication:**
- [ ] User can request OTP
- [ ] User can verify OTP and receive JWT
- [ ] JWT validates on all protected endpoints
- [ ] Roles prevent unauthorized access

✅ **Sellers:**
- [ ] Seller can toggle ONLINE/OFFLINE
- [ ] Status persists and has timestamp
- [ ] Seller discovery filters by status=ONLINE
- [ ] Distance calculation works

✅ **Categories:**
- [ ] Returns seeded categories
- [ ] Status (ACTIVE/COMING_SOON) correct

✅ **Code Quality:**
- [ ] All endpoints have DTOs
- [ ] Input validation works
- [ ] No loose typing remains
- [ ] Build passes with no errors

---

## 🚨 RISK MITIGATION

**Risk: Database schema changes mid-sprint**
- Mitigation: Complete schema design and approval BEFORE Day 1
- Backup plan: Allow Day 1 afternoon for schema adjustments if needed

**Risk: OTP provider integration takes longer than expected**
- Mitigation: Use mock OTP service for dev, integrate real provider in Sprint 2 if needed
- Acceptance: Console logging OTP is acceptable for Sprint 1

**Risk: JWT/Guards complexity**
- Mitigation: Use @nestjs/passport examples, allocate full day
- Backup plan: Simple JWT signing without passport if blocked

**Risk: Distance calculation performance**
- Mitigation: Start with simple haversine formula, optimize later
- Backup plan: Skip distance sorting for Sprint 1, just filter by category

---

## 📞 DAILY STANDUP QUESTIONS

**What did you complete yesterday?**
**What will you complete today?**
**Are you blocked?**

**Key Metrics to Track:**
- APIs completed: X / 5
- DTOs completed: X / 4
- Tests passing: X / 10
- Blockers: X

---

## 🎯 DEFINITION OF DONE (Sprint 1)

Sprint 1 is complete when:
- [ ] All 5 planned APIs work end-to-end
- [ ] Database schema supports all MVP requirements
- [ ] Authentication flow is secure and complete
- [ ] Seller availability logic enforces ONLINE gate
- [ ] All code has proper DTOs and validation
- [ ] Build and tests pass
- [ ] Demo successfully shown to stakeholders
- [ ] Sprint 2 backlog is prioritized

**If any item is incomplete, Sprint 1 extends. No exceptions.**

---

## 📝 HANDOFF TO SPRINT 2

After Sprint 1, team should have:
- ✅ Working database with seed data
- ✅ Authentication system fully functional
- ✅ Seller management basics working
- ✅ Foundation for order flow (next sprint)

Sprint 2 will build on this foundation to implement the order state machine.

---

**Created:** 2026-01-24  
**Sprint Start:** Jan 27, 2026 (pending pre-sprint completion)  
**Sprint End:** Jan 31, 2026  
**Sprint 2 Planning:** Feb 3, 2026
