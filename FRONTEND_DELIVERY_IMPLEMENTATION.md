# Frontend Delivery Partner Selection Implementation

## Summary

Updated the frontend to implement a complete delivery partner selection flow with address management and multiple provider options.

## User Flow

1. **User selects Delivery** → Goes to `/order/delivery`
2. **Address Selection Screen** (`/order/delivery`)
   - Shows saved addresses from user profile
   - If no addresses exist → Can add new one (prompts to add address)
   - User selects address or adds new one
   - Fetches delivery quotes from all providers (backend)
   - Quotes cached in React Query
3. **Delivery Options Screen** (`/order/delivery-options`)
   - Shows all 3 delivery providers with quotes
   - Displays: Provider logo, name, rating, features, price, ETA
   - User selects preferred provider
   - Selection saved to order draft store
4. **Price Breakdown Screen** (`/order/price-breakdown`)
   - Shows selected delivery provider details
   - Displays: Printing cost + Delivery fee = Total
   - Can change provider (go back) or proceed to payment

## Files Updated

### Frontend Changes

#### 1. `apps/user-app/src/store/order-draft.store.ts`
**Changes:** Added delivery state tracking
```typescript
- Added fields: deliveryProvider, deliveryFee, deliveryAddressId
- Added setters: setDeliveryProvider(), setDeliveryFee(), setDeliveryAddressId()
- Updated reset() to clear delivery data
```

#### 2. `apps/user-app/app/order/delivery.tsx`
**Changes:** Completely rewritten for address selection
```typescript
- Shows list of saved user addresses with radio buttons
- Click to select address from saved list
- Button to add new address
- Fetches all delivery quotes from backend using new API endpoint
- Caches quotes in React Query for next screen
- Validates address selection before proceeding
```

#### 3. `apps/user-app/app/order/delivery-options.tsx` (NEW)
**Purpose:** Display all delivery providers with their quotes
```typescript
- Shows 3 providers: Uber Direct, Dunzo, Porter
- Each provider card displays:
  * Logo image
  * Display name
  * Star rating
  * 2 key features
  * Estimated fee (₹)
  * Estimated delivery time (minutes)
- User selects provider via radio button
- Selection saves to order draft store
- Navigates to price-breakdown on confirm
- Uses cached quotes from React Query
```

#### 4. `apps/user-app/app/order/price-breakdown.tsx`
**Changes:** Enhanced to show delivery provider details
```typescript
- Displays selected delivery partner card with logo and name
- "Change" button to go back and select different provider
- Shows breakdown: Printing cost + Delivery fee = Total
- Info card explaining delivery with selected provider name
- Uses deliveryProvider and deliveryFee from order draft store
```

#### 5. `apps/user-app/src/constants/colors.ts`
**Changes:** Added missing color constants
```typescript
- Added: primaryLight (for selected state backgrounds)
- Added: background (alias for backgroundDark)
- Added: border (alias for borderDark)
- Added: white, gray, orange (for UI components)
```

#### 6. `apps/user-app/src/hooks/useDeliveryQuotes.ts` (NEW)
**Purpose:** Custom hook for delivery quote management
```typescript
- useDeliveryQuotes(orderId, location)
- Returns React Query result with quotes from all providers
- Handles caching and refetch logic
```

### Backend Status

✅ **Already Implemented:** Backend endpoints and logic exist
- `POST /v1/orders/:id/delivery-quotes` - Get all provider quotes
- `POST /v1/orders/:id/select-delivery-provider` - Select provider
- `DeliveryService.getAllQuotes()` - Parallel quote fetching
- `OrdersService.getAllDeliveryQuotes()` - Handler with validation
- `OrdersService.selectDeliveryProvider()` - Provider selection with fresh quote
- All 3 adapters registered: Uber Direct, Dunzo, Porter

## Component Architecture

```
Order Flow:
delivery.tsx (Address Selection)
    ↓ (Fetch quotes & cache)
delivery-options.tsx (Provider Selection)
    ↓ (Save provider to store)
price-breakdown.tsx (Confirmation)
    ↓ (Continue to payment)
review.tsx
```

## Data Flow

```
Address Selection:
1. User selects saved address
2. Mutation called: getAllDeliveryQuotes(orderId, dropLocation)
3. Backend returns: { order_id, options: [...], message }
4. Response cached in React Query: queryClient.setQueryData(['deliveryQuotes', orderId], response)

Provider Selection:
1. User selects provider from cached options
2. Mutation called: selectDeliveryProvider(orderId, provider)
3. Backend returns: { order_id, provider, deliveryFee, estimatedDurationMinutes, message }
4. Data saved to store: setDeliveryProvider(), setDeliveryFee()
5. Navigate to price-breakdown

Price Breakdown:
1. Display provider info from store
2. Calculate total: printing cost + delivery fee
3. Allow "Change" to go back to delivery-options
```

## State Management

### Order Draft Store
```typescript
{
  orderId: string | null,
  deliveryProvider: string | null,  // 'UBER_DIRECT' | 'DUNZO' | 'PORTER'
  deliveryFee: number | null,       // In rupees
  deliveryAddressId: string | null, // Address ID selected
}
```

### React Query Cache
```typescript
['addresses'] → UserAddressItem[]
['deliveryQuotes', orderId] → DeliveryQuotesResponse
```

## API Contracts

### Endpoint: POST /v1/orders/:id/delivery-quotes
**Request:**
```json
{
  "dropLocation": {
    "lat": 28.1234567,
    "lng": 77.5678901,
    "address": "123 Main Street, Delhi"
  }
}
```

**Response:**
```json
{
  "order_id": "order-123",
  "options": [
    {
      "provider": "DUNZO",
      "displayName": "Dunzo",
      "estimatedFee": 95,
      "estimatedDurationMinutes": 35,
      "currency": "INR",
      "features": ["Fast delivery", "Local coverage", "Affordable"],
      "logo": "https://...",
      "rating": 4.6
    },
    ...
  ],
  "message": "3 delivery options available..."
}
```

### Endpoint: POST /v1/orders/:id/select-delivery-provider
**Request:**
```json
{
  "provider": "DUNZO",
  "quoteId": "optional-quote-id"
}
```

**Response:**
```json
{
  "order_id": "order-123",
  "provider": "DUNZO",
  "deliveryFee": 95,
  "estimatedDurationMinutes": 35,
  "message": "Dunzo selected..."
}
```

## Styling

All components use consistent dark theme:
- **Colors:** Primary blue (#0d59f2), dark surfaces (#1C2433), text white
- **Components:** Radio buttons, cards, input fields, buttons
- **Responsive:** ScrollView for content, Footer button with primary button
- **Feedback:** Loading states, error messages, selection states

## Error Handling

1. **No addresses saved:**
   - Shows "Add New Address" button prominently
   - Validates address selection before proceeding

2. **Quote fetch fails:**
   - Displays error message to user
   - Button disabled until valid address selected

3. **Provider selection fails:**
   - Shows error message
   - Allows user to select different provider

## Testing Notes

To test the flow:
1. Navigate to `/order/delivery`
2. If no addresses: Click "Add New Address"
3. Select or add address → Click "Continue to Delivery Options"
4. See all 3 providers with different prices
5. Select one → Navigate to price-breakdown
6. See provider logo and fee breakdown
7. Click "Change" to go back to delivery-options
8. Click "Proceed to Payment" to continue

## Future Enhancements

1. Real-time quote updates if address changes
2. Sort providers by price/rating by default
3. Provider filtering (hide unavailable)
4. User preferences (remember last selected provider)
5. Integration with location service for address suggestions
