# Quick Start: Delivery Partner Selection Feature

## User Journey (What Users See)

```
Order Flow: delivery.tsx → delivery-options.tsx → price-breakdown.tsx

1. DELIVERY.TSX - Address Selection
   ┌─────────────────────────────────────┐
   │ Delivery Address                    │
   ├─────────────────────────────────────┤
   │ Saved Addresses:                    │
   │ ○ Home                              │
   │   123 Main Street, Delhi            │
   │ ● Office                            │
   │   456 Business Park, Delhi          │
   │                                     │
   │ + Add New Address                   │
   │                                     │
   │ [Continue to Delivery Options]      │
   └─────────────────────────────────────┘

2. DELIVERY-OPTIONS.TSX - Provider Selection
   ┌─────────────────────────────────────┐
   │ Delivery Partners                   │
   │ Choose your preferred provider      │
   ├─────────────────────────────────────┤
   │ ● Dunzo                    ₹95      │
   │   ⭐ 4.6                   35 min   │
   │   • Fast delivery                   │
   │   • Local coverage                  │
   │                                     │
   │ ○ Uber Direct              ₹120     │
   │   ⭐ 4.8                   30 min   │
   │   • Real-time tracking              │
   │   • Professional drivers            │
   │                                     │
   │ ○ Porter                   ₹110     │
   │   ⭐ 4.7                   28 min   │
   │   • Premium service                 │
   │   • Insured                         │
   │                                     │
   │ [Continue]                          │
   └─────────────────────────────────────┘

3. PRICE-BREAKDOWN.TSX - Confirmation
   ┌─────────────────────────────────────┐
   │ Price Breakdown                     │
   ├─────────────────────────────────────┤
   │ Delivery Partner                    │
   │ [Dunzo Logo] Dunzo      [Change]    │
   │                                     │
   │ Printing cost        ₹250           │
   │ Delivery fee         ₹95 (Dunzo)    │
   │ ─────────────────────────────        │
   │ Total Amount        ₹345            │
   │                                     │
   │ Your order will be delivered by     │
   │ Dunzo. You will be charged ₹345.    │
   │                                     │
   │ [Proceed to Payment]                │
   └─────────────────────────────────────┘
```

## What Was Implemented

### Frontend (React Native)
✅ **delivery.tsx** - Address selection screen
  - Show saved addresses from user profile
  - Ask user to add new address if none exist
  - Fetch delivery quotes from backend
  - Cache quotes for next screen

✅ **delivery-options.tsx** - Provider selection screen  
  - Display 3 delivery providers (Uber Direct, Dunzo, Porter)
  - Show: Logo, name, rating, features, price, ETA
  - User selects preferred provider
  - Save selection to app state

✅ **price-breakdown.tsx** - Price confirmation screen
  - Show selected provider info with logo
  - Display: Printing cost + Delivery fee = Total
  - Option to change provider
  - Proceed to payment

✅ **order-draft.store.ts** - State management
  - Track: deliveryProvider, deliveryFee, deliveryAddressId
  - Store selected data for use across screens

✅ **useDeliveryQuotes.ts** - Custom hook
  - Manages React Query for quote fetching
  - Handles caching and refetch

✅ **colors.ts** - Updated color constants
  - Added: primaryLight, white, gray, orange

### Backend (Already Implemented)
✅ **POST /v1/orders/:id/delivery-quotes**
  - Input: dropLocation { lat, lng, address }
  - Output: 3 provider options with prices
  - Parallel fetching from all providers

✅ **POST /v1/orders/:id/select-delivery-provider**
  - Input: provider name
  - Output: confirmation with fee
  - Updates order with delivery fee

✅ **DeliveryService.getAllQuotes()**
  - Fetches quotes from Uber Direct, Dunzo, Porter in parallel
  - Handles failures gracefully
  - Returns sorted by price

✅ **OrdersService methods**
  - getAllDeliveryQuotes() - Main handler
  - selectDeliveryProvider() - Provider selection
  - Helper methods for provider metadata

✅ **Delivery Adapters**
  - Dunzo: ₹50 + ₹10/km
  - Porter: ₹60 + ₹12/km  
  - Uber Direct: Real API

## File Changes Summary

| File | Change |
|------|--------|
| delivery.tsx | Completely rewritten for address selection |
| delivery-options.tsx | NEW - Provider selection screen |
| price-breakdown.tsx | Enhanced with provider details |
| order-draft.store.ts | Added delivery state fields |
| useDeliveryQuotes.ts | NEW - Quote management hook |
| colors.ts | Added missing color constants |

## Key Features

### Address Management
- Show saved addresses from user profile
- Allow user to select from multiple addresses
- Prompt to add new address if none exist
- Validate address before fetching quotes

### Multi-Provider Quotes
- Fetch from 3 delivery partners in parallel
- Display full pricing and timing info
- Show provider ratings and features
- Sort by price (cheapest first)

### User Selection Flow
- Clean, intuitive radio button selection
- Visual feedback for selected provider
- Easy to change provider choice
- Price updates automatically

### Price Breakdown
- Shows delivery partner details
- Displays cost breakdown clearly
- Easy "Change" option to switch provider
- Informative message about delivery

### Performance
- Parallel quote fetching (3x faster)
- React Query caching (no duplicate requests)
- Optimized re-renders
- Lazy image loading

## Testing the Feature

### Test Path
1. Complete order until delivery screen
2. See your saved addresses displayed
3. If no addresses: Click "Add New Address" 
4. Select address → "Continue to Delivery Options"
5. See 3 providers with different prices
6. Select one → "Continue"
7. See price breakdown with provider info
8. Click "Change" to go back to step 5
9. Click "Proceed to Payment" to continue

### Test Variations
- [ ] User with multiple saved addresses
- [ ] User with no saved addresses
- [ ] Switch between different providers
- [ ] Verify price changes correctly
- [ ] Verify provider logo displays
- [ ] Test error scenarios

## Code Examples

### How to fetch quotes (from delivery.tsx)
```typescript
const response = await ordersApi.getAllDeliveryQuotes(
  orderId,
  { lat: 28.123, lng: 77.567, address: "123 Main St" }
);
// Response: { order_id, options: [...], message }
```

### How to select provider (from delivery-options.tsx)
```typescript
const response = await ordersApi.selectDeliveryProvider(
  orderId,
  "DUNZO"
);
// Response: { order_id, provider, deliveryFee, ... }
```

### How to use from store (from price-breakdown.tsx)
```typescript
const deliveryProvider = useOrderDraftStore((s) => s.deliveryProvider);
const deliveryFee = useOrderDraftStore((s) => s.deliveryFee);
// Use in display: "₹{deliveryFee} (Dunzo)"
```

## API Endpoints

### Fetch All Delivery Quotes
```
POST /v1/orders/:id/delivery-quotes
Authorization: Bearer TOKEN

Request:
{
  "dropLocation": {
    "lat": 28.1234567,
    "lng": 77.5678901,
    "address": "123 Main Street, Delhi"
  }
}

Response:
{
  "order_id": "order-123",
  "options": [
    {
      "provider": "DUNZO",
      "displayName": "Dunzo",
      "estimatedFee": 95,
      "estimatedDurationMinutes": 35,
      "rating": 4.6,
      "features": ["Fast delivery", "Local coverage", "Affordable"],
      "logo": "https://..."
    },
    ...
  ],
  "message": "3 delivery options available..."
}
```

### Select Delivery Provider
```
POST /v1/orders/:id/select-delivery-provider
Authorization: Bearer TOKEN

Request:
{
  "provider": "DUNZO"
}

Response:
{
  "order_id": "order-123",
  "provider": "DUNZO",
  "deliveryFee": 95,
  "estimatedDurationMinutes": 35,
  "message": "Dunzo selected successfully"
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No addresses showing | Backend address API needed, or user has no saved addresses |
| Quotes not loading | Check backend is running, network request may be failing |
| Wrong provider info | Check PROVIDER_INFO mapping in price-breakdown.tsx |
| State not persisting | Verify order-draft store is properly initialized |
| Images not loading | Check logo URLs are accessible |

## Next Steps

1. **Deploy frontend changes** - All files ready
2. **Verify backend integration** - Endpoints already exist
3. **Test complete flow** - Create test order and go through all screens
4. **Add real provider APIs** - Replace dummy Dunzo/Porter with real APIs
5. **Monitor performance** - Check parallel quote fetch times
6. **Gather user feedback** - Is provider selection clear?

## Support

For issues or questions:
1. Check FRONTEND_DELIVERY_IMPLEMENTATION.md for detailed docs
2. Check DELIVERY_SYSTEM_VERIFICATION.md for architecture
3. Check orders.api.ts for API contract
4. Check backend implementation in orders.service.ts
