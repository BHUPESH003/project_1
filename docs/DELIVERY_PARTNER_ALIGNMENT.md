# Delivery Partner Alignment & Order Processing Guide

**Purpose:** Explain how multiple orders from different sellers are processed with different delivery partners

---

## Overview

When a user checks out with items from multiple sellers, the system creates independent orders but coordinates them through a unified delivery partner assignment system.

### Example Scenario

```
User's Cart:
├─ Seller A (Print Shop): 100 A4 pages
├─ Seller B (Stationery): 500 visiting cards
└─ Seller C (Packaging): 2 rolls of tape
```

### What Happens During Checkout

---

## Step 1: Order Creation (Atomic Transaction)

**Endpoint:** `POST /orders/batch/create`

All orders created in single transaction with `batch_id`:

| Field | Seller A | Seller B | Seller C |
|-------|----------|----------|----------|
| order_id | ord_a1 | ord_b1 | ord_c1 |
| batch_id | batch_123 | batch_123 | batch_123 |
| seller_id | seller_a | seller_b | seller_c |
| user_id | user_1 | user_1 | user_1 |
| subtotal | ₹500 | ₹250 | ₹150 |
| status | CREATED | CREATED | CREATED |

**Key Points:**
- All succeed or all fail (transactional)
- Each order is independent
- Linked via `batch_id` for tracking

---

## Step 2: Delivery Quote Fetching (Parallel)

**Endpoint:** `POST /orders/batch/delivery-quotes`

System fetches quotes from ALL providers for EACH order in parallel:

```
Request:
{
  "orderIds": ["ord_a1", "ord_b1", "ord_c1"],
  "deliveryAddress": { lat: 28.5, lng: 77.3, address: "..." }
}
```

### Quote Fetching Timeline

```
Time 0ms:     Uber.quote(Seller A → User) ─────┐
              Uber.quote(Seller B → User) ─────┤
              Uber.quote(Seller C → User) ─────┤
                                                ├─> All parallel
              Porter.quote(Seller A → User) ──┤
              Porter.quote(Seller B → User) ──┤
              Porter.quote(Seller C → User) ──┤
                                                ├─> ~3-5 sec total
              Dunzo.quote(Seller A → User) ───┤
              Dunzo.quote(Seller B → User) ───┤
              Dunzo.quote(Seller C → User) ───┤
                                                │
Time 5s:      All quotes collected ────────────┘
```

### Response Structure

```json
{
  "orders": [
    {
      "orderId": "ord_a1",
      "sellerId": "seller_a",
      "providers": [
        {
          "provider": "UBER_DIRECT",
          "displayName": "Uber Direct",
          "estimatedFee": 40,
          "estimatedDurationMinutes": 20,
          "rating": 4.8
        },
        {
          "provider": "PORTER",
          "displayName": "Porter",
          "estimatedFee": 35,
          "estimatedDurationMinutes": 25,
          "rating": 4.5
        },
        {
          "provider": "DUNZO",
          "displayName": "Dunzo",
          "estimatedFee": 45,
          "estimatedDurationMinutes": 30,
          "rating": 4.6
        }
      ],
      "cheapest": { "provider": "PORTER", "estimatedFee": 35 },
      "fastest": { "provider": "UBER_DIRECT", "estimatedDurationMinutes": 20 }
    },
    {
      "orderId": "ord_b1",
      "sellerId": "seller_b",
      "providers": [ ... similar structure ... ]
    },
    {
      "orderId": "ord_c1",
      "sellerId": "seller_c",
      "providers": [ ... similar structure ... ]
    }
  ],
  "totalDeliveryFees": 120, // Sum of all delivery fees
  "estimatedDeliveryTimes": {
    "earliest": 20, // Min of all ETAs
    "latest": 30    // Max of all ETAs
  }
}
```

---

## Step 3: User Selects Delivery Partners

**Mobile UI Shows:**

```
┌─────────────────────────────────────┐
│ Order From: Print Shop A             │
│ Items: A4 Pages (100)                │
│ Subtotal: ₹500                       │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ ✓ Uber Direct                    │ │
│ │   Est. 20 min | ₹40              │ │
│ │                                  │ │
│ │    □ Porter                      │ │
│ │       Est. 25 min | ₹35          │ │
│ │                                  │ │
│ │    □ Dunzo                       │ │
│ │       Est. 30 min | ₹45          │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Order From: Stationery Shop          │
│ Items: Visiting Cards (500)          │
│ Subtotal: ₹250                       │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ □ Uber Direct                    │ │
│ │   Est. 22 min | ₹42              │ │
│ │                                  │ │
│ │ ✓ Porter                         │ │
│ │   Est. 28 min | ₹33              │ │
│ │                                  │ │
│ │   □ Dunzo                        │ │
│ │      Est. 35 min | ₹48           │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘

[Proceed to Payment] → Total: ₹873 (500+250+40+33)
```

**Key Point:** Each seller's order can have DIFFERENT delivery partner!

---

## Step 4: Order Confirmation (Atomic Transaction)

**Endpoint:** `POST /orders/batch/confirm`

```json
Request:
{
  "deliveryConfirmations": [
    {
      "orderId": "ord_a1",
      "sellerId": "seller_a",
      "deliveryPartner": "UBER_DIRECT",
      "deliveryFee": 40
    },
    {
      "orderId": "ord_b1",
      "sellerId": "seller_b",
      "deliveryPartner": "PORTER",
      "deliveryFee": 33
    },
    {
      "orderId": "ord_c1",
      "sellerId": "seller_c",
      "deliveryPartner": "DUNZO",
      "deliveryFee": 47
    }
  ],
  "paymentMethod": "UPI"
}
```

### Backend Processing

```
Transaction START:
├── For Seller A:
│   ├── Update ord_a1.delivery_partner = UBER_DIRECT
│   ├── Update ord_a1.delivery_fee = 40
│   ├── Calculate ord_a1.total_amount = 500 + 40 = 540
│   ├── Update ord_a1.status = READY_FOR_PAYMENT
│   └── Create Uber delivery request (async)
│
├── For Seller B:
│   ├── Update ord_b1.delivery_partner = PORTER
│   ├── Update ord_b1.delivery_fee = 33
│   ├── Calculate ord_b1.total_amount = 250 + 33 = 283
│   ├── Update ord_b1.status = READY_FOR_PAYMENT
│   └── Create Porter delivery request (async)
│
├── For Seller C:
│   ├── Update ord_c1.delivery_partner = DUNZO
│   ├── Update ord_c1.delivery_fee = 47
│   ├── Calculate ord_c1.total_amount = 150 + 47 = 197
│   ├── Update ord_c1.status = READY_FOR_PAYMENT
│   └── Create Dunzo delivery request (async)
│
├── Calculate GRAND_TOTAL = 540 + 283 + 197 = 1020
├── Create single payment intent for 1020
└── Return payment URLs
```

**Response:**
```json
{
  "success": true,
  "confirmedOrders": [
    { "orderId": "ord_a1", "sellerId": "seller_a", "totalAmount": 540 },
    { "orderId": "ord_b1", "sellerId": "seller_b", "totalAmount": 283 },
    { "orderId": "ord_c1", "sellerId": "seller_c", "totalAmount": 197 }
  ],
  "grandTotal": 1020,
  "paymentIntents": [
    {
      "orderId": "ord_a1",
      "paymentIntentId": "pi_a123",
      "paymentUrl": "https://payment.provider.com/..."
    }
  ]
}
```

---

## Step 5: Payment Processing

### Single Unified Payment

- User sees ONE payment screen
- Amount: ₹1020 (grand total)
- Payment gateway processes once
- SUCCESS = all orders PAID
- FAILURE = all orders CANCELLED

### Payment Success Webhook

```
webhook {
  paymentIntentId: "pi_a123",
  status: "SUCCEEDED",
  amount: 1020,
  batchId: "batch_123"
}

Backend Action:
├── Update all orders in batch_123 to status = PAID
├── Publish messages to:
│   ├── seller-seller_a-queue: "Ready for pickup"
│   ├── seller-seller_b-queue: "Ready for pickup"
│   ├── seller-seller_c-queue: "Ready for pickup"
│   ├── delivery-uber-queue: "Pickup from seller_a"
│   ├── delivery-porter-queue: "Pickup from seller_b"
│   ├── delivery-dunzo-queue: "Pickup from seller_c"
│   └── user-notifications-queue: "3 orders confirmed"
└── Clear user's cart items
```

---

## Step 6: Fulfillment & Delivery

### Parallel Processing

```
Timeline:

T=0:   Orders confirmed
       ├─ Seller A receives order (from queue)
       ├─ Seller B receives order (from queue)
       ├─ Seller C receives order (from queue)
       ├─ Uber receives pickup request
       ├─ Porter receives pickup request
       └─ Dunzo receives pickup request

T=5min: Seller A prepares items
        Seller B prepares items
        Seller C prepares items

T=15min: Seller A ready for pickup
         ├─ Uber notified
         ├─ Driver gets location
         └─ ETA: 5 min

T=20min: Seller B ready for pickup
         ├─ Porter notified
         └─ ETA: 10 min

T=25min: Seller C ready for pickup
         ├─ Dunzo notified
         └─ ETA: 8 min

T=30min ─ T=45min: Deliveries in progress
                    ├─ Uber: Seller A → User
                    ├─ Porter: Seller B → User
                    └─ Dunzo: Seller C → User

T=50min: All items delivered
         └─ User sees combined "All delivered" notification
```

### Tracking

User can track in app:
- Seller A order status (with Uber tracking)
- Seller B order status (with Porter tracking)
- Seller C order status (with Dunzo tracking)

---

## Database State at Each Step

### After Creation
```
Orders Table:
| order_id | batch_id   | seller_id | status  | delivery_partner | delivery_fee |
|----------|-----------|-----------|---------|------------------|--------------|
| ord_a1   | batch_123 | seller_a  | CREATED | NULL            | NULL         |
| ord_b1   | batch_123 | seller_b  | CREATED | NULL            | NULL         |
| ord_c1   | batch_123 | seller_c  | CREATED | NULL            | NULL         |
```

### After Confirmation
```
Orders Table:
| order_id | batch_id   | seller_id | status        | delivery_partner | delivery_fee |
|----------|-----------|-----------|---------------|------------------|--------------|
| ord_a1   | batch_123 | seller_a  | READY_FOR_PAYMENT | UBER_DIRECT      | 40          |
| ord_b1   | batch_123 | seller_b  | READY_FOR_PAYMENT | PORTER           | 33          |
| ord_c1   | batch_123 | seller_c  | READY_FOR_PAYMENT | DUNZO            | 47          |
```

### After Payment
```
Orders Table:
| order_id | batch_id   | seller_id | status  | delivery_partner | delivery_fee |
|----------|-----------|-----------|---------|------------------|--------------|
| ord_a1   | batch_123 | seller_a  | PAID    | UBER_DIRECT      | 40          |
| ord_b1   | batch_123 | seller_b  | PAID    | PORTER           | 33          |
| ord_c1   | batch_123 | seller_c  | PAID    | DUNZO            | 47          |
```

---

## Error Scenarios

### Scenario 1: Delivery Provider Unavailable

**Problem:** Dunzo API is down when fetching quotes

**Handling:**
```json
{
  "orderId": "ord_c1",
  "sellerId": "seller_c",
  "providers": [
    { "provider": "UBER_DIRECT", ... },
    { "provider": "PORTER", ... }
    // Dunzo missing but flow continues
  ]
}
```

**Action:** Show available providers only, suggest "Try again" later

### Scenario 2: One Seller's Delivery Fails

**Problem:** Porter couldn't pickup from Seller B

**Handling:**
- Only Seller B order affected
- Seller A (Uber) and C (Dunzo) continue
- Retry logic for Seller B
- User notified separately for each order

### Scenario 3: Payment Fails

**Problem:** UPI payment declined

**Handling:**
```
1. Don't update order statuses
2. Cancel all delivery requests
3. Keep orders in READY_FOR_PAYMENT
4. Return orders to user's cart
5. Allow user to retry payment
```

---

## Optimization: Batch Delivery Routing

### Geographic Optimization

If multiple orders are geographically close:

```
Seller A location: (28.53, 77.38)
Seller B location: (28.54, 77.39)  ← Only 2km away
Seller C location: (28.45, 77.35)  ← 15km away
User location:     (28.60, 77.40)
```

**Optimization 1: Combined pickup**
- Uber picks up A & B together (optimized route)
- Saves time and fuel

**Optimization 2: Shared delivery**
- Same driver delivers both items
- Further optimization

**Current Implementation:** Each order independent (simple)
**Future Optimization:** Route optimization algorithm

---

## Monitoring & Metrics

### Per-Order Metrics
- Creation time
- Quote fetch time
- Confirmation time
- Pickup time
- Delivery time
- Total time from order to delivery

### Per-Provider Metrics
- Quote fetch success rate
- Quote accuracy (actual vs estimated)
- Pickup on-time rate
- Delivery on-time rate
- Customer rating

### Per-Seller Metrics
- Order fulfillment speed
- Quality of items
- Cancellation rate

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Orders** | One per seller, linked via batch_id |
| **Delivery Partners** | Different per seller, chosen by user |
| **Payment** | Single unified payment for all |
| **Fulfillment** | Parallel per seller with respective provider |
| **Tracking** | Combined view + individual tracking |
| **Atomicity** | All succeed or all fail at confirmation |
| **Error Handling** | Graceful degradation, partial failures handled |

---

## Implementation Checklist

Backend Implementation:
- [ ] Batch order creation with transactionality
- [ ] Parallel delivery quote fetching
- [ ] Per-order delivery partner assignment
- [ ] Unified payment intent creation
- [ ] Order status transitions
- [ ] Message queue integration for fulfillment
- [ ] Delivery provider SDKs/integrations
- [ ] Error handling and retry logic
- [ ] Monitoring and logging
- [ ] Database migrations

---

## Questions & Escalation

### Common Questions

**Q: What if Seller A is ready in 15min but Seller B takes 45min?**
A: Uber can pickup from A immediately, but item will be stored for consolidation with B

**Q: Can user change delivery provider after confirmation?**
A: No - confirmation is atomic. User can cancel and retry.

**Q: What if payment succeeds partially (₹500 of ₹1020)?**
A: Payment gateway should not allow partial payment. Entire ₹1020 or nothing.

**Q: Can one order's delivery fail without affecting others?**
A: Yes! Each delivery is independent. One failure doesn't cascade.

---

**Document Version:** 1.0
**Last Updated:** March 17, 2026
**Status:** Ready for Backend Implementation
