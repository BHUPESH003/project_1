/**
 * Checkout screen – cart summary, delivery partner selection, payment method
 * 
 * ORDER LIFECYCLE:
 * 1. User adds products to cart (shop-detail.tsx) - local cart updates only
 * 2. User navigates to checkout - orderId from cart store is retrieved
 * 3. If orderId doesn't exist, first order is created with current cart items + location
 * 4. OrderId is stored in cart store to persist across navigations
 * 5. Delivery quotes are fetched for the order
 * 6. User selects delivery partner and payment method
 * 7. User clicks "Pay" - uses existing orderId, navigates to payment
 * 8. Payment confirmed - order proceeds through fulfillment
 * 
 * KEY: Only ONE order is created per cart session. Adding/removing products
 * updates the local cart, not the order (since no update API exists yet).
 * The order is finalized with current cart state at checkout.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useCartStore } from '@/store/cart.store';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi, DeliveryQuoteOption } from '@/api/orders.api';
import { useLocation } from '@/hooks/useLocation';

/**
 * Map category display names to category IDs
 */
function getCategoryIdFromName(categoryName?: string): string {
  if (!categoryName) return 'printing'; // Default to 'printing' if unknown
  
  const lowerName = categoryName.toLowerCase();
  
  const categoryMap: { [key: string]: string } = {
    'printing services': 'printing',
    'printing': 'printing',
    'popular stationery': 'stationery',
    'stationery': 'stationery',
    'hardware': 'hardware',
    'sports': 'sports',
    'electronics': 'electronics'
  };
  
  // Return matching ID from map, or just format the string to be ID-like
  return categoryMap[lowerName] || lowerName.replace(/\s+/g, '-');
}

export default function CheckoutScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coords: deviceLocation } = useLocation();
  
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryQuoteOption[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  
  const cartItems = useCartStore((state) => state.items);
  const selectedSellerId = useCartStore((state) => state.selectedSellerId);
  const selectedShopName = useCartStore((state) => state.selectedShopName);
  const selectedProvider = useCartStore((state) => state.selectedDeliveryProvider);
  const paymentMethod = useCartStore((state) => state.paymentMethod);
  
  // Track specifically which vehicle type the user chose under the provider
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('bike');
  const subtotal = useCartStore((state) => state.getSubtotal());
  const cartDropLocation = useCartStore((state) => state.dropLocation);
  const cartOrderId = useCartStore((state) => state.orderId); // Get orderId from cart store
  
  const setDeliveryProvider = useCartStore((state) => state.setDeliveryProvider);
  const setDeliveryFee = useCartStore((state) => state.setDeliveryFee);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const setCartOrderId = useCartStore((state) => state.setOrderId);
  
  const setOrderId = useOrderDraftStore((state) => state.setOrderId);
  const setDeliveryProviderOD = useOrderDraftStore((state) => state.setDeliveryProvider);
  const setDeliveryFeeOD = useOrderDraftStore((state) => state.setDeliveryFee);

  // Get drop location - prioritize cart drop location, fallback to device location
  const dropLocation = React.useMemo(() => {
    if (cartDropLocation) return cartDropLocation;
    if (deviceLocation) {
      return {
        lat: deviceLocation.latitude,
        lng: deviceLocation.longitude,
        address: 'Current Location'
      };
    }
    return null;
  }, [cartDropLocation, deviceLocation]);

  // Local state for tracking order ID during creation
  const [orderId, setLocalOrderId] = useState<string | null>(null);
  const [initialOrderLoading, setInitialOrderLoading] = useState(true);

  const selectedPartner = deliveryPartners.find(p => p.provider === selectedProvider);
  const deliveryFee = useCartStore((state) => state.deliveryFee) || 0; // Use stored fee to handle dynamic vehicle selections
  const total = paymentMethod === 'postpay' ? subtotal : subtotal + deliveryFee;

  const handleSelectProvider = (provider: DeliveryQuoteOption, vehicleType?: { type: string, fee: number }) => {
    setDeliveryProvider(provider.provider);
    
    // If provider has multi-vehicle options, set specific vehicle properties, else fallback to standard quote
    if (vehicleType) {
      setSelectedVehicleType(vehicleType.type);
      setDeliveryFee(vehicleType.fee);
    } else {
      setSelectedVehicleType('standard');
      setDeliveryFee(provider.estimatedFee || 0);
    }
  };

  // Load delivery partners on checkout page load
  useEffect(() => {
    const loadDeliveryPartners = async () => {
      try {        // Wait for location to be available
        if (!selectedSellerId || !dropLocation) {
          setPartnerError(!dropLocation ? 'Delivery location required to fetch quotes.' : 'No seller selected.');
          setInitialOrderLoading(false);
          return;
        }

        setIsLoadingPartners(true);
        setPartnerError(null);

        let createdOrderId = cartOrderId; // Use existing order from cart if available

        // Only create new order if one doesn't exist
        if (!createdOrderId) {
          // Determine category ID from first cart item's category
          const firstItemCategory = cartItems[0]?.category;
          const categoryId = getCategoryIdFromName(firstItemCategory);

          // Build order payload
          const orderPayload: any = {
            items: cartItems.map(item => ({
              productId: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            notes: `Order from ${selectedShopName || 'shop'}. Items: ${cartItems.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
            dropLatitude: dropLocation.lat,
            dropLongitude: dropLocation.lng,
            dropAddress: dropLocation.address || 'Delivery Location',
          };

          // For printing category, fileUrl is mandatory
          if (categoryId === 'printing') {
            // Use shop name as reference fileUrl for product-based printing
            orderPayload.fileUrl = `print-shop-order-${selectedShopName || 'unknown'}-${Date.now()}`;
            orderPayload.pages = 1; // Default: 1 page
            orderPayload.copies = 1; // Default: 1 copy
            orderPayload.color = false; // Default: B&W
          }

          const createPayload = {
            categoryId,
            sellerId: selectedSellerId || undefined,
            orderPayload,
          };

          const response = await ordersApi.createOrder(createPayload);
          createdOrderId = response.order_id;
          setLocalOrderId(createdOrderId);
          setCartOrderId(createdOrderId); // Store in cart store for persistence
        } else {
          setLocalOrderId(createdOrderId);
          try { await ordersApi.updateOrder(createdOrderId, { dropLatitude: dropLocation.lat, dropLongitude: dropLocation.lng, dropAddress: dropLocation.address || '' }); } catch(e) { setCartOrderId(null); return; }
        }

        // Fetch delivery quotes
                const quotesResponse = await ordersApi.getDeliveryQuotes(createdOrderId) as any;
        console.log('API RAW QUOTES RESP:', JSON.stringify(quotesResponse, null, 2));
        const partners = quotesResponse?.providers || quotesResponse?.data?.providers || (Array.isArray(quotesResponse) ? quotesResponse : []);
        setDeliveryPartners(partners);
        if (partners.length === 0) setPartnerError('API Returned empty providers or structure is ' + JSON.stringify(quotesResponse));
            } catch (err: any) {
        console.error('Failed to load delivery partners:', err);
        setPartnerError(err?.response?.data?.message || err?.message || 'Could not complete fetching quotes.');
      } finally {
        setIsLoadingPartners(false);
        setInitialOrderLoading(false);
      }
    };

    loadDeliveryPartners();
  }, [selectedSellerId, dropLocation, cartItems, selectedShopName]);

  // Create order mutation (or use existing orderId from useEffect)
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // If order was already created by useEffect or from cart store, skip creation
      if (orderId || cartOrderId) {
        return (orderId || cartOrderId) as string;
      }

      if (!selectedSellerId) throw new Error('No seller selected');
      if (cartItems.length === 0) throw new Error('Cart is empty');
      if (!dropLocation) throw new Error('Delivery location required. Please enable location permissions or set a delivery address.');
      
      // Determine category ID from first cart item's category
      const firstItemCategory = cartItems[0]?.category;
      const categoryId = getCategoryIdFromName(firstItemCategory);
      
      // Build order payload
      const orderPayload: any = {
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        notes: `Order from ${selectedShopName || 'shop'}. Items: ${cartItems.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
        dropLatitude: dropLocation.lat,
        dropLongitude: dropLocation.lng,
        dropAddress: dropLocation.address || 'Delivery Location',
        vehicleType: selectedVehicleType,
      };

      // For printing category, fileUrl is mandatory
      if (categoryId === 'printing') {
        // Use shop name as reference fileUrl for product-based printing
        orderPayload.fileUrl = `print-shop-order-${selectedShopName || 'unknown'}-${Date.now()}`;
        orderPayload.pages = 1; // Default: 1 page
        orderPayload.copies = 1; // Default: 1 copy
        orderPayload.color = false; // Default: B&W
      }
      
      // Step 1: Create draft order with drop location
      const createPayload = {
        categoryId,
        sellerId: selectedSellerId || undefined,
        orderPayload,
      };
            const response = await ordersApi.createOrder(createPayload);
      const createdOrderId = response.order_id;
      setCartOrderId(createdOrderId); // Save to cart store for persistence
      
      // Step 2: Fetch delivery quotes for this order (fallback if useEffect didn't load them)
      try {
                const quotesResponse = await ordersApi.getDeliveryQuotes(createdOrderId) as any;
        console.log('API RAW QUOTES RESP:', JSON.stringify(quotesResponse, null, 2));
        const partners = quotesResponse?.providers || quotesResponse?.data?.providers || (Array.isArray(quotesResponse) ? quotesResponse : []);
        setDeliveryPartners(partners);
        if (partners.length === 0) setPartnerError('API Returned empty providers or structure is ' + JSON.stringify(quotesResponse));
      } catch (err: any) {
        console.warn('Failed to fetch delivery quotes:', err);
        setPartnerError('Could not load delivery partners. Please try again.');
      }
      
      return createdOrderId;
    },
    onSuccess: async (resolvedOrderId) => {
      // Store order ID for payment flow
      setOrderId(resolvedOrderId as string);
      setDeliveryProviderOD(selectedProvider || null);
      setDeliveryFeeOD(deliveryFee);
      // Temporarily store the vehicle type if we need it for UI on order progress page
      // Optionally could add this to order draft store: setVehicleTypeOD(selectedVehicleType);
      
      // Navigate to payment method
      router.push('/order/payment-method');
    },
    onError: (error: any) => {
      Alert.alert('Order Creation Failed', error?.message || 'Could not create order. Please try again.');
    },
  });


  const handlePaymentConfirm = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before proceeding');
      return;
    }
    if (!selectedSellerId) {
      Alert.alert('Seller Not Selected', 'Please go back to shop and ensure you selected the correct shop. Your cart may have been cleared.');
      return;
    }

    // Validate that all items are from the same shop
    const allItemsFromSameSeller = cartItems.every(item => item.sellerId === selectedSellerId);
    if (!allItemsFromSameSeller) {
      Alert.alert('Invalid Cart', 'All items must be from the same shop. Please clear your cart and try again.');
      return;
    }

    if (!dropLocation) {
      Alert.alert('Location Required', 'Please enable location permissions or set a delivery address to get delivery quotes.');
      return;
    }
    if (!selectedProvider) {
      Alert.alert('Delivery Partner Required', 'Please select a delivery partner before proceeding');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment option (Prepay or Pay After Delivery)');
      return;
    }
    
    // Create order and proceed to payment
    createOrderMutation.mutate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <View style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Shop & Items Summary */}
          <View style={styles.section}>
            <View style={styles.shopHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopLabel}>FROM</Text>
                <Text style={styles.shopName}>{selectedShopName || 'Shop Not Selected'}</Text>
                {!selectedSellerId && (
                  <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>
                    ⚠️ Go back to shop to ensure seller is selected
                  </Text>
                )}
              </View>
              <MaterialIcons name="store" size={32} color={selectedSellerId ? colors.primary : colors.error} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ITEMS ({cartItems.length})</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image
                  source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                  style={styles.itemImage}
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.description?.substring(0, 40)}</Text>
                  <Text style={styles.itemPrice}>
                    ₹{(item.totalPrice ? item.totalPrice : item.price).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quantityAdjuster}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeItem(item.id);
                      }
                    }}
                  >
                    <MaterialIcons name="remove" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <MaterialIcons name="add" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Delivery Partner Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY PARTNER</Text>
            
            {isLoadingPartners ? (
              <View style={styles.loadingContainer}>
                <MaterialIcons name="hourglass-empty" size={32} color={colors.textMuted} />
                <Text style={styles.loadingText}>Loading delivery partners...</Text>
              </View>
            ) : partnerError ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={32} color={colors.error} />
                <Text style={styles.errorText}>{partnerError}</Text>
              </View>
            ) : deliveryPartners.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="local-shipping" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No delivery partners available</Text>
              </View>
            ) : (
              deliveryPartners.map((partner) => {
                  const vehicles = partner.vehicleOptions || partner.vehicles?.map(v => ({
                    vehicleType: v.type.toLowerCase(),
                    estimatedFee: v.price || 0,
                    estimatedDurationMinutes: parseInt(String(v.estimated_time || '30').replace(/\D/g, ''), 10) || 30
                  }));

                  const displayName = partner.displayName || (partner.provider.charAt(0).toUpperCase() + partner.provider.slice(1));
                  const isSelectedPartner = selectedProvider === partner.provider;

                  // If it doesn't have multiple options, show just the single card fee
                  const defaultFee = vehicles && vehicles.length > 0
                                        ? vehicles[0].estimatedFee
                                        : (partner.estimatedFee || 0);

                  const defaultTime = vehicles && vehicles.length > 0
                                        ? vehicles[0].estimatedDurationMinutes 
                                        : (partner.estimatedDurationMinutes || 30);
                return (
                  <View key={partner.provider} style={{ marginBottom: spacing.md }}>
                    <TouchableOpacity
                      style={[
                        styles.partnerCard,
                        isSelectedPartner && styles.partnerCardSelected,
                        { marginBottom: isSelectedPartner && vehicles ? 0 : spacing.md, 
                          borderBottomLeftRadius: isSelectedPartner && vehicles ? 0 : 12,
                          borderBottomRightRadius: isSelectedPartner && vehicles ? 0 : 12,
                          borderBottomWidth: isSelectedPartner && vehicles ? 0 : 2
                        }
                      ]}
                      onPress={() => handleSelectProvider(partner, 
                          vehicles && vehicles.length > 0 ? { type: vehicles[0].vehicleType, fee: vehicles[0].estimatedFee } : undefined)}
                    >
                      <View style={styles.partnerIconWrap}>
                        <MaterialIcons name="local-shipping" size={28} color={colors.primary} />
                      </View>
                      <View style={styles.partnerContent}>
                        <View style={styles.partnerNameRow}>
                          <Text style={styles.partnerName}>{displayName}</Text>
                        </View>
                        <Text style={styles.partnerTime}>
                          {defaultTime} mins
                        </Text>
                      </View>
                      <View style={styles.partnerFeeWrap}>
                         <Text style={styles.partnerFee}>From ₹{defaultFee}</Text>
                        <View
                          style={[
                            styles.partnerRadio,
                            isSelectedPartner && styles.partnerRadioSelected,
                          ]}
                        >
                          {isSelectedPartner && (
                            <View style={styles.partnerRadioInner} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Render sub-vehicle options if partner is selected */}
                    {isSelectedPartner && vehicles && vehicles.length > 0 && (
                      <View style={[styles.vehicleOptionsContainer, { borderColor: colors.primary }]}>
                         <Text style={styles.vehicleOptionsTitle}>Select Vehicle Type:</Text>
                         {vehicles.map((vehicle) => (
                           <TouchableOpacity 
                              key={vehicle.vehicleType}
                              style={[
                                styles.vehicleOptionCard, 
                                selectedVehicleType === vehicle.vehicleType && styles.vehicleOptionCardSelected
                              ]}
                              onPress={() => handleSelectProvider(partner, { type: vehicle.vehicleType, fee: vehicle.estimatedFee })}
                           >
                              <View style={styles.vehicleContentLeft}>
                                 <MaterialIcons 
                                    name={vehicle.vehicleType === 'bike' ? 'two-wheeler' : vehicle.vehicleType === 'van' ? 'airport-shuttle' : 'local-shipping'} 
                                    size={24} 
                                    color={selectedVehicleType === vehicle.vehicleType ? colors.primary : colors.textMuted} 
                                    style={{marginRight: 10}}
                                  />
                                 <View>
                                    <Text style={[styles.vehicleTypeName, selectedVehicleType === vehicle.vehicleType && {color: colors.primary}]}>
                                      {vehicle.vehicleType.charAt(0).toUpperCase() + vehicle.vehicleType.slice(1)}
                                    </Text>
                                    <Text style={styles.vehicleTypeTime}>
                                      {vehicle.estimatedDurationMinutes} mins
                                    </Text>
                                 </View>
                              </View>
                              <View style={styles.vehicleContentRight}>
                                 <Text style={[styles.vehicleTypeFee, selectedVehicleType === vehicle.vehicleType && {color: colors.primary}]}>
                                    ₹{vehicle.estimatedFee}
                                 </Text>
                              </View>
                           </TouchableOpacity>
                         ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Delivery Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY PAYMENT</Text>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'prepay' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('prepay')}
            >
              <View style={styles.paymentRadioWrap}>
                <View
                  style={[
                    styles.paymentRadio,
                    paymentMethod === 'prepay' && styles.paymentRadioSelected,
                  ]}
                >
                  {paymentMethod === 'prepay' && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Prepay with Order</Text>
                <Text style={styles.paymentDesc}>Delivery fee is added to your checkout total</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'postpay' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('postpay')}
            >
              <View style={styles.paymentRadioWrap}>
                <View
                  style={[
                    styles.paymentRadio,
                    paymentMethod === 'postpay' && styles.paymentRadioSelected,
                  ]}
                >
                  {paymentMethod === 'postpay' && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Pay After Delivery</Text>
                <Text style={styles.paymentDesc}>Pay fee directly to partner upon arrival</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SHIPPING TO</Text>
              <TouchableOpacity>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addressBox}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.addressLabel}>Home • HSR Layout, Sector 4</Text>
              </View>
            </View>
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.section}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Items Subtotal</Text>
              <Text style={styles.pricingValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Delivery ({selectedPartner?.displayName || 'Partner'})</Text>
              <Text style={styles.pricingValue}>
                {selectedPartner ? (
                  paymentMethod === 'postpay' ? 'Payable at delivery' : `+₹${deliveryFee.toFixed(2)}`
                ) : '—'}
              </Text>
            </View>
            <View style={[styles.pricingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Final Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedProvider || !paymentMethod || createOrderMutation.isPending) && styles.confirmBtnDisabled,
            ]}
            onPress={handlePaymentConfirm}
            disabled={!selectedProvider || !paymentMethod || createOrderMutation.isPending}
          >
            <Text style={styles.confirmBtnText}>
              {createOrderMutation.isPending ? 'Creating Order...' : `Pay ₹${total.toFixed(2)}`}
            </Text>
            {!createOrderMutation.isPending && (
              <MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 20,
  },
  scroll: {
    flex: 1,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'colors.primaryLight',
  },
  shopLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shopName: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editText: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: '600',
  },
  changeText: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    gap: spacing.md,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  itemName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  itemQty: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 14,
  },
  quantityAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  partnerCardSelected: {
    borderColor: colors.primary,
  },
  partnerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerLabel: {
    ...typography.overline,
    color: colors.primary,
    fontWeight: '700',
  },
  partnerTime: {
    ...typography.meta,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  partnerFeeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnerFee: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.primary,
  },
  partnerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  partnerRadioSelected: {
    borderColor: colors.primary,
  },
  partnerRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  loadingText: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.meta,
    color: colors.error,
    marginTop: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  emptyText: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
  },
  paymentRadioWrap: {
    marginRight: spacing.md,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  paymentRadioSelected: {
    borderColor: colors.primary,
  },
  paymentRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  paymentTitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentDesc: {
    ...typography.meta,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'colors.primaryLight',
  },
  addressLabel: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    marginBottom: 0,
  },
  pricingLabel: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  pricingValue: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.primary,
  },
  totalLabel: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  totalValue: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 18,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  vehicleOptionsContainer: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: spacing.md,
    paddingTop: 0,
    marginTop: -2,
  },
  vehicleOptionsTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  vehicleOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: spacing.xs,
    backgroundColor: colors.backgroundDark,
  },
  vehicleOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  vehicleContentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleTypeName: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  vehicleTypeTime: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  vehicleContentRight: {
    alignItems: 'flex-end',
  },
  vehicleTypeFee: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
