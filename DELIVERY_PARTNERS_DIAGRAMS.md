# Delivery Partners System - Architecture & Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER APP (React Native)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Create Order                                                    │
│  2. Select Seller                                                   │
│  3. VIEW DELIVERY OPTIONS ← NEW                                     │
│     - Calls: POST /orders/:id/delivery-quotes                       │
│     - Shows: 3 providers with pricing & features                    │
│  4. SELECT DELIVERY PROVIDER ← NEW                                  │
│     - Calls: POST /orders/:id/select-delivery-provider              │
│     - Locks: Fee to order                                           │
│  5. Confirm & Pay                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (NestJS)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ OrdersController                                               │
│  │  ├─ POST /orders (create)                                       │
│  │  ├─ POST /orders/:id/select-seller                              │
│  │  ├─ POST /orders/:id/delivery-quotes ← NEW                      │
│  │  ├─ POST /orders/:id/select-delivery-provider ← NEW             │
│  │  └─ POST /orders/:id/confirm                                    │
│  │                                                                  │
│  ├─ OrdersService                                                  │
│  │  ├─ create()                                                    │
│  │  ├─ selectSeller()                                              │
│  │  ├─ getAllDeliveryQuotes() ← NEW                                │
│  │  │  └─ Calls DeliveryService.getAllQuotes()                    │
│  │  │  └─ Formats response with logos, ratings, features          │
│  │  ├─ selectDeliveryProvider() ← NEW                             │
│  │  │  └─ Calls DeliveryService.getQuoteFromProvider()            │
│  │  │  └─ Updates order with selected fee                         │
│  │  └─ confirmOrder()                                              │
│  │                                                                  │
│  └─ DeliveryService                                                │
│     ├─ getQuote() (legacy, single provider)                        │
│     ├─ getAllQuotes() ← NEW                                        │
│     │  ├─ Parallel execution: all adapters at once                │
│     │  ├─ Input: pickup, drop, orderId                             │
│     │  └─ Output: sorted array of quotes                           │
│     ├─ getQuoteFromProvider() ← NEW                               │
│     │  ├─ Get quote from specific adapter                          │
│     │  └─ Validates provider is registered                         │
│     ├─ validateDeliveryProvider() ← NEW                           │
│     ├─ assignDelivery()                                            │
│     └─ handleWebhook()                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Calls Adapters
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│              DeliveryAdapterRegistry (Factory Pattern)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  getAdapter(provider) → DeliveryAdapter                            │
│  register(adapter)    → void                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
    │           │           │
    │           │           │
    ↓           ↓           ↓
┌─────────┐ ┌──────────┐ ┌────────┐
│  UBER   │ │  DUNZO   │ │ PORTER │
│ DIRECT  │ │ (DUMMY)  │ │ (DUMMY)│
│ (LIVE)  │ │          │ │        │
└─────────┘ └──────────┘ └────────┘
    │           │           │
    ↓           ↓           ↓
Real API      Static      Static
             Formula      Formula
```

---

## Parallel Quote Fetching Flow

```
┌─────────────────────────────────────┐
│  getAllQuotes() called               │
│  Input: pickup, drop, orderId        │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Get all registered providers       │
│  [UBER_DIRECT, DUNZO, PORTER]       │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Create Promise.all() with 3 calls   │
└─────────────────────────────────────┘
           │
    ┌──────┼──────┐
    │      │      │
    ↓      ↓      ↓
  ┌───┐  ┌───┐  ┌───┐
  │ 1 │  │ 2 │  │ 3 │   (Running in parallel)
  │   │  │   │  │   │
  │ UB│  │ DN│  │ PT│
  │ ER│  │ ZO│  │ ER│
  │   │  │   │  │   │
  │ 15│  │ 200│  │ 300│  (milliseconds)
  │ms │  │ ms │  │ ms │
  └───┘  └───┘  └───┘
    │      │      │
    └──────┼──────┘
           ↓
    ┌────────────────┐
    │ All done in    │
    │ 300ms          │ (Max of 3, not sum)
    │ (vs 600ms if   │
    │  sequential)   │
    └────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Filter failed providers             │
│  [UBER: ₹89, DUNZO: ₹50, PORTER: ₹60]
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Sort by price (ascending)           │
│  [DUNZO: ₹50, PORTER: ₹60, UBER: ₹89]
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Return array to caller              │
└─────────────────────────────────────┘
```

---

## Order State Transitions with Delivery Selection

```
┌─────────┐
│ CREATED │
└────┬────┘
     │ selectSeller()
     ↓
┌──────────────────┐
│ SELLER_SELECTED  │
└────┬─────────────┘
     │ requestDeliveryQuotes()  ← NEW STEP
     │ (Shows 3 options)
     │ selectDeliveryProvider() ← NEW STEP
     │ (Locks delivery fee to order)
     │ confirmOrder() + payment
     ↓
   ┌────┐
   │PAID│
   └────┬─────────────────────┐
        │ seller accepts      │
        ↓                     │ seller rejects
   ┌─────────────────┐     ┌────────────────┐
   │ SELLER_ACCEPTED │     │ SELLER_REJECTED│
   └────┬────────────┘     └────────────────┘
        │
        ↓
   ┌──────────┐
   │PREPARING │
   └────┬─────┘
        │
        ↓
┌──────────────────────┐
│ READY_FOR_PICKUP     │
│ (AUTO-ASSIGN         │
│  DELIVERY)           │
└────┬─────────────────┘
     │ Webhook: pickup_complete
     ↓
┌──────────────┐
│ PICKED_UP    │
└────┬─────────┘
     │ Webhook: delivery_complete
     ↓
┌──────────────┐
│ DELIVERED ✓  │
└──────────────┘
```

---

## API Endpoint Interaction Flow

```
┌────────────────────────────────────────────────────────────────┐
│                       USER APP                                  │
│                                                                 │
│  User taps "View Delivery Options"                             │
│  Location: 28.1234, 77.5678                                    │
└────────────────────────────────────────────────────────────────┘
                           │
                           │ POST /orders/:id/delivery-quotes
                           ↓
┌────────────────────────────────────────────────────────────────┐
│               OrdersController.getAllDeliveryQuotes()           │
│                                                                 │
│  1. Validate order belongs to user                             │
│  2. Validate order in SELLER_SELECTED state                    │
│  3. Get seller location from DB                                │
│  4. Call OrdersService.getAllDeliveryQuotes()                  │
└────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌────────────────────────────────────────────────────────────────┐
│            OrdersService.getAllDeliveryQuotes()                │
│                                                                 │
│  1. Validate delivery location set                             │
│  2. Get seller location                                        │
│  3. Call DeliveryService.getAllQuotes()                        │
│  4. Transform quotes to rich response:                         │
│     - Add logos, ratings, features                             │
│     - Format for mobile display                                │
│  5. Update order with delivery location                        │
└────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌────────────────────────────────────────────────────────────────┐
│         DeliveryService.getAllQuotes()                         │
│                                                                 │
│  1. Get all registered providers                               │
│  2. Create array of quote requests                             │
│  3. Promise.all() - fetch in parallel:                         │
│     - UberDirectAdapter.getQuote()   ← 15ms                   │
│     - DunzoAdapter.getQuote()        ← 200ms                  │
│     - PorterAdapter.getQuote()       ← 300ms                  │
│  4. Filter out failed providers                                │
│  5. Sort by price (ascending)                                  │
│  6. Return array                                               │
└────────────────────────────────────────────────────────────────┘
                           │
                           │ Returns 3 quotes
                           ↓
┌────────────────────────────────────────────────────────────────┐
│               Response to User App                              │
│                                                                 │
│  {                                                              │
│    "order_id": "clx123...",                                    │
│    "options": [                                                │
│      {                                                          │
│        "provider": "DUNZO",                                    │
│        "displayName": "Dunzo",                                 │
│        "estimatedFee": 50,                                     │
│        "estimatedDurationMinutes": 35,                         │
│        "logo": "https://...",                                  │
│        "rating": 4.7,                                          │
│        "features": ["Fast", "Affordable"]                      │
│      },                                                         │
│      ...more options                                            │
│    ]                                                            │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            │ User selects DUNZO          │
            │                             │
            ↓                             │
┌────────────────────────────────────────┐ │
│  POST /orders/:id/                     │ │
│  select-delivery-provider              │ │
│  Body: { provider: "DUNZO" }           │ │
└────────────────────────────────────────┘ │
            │                             │
            ↓                             │
┌────────────────────────────────────────┐ │
│ OrdersController.selectDeliveryProvider│ │
│                                        │ │
│ 1. Validate order & user               │ │
│ 2. Validate provider exists            │ │
│ 3. Call OrdersService.selectProvider() │ │
└────────────────────────────────────────┘ │
            │                             │
            ↓                             │
┌────────────────────────────────────────┐ │
│  OrdersService.selectDeliveryProvider()│ │
│                                        │ │
│ 1. Validate location is set            │ │
│ 2. Validate provider is registered     │ │
│ 3. Get fresh quote from DUNZO          │ │
│ 4. Update order:                       │ │
│    - deliveryFee = 50                  │ │
│    - (optionally: deliveryProvider)   │ │
└────────────────────────────────────────┘ │
            │                             │
            ↓                             │
┌────────────────────────────────────────┐ │
│ Response: Provider Selected             │ │
│                                        │ │
│ {                                       │ │
│   "order_id": "clx123...",              │ │
│   "provider": "DUNZO",                  │ │
│   "deliveryFee": 50,                    │ │
│   "estimatedDurationMinutes": 35,       │ │
│   "message": "Ready to confirm order"   │ │
│ }                                       │ │
└────────────────────────────────────────┘ │
            │                             │
            └──────────────┬──────────────┘
                           │
                    User proceeds to
                    payment screen
                           │
                           ↓
                  Confirms & pays
```

---

## Adapter Implementation Pattern

```
┌──────────────────────────────────────────┐
│        DeliveryAdapter Interface          │
├──────────────────────────────────────────┤
│                                          │
│  getQuote(request):                      │
│    DeliveryQuote                         │
│                                          │
│  createTask(request):                    │
│    DeliveryTask                          │
│                                          │
│  cancelTask(request):                    │
│    void                                  │
│                                          │
│  parseWebhook(payload, signature):       │
│    WebhookVerificationResult             │
│                                          │
│  getProviderName():                      │
│    string                                │
│                                          │
└──────────────────────────────────────────┘
        │          │          │
        │          │          │
    ┌───┘          │          └────┐
    │              │               │
    ↓              ↓               ↓
┌────────┐  ┌──────────┐  ┌──────────────┐
│ UBER   │  │  DUNZO   │  │   PORTER     │
│ DIRECT │  │ (DUMMY)  │  │  (DUMMY)     │
└────────┘  └──────────┘  └──────────────┘
    │              │               │
    ↓              ↓               ↓
  Real API      Distance-based   Distance-based
  Integration   Formula          Formula
  (Live)        (₹50 + ₹10/km)    (₹60 + ₹12/km)
  
  Example:     Example:         Example:
  ₹89,         ₹100,            ₹120,
  25 min,      35 min,          32 min,
  Real ETA     Estimated        Estimated
```

---

## Error Handling Flow

```
User requests delivery quotes
         │
         ↓
getAllQuotes() - Parallel execution
    │      │      │
    ↓      ↓      ↓
  UBER   DUNZO  PORTER
    │      │      │
    │    TIMEOUT  ✓OK
    │      │      │
    ↓      ↓      ↓
  ✓OK   ✗ERROR   (fee, time)
  (fee,  (return
   time) null)
    │      │      │
    └──────┼──────┘
           ↓
Filter null results
      │
      ├─ UBER: ✓
      ├─ DUNZO: ✗ (filtered out)
      └─ PORTER: ✓
      │
      ↓
Check results
      │
      ├─ Have 2 providers? ✓ SUCCESS
      │  Return: [UBER, PORTER]
      │
      └─ Have 0 providers? ✗ ERROR
         Return: "Unable to fetch quotes"

User sees 2 options instead of 3
(Dunzo unavailable, but still proceed)
```

---

## Message Sequence Diagram

```
User        App         API        Delivery       Providers
 │          │           │          Service        │
 │Create    │           │          │              │
 ├─order────→●           │          │              │
 │          │ store     │          │              │
 │          ├──────────→●          │              │
 │          │           │          │              │
 │Select    │           │          │              │
 ├─seller───→●           │          │              │
 │          │ store     │          │              │
 │          ├──────────→●          │              │
 │          │           │          │              │
 │Request   │           │          │              │
 ├delivery  │           │ get all  │              │
 ├quotes───→●────fetch─→│ quotes   │              │
 │          │           ├─────────→●              │
 │          │           │          │              │ Parallel
 │          │           │          ├─quote───────→●  calls
 │          │           │          ├─quote───────→●
 │          │           │          ├─quote───────→●
 │          │           │          │   │          │
 │          │           │          │   ←quote────←●  Results
 │          │           │          │   ←quote────←●
 │          │           │          │   ←quote────←●
 │          │           │          │              │
 │          │           │◄─sorted──┤              │
 │          │◄──options─┤          │              │
 │          Display 3    │          │              │
 │          options      │          │              │
 │          │            │          │              │
 │Select    │            │          │              │
 ├delivery  │            │ validate │              │
 ├provider─→●───confirm─→│ provider │              │
 │          │            ├──quote──→● (fresh)    │
 │          │            │          │──────────→ ●
 │          │            │          │◄─fee─────←●
 │          │            │◄─locked──┤              │
 │          │◄─confirmed─┤          │              │
 │          Display      │          │              │
 │          selected     │          │              │
 │          │            │          │              │
 │Confirm & │            │          │              │
 ├pay─────→●──confirm───→│          │              │
 │          │ payment    │          │              │
 │          ├───────────→● (separate)             │
 │          │            │          │              │
 └──────────┴────────────┴──────────┴──────────────┘
```

---

These diagrams show:
1. **System architecture** - how components interact
2. **Parallel execution** - why it's fast
3. **State transitions** - order lifecycle with new steps
4. **API flow** - request/response sequence
5. **Adapter pattern** - how providers are plugged in
6. **Error handling** - graceful degradation
7. **Message sequence** - interaction timeline

All visualizations are in **ASCII art** for easy terminal viewing and documentation.
