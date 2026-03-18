/**
 * SingleCheckoutFlow Component
 *
 * Single seller cart checkout flow:
 * - Shows products from only this seller
 * - Select delivery address (from saved addresses or location)
 * - Select delivery partner (from real API)
 * - Place order via orders API
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { MaterialIcons } from '@expo/vector-icons';
import { usersApi } from '@/api/users.api';
import { ordersApi } from '@/api/orders.api';
import { sellersApi } from '@/api/sellers.api';
import { useLocationStore } from '@/store/location.store';

type Step = 'address' | 'delivery' | 'placing';

interface DeliveryOption {
  id: string;
  provider: string;
  displayName: string;
  eta: string;
  price: number;
}

interface SingleCheckoutFlowProps {
  sellerId?: string;
}

export const SingleCheckoutFlow: React.FC<SingleCheckoutFlowProps> = (props) => {
  const router = useRouter();
  const navigation = useNavigation<{ reset: (opts: { index: number; routes: Array<{ name: string }> }) => void; goBack: () => void }>();
  const sellerId = props.sellerId ?? '';

  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [deliveryAddress, setDeliveryAddress] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<DeliveryOption | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryOption[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const cart = useMultiCartStore((state) => state.carts[sellerId]);
  const clearCart = useMultiCartStore((state) => state.clearCart);
  const locationCoords = useLocationStore((s) => s.coords);
  const setOrderDraftId = useOrderDraftStore((s) => s.setOrderId);

  const { data: addresses = [] } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => usersApi.getMyAddresses(),
  });

  const { data: sellerData } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: () => sellersApi.getSeller(sellerId),
    enabled: Boolean(sellerId),
  });

  useEffect(() => {
    if (deliveryAddress && orderId && deliveryPartners.length === 0 && !deliveryLoading) {
      setDeliveryLoading(true);
      ordersApi
        .getDeliveryQuotes(orderId)
        .then((res) => {
          const providers = res.providers ?? [];
          setDeliveryPartners(
            providers.map((p, i) => ({
              id: p.quoteId ?? p.provider ?? `p-${i}`,
              provider: p.provider ?? 'UNKNOWN',
              displayName: p.displayName ?? p.provider ?? 'Unknown',
              eta: p.estimatedDurationMinutes ? `${p.estimatedDurationMinutes} min` : 'N/A',
              price: p.estimatedFee ?? 0,
            })),
          );
        })
        .catch(() => setDeliveryPartners([]))
        .finally(() => setDeliveryLoading(false));
    }
  }, [deliveryAddress, orderId, deliveryPartners.length, deliveryLoading]);

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Cart is empty</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cartTotal = cart.items.reduce((sum, item) => {
    const itemTotal = item.totalPrice ? item.totalPrice * item.quantity : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  const deliveryFee = selectedPartner?.price ?? 0;
  const totalAmount = cartTotal + deliveryFee;

  const handleAddressSelect = (addr?: { lat: number; lng: number; address: string }) => {
    if (addr) {
      setDeliveryAddress(addr);
      setCurrentStep('delivery');
      createOrderAndFetchQuotes(addr);
    } else {
      const fallback = {
        lat: locationCoords?.latitude ?? 28.7041,
        lng: locationCoords?.longitude ?? 77.1025,
        address: locationCoords?.label ?? 'Current location',
      };
      setDeliveryAddress(fallback);
      setCurrentStep('delivery');
      createOrderAndFetchQuotes(fallback);
    }
  };

  const createOrderAndFetchQuotes = async (addr: { lat: number; lng: number; address: string }) => {
    try {
      const { order_id } = await ordersApi.createOrder({
        categoryId: cart.items[0]?.category ?? 'printing',
        sellerId,
        orderPayload: {
          items: cart.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          dropLatitude: addr.lat,
          dropLongitude: addr.lng,
          dropAddress: addr.address,
        },
      });
      setOrderId(order_id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress || !selectedPartner || !orderId) {
      Alert.alert('Missing Info', 'Please select address and delivery partner');
      return;
    }

    setIsPlacing(true);

    try {
      await ordersApi.updateOrder(orderId, { deliveryFee: selectedPartner.price });
      const confirmResponse = await ordersApi.confirmOrder(orderId, 'UPI');
      
      // Check if payment_intent is returned
      const paymentIntent = (confirmResponse as any)?.payment?.payment_intent;
      const paymentId = (confirmResponse as any)?.payment?.payment_id;
      
      if (paymentIntent) {
        // Razorpay payment intent received - set orderId in store and navigate to payment screen
        clearCart(sellerId);
        setOrderDraftId(orderId);
        router.push('/order/payment-method');
      } else {
        // No payment required (shouldn't happen, but handle gracefully)
        clearCart(sellerId);
        Alert.alert('Success', 'Order placed successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/orders');
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (currentStep === 'placing') {
    return (
      <View style={styles.placingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.placingText}>Placing order...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <Text style={styles.sellerName}>{cart.sellerName}</Text>

        <View style={styles.itemsContainer}>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.itemUnit}>
                  ₹{item.price.toFixed(2)} each
                </Text>
              </View>

              {/* Quantity Controls */}
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => {
                    if (item.quantity > 1) {
                      useMultiCartStore.getState().updateQuantity(sellerId, item.id, item.quantity - 1);
                    } else {
                      useMultiCartStore.getState().removeItem(sellerId, item.id);
                    }
                  }}
                >
                  <MaterialIcons name="remove" size={16} color="#FF6B35" />
                </TouchableOpacity>

                <Text style={styles.qtyText}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => {
                    useMultiCartStore.getState().updateQuantity(sellerId, item.id, item.quantity + 1);
                  }}
                >
                  <MaterialIcons name="add" size={16} color="#FF6B35" />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemPrice}>
                ₹{(item.price * item.quantity).toFixed(2)}
              </Text>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  useMultiCartStore.getState().removeItem(sellerId, item.id);
                }}
              >
                <MaterialIcons name="delete" size={16} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text>Subtotal</Text>
          <Text>₹{cartTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Step 1: Address */}
      <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            {deliveryAddress ? (
              <View style={styles.addressBox}>
                <Text style={styles.addressText}>{deliveryAddress.address}</Text>
                <TouchableOpacity onPress={() => setDeliveryAddress(null)}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {addresses.length > 0 ? (
                  addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.addressOption}
                      onPress={() =>
                        handleAddressSelect(
                          addr.latitude != null && addr.longitude != null
                            ? { lat: addr.latitude, lng: addr.longitude, address: addr.addressLine }
                            : undefined,
                        )
                      }
                    >
                      <Text style={styles.addressLabel}>{addr.label}</Text>
                      <Text style={styles.addressText}>{addr.addressLine}</Text>
                    </TouchableOpacity>
                  ))
                ) : null}
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => handleAddressSelect()}
                >
                  <Text style={styles.buttonText}>
                    {addresses.length > 0 ? 'Use current location' : 'Select Address'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Step 2: Delivery Partner */}
          {deliveryAddress && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Partner</Text>
              {deliveryLoading ? (
                <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 16 }} />
              ) : deliveryPartners.length === 0 ? (
                <Text style={styles.emptyPartners}>No delivery options available. Try a different address.</Text>
              ) : (
              <FlatList
                scrollEnabled={false}
                data={deliveryPartners}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.partnerCard,
                      selectedPartner?.id === item.id && styles.partnerCardSelected,
                    ]}
                    onPress={() => setSelectedPartner(item)}
                  >
                    <View style={styles.partnerInfo}>
                      <Text style={styles.partnerName}>{item.displayName}</Text>
                      <Text style={styles.partnerEta}>{item.eta}</Text>
                    </View>
                    <Text style={styles.partnerPrice}>₹{item.price}</Text>
                  </TouchableOpacity>
                )}
              />
              )}
            </View>
          )}

          {/* Total */}
          {selectedPartner && (
            <View style={styles.section}>
              <View style={styles.totalRow}>
                <Text>Delivery Fee</Text>
                <Text>₹{selectedPartner.price.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalAmountRow]}>
                <Text style={styles.totalAmountText}>Total Amount</Text>
                <Text style={styles.totalAmountText}>₹{totalAmount.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handlePlaceOrder}
                disabled={isPlacing}
              >
                <Text style={styles.checkoutButtonText}>
                  {isPlacing ? 'Placing Order...' : 'Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 20,
  },
  placingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 6,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 11,
    color: '#9ca3af',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  qtyButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    minWidth: 18,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalAmountRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  addressBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  addressOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyPartners: {
    fontSize: 13,
    color: '#6b7280',
    marginVertical: 16,
  },
  addressText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  changeLink: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  partnerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  partnerCardSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  partnerEta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  partnerPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
