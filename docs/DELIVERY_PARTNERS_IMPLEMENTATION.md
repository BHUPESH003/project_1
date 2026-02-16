# Configurable Delivery Partner System - Implementation Guide

## Overview

This document describes the new **configurable delivery partner system** that enables users to see all available delivery options with quotations and select their preferred delivery partner before confirming their order.

## Architecture

### 1. **Delivery Adapter Pattern**

The system uses the **Adapter Pattern** to support multiple delivery providers:

```
DeliveryAdapter (Interface)
├── UberDirectAdapter (Production)
├── DunzoAdapter (Dummy)
└── PorterAdapter (Dummy)
```

Each adapter implements the same interface, allowing new providers to be added without changing core logic.

#### Adapter Interface Methods

```typescript
interface DeliveryAdapter {
  getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote>;
  createTask(request: CreateTaskRequest): Promise<DeliveryTask>;
  cancelTask(request: CancelTaskRequest): Promise<void>;
  parseWebhook(payload: DeliveryWebhookPayload, signature?: string): Promise<WebhookVerificationResult>;
  getProviderName(): string;
}
```

### 2. **Provider Registry**

The `DeliveryAdapterRegistry` manages all registered delivery providers:

- **Uber Direct** - Live production integration with real API
- **Dunzo** - Dummy adapter returning static quotes
- **Porter** - Dummy adapter returning static quotes

```typescript
// All providers registered in DeliveryModule
registry.register(uberAdapter);      // UBER_DIRECT
registry.register(dunzoAdapter);     // DUNZO
registry.register(porterAdapter);    // PORTER
```

## User Flow

### Step 1: User Creates Order
```
POST /orders
Response: { order_id, status: "CREATED" }
```

### Step 2: User Selects Seller
```
POST /orders/{orderId}/select-seller
Body: { seller_id: string }
Response: { order_id, seller: {...}, itemCost: 500 }
Order Status: CREATED → SELLER_SELECTED
```

### Step 3: **NEW** - User Requests All Delivery Quotes
```
POST /orders/{orderId}/delivery-quotes
Body: { dropLocation: { lat: 28.123, lng: 77.456, address: "..." } }

Response:
{
  order_id: "order-123",
  options: [
    {
      provider: "UBER_DIRECT",
      displayName: "Uber Direct",
      estimatedFee: 89,
      estimatedDurationMinutes: 25,
      currency: "INR",
      rating: 4.8,
      features: ["Real-time tracking", "Insurance coverage"],
      logo: "https://..."
    },
    {
      provider: "DUNZO",
      displayName: "Dunzo",
      estimatedFee: 50,
      estimatedDurationMinutes: 35,
      currency: "INR",
      rating: 4.7,
      features: ["Fast delivery", "Affordable pricing"],
      logo: "https://..."
    },
    {
      provider: "PORTER",
      displayName: "Porter",
      estimatedFee: 60,
      estimatedDurationMinutes: 32,
      currency: "INR",
      rating: 4.6,
      features: ["Premium service", "Insured delivery"],
      logo: "https://..."
    }
  ],
  message: "3 delivery options available. Select preferred provider to proceed."
}
```

### Step 4: **NEW** - User Selects Preferred Delivery Provider
```
POST /orders/{orderId}/select-delivery-provider
Body: { provider: "DUNZO", quoteId?: "dunzo-xxx" }

Response:
{
  order_id: "order-123",
  provider: "DUNZO",
  deliveryFee: 50,
  estimatedDurationMinutes: 35,
  message: "Dunzo selected. Ready to confirm order."
}
```

Order updates with selected delivery provider and fee.

### Step 5: User Confirms Order & Payment
```
POST /orders/{orderId}/confirm
Body: { paymentMethod: "UPI" }
Order Status: SELLER_SELECTED → PAID
```

### Step 6: Order Delivery Lifecycle
```
Order Status Flow:
CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → 
PREPARING → READY_FOR_PICKUP → [DELIVERY PROVIDER] → 
PICKED_UP → DELIVERED
```

When order reaches `READY_FOR_PICKUP`, the system automatically assigns the selected delivery provider.

## Backend Implementation

### DeliveryService Methods

#### 1. Get All Provider Quotes
```typescript
async getAllQuotes(
  pickup: Location,
  drop: Location,
  orderId: string
): Promise<DeliveryQuote[]>
```

- Fetches quotes from ALL registered adapters in **parallel**
- Returns array sorted by price (cheapest first)
- Filters out failed providers gracefully
- Each quote includes: fee, duration, provider name, expiration

#### 2. Get Quote from Specific Provider
```typescript
async getQuoteFromProvider(
  providerName: string,
  pickup: Location,
  drop: Location,
  orderId: string
): Promise<DeliveryQuote>
```

- Gets quote from specific provider only
- Used when user selects a provider

#### 3. Validate Provider
```typescript
validateDeliveryProvider(providerName: string): void
```

- Checks if provider is registered
- Throws error with list of available providers if invalid

### OrdersService Methods

#### 1. Get All Delivery Quotes
```typescript
async getAllDeliveryQuotes(
  orderId: string,
  userId: string,
  locationDto: DeliveryQuoteDto
): Promise<DeliveryQuotesResponse>
```

**Process:**
1. Validates order ownership & state (must be SELLER_SELECTED)
2. Gets seller location from order
3. Calls `DeliveryService.getAllQuotes()`
4. Updates order with delivery location
5. Returns formatted options with provider details (logo, rating, features)

#### 2. Select Delivery Provider
```typescript
async selectDeliveryProvider(
  orderId: string,
  userId: string,
  providerDto: SelectDeliveryProviderDto
): Promise<SelectDeliveryProviderResponse>
```

**Process:**
1. Validates order ownership & delivery location is set
2. Validates provider is registered
3. Gets fresh quote from selected provider
4. Updates order with delivery fee
5. Returns confirmation with selected provider details

## New API Endpoints

### GET /v1/orders/:id/delivery-quotes
Fetch all available delivery options for an order

**Request:**
```json
{
  "dropLocation": {
    "lat": 28.123,
    "lng": 77.456,
    "address": "123 Main St, Delhi"
  }
}
```

**Response:** Array of delivery options (see Step 3 above)

**Status:** 200 OK | 400 Bad Request | 404 Not Found

### POST /v1/orders/:id/select-delivery-provider
User selects preferred delivery provider

**Request:**
```json
{
  "provider": "DUNZO",
  "quoteId": "optional-provider-quote-id"
}
```

**Response:** Confirmation with selected provider (see Step 4 above)

**Status:** 200 OK | 400 Bad Request | 404 Not Found

## Pricing Model

### Dummy Adapters (Dunzo, Porter)

**Distance-based pricing** (static formula):

| Provider | Base Fee | Per-KM Fee | Min. ETA | Max ETA |
|----------|----------|-----------|----------|---------|
| Uber Direct | Live API | Live API | - | - |
| Dunzo | ₹50 | ₹10/km | 15 min | 15 + 2*distance |
| Porter | ₹60 | ₹12/km | 12 min | 12 + 1.8*distance |

**Distance Calculation:** Haversine formula for lat/lng coordinates

### Example Quotes for 5 km delivery:
- **Uber Direct**: ₹89 (25 min) - assuming live API returns this
- **Dunzo**: ₹100 (25 min)  → ₹50 + (5 * ₹10)
- **Porter**: ₹120 (21 min) → ₹60 + (5 * ₹12)

## Provider Features

Each provider displays different features to users:

### Uber Direct
- Real-time tracking
- Insurance coverage
- Professional delivery
- GPS enabled

### Dunzo
- Fast delivery
- Local coverage
- Same-day service
- Affordable pricing

### Porter
- Premium service
- Insured delivery
- Real-time updates
- Wide coverage area

## Configuration

### Adding a New Delivery Provider

1. **Create Adapter Implementation**
```typescript
// src/delivery/adapters/newprovider/newprovider.adapter.ts
@Injectable()
export class NewProviderAdapter implements DeliveryAdapter {
  async getQuote(request): Promise<DeliveryQuote> { ... }
  async createTask(request): Promise<DeliveryTask> { ... }
  async cancelTask(request): Promise<void> { ... }
  async parseWebhook(payload, signature): Promise<WebhookVerificationResult> { ... }
  getProviderName(): string { return 'NEW_PROVIDER'; }
}
```

2. **Register in DeliveryModule**
```typescript
// src/delivery/delivery.module.ts
providers: [
  NewProviderAdapter,
  {
    provide: 'DELIVERY_ADAPTER_REGISTRATION',
    useFactory: (registry, newAdapter) => {
      registry.register(newAdapter);
      return true;
    },
    inject: [DeliveryAdapterRegistry, NewProviderAdapter],
  }
]
```

3. **Add Provider Metadata**
```typescript
// src/orders/orders.service.ts
private getProviderDisplayName(provider: string): string {
  const nameMap = {
    'NEW_PROVIDER': 'New Provider Name',
    // ...
  };
  return nameMap[provider] || provider;
}

private getProviderLogoUrl(provider: string): string {
  const logoMap = {
    'NEW_PROVIDER': 'https://newprovider.com/logo.png',
    // ...
  };
  return logoMap[provider] || '';
}
```

## Frontend Integration

### React Native Example (React Query)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';

function DeliveryOptionsScreen({ orderId, dropLocation }) {
  // Fetch all delivery quotes
  const { data: quotesResponse, isLoading } = useQuery({
    queryKey: ['deliveryQuotes', orderId],
    queryFn: () => ordersApi.getAllDeliveryQuotes(orderId, dropLocation),
  });

  // Select delivery provider
  const selectProviderMutation = useMutation({
    mutationFn: (provider: string) =>
      ordersApi.selectDeliveryProvider(orderId, provider),
    onSuccess: () => {
      // Navigate to payment
      router.push(`/order/${orderId}/confirm`);
    },
  });

  if (isLoading) return <Loader />;

  return (
    <ScrollView>
      <Text>Select Delivery Partner</Text>
      {quotesResponse?.options.map((option) => (
        <DeliveryOptionCard
          key={option.provider}
          option={option}
          onSelect={() => selectProviderMutation.mutate(option.provider)}
          isSelected={quotesResponse?.selected_provider === option.provider}
        />
      ))}
    </ScrollView>
  );
}

function DeliveryOptionCard({ option, onSelect, isSelected }) {
  return (
    <TouchableOpacity 
      onPress={onSelect}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
    >
      <Image source={{ uri: option.logo }} style={styles.logo} />
      <Text style={styles.name}>{option.displayName}</Text>
      <StarRating rating={option.rating} />
      <Text style={styles.price}>₹{option.estimatedFee}</Text>
      <Text style={styles.time}>{option.estimatedDurationMinutes} min</Text>
      {option.features?.map((feature) => (
        <Text key={feature} style={styles.feature}>✓ {feature}</Text>
      ))}
    </TouchableOpacity>
  );
}
```

## Error Handling

### Provider Quote Failures

If a provider's quote fails, the system:
1. **Logs the error** with provider name
2. **Filters out the failed provider** from results
3. **Returns other available options** to user
4. **Succeeds** if at least one provider returns a quote
5. **Fails only** if ALL providers fail to return quotes

Example:
```
User requests quotes. Dunzo API is down.
✓ Uber Direct: ₹89 (success)
✗ Dunzo: [timeout error]
✓ Porter: ₹60 (success)

Response: 2 options (Dunzo filtered out)
```

### Provider Selection Validation

- Validates provider is registered
- Gets fresh quote before confirming selection
- Returns clear error if provider no longer available
- Maintains consistency with stored order location

## Future Enhancements

1. **Provider Availability Zones**
   - Only show providers that service user's delivery area
   - API returns `isAvailable` flag per option

2. **Dynamic Pricing Tiers**
   - Different pricing for express vs. standard delivery
   - Volume discounts for bulk orders

3. **Real-time Tracking**
   - Webhook-driven delivery status updates
   - Live ETA updates as driver progresses

4. **Payment Integration**
   - Different payment methods per provider
   - Provider-specific payment flows

5. **Rating & Reviews**
   - Per-provider delivery quality metrics
   - User feedback after delivery

6. **Geofencing**
   - Restrict providers based on delivery location
   - Show only available providers for user's area

## Database Schema

### Order Model (Updated)

```prisma
model Order {
  // ... existing fields ...
  
  // Delivery location
  dropLatitude    Decimal?    @db.Decimal(10, 8)
  dropLongitude   Decimal?    @db.Decimal(11, 8)
  dropAddress     String?
  
  // Delivery provider (future enhancement)
  // deliveryProvider String?  // e.g., "UBER_DIRECT", "DUNZO"
  
  deliveryFee     Decimal?    @db.Decimal(10, 2)
  totalAmount     Decimal?    @db.Decimal(10, 2)
}
```

Currently, the selected provider is stored in the Order's `deliveryFee` update, but can be enhanced with an explicit `deliveryProvider` field for better tracking.

## Testing

### API Testing with cURL

```bash
# 1. Create order
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categoryId": "cat-1", "orderPayload": {...}}'

# 2. Select seller
curl -X POST http://localhost:3000/orders/order-123/select-seller \
  -H "Authorization: Bearer TOKEN" \
  -d '{"sellerId": "seller-1"}'

# 3. Get all delivery quotes
curl -X POST http://localhost:3000/orders/order-123/delivery-quotes \
  -H "Authorization: Bearer TOKEN" \
  -d '{"dropLocation": {"lat": 28.123, "lng": 77.456}}'

# 4. Select delivery provider
curl -X POST http://localhost:3000/orders/order-123/select-delivery-provider \
  -H "Authorization: Bearer TOKEN" \
  -d '{"provider": "DUNZO"}'

# 5. Confirm order
curl -X POST http://localhost:3000/orders/order-123/confirm \
  -H "Authorization: Bearer TOKEN" \
  -d '{"paymentMethod": "UPI"}'
```

## Summary

This configurable delivery system provides:

✅ **Flexibility** - Easily add new delivery partners  
✅ **User Choice** - Users see all options with pricing  
✅ **Real Quotes** - Live pricing from Uber, dummy quotes for others  
✅ **Fallback Support** - Works even if one provider is unavailable  
✅ **Maintainability** - Clean adapter pattern, no provider-specific logic in core  
✅ **Scalability** - Parallel quote fetching, optimized for performance  

The system is production-ready with Uber Direct live integration and Dunzo/Porter dummy providers for testing and future real integrations.
