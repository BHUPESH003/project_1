/**
 * SingleCheckoutFlow Component
 *
 * Single seller cart checkout flow:
 * - Shows products from only this seller
 * - Select delivery address
 * - Select delivery partner
 * - Place order
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

type Step = 'address' | 'delivery' | 'placing';

interface DeliveryOption {
  id: string;
  provider: string;
  displayName: string;
  eta: string;
  price: number;
}

export const SingleCheckoutFlow: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sellerId } = route.params;

  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [deliveryAddress, setDeliveryAddress] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<DeliveryOption | null>(
    null
  );
  const [isPlacing, setIsPlacing] = useState(false);

  // Get this seller's cart
  const cart = useMultiCartStore((state) => state.carts[sellerId]);
  const clearCart = useMultiCartStore((state) => state.clearCart);

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Cart is empty</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cartTotal = cart.items.reduce((sum, item) => {
    const itemTotal = item.totalPrice
      ? item.totalPrice * item.quantity
      : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  const deliveryFee = selectedPartner?.price || 0;
  const totalAmount = cartTotal + deliveryFee;

  // Mock delivery partners
  const deliveryPartners: DeliveryOption[] = [
    {
      id: 'uber',
      provider: 'Uber Direct',
      displayName: 'Uber Direct',
      eta: '10-15 min',
      price: 50,
    },
    {
      id: 'porter',
      provider: 'Porter',
      displayName: 'Porter',
      eta: '15-20 min',
      price: 40,
    },
    {
      id: 'dunzo',
      provider: 'Dunzo',
      displayName: 'Dunzo',
      eta: '20-25 min',
      price: 30,
    },
  ];

  const handleAddressSelect = () => {
    // In real implementation, open location picker
    setDeliveryAddress({
      lat: 28.7041,
      lng: 77.1025,
      address: '123 Main St, New Delhi',
    });
    setCurrentStep('delivery');
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress || !selectedPartner) {
      Alert.alert('Missing Info', 'Please select address and delivery partner');
      return;
    }

    setIsPlacing(true);

    try {
      // In Phase 2: Use local mock API for order placement
      // In future: Replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mock success response
      const result = { status: 'success', orderId: `ORD-${Date.now()}` };

      // Clear this seller's cart after successful order
      clearCart(sellerId);
      
      Alert.alert('Success', `Order placed! Order ID: ${result.orderId}`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
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
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>
                ₹{(item.price * item.quantity).toFixed(2)}
              </Text>
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
                <TouchableOpacity onPress={handleAddressSelect}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleAddressSelect}
              >
                <Text style={styles.buttonText}>Select Address</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step 2: Delivery Partner */}
          {deliveryAddress && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Partner</Text>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginRight: 8,
  },
  itemQty: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'right',
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
