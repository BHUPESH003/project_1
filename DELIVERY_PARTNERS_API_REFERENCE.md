# Delivery Partners - API Quick Reference

## New Endpoints

### 1. GET ALL DELIVERY QUOTES
Shows user all available delivery options with pricing

```http
POST /v1/orders/:id/delivery-quotes
Authorization: Bearer {token}
Content-Type: application/json

{
  "dropLocation": {
    "lat": 28.1234567,
    "lng": 77.5678901,
    "address": "123 Main Street, Delhi"
  }
}
```

**Success Response (200):**
```json
{
  "order_id": "clx1234abcd",
  "options": [
    {
      "provider": "UBER_DIRECT",
      "displayName": "Uber Direct",
      "estimatedFee": 89,
      "estimatedDurationMinutes": 25,
      "currency": "INR",
      "features": [
        "Real-time tracking",
        "Insurance coverage",
        "Professional delivery",
        "GPS enabled"
      ],
      "logo": "https://www.uber-cdn.com/...",
      "rating": 4.8,
      "quoteId": "uber-quote-xxx",
      "expiresAt": "2026-02-11T12:30:00Z"
    },
    {
      "provider": "DUNZO",
      "displayName": "Dunzo",
      "estimatedFee": 50,
      "estimatedDurationMinutes": 35,
      "currency": "INR",
      "features": [
        "Fast delivery",
        "Local coverage",
        "Same-day service",
        "Affordable pricing"
      ],
      "logo": "https://cdn.dunzo.com/...",
      "rating": 4.7,
      "quoteId": "dunzo-1707638400000",
      "expiresAt": "2026-02-11T12:35:00Z"
    },
    {
      "provider": "PORTER",
      "displayName": "Porter",
      "estimatedFee": 60,
      "estimatedDurationMinutes": 32,
      "currency": "INR",
      "features": [
        "Premium service",
        "Insured delivery",
        "Real-time updates",
        "Wide coverage area"
      ],
      "logo": "https://porter.in/assets/...",
      "rating": 4.6,
      "quoteId": "porter-1707638400000",
      "expiresAt": "2026-02-11T12:35:00Z"
    }
  ],
  "message": "3 delivery options available. Select preferred provider to proceed."
}
```

**Error Responses:**
- `400`: Invalid location or seller not selected
- `404`: Order not found
- `401`: Unauthorized

---

### 2. SELECT DELIVERY PROVIDER
User chooses their preferred delivery partner

```http
POST /v1/orders/:id/select-delivery-provider
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "DUNZO",
  "quoteId": "dunzo-1707638400000"
}
```

**Success Response (200):**
```json
{
  "order_id": "clx1234abcd",
  "provider": "DUNZO",
  "deliveryFee": 50,
  "estimatedDurationMinutes": 35,
  "message": "Dunzo selected. Ready to confirm order."
}
```

**Error Responses:**
- `400`: Invalid provider or delivery location not set
- `404`: Order not found
- `401`: Unauthorized

---

## Complete Order Flow

```mermaid
sequenceDiagram
    participant User as User App
    participant API as Backend API
    participant DeliveryService as Delivery Service
    participant Providers as Delivery Providers<br/>(Uber, Dunzo, Porter)

    User->>API: POST /orders (Create order)
    API-->>User: order_id, status: CREATED

    User->>API: POST /select-seller (Choose seller)
    API-->>User: order_id, status: SELLER_SELECTED

    User->>API: POST /delivery-quotes (Get all options)
    API->>DeliveryService: getAllQuotes()
    DeliveryService->>Providers: Fetch quotes (parallel)
    Providers-->>DeliveryService: ₹89, ₹50, ₹60
    DeliveryService-->>API: Array of options sorted by price
    API-->>User: Display 3 delivery options

    User->>API: POST /select-delivery-provider (Choose provider)
    API->>DeliveryService: getQuoteFromProvider('DUNZO')
    DeliveryService->>Providers: Get Dunzo quote
    Providers-->>DeliveryService: ₹50, 35 min
    DeliveryService-->>API: Confirmation
    API-->>User: Dunzo selected, fee: ₹50

    User->>API: POST /confirm (Confirm order & pay)
    API-->>User: Payment intent
    User->>User: Complete payment
    API-->>API: Webhook → Order.PAID

    API->>API: Order: SELLER_SELECTED → PAID

    Note: Later, when seller marks ready...
    API->>DeliveryService: assignDelivery()
    DeliveryService->>Providers: Create task with DUNZO
    Providers-->>DeliveryService: Task created
    API-->>API: Order: READY_FOR_PICKUP
```

---

## Quick Examples

### Frontend (React Native)

```typescript
import { ordersApi } from '@/api/orders.api';

// Get all delivery quotes
const quotes = await ordersApi.getAllDeliveryQuotes(
  'order-123',
  { lat: 28.123, lng: 77.456, address: '123 Main St' }
);

// Display options to user
quotes.options.forEach(option => {
  console.log(`${option.displayName}: ₹${option.estimatedFee} (${option.estimatedDurationMinutes}min)`);
});

// User selects a provider
const selected = await ordersApi.selectDeliveryProvider('order-123', 'DUNZO');
console.log(`Selected: ${selected.provider}, Fee: ₹${selected.deliveryFee}`);
```

### Backend Testing (cURL)

```bash
# Get all delivery quotes
curl -X POST http://localhost:3000/orders/order-123/delivery-quotes \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{
    "dropLocation": {
      "lat": 28.1234567,
      "lng": 77.5678901,
      "address": "123 Main Street"
    }
  }'

# Select delivery provider
curl -X POST http://localhost:3000/orders/order-123/select-delivery-provider \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"provider": "DUNZO"}'
```

---

## Provider Details

### Uber Direct
- **Status**: Live production integration
- **API**: Real Uber Deliveries API v1.0.1
- **Pricing**: Dynamic based on distance & time
- **ETA**: Real-time estimates
- **Features**: Tracking, insurance, professional drivers

### Dunzo (Dummy)
- **Status**: Dummy implementation for testing
- **Pricing**: ₹50 + ₹10/km
- **ETA**: 15 + (distance × 2) minutes
- **Features**: Fast, local, affordable
- **Note**: Replace with real Dunzo API when ready

### Porter (Dummy)
- **Status**: Dummy implementation for testing
- **Pricing**: ₹60 + ₹12/km
- **ETA**: 12 + (distance × 1.8) minutes
- **Features**: Premium, insured, wide coverage
- **Note**: Replace with real Porter API when ready

---

## Error Codes

| Code | Scenario | Solution |
|------|----------|----------|
| 400 | Seller not selected | Call `/select-seller` first |
| 400 | Order in wrong state | Must be in SELLER_SELECTED state |
| 400 | Invalid provider | Check available options from `/delivery-quotes` |
| 400 | Location not set | Set `dropLocation` in `/delivery-quotes` first |
| 404 | Order not found | Verify order ID |
| 401 | Unauthorized | Include valid Bearer token |
| 503 | All providers down | Retry after some time |

---

## Notes

1. **Quote Expiration**: Quotes expire based on provider. Always re-fetch if showing stale quotes.

2. **Provider Selection**: Only select providers returned from `/delivery-quotes` endpoint.

3. **Parallel Fetching**: All provider quotes are fetched in parallel for fast response.

4. **Graceful Degradation**: If one provider fails (e.g., Dunzo API down), others still show.

5. **Distance Calculation**: Uses Haversine formula on coordinates. Address is for display only.

6. **Fee Updates**: Selected provider's fee is stored in order for later reference.

---

## Configuration

To add a new delivery provider:

1. Create adapter in `src/delivery/adapters/{provider}/`
2. Register in `DeliveryModule`
3. Add metadata to `OrdersService`
4. Update frontend types

See [DELIVERY_PARTNERS_IMPLEMENTATION.md](./DELIVERY_PARTNERS_IMPLEMENTATION.md) for details.
