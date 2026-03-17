# Multi-Cart Backend Implementation Guide

## Overview

This guide documents the required backend API enhancements to support multi-cart functionality where users can add items from multiple sellers and checkout all items in a single flow, with each seller's items being processed as separate orders but with unified delivery partner allocation.

---

## Critical Requirements

### 1. One Order Per Seller
- Each seller gets exactly ONE order when user checks out
- User with items from 3 sellers = 3 separate orders created
- Each order goes through its own fulfillment pipeline
- Orders are independent but related via a `batch_id` or `session_id`

### 2. Multiple Delivery Partners
- Support multiple delivery providers (Uber Direct, Porter, Dunzo, etc.)
- Each seller's order can be delivered by a different provider
- Delivery quotes fetched per order (seller-to-user location)
- User can choose different provider for each seller

### 3. Unified Checkout Flow
- Single payment process for all orders combined
- Payment success = all orders confirmed
- Payment failure = all orders cancelled
- User sees combined total before paying

---

## API Endpoints Required

### 1. Create Multiple Orders (Batch)

**Endpoint:** `POST /orders/batch/create`

**Purpose:** Create one order per seller in a single atomic operation

**Request Body:**
```json
{
  "orders": [
    {
      "sellerId": "seller_123",
      "sellerName": "Print Shop A",
      "items": [
        {
          "productId": "prod_1",
          "name": "A4 Pages",
          "quantity": 100,
          "price": 5.00
        }
      ],
      "notes": "Single sided, black & white"
    },
    {
      "sellerId": "seller_456",
      "sellerName": "Print Shop B",
      "items": [
        {
          "productId": "prod_2",
          "name": "Visiting Cards",
          "quantity": 500,
          "price": 50.00
        }
      ],
      "notes": "Glossy finish"
    }
  ],
  "deliveryAddress": {
    "latitude": 28.5355,
    "longitude": 77.3910,
    "address": "123 Main St, Delhi"
  },
  "paymentMethod": "UPI"
}
```

**Response (Success):**
```json
{
  "success": true,
  "totalOrders": 2,
  "successfulOrders": [
    {
      "orderId": "ord_abc123",
      "sellerId": "seller_123",
      "sellerName": "Print Shop A",
      "items": [...],
      "subtotal": 500.00,
      "status": "CREATED",
      "createdAt": "2024-03-17T10:30:00Z"
    },
    {
      "orderId": "ord_def456",
      "sellerId": "seller_456",
      "sellerName": "Print Shop B",
      "items": [...],
      "subtotal": 25000.00,
      "status": "CREATED",
      "createdAt": "2024-03-17T10:30:00Z"
    }
  ],
  "failedOrders": [],
  "totalAmount": 25500.00,
  "message": "All orders created successfully"
}
```

**Database:**
- Create `order_batch` table with `batch_id` and `createdAt`
- Link each order to batch via `batch_id` foreign key
- This allows tracking orders created together

**Backend Logic:**
```
For each order in request:
  1. Fetch seller details (validate exists)
  2. Validate items against seller's products
  3. Calculate subtotal
  4. Create Order record with status CREATED
  5. Create order-items join records
  6. Link to batch_id

If any order fails:
  5a. Rollback all orders in batch  
  5b. Return error with specific reason

Return created orders with IDs for next steps
```

---

### 2. Get Delivery Quotes for Multiple Orders

**Endpoint:** `POST /orders/batch/delivery-quotes`

**Purpose:** Fetch delivery provider quotes for all orders simultaneously (per-seller quotes)

**Request Body:**
```json
{
  "orderIds": ["ord_abc123", "ord_def456"],
  "deliveryAddress": {
    "latitude": 28.5355,
    "longitude": 77.3910,
    "address": "123 Main St, Delhi"
  }
}
```

**Response:**
```json
{
  "orders": [
    {
      "orderId": "ord_abc123",
      "sellerId": "seller_123",
      "providers": [
        {
          "provider": "UBER_DIRECT",
          "displayName": "Uber Direct",
          "estimatedFee": 40.00,
          "estimatedDurationMinutes": 25,
          "rating": 4.8,
          "quoteId": "quote_uber_123"
        },
        {
          "provider": "PORTER",
          "displayName": "Porter",
          "estimatedFee": 35.00,
          "estimatedDurationMinutes": 30,
          "rating": 4.5,
          "quoteId": "quote_porter_123"
        }
      ],
      "cheapest": { "provider": "PORTER", "estimatedFee": 35.00 },
      "fastest": { "provider": "UBER_DIRECT", "estimatedDurationMinutes": 25 }
    },
    {
      "orderId": "ord_def456",
      "sellerId": "seller_456",
      "providers": [
        {
          "provider": "DUNZO",
          "displayName": "Dunzo",
          "estimatedFee": 50.00,
          "estimatedDurationMinutes": 35,
          "rating": 4.6,
          "quoteId": "quote_dunzo_456"
        }
      ],
      "cheapest": { "provider": "DUNZO", "estimatedFee": 50.00 },
      "fastest": { "provider": "DUNZO", "estimatedDurationMinutes": 35 }
    }
  ],
  "totalDeliveryFees": 85.00,
  "estimatedDeliveryTimes": {
    "earliest": 25,
    "latest": 35
  }
}
```

**Backend Logic:**
```
For each orderId:
  1. Fetch order details (seller location)
  2. Call delivery provider APIs in parallel:
     - Uber Direct API
     - Porter API
     - Dunzo API
  3. Aggregate responses
  4. Cache quotes with TTL (5-10 minutes)
  5. Return sorted by price/time

Handle provider API failures gracefully:
- If Uber fails, continue with others
- Return available providers only
```

---

### 3. Confirm Multiple Orders

**Endpoint:** `POST /orders/batch/confirm`

**Purpose:** Finalize all orders with delivery partner selections and process payment

**Request Body:**
```json
{
  "deliveryConfirmations": [
    {
      "orderId": "ord_abc123",
      "sellerId": "seller_123",
      "deliveryPartner": "PORTER",
      "deliveryFee": 35.00
    },
    {
      "orderId": "ord_def456",
      "sellerId": "seller_456",
      "deliveryPartner": "DUNZO",
      "deliveryFee": 50.00
    }
  ],
  "paymentMethod": "UPI"
}
```

**Response:**
```json
{
  "success": true,
  "totalOrders": 2,
  "confirmedOrders": [
    {
      "orderId": "ord_abc123",
      "sellerId": "seller_123",
      "status": "PAYMENT_PENDING",
      "totalAmount": 535.00
    },
    {
      "orderId": "ord_def456",
      "sellerId": "seller_456",
      "status": "PAYMENT_PENDING",
      "totalAmount": 25050.00
    }
  ],
  "failedOrders": [],
  "grandTotal": 25585.00,
  "paymentIntents": [
    {
      "orderId": "ord_abc123",
      "paymentIntentId": "pi_123abc",
      "paymentUrl": "https://payment.provider.com/..."
    }
  ]
}
```

**Backend Logic:**
```
Transaction START:
For each delivery confirmation:
  1. Verify order exists and status is CREATED
  2. Verify delivery provider quote is valid (not expired)
  3. Update order with:
     - deliveryPartner
     - deliveryFee
     - total_amount = subtotal + delivery_fee
     - status = READY_FOR_PAYMENT

After all updates successful:
  4. Create combined payment intent for all orders
  5. Return payment URL

If any confirmation fails:
  ROLLBACK all changes
  Return error with specific order details

On Payment Success (webhook):
  - Update all orders status to PAID
  - Sort orders by seller priority
  - Send to their respective fulfillment queues
  - Mark user's cart items as cleared
```

---

### 4. Get Batch Order Status

**Endpoint:** `POST /orders/batch/status`

**Purpose:** Get real-time status of multiple orders

**Request Body:**
```json
{
  "orderIds": ["ord_abc123", "ord_def456"]
}
```

**Response:**
```json
{
  "orders": [
    {
      "orderId": "ord_abc123",
      "sellerId": "seller_123",
      "status": "PREPARING",
      "estimatedDeliveryTime": 40,
      "deliveryPartner": "PORTER",
      "trackingUrl": "https://tracking.porter.com/..."
    },
    {
      "orderId": "ord_def456",
      "sellerId": "seller_456",
      "status": "READY_FOR_PICKUP",
      "estimatedDeliveryTime": 50,
      "deliveryPartner": "DUNZO",
      "trackingUrl": "https://tracking.dunzo.com/..."
    }
  ]
}
```

---

### 5. Cancel Batch Orders

**Endpoint:** `POST /orders/batch/cancel`

**Purpose:** Cancel one or multiple orders (before confirmation or payment)

**Request Body:**
```json
{
  "orderIds": ["ord_abc123", "ord_def456"],
  "reason": "User requested"
}
```

**Response:**
```json
{
  "success": true,
  "cancelledOrders": ["ord_abc123"],
  "failedOrders": [
    {
      "orderId": "ord_def456",
      "error": "Already confirmed, cannot cancel"
    }
  ]
}
```

---

### 6. Get Combined Order

**Endpoint:** `GET /orders/batch/combined?orderIds=ord_abc123,ord_def456`

**Purpose:** Get combined view of related orders for order history

**Response:**
```json
{
  "combinedOrderId": "batch_xyz789",
  "orders": [
    { "orderId": "ord_abc123", "sellerName": "Print Shop A", ... },
    { "orderId": "ord_def456", "sellerName": "Print Shop B", ... }
  ],
  "totalAmount": 25585.00,
  "estimatedDeliveryTime": "Today by 6 PM",
  "statuses": ["PREPARING", "READY_FOR_PICKUP"]
}
```

---

## Database Schema Changes

### 1. New`order_batch` Table
```sql
CREATE TABLE order_batches (
  batch_id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  total_orders INT NOT NULL,
  total_amount DECIMAL(10, 2),
  payment_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. Update `orders` Table
```sql
ALTER TABLE orders ADD COLUMN batch_id UUID;
ALTER TABLE orders ADD COLUMN delivery_partner VARCHAR(100);
ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN delivery_quote_id VARCHAR(255);
ALTER TABLE orders ADD FOREIGN KEY (batch_id) REFERENCES order_batches(batch_id) ON DELETE CASCADE;
```

---

## Delivery Provider Integration

### Each Provider Needs:
1. **API Authentication** - API keys, credentials
2. **Quote API** - Get delivery quotes
3. **Tracking API** - Real-time tracking
4. **Webhook Endpoint** - Updates on delivery status

### Providers to Support:
- **Uber Direct** - `POST /delivery/quotes`
- **Porter** - `POST /shipments/quotes`
- **Dunzo** - `POST /delivery_quotes`

---

## Payment Processing Flow

### Unified Payment:
```
1. User selects delivery providers for all sellers
2. Backend calculates GRAND_TOTAL = sum(subtotal + delivery_fee)
3. Create single payment intent for GRAND_TOTAL
4. User pays once
5. On success: All orders move to PAID status
6. Each order queued for seller's fulfillment
```

---

## Error Handling

### Scenarios:
1. **Some Orders Fail Creation** - Return partial success with error details
2. **Delivery Quote Expired** - Re-fetch before confirmation
3. **Payment Fails** - Cancel all orders, return to cart
4. **Provider API Down** - Return available providers, suggest retry

---

## Queue/Message System

### After Payment Success:
```
For each order in batch:
  Publish message to:
  - seller-{seller_id}-queue
  - delivery-partner-{provider}-queue
  - user-notifications-queue

This ensures:
- Seller gets notified immediately
- Delivery partner receives pickup request
- User sees real-time updates
```

---

## Testing Scenarios

1. **Happy Path**: 2 sellers, 2 different providers, payment success
2. **Partial Failure**: 1 provider unavailable, fallback to alternate
3. **Payment Failure**: Cancel all orders, return to cart
4. **Timeout**: Provider quote fetch timeout, retry logic
5. **Wrong Location**: Invalid delivery coordinates, validation error

---

## Performance Considerations

1. **Parallel API Calls** - Fetch quotes from all providers concurrently (not sequential)
2. **Quote Caching** - Cache quotes with 5-10 minute TTL
3. **Batch Database Operations** - Use transactions for atomicity
4. **Connection Pooling** - Maintan pool for provider APIs
5. **Timeout Settings** - Provider API timeout = 5-10 seconds

---

## Frontend Integration

The mobile app will:
1. Call `POST /orders/batch/create` to create all orders
2. Call `POST /orders/batch/delivery-quotes` to get options
3. User selects providers in UI
4. Call `POST /orders/batch/confirm` to finalize
5. Handle payment flow
6. Clear cart on success
