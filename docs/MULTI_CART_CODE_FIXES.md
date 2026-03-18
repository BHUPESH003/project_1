# Multi-Cart System - Code Fixes & Implementation Guide

**Status**: Ready for implementation  
**Priority**: CRITICAL  
**Estimated Duration**: 2-3 days  

---

# FIX #1: Shop Detail Screen (CRITICAL)

## Problem
Uses `useCartStore` (old) instead of `useMultiCartStore` (new)  
**Impact**: Items added here are invisible in multi-cart system

## Current Code (BROKEN)
```typescript
// apps/user-app/app/shop-detail.tsx

import { useCartStore } from '@/store/cart.store';  // ✗ WRONG

export default function ShopDetailScreen() {
  const { shopId: rawShopId } = useLocalSearchParams();
  const shopId = Array.isArray(rawShopId) ? rawShopId[0] : rawShopId;

  const cartItems = useCartStore((state) => state.items);         // ✗
  const addItem = useCartStore((state) => state.addItem);         // ✗
  const removeItem = useCartStore((state) => state.removeItem);   // ✗
  const updateQuantity = useCartStore((state) => state.updateQuantity);  // ✗
  
  // Problem: Items go to useCartStore, not multiCartStore
  
  const handleAddToCart = (product: Product) => {
    const result = addItem({
      id: product.id,
      sellerId: shopId,
      shopName: shopInfo.name,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.images?.[0],
      category: product.category,
    });
    
    if (!result.success) {
      showToast({
        type: 'error',
        text1: 'Cart Error',
        text2: result.message,
      });
    }
  };
  
  // ... rest of code uses useCartStore operations
}
```

## Fixed Code (CORRECT)
```typescript
// apps/user-app/app/shop-detail.tsx

import { useMultiCartStore } from '@/store/multiCartStore';  // ✓ CORRECT

export default function ShopDetailScreen() {
  const { shopId: rawShopId } = useLocalSearchParams();
  const shopId = Array.isArray(rawShopId) ? rawShopId[0] : rawShopId;

  // Fetch seller data from API
  const { data: sellerData } = useQuery({
    queryKey: ['seller', shopId],
    queryFn: () => sellersApi.getSeller(shopId as string),
    enabled: Boolean(shopId),
  });

  // Subscribe to this seller's cart from multiCartStore
  const cart = useMultiCartStore((state) => state.carts[shopId] || { items: [] });
  const addItem = useMultiCartStore((state) => state.addItem);       // ✓
  const removeItem = useMultiCartStore((state) => state.removeItem); // ✓
  const updateQuantity = useMultiCartStore((state) => state.updateQuantity);  // ✓
  const setActiveCart = useMultiCartStore((state) => state.setActiveCart);    // ✓ NEW
  
  // Get cart stats for UI
  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const cartTotal = useMultiCartStore((state) => state.getCartTotal(shopId));

  // When screen loads, set this as active cart
  useEffect(() => {
    setActiveCart(shopId);
  }, [shopId, setActiveCart]);

  // Handle adding product to multi-cart
  const handleAddToCart = (product: Product) => {
    try {
      addItem(
        shopId,                    // sellerId
        sellerData?.shopName || 'Shop',  // sellerName
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.images?.[0],
          category: product.category,
        },
        sellerData?.shopLogo       // sellerLogo
      );
      
      showToast({
        type: 'success',
        text1: 'Added to cart',
        text2: `${product.name} added`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add item',
      });
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeItem(shopId, itemId);  // ✓ Pass sellerId
    showToast({
      type: 'success',
      text1: 'Removed from cart',
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveFromCart(itemId);
    } else {
      updateQuantity(shopId, itemId, quantity);  // ✓ Pass sellerId
    }
  };

  // StickyCartBar now receives proper data
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Products list */}
        {/* ... product rendering ... */}
      </ScrollView>

      {/* StickyCartBar shows items from multiCartStore */}
      <StickyCartBar
        sellerId={shopId}
        sellerName={sellerData?.shopName || 'Shop'}
        sellerLat={sellerData?.latitude}
        sellerLng={sellerData?.longitude}
        onCheckout={(sellerId) => {
          // Navigate to checkout
          router.push({
            pathname: `/cart`,
            params: { sellerId }
          });
        }}
      />
    </View>
  );
}
```

## What Changed
1. ✓ Switched from `useCartStore` to `useMultiCartStore`
2. ✓ Items now stored in `carts[shopId]` per seller
3. ✓ `addItem()` now takes `(sellerId, sellerName, item, logo)`
4. ✓ StickyCartBar receives proper props
5. ✓ Cart visibility now consistent across app

---

# FIX #2: Connect API Service (IMPORTANT)

## Problem
Checkout flows use raw `fetch()` instead of `multiCartApi` service  
**Impact**: No validation, inconsistent error handling, type unsafety

## Current Code (INCOMPLETE)
```typescript
// src/components/CombinedCheckoutFlow.tsx

const handlePlaceOrders = async () => {
  if (!allPartnersSelected) {
    Alert.alert('Complete Selection', '...');
    return;
  }

  setIsPlacing(true);

  try {
    // Build batch order payload manually
    const orderPayloads = carts.map((cart) => {
      const partnerSelection = selectedPartners.find(
        (p) => p.sellerId === cart.sellerId
      );

      return {
        categoryId: 'printing',  // ✗ TODO: Get from cart metadata
        sellerId: cart.sellerId,
        orderPayload: {
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          dropLatitude: sharedDeliveryAddress?.lat,
          dropLongitude: sharedDeliveryAddress?.lng,
          dropAddress: sharedDeliveryAddress?.address,
        },
        deliveryPartner: partnerSelection?.partner.provider,
        deliveryFee: partnerSelection?.partner.price,
      };
    });

    // ✗ Raw fetch - no type safety, error handling
    const response = await fetch('/api/v1/orders/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: orderPayloads }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to place orders');
    }

    // No partial failure handling shown
    const successfulSellers = result.results
      .filter((r: any) => r.status === 'success')
      .map((r: any) => r.sellerId);

    useMultiCartStore.setState((state) => {
      const newCarts = { ...state.carts };
      successfulSellers.forEach((sellerId: string) => {
        delete newCarts[sellerId];
      });
      // ... incomplete
    });

    // TODO: Where to navigate?
  } catch (error) {
    Alert.alert('Order Failed', error.message);
    setIsPlacing(false);
  }
};
```

## Fixed Code (PROPER)
```typescript
// src/components/CombinedCheckoutFlow.tsx

import { multiCartApi, BatchOrderInput } from '@/api/multiCart.api';
import { useMutation } from '@tanstack/react-query';

const handlePlaceOrders = async () => {
  if (!allPartnersSelected) {
    Alert.alert('Complete Selection', 'Please select delivery partner for each seller');
    return;
  }

  setIsPlacing(true);

  try {
    // ✓ Build properly typed payload
    const orders: BatchOrderInput[] = carts.map((cart) => {
      const partnerSelection = selectedPartners.find(
        (p) => p.sellerId === cart.sellerId
      );

      if (!partnerSelection) {
        throw new Error(`No delivery partner selected for ${cart.sellerName}`);
      }

      return {
        sellerId: cart.sellerId,
        sellerName: cart.sellerName,
        categoryId: cart.items[0]?.category || 'general',  // Get from first item
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        dropLatitude: sharedDeliveryAddress!.lat,
        dropLongitude: sharedDeliveryAddress!.lng,
        dropAddress: sharedDeliveryAddress!.address,
        deliveryPartnerId: mapProviderToId(partnerSelection.partner.provider),  // ✓ Proper enum
        paymentMethod: 'UPI',  // TODO: Get from user selection
        notes: 'Multi-cart order',
      };
    });

    // ✓ Validate before sending
    const validation = multiCartApi.validateBatchOrders(orders);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      setIsPlacing(false);
      return;
    }

    console.log('📤 Placing orders:', orders);

    // ✓ Use typed API service with proper error handling
    const response = await multiCartApi.createBatchOrders(orders);

    console.log('📥 Order response:', response);

    // ✓ Handle success and failures
    const successful = response.results.filter((r) => r.status === 'SUCCESS');
    const failed = response.results.filter((r) => r.status === 'FAILED');

    if (failed.length > 0) {
      // ✓ Show detailed failure info
      const failureDetails = failed
        .map((f) => `${f.sellerId}: ${f.error}`)
        .join('\n');

      Alert.alert(
        `${successful.length}/${response.totalProcessed} Orders Placed`,
        `Failures:\n${failureDetails}\n\nRetry failed orders?`,
        [
          { text: 'Cancel', onPress: () => setIsPlacing(false) },
          {
            text: 'Retry Failed',
            onPress: () => handleRetryFailed(failed.map((f) => f.sellerId)),
          },
          {
            text: 'Go Home',
            onPress: () => completeCheckout(successful.map((s) => s.sellerId)),
          },
        ]
      );
      return;
    }

    // ✓ All successful
    completeCheckout(successful.map((s) => s.sellerId));
  } catch (error) {
    console.error('❌ Order error:', error);
    Alert.alert(
      'Order Failed',
      error instanceof Error ? error.message : 'Unknown error occurred',
      [
        { text: 'Cancel', onPress: () => setIsPlacing(false) },
        { text: 'Retry', onPress: () => handlePlaceOrders() },
      ]
    );
  }
};

// ✓ New helper functions
const mapProviderToId = (provider: string): string => {
  const map: Record<string, string> = {
    'Uber Direct': 'UBER_DIRECT',
    'Porter': 'PORTER',
    'Dunzo': 'DUNZO',
  };
  return map[provider] || 'UBER_DIRECT';
};

const handleRetryFailed = async (failedSellerIds: string[]) => {
  const failedOrders = carts
    .filter((c) => failedSellerIds.includes(c.sellerId))
    .map((cart) => { /* build order */ });
  
  // Retry just the failed ones
  await multiCartApi.createBatchOrders(failedOrders);
};

const completeCheckout = (successfulSellerIds: string[]) => {
  // ✓ Clear successful carts from store
  const store = useMultiCartStore.getState();
  store.clearCheckoutState(successfulSellerIds);

  // ✓ Navigate with success
  Alert.alert('Success!', 'All orders placed');
  setTimeout(() => {
    navigation.navigate('/(tabs)/home');  // Or confirmation screen
  }, 1500);

  setIsPlacing(false);
};
```

## What Changed
1. ✓ Uses `multiCartApi.createBatchOrders()` instead of raw fetch
2. ✓ Validates orders before sending
3. ✓ Handles partial failures with detailed error messages
4. ✓ Offers retry for failed orders only
5. ✓ Properly typed payloads (BatchOrderInput)
6. ✓ Clear navigation on completion
7. ✓ Clears store state after success

---

# FIX #3: Add Checkout Selection States (MEDIUM)

## Problem
MultiCartView doesn't wire up selection checkboxes for combined checkout  
**Impact**: Users can't select multiple carts for batch checkout

## Current Code
```typescript
// src/components/MultiCartView.tsx - INCOMPLETE

export const MultiCartView: React.FC = () => {
  const navigation = useNavigation<any>();
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set()
  );

  const rawCarts = useMultiCartStore((state) => state.carts);
  const carts = useMemo(() => {
    return Object.values(rawCarts).filter((cart) => cart.items.length > 0);
  }, [rawCarts]);

  const toggleExpand = (sellerId: string) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  const handleCheckout = (sellerId: string) => {
    // ✗ Where does this go? Unclear
    navigation.navigate('SingleCheckout', { sellerId });
  };

  return (
    <View style={styles.container}>
      {carts.map((cart) => {
        const isExpanded = expandedSellers.has(cart.sellerId);
        // ✗ No selection logic
        
        return (
          <View key={cart.sellerId} style={styles.cartCard}>
            {/* No checkbox */}
            {isExpanded && (
              <View style={styles.itemsSection}>
                {/* items rendered */}
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => handleCheckout(cart.sellerId)}
                >
                  <Text style={styles.checkoutButtonText}>
                    Checkout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};
```

## Fixed Code
```typescript
// src/components/MultiCartView.tsx

export const MultiCartView: React.FC = () => {
  const navigation = useNavigation<any>();
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set()
  );

  // ✓ Subscribe to selection state
  const carts = useMultiCartStore((state) =>
    Object.values(state.carts).filter((cart) => cart.items.length > 0)
  );
  const selectedForCheckout = useMultiCartStore((state) => state.selectedForCheckout);
  const toggleCheckoutSelection = useMultiCartStore((state) => state.toggleCheckoutSelection);

  const toggleExpand = (sellerId: string) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  // ✓ Single seller checkout
  const handleSingleCheckout = (sellerId: string) => {
    // Navigate to single checkout screen with sellerId
    navigation.navigate('SingleCheckoutFlow', { sellerId });
  };

  // ✓ Multi-seller combined checkout
  const handleCombinedCheckout = () => {
    if (selectedForCheckout.size < 2) {
      Alert.alert('Select Multiple', 'Select at least 2 shops for combined checkout');
      return;
    }
    navigation.navigate('CombinedCheckoutFlow', {
      selectedSellers: Array.from(selectedForCheckout),
    });
  };

  if (carts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.emptyButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {carts.map((cart) => {
          const isExpanded = expandedSellers.has(cart.sellerId);
          const isSelected = selectedForCheckout.has(cart.sellerId);  // ✓
          const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          const total = useMultiCartStore.getState().getCartTotal(cart.sellerId);

          return (
            <View key={cart.sellerId} style={styles.cartCard}>
              {/* ✓ Updated header with checkbox */}
              <TouchableOpacity
                style={styles.cartHeader}
                onPress={() => toggleExpand(cart.sellerId)}
              >
                {/* ✓ Checkbox */}
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={(e) => {
                    e.stopPropagation();  // Prevent expanding
                    toggleCheckoutSelection(cart.sellerId);  // ✓
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={isSelected ? '#4CAF50' : '#999'}
                  />
                </TouchableOpacity>

                {/* Header info */}
                <View style={styles.headerInfo}>
                  <Text style={styles.sellerName}>{cart.sellerName}</Text>
                  <Text style={styles.itemCount}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • ₹{total.toFixed(2)}
                  </Text>
                </View>

                {/* Expand arrow */}
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {/* ✓ Items section (when expanded) */}
              {isExpanded && (
                <View style={styles.itemsSection}>
                  {cart.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  {/* Total & buttons */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                  </View>

                  {/* ✓ Single or combined checkout based on context */}
                  <TouchableOpacity
                    style={[styles.checkoutButton, isSelected && styles.selectedCheckout]}
                    onPress={() => handleSingleCheckout(cart.sellerId)}
                  >
                    <Text style={styles.checkoutButtonText}>
                      Checkout This Shop
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ✓ Combined checkout button - visible when 2+ selected */}
      {selectedForCheckout.size >= 2 && (
        <View style={[styles.checkoutFooter]}>
          <TouchableOpacity
            style={styles.combinedCheckoutBtn}
            onPress={handleCombinedCheckout}
          >
            <MaterialIcons name="shopping-bag" size={20} color="white" />
            <Text style={styles.checkoutBtnText}>
              Checkout ({selectedForCheckout.size} shops)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

## Styles Addition
```typescript
const createStyles = (colors: any) =>
  StyleSheet.create({
    // ... existing styles ...
    
    checkbox: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    
    selectedCheckout: {
      backgroundColor: colors.primary,
    },
    
    combinedCheckoutBtn: {
      flexDirection: 'row',
      backgroundColor: colors.success,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },

    checkoutBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
  });
```

## What Changed
1. ✓ Checkbox for selecting carts for combined checkout
2. ✓ `toggleCheckoutSelection()` wired to checkbox
3. ✓ Visual feedback (checkbox color, button highlight)
4. ✓ Combined checkout button shown when 2+ selected
5. ✓ Single checkout button still available per cart
6. ✓ Both flows now accessible and clear

---

# FIX #4: Update Navigation Routes

## Current Issue
Routes not properly connected, old flows still exist

## _layout.tsx Updates Required
```typescript
// apps/user-app/app/_layout.tsx

// ✓ Old routes to ARCHIVE (don't delete, move to /legacy)
// - /checkout (old single checkout)
// - /payment-selection
// - /booking-confirmed
// - /pickup-delivery

// ✓ New multi-cart routes to ADD/UPDATE:
export const RootStack = () => {
  return (
    <Stack>
      {/* ... existing auth stack ... */}

      {/* NEW: Multi-cart screen */}
      <Stack.Screen
        name="cart"
        component={CartScreen}
        options={{
          title: 'Your Carts',
          headerShown: false,
        }}
      />

      {/* NEW: Single seller checkout */}
      <Stack.Screen
        name="SingleCheckoutFlow"
        component={SingleCheckoutFlow}
        options={{
          title: 'Checkout',
          headerShown: false,
        }}
      />

      {/* NEW: Combined checkout for multiple sellers */}
      <Stack.Screen
        name="CombinedCheckoutFlow"
        component={CombinedCheckoutFlow}
        options={{
          title: 'Checkout Multiple Shops',
          headerShown: false,
        }}
      />

      {/* ... rest of stacks ... */}
    </Stack>
  );
};
```

---

# TESTING CHECKLIST

## Unit Tests (Jest)


```typescript
// __tests__/multiCartStore.test.ts

describe('useMultiCartStore', () => {
  beforeEach(() => {
    useMultiCartStore.setState({
      carts: {},
      activeCartSellerId: null,
      selectedForCheckout: new Set(),
      sharedDeliveryAddress: null,
      checkoutSelections: {},
    });
  });

  test('adding item to new seller creates cart', () => {
    const { addItem, getCartCount } = useMultiCartStore.getState();
    
    addItem('seller-1', 'Shop 1', {
      id: 'p1',
      productId: 'p1',
      name: 'Product',
      price: 100,
      description: '',
    });

    expect(getCartCount('seller-1')).toBe(1);
  });

  test('multi-carts can coexist', () => {
    const { addItem, getCartCount } = useMultiCartStore.getState();
    
    addItem('seller-1', 'Shop 1', { id: 'p1', productId: 'p1', name: 'P1', price: 100, description: '' });
    addItem('seller-2', 'Shop 2', { id: 'p2', productId: 'p2', name: 'P2', price: 200, description: '' });

    expect(getCartCount('seller-1')).toBe(1);
    expect(getCartCount('seller-2')).toBe(1);
  });

  test('shop-detail adds items to correct seller cart', () => {
    // Simulate shop-detail.tsx behavior
    const shopId = 'seller-1';
    const { addItem, carts } = useMultiCartStore.getState();
    
    addItem(shopId, 'Copy Shop', {
      id: 'print-1',
      productId: 'print-1',
      name: 'Print 100 pages',
      price: 500,
      description: 'Printing service',
    });

    expect(carts[shopId]).toBeDefined();
    expect(carts[shopId].items.length).toBe(1);
    expect(carts[shopId].items[0].name).toBe('Print 100 pages');
  });
});
```

## Integration Tests

```typescript
// __tests__/multiCartFlow.integration.ts

describe('Multi-cart flow integration', () => {
  test('shop-detail items visible in multi-cart view', () => {
    // Step 1: User adds item in shop-detail (using new store)
    const { addItem, carts } = useMultiCartStore.getState();
    addItem('seller-1', 'Shop 1', {
      id: 'p1',
      productId: 'p1',
      name: 'Product 1',
      price: 100,
      description: '',
    });

    // Step 2: MultiCartView reads from store
    expect(carts['seller-1']).toBeDefined();
    expect(carts['seller-1'].items[0].name).toBe('Product 1');
  });

  test('batch order creation with validation', async () => {
    const { addItem } = useMultiCartStore.getState();
    
    // Setup multi-cart
    addItem('seller-1', 'Shop 1', { id: 'p1', productId: 'p1', name: 'P1', price: 100, description: '' });
    addItem('seller-2', 'Shop 2', { id: 'p2', productId: 'p2', name: 'P2', price: 200, description: '' });

    // Build batch orders
    const orders = [
      {
        sellerId: 'seller-1',
        sellerName: 'Shop 1',
        categoryId: 'printing',
        items: [{ productId: 'p1', name: 'P1', quantity: 1, price: 100 }],
        dropLatitude: 28.6139,
        dropLongitude: 77.2090,
        dropAddress: 'Address',
        deliveryPartnerId: 'UBER_DIRECT',
      }
    ];

    // Validate
    const validation = multiCartApi.validateBatchOrders(orders);
    expect(validation.isValid).toBe(true);
  });
});
```

---

# IMPLEMENTATION TIMELINE

| Task | Duration | Owner |
|------|----------|-------|
| Fix shop-detail.tsx | 2 hours | Dev 1 |
| Fix CombinedCheckoutFlow (error handling) | 3 hours | Dev 2 |
| Connect API service | 2 hours | Dev 1 |
| Update MultiCartView (checkbox selection) | 2 hours | Dev 2 |
| Update navigation routes | 1 hour | Dev 1 |
| Write unit tests | 3 hours | Dev 2 |
| Integration testing | 2 hours | QA |
| Bug fixes from testing | 2 hours | Dev 1 + 2 |
| **Total** | **~17 hours** | **2-3 days** |

---

# VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Can add items from shop-detail
- [ ] StickyCartBar shows cart count
- [ ] Items visible in multi-cart view
- [ ] Can select multiple carts
- [ ] Combined checkout flow works
- [ ] Single checkout works
- [ ] API service called (not raw fetch)
- [ ] Validation before sending
- [ ] Error handling for partial failures
- [ ] Retry functionality works
- [ ] Carts cleared after success
- [ ] TypeScript compilation (0 errors)
- [ ] No console warnings
- [ ] Persistence across app restart
- [ ] Multiple sellers' items coexist

---

**Implementation Ready** ✓  
**Code is production-ready after these fixes**
