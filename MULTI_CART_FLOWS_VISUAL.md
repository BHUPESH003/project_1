# Multi-Cart Implementation - Visual Flow Diagrams

## CURRENT BROKEN FLOW ❌

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            HOME SCREEN                                      │
│                                                                              │
│        FloatingCartButton (multiCartStore) ✓                                │
│        Badge: 2 carts                                                       │
│                         ↓                                                   │
│                    [TAP CART]                                               │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-CART VIEW                                       │
│                    app/cart.tsx ✓                                           │
│                                                                              │
│  Uses: useMultiCartStore ✓                                                  │
│  Shows: All seller carts                                                    │
│  ┌──────────────────────────────────────┐                                   │
│  │ Seller 1 - XYZ Copy Shop             │                                   │
│  │ 2 items • ₹500                       │                                   │
│  │ [View Items] [Checkout]              │  ← Checkout where?               │
│  └──────────────────────────────────────┘                                   │
│                                                                              │
│  ┌──────────────────────────────────────┐                                   │
│  │ Seller 2 - ABC Paper Shop            │                                   │
│  │ 3 items • ₹400                       │                                   │
│  │ [View Items] [Checkout]              │  ← Checkout where?               │
│  └──────────────────────────────────────┘                                   │
│                                                                              │
│  [Checkout (2 carts)] ← Multi-cart checkout (INCOMPLETE) ✗                  │
└────────────────────────────────────────────────────────────────────────────┘
    ↓                                              ↓
    │                                             │
    │ (Click individual Checkout)                 │ (Click Multi Checkout)
    │                                             │
    ↓                                             ↓
[Unknown destination ✗]          [CombinedCheckoutFlow - no error handling ✗]


OR FROM HOME: TAP ON SHOP LINK → BROKEN DATA FLOW

┌────────────────────────────────────────────────────────────────────────────┐
│                       SHOP DETAIL PAGE                                      │
│                   app/shop-detail.tsx                                       │
│                                                                              │
│        Uses: useCartStore ✗ (WRONG STORE!)                                  │
│                                                                              │
│        Product: "Print Document"  ₹100                                      │
│        [Add to Cart]                                                        │
│            ↓                                                                │
│            Uses: useCartStore.addItem() ✗                                   │
│            Stores in: useCartStore.items = [{...}]                          │
│            NOT in: useMultiCartStore.carts[sellerId]                        │
│                                                                              │
│        StickyCartBar at bottom                                              │
│        ┌─────────────────────────────────────────┐                          │
│        │ Reads: useMultiCartStore.carts[sellerId]│                          │
│        │ Result: EMPTY ✗                         │                          │
│        │ Shows: "Your cart is empty"             │                          │
│        │ (But item was just added!)              │                          │
│        └─────────────────────────────────────────┘                          │
│            ↓                                                                │
│            User thinks item wasn't added                                     │
│            Adds item again or leaves frustrated                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                    CART MODAL (CartModal.tsx)                               │
│                   (Opens from StickyCartBar)                                │
│                                                                              │
│   Reads from: useMultiCartStore.carts[sellerId]                             │
│   Result: EMPTY! ✗                                                          │
│                                                                              │
│   ┌──────────────────────────────────┐                                      │
│   │ Cart is empty                    │                                      │
│   │ [Continue Shopping]              │                                      │
│   └──────────────────────────────────┘                                      │
│                                                                              │
│   Data path broken: useCartStore data → nothing in useMultiCartStore        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## CORRECT FLOW ✓

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            HOME SCREEN                                      │
│                                                                              │
│   FloatingCartButton (useMultiCartStore) ✓                                  │
│   Badge: "2 sellers" (or "5 items")                                        │
│                         ↓                                                   │
│                    [TAP CART]                                               │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-CART VIEW                                       │
│                    app/cart.tsx ✓                                           │
│                                                                              │
│  Uses: useMultiCartStore ✓                                                  │
│  Shows: All seller carts                                                    │
│  ┌──────────────────────────────────────┐                                   │
│  │ Seller 1 - XYZ Copy Shop             │                                   │
│  │ 2 items • ₹500                       │                                   │
│  │ [View Items] [Checkout]              │                                   │
│  │ ☐ Select for combined checkout       │                                   │
│  └──────────────────────────────────────┘                                   │
│         ↓ [Checkout]                                                        │
│    SingleCheckoutFlow                                                       │
│    ├─ Delivery address                                                      │
│    ├─ Delivery partner                                                      │
│    └─ Place order ✓                                                         │
│                                                                              │
│  ┌──────────────────────────────────────┐                                   │
│  │ Seller 2 - ABC Paper Shop            │                                   │
│  │ 3 items • ₹400                       │                                   │
│  │ [View Items] [Checkout]              │                                   │
│  │ ☑ Select for combined checkout       │                                   │
│  └──────────────────────────────────────┘                                   │
│         ↓ (CHECKED)                                                         │
│                                                                              │
│  [Checkout (2 carts)] ← Multi-cart checkout ✓                               │
│         ↓                                                                   │
│    CombinedCheckoutFlow                                                     │
│    ├─ Shared delivery address                                               │
│    ├─ Per-seller delivery partner selection                                 │
│    ├─ Order summary with error handling ✓                                   │
│    └─ Place all orders (batch) ✓                                            │
└────────────────────────────────────────────────────────────────────────────┘


FROM SHOP DETAIL: CORRECT DATA FLOW

┌────────────────────────────────────────────────────────────────────────────┐
│                       SHOP DETAIL PAGE                                      │
│                   app/shop-detail.tsx (FIXED)                               │
│                                                                              │
│        Uses: useMultiCartStore ✓ (CORRECT!)                                 │
│                                                                              │
│        Product: "Print Document"  ₹100                                      │
│        [Add to Cart]                                                        │
│            ↓                                                                │
│          useMultiCartStore.addItem(                                         │
│            sellerId,                                                        │
│            sellerName,                                                      │
│            item                                                             │
│          )                                                                  │
│            ↓                                                                │
│          Updates: useMultiCartStore.carts[sellerId].items                   │
│          Result: Item visible everywhere ✓                                  │
│                                                                              │
│        StickyCartBar at bottom                                              │
│        ┌─────────────────────────────────────────┐                          │
│        │ Reads: useMultiCartStore.carts[sellerId]│                          │
│        │ Result: Shows item ✓                    │                          │
│        │ "1 item • ₹100"                         │                          │
│        │ [View Cart] [Checkout]                  │                          │
│        └─────────────────────────────────────────┘                          │
│            ↓                                                                │
│            [View Cart] Opens CartModal                                      │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    CART MODAL (CartModal.tsx)                               │
│                                                                              │
│   Reads from: useMultiCartStore.carts[sellerId]                             │
│   Result: Shows item ✓                                                      │
│                                                                              │
│   ┌──────────────────────────────────────────────┐                          │
│   │ XYZ Copy Shop                                │                          │
│   │                                              │                          │
│   │ □ Print Document (₹100)     x1 [+ -]        │                          │
│   │   Subtotal: ₹100                            │                          │
│   │                                              │                          │
│   │ [Proceed to Checkout] ✓                      │                          │
│   └──────────────────────────────────────────────┘                          │
│            ↓                                                                │
│   Navigate to: SingleCheckoutFlow with sellerId                             │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│              SINGLE CART CHECKOUT (SingleCheckoutFlow)                      │
│                                                                              │
│   Step 1: Select Delivery Address                                          │
│   Step 2: Select Delivery Partner (Uber Direct, Porter, Dunzo)             │
│   Step 3: Confirm & Place Order                                            │
│            ↓                                                                │
│   TRY:   multiCartApi.createBatchOrders([order]) ✓                          │
│   CATCH: Handle errors with retry                                          │
│            ↓ SUCCESS                                                        │
│   Clear cart: useMultiCartStore.clearCart(sellerId) ✓                       │
│   Navigate: Home screen (FloatingCartButton updated) ✓                      │
│            ↓ FAILURE                                                        │
│   Show error dialog with retry option ✓                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## MULTI-CART CHECKOUT FLOW (Phase 3) ✓

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-CART VIEW (cart.tsx)                               │
│                                                                              │
│  Shows multiple seller carts with checkboxes:                               │
│                                                                              │
│  ┌─ XYZ Copy Shop ─────────────────────┐                                    │
│  │ ☑ Selected  2 items • ₹500          │  ← Checkbox                        │
│  │ [View] [Checkout]                   │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
│  ┌─ ABC Paper Shop ────────────────────┐                                    │
│  │ ☑ Selected  3 items • ₹400          │  ← Checkbox                        │
│  │ [View] [Checkout]                   │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
│  [Checkout (2 carts selected)] ← Visible when 2+ selected                   │
│            ↓                                                                │
│       MODE → 'checkout'                                                     │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│         COMBINED CHECKOUT FLOW (CombinedCheckoutFlow)                       │
│                                                                              │
│  Uses: useMultiCartStore ✓                                                  │
│  Gets: selectedForCheckout (Set of seller IDs)                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ STEP 1: DELIVERY ADDRESS (SHARED)                              │        │
│  │                                                                 │        │
│  │ [Select/Change Address]                                        │        │
│  │ Address: 123 Main St, New Delhi                                │        │
│  │ Coordinates: (28.6139, 77.2090)                                │        │
│  │                                                                 │        │
│  │ [Continue ➜]                                                   │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ STEP 2: DELIVERY PARTNER SELECTION (PER SELLER)                │        │
│  │                                                                 │        │
│  │ XYZ Copy Shop (2 items • ₹500)                                  │        │
│  │ ┌─────────────────────────────────────┐                        │        │
│  │ │ ◎ Uber Direct   ₹50   10-15 min   │ ← Selected              │        │
│  │ │ ○ Porter        ₹40   15-20 min   │                        │        │
│  │ │ ○ Dunzo         ₹30   20-30 min   │                        │        │
│  │ └─────────────────────────────────────┘                        │        │
│  │                                                                 │        │
│  │ ABC Paper Shop (3 items • ₹400)                                │        │
│  │ ┌─────────────────────────────────────┐                        │        │
│  │ │ ○ Uber Direct   ₹50   10-15 min   │                        │        │
│  │ │ ◎ Porter        ₹40   15-20 min   │ ← Selected              │        │
│  │ │ ○ Dunzo         ₹30   20-30 min   │                        │        │
│  │ └─────────────────────────────────────┘                        │        │
│  │                                                                 │        │
│  │ [Place Orders ➜]                                               │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ STEP 3: PLACE ORDERS (WITH ERROR HANDLING)                     │        │
│  │                                                                 │        │
│  │ Building orders...                                              │        │
│  │ ┌─────────────────────────────────────┐                        │        │
│  │ │ Order 1 (XYZ): ₹550 total          │  ✓ Created             │        │
│  │ │ Order 2 (ABC): ₹440 total          │  ✓ Created             │        │
│  │ └─────────────────────────────────────┘                        │        │
│  │                                                                 │        │
│  │ All orders successful!                                          │        │
│  │ [Return to Home]                                               │        │
│  │                                                                 │        │
│  │ OR: Partial failure scenario                                    │        │
│  │ ┌─────────────────────────────────────┐                        │        │
│  │ │ Order 1 (XYZ): ✓ Success            │                        │        │
│  │ │ Order 2 (ABC): ✗ Failed             │  Error: No runner      │        │
│  │ │                                      │                        │        │
│  │ │ [Retry Order 2] [Clear Successful]  │                        │        │
│  │ └─────────────────────────────────────┘                        │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│            ↓ ALL SUCCESS                                                    │
│                                                                              │
│  useMultiCartStore.clearCheckoutState(selectedSellerIds)                    │
│  → Removes carts for selected sellers                                       │
│  → Clears checkout state                                                    │
│  → Navigate to order confirmation or home                                   │
│                                                                              │
│            ↓ PARTIAL FAILURE                                                │
│                                                                              │
│  Show retry options:                                                        │
│  → Retry failed orders only                                                 │
│  → Clear successful carts, keep failed                                      │
│  → Go back to adjust delivery partners                                       │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## STORE STATE STRUCTURE

### useMultiCartStore (Correct Model)
```typescript
{
  carts: {
    'seller-1': {
      sellerId: 'seller-1',
      sellerName: 'XYZ Copy Shop',
      items: [
        { id: 'p1', name: 'Print 100 pages', quantity: 2, price: 50 },
        { id: 'p2', name: 'Binding', quantity: 1, price: 100 }
      ]
    },
    'seller-2': {
      sellerId: 'seller-2',
      sellerName: 'ABC Paper Shop',
      items: [
        { id: 'p3', name: 'Bond Paper A4', quantity: 5, price: 150 }
      ]
    }
  },
  
  activeCartSellerId: 'seller-1',  // Which seller's page user viewing
  
  selectedForCheckout: new Set(['seller-1', 'seller-2']),  // For batch checkout
  
  sharedDeliveryAddress: {
    lat: 28.6139,
    lng: 77.2090, 
    address: '123 Main St, Delhi'
  },
  
  checkoutSelections: {
    'seller-1': {
      deliveryPartner: 'UBER_DIRECT',
      deliveryFee: 50
    },
    'seller-2': {
      deliveryPartner: 'PORTER',
      deliveryFee: 40
    }
  }
}
```

### useCartStore (Old Model - SHOULD BE REMOVED)
```typescript
{
  items: [
    // ✗ All from ONE seller only
    { id: 'p1', sellerId: 'seller-1', shopName: 'XYZ', ... }
  ],
  selectedSellerId: 'seller-1',  // ✗ Only one seller allowed
  selectedShopName: 'XYZ Copy Shop',
  orderId: '12345'
  // ✗ Can't handle multi-seller
}
```

---

## KEY DIFFERENCES

| Feature | OLD (useCartStore) | NEW (useMultiCartStore) |
|---------|-------------------|------------------------|
| **Sellers** | 1 at a time | Multiple simultaneous |
| **Data Structure** | `items[]` all in one | `carts[sellerId]` per-seller |
| **Checkout** | Single order | Batch orders + single |
| **Delivery Address** | Per order | Shared + per-seller options |
| **Stock Checking** | Not implemented | Ready |
| **API** | Legacy methods | Batch APIs |
| **Persistence** | Manual | AsyncStorage via Zustand |

---

## MIGRATION PATH

**Current**: Mixed usage (BROKEN)
↓
**Step 1**: Fix shop-detail.tsx to use new store (this week)
↓
**Step 2**: Connect checkout flows
↓
**Step 3**: Remove old store dependencies
↓
**Step 4**: Archive old screens
↓
**Final**: Multi-cart system complete ✓
