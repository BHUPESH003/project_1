# Prisma Schema Documentation

## Overview

This is the **initial Prisma schema** for the MVP, designed to support the complete order coordination flow from order creation to delivery.

**Key Principles:**
- ✅ Category-agnostic design (extensible)
- ✅ Order as central aggregate
- ✅ Seller availability as hard gate
- ✅ State machine enforced at application level
- ✅ Audit trail for all state transitions
- ✅ Geospatial ready (lat/lng with precision)

---

## Models

### Core Entities

#### **User**
- Authentication via phone + OTP
- Roles: USER, SELLER, ADMIN
- One user can be a seller (one-to-one relationship)

#### **Seller**
- Extends User (userId is unique)
- Location stored as lat/lng (Decimal precision)
- Status: ONLINE (accepting orders) | OFFLINE (default)
- Supports multiple categories (many-to-many)

#### **Category**
- Static list seeded during migration
- Status: ACTIVE (printing) | COMING_SOON (others)
- Category-agnostic by design

### Order Flow

#### **Order** (Central Aggregate)
- References: User, Seller (nullable), Category
- Order payload stored as JSON (category-specific)
- Status enum follows enforced state machine
- Pricing: itemCost + deliveryFee = totalAmount

#### **OrderStateHistory**
- Immutable audit log
- Tracks ALL state transitions
- Records who/what triggered each transition

### Integrations

#### **Payment**
- One-to-one with Order
- Method: UPI only (MVP)
- Gateway details stored (Razorpay/Paytm)
- Refund tracking included

#### **Delivery**
- One-to-one with Order
- Provider details (Dunzo, Porter, etc.)
- Pickup (seller) and Drop (user) locations
- Status tracking from assignment to delivery

#### **File**
- One-to-many with Order
- Metadata only (actual files in S3)
- Validation status tracked
- Page count for printing category

---

## State Machine

```
CREATED
  ↓ (user selects seller)
SELLER_SELECTED
  ↓ (user pays)
PAID
  ↓ (seller accepts)
SELLER_ACCEPTED
  ↓ (seller prepares)
PREPARING
  ↓ (seller marks ready)
READY_FOR_PICKUP
  ↓ (delivery picks up)
PICKED_UP
  ↓ (delivery completes)
DELIVERED ✅
```

**Failure States:**
- SELLER_REJECTED (seller declined)
- ORDER_EXPIRED (timeout)
- DELIVERY_FAILED (delivery issues)
- USER_CANCELLED (pre-pickup only)

---

## Key Indexes

**Performance-Critical:**
- `User.phone` - Auth lookup
- `Seller.status` - Filter ONLINE sellers
- `Seller.latitude, longitude` - Geospatial queries
- `Order.status` - Filter by order state
- `Order.userId, sellerId` - User/seller order lists
- `Payment.status, gatewayPaymentId` - Payment tracking

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd services/api
pnpm add prisma @prisma/client
pnpm add -D ts-node
```

### 2. Configure Environment

Create `services/api/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mvp_db?schema=public"
```

### 3. Initialize Database

```bash
# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Run seed
npx prisma db seed
```

### 4. Explore Data

```bash
# Open Prisma Studio
npx prisma studio
```

---

## Seed Data

After seeding, you'll have:

**Categories:**
- `printing` (ACTIVE) - MVP live category
- `stationery` (COMING_SOON)
- `hardware` (COMING_SOON)
- `pick-and-drop` (COMING_SOON)

**Test Sellers:**
- 3 print shops in Gurgaon (Sector 29, 14, DLF Phase 1)
- All default to OFFLINE status
- Price per page: ₹2.5 - ₹4.0

**Admin User:**
- Phone: +919999999999

---

## Data Types & Precision

### Money (Decimal)
```prisma
amount Decimal @db.Decimal(10, 2)
```
- Never use Float for currency
- Precision: 99,999,999.99 (sufficient for MVP)

### Location (Decimal)
```prisma
latitude  Decimal @db.Decimal(10, 8)  // ±90.00000000
longitude Decimal @db.Decimal(11, 8)  // ±180.00000000
```
- Precision: ~1mm accuracy
- Sufficient for distance calculations

### Timestamps (DateTime)
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```
- All mutable tables have timestamps
- Business events have specific timestamps (paidAt, deliveredAt)

---

## Schema Evolution

### ✅ Safe Changes
- Adding nullable columns
- Adding new tables
- Adding indexes
- Adding enums values (append only)

### ⚠️ Risky Changes
- Renaming columns (requires data migration)
- Changing column types (requires casting)
- Removing enum values (check usage first)
- Removing tables (check foreign keys)

### Migration Strategy
1. Create migration: `npx prisma migrate dev --name description`
2. Review SQL in `prisma/migrations/`
3. Test on staging first
4. Apply to production: `npx prisma migrate deploy`

---

## Common Queries

### Find ONLINE sellers for category
```typescript
const sellers = await prisma.seller.findMany({
  where: {
    status: SellerStatus.ONLINE,
    categories: {
      some: { categoryId: 'printing' }
    }
  },
  include: { user: true }
});
```

### Get order with full details
```typescript
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    user: true,
    seller: { include: { user: true } },
    category: true,
    payment: true,
    delivery: true,
    files: true,
    stateHistory: { orderBy: { createdAt: 'asc' } }
  }
});
```

### Track state transitions
```typescript
const history = await prisma.orderStateHistory.findMany({
  where: { orderId },
  orderBy: { createdAt: 'asc' }
});
```

---

## Business Rules Enforced by Schema

✅ **One User → One Seller** (userId is @unique on Seller)  
✅ **One Order → One Payment** (orderId is @unique on Payment)  
✅ **One Order → One Delivery** (orderId is @unique on Delivery)  
✅ **Seller must be ONLINE or OFFLINE** (enum constraint)  
✅ **Order status must be valid** (enum constraint)  
✅ **Money is always Decimal** (no Float errors)  
✅ **Cascading deletes on relations** (onDelete: Cascade)  
✅ **Restrict deletes for orders** (onDelete: Restrict - no data loss)

---

## Performance Considerations

### Indexes Created
- 20+ indexes on critical lookup paths
- Composite indexes for admin filtering
- Geospatial indexes for seller discovery

### Expected Performance (1000 orders)
- User login: <50ms
- Seller discovery: <100ms
- Order creation: <200ms
- State transition: <100ms

### When to Optimize
- >10,000 orders: Consider partitioning
- >100 sellers: Consider PostGIS extension
- Slow queries: Add EXPLAIN ANALYZE and optimize

---

## Troubleshooting

### Migration Failed
```bash
# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Or fix and retry
npx prisma migrate dev
```

### Prisma Client Out of Sync
```bash
npx prisma generate
```

### Seed Failed
```bash
# Check logs for constraint violations
# Common: Duplicate phone numbers or IDs
npx prisma db seed
```

### Studio Won't Open
```bash
# Check DATABASE_URL is correct
# Check PostgreSQL is running
npx prisma studio
```

---

## Next Steps (Sprint 1)

After schema is approved and migrated:

1. [ ] Create `PrismaService` as global provider
2. [ ] Update `app.module.ts` to include PrismaModule
3. [ ] Connect services to Prisma Client
4. [ ] Implement DTOs matching schema models
5. [ ] Add validation for enums in controllers
6. [ ] Test database connection in health check

---

## Schema Approval Checklist

Before proceeding to Sprint 1 implementation:

- [ ] All models align with API Contract v1
- [ ] State machine includes ORDER_EXPIRED
- [ ] Seller availability logic supported
- [ ] Indexes cover all common queries
- [ ] Decimal precision correct for money and location
- [ ] Timestamps on all mutable models
- [ ] Foreign keys and cascades correct
- [ ] Seed data includes test sellers
- [ ] Team has reviewed and approved

---

**Schema Version:** 1.0 (Initial)  
**Created:** 2026-01-24  
**Status:** Ready for Sprint 1  
**Next Review:** After Sprint 1 completion
