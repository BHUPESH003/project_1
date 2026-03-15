/**
 * CombinedCheckoutFlow Component
 *
 * Three-step combined checkout for multiple seller carts:
 * Step 1: Delivery Address - Single shared address selector
 * Step 2: Delivery Partner Selection - Per-seller delivery partner choice
 * Step 3: Order Placement - Silent parallel order creation
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

interface SelectedDeliveryPartner {
  sellerId: string;
  partner: DeliveryOption;
}

export const CombinedCheckoutFlow: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedSellers } = route.params;

  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [deliveryAddress, setDeliveryAddress] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<
    SelectedDeliveryPartner[]
  >([]);
  const [isPlacing, setIsPlacing] = useState(false);

  const sharedDeliveryAddress = useMultiCartStore(
    (state) => state.sharedDeliveryAddress
  );
  const carts = useMultiCartStore((state) =>
    state.getAllCartsWithItems()
  ).filter((cart) => selectedSellers.includes(cart.sellerId));

  // Step 1: Address Selection
  const handleAddressSelect = async () => {
    // In real implementation, this would open a location picker
    // For now, assume user already selected via modal
    if (sharedDeliveryAddress) {
      useMultiCartStore.setState({ sharedDeliveryAddress });
      setCurrentStep('delivery');
    } else {
      Alert.alert('Select Address', 'Please select a delivery address');
    }
  };

  // Step 2: Delivery Partner Selection per Seller
  const handleDeliveryPartnerSelect = (
    sellerId: string,
    partner: DeliveryOption
  ) => {
    setSelectedPartners((prev) => {
      const filtered = prev.filter((p) => p.sellerId !== sellerId);
      return [...filtered, { sellerId, partner }];
    });
  };

  const allPartnersSelected =
    selectedPartners.length === selectedSellers.length;

  // Step 3: Place Orders
  const handlePlaceOrders = async () => {
    if (!allPartnersSelected) {
      Alert.alert(
        'Complete Selection',
        'Please select a delivery partner for each seller'
      );
      return;
    }

    setIsPlacing(true);

    try {
      // Build batch order payload
      const orderPayloads = carts.map((cart) => {
        const partnerSelection = selectedPartners.find(
          (p) => p.sellerId === cart.sellerId
        );

        return {
          categoryId: 'printing', // TODO: Get from cart metadata
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

      // Call API to create batch orders
      const response = await fetch('/api/v1/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: orderPayloads }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to place orders');
      }

      // Clear successful carts
      const successfulSellers = result.results
        .filter((r: any) => r.status === 'success')
        .map((r: any) => r.sellerId);

      useMultiCartStore.setState((state) => {
        const newCarts = { ...state.carts };
        successfulSellers.forEach((sellerId: string) => {
          delete newCarts[sellerId];
        });
        return {
          carts: newCarts,
          selectedForCheckout: new Set(),
          checkoutSelections: {},
        };
      });

      // Navigate to confirmation screen
      navigation.navigate('OrderConfirmation', {
        results: result.results,
      });
    } catch (error: any) {
      Alert.alert(
        'Order Failed',
        error.message || 'Failed to place orders. Please try again.'
      );
    } finally {
      setIsPlacing(false);
    }
  };

  if (isPlacing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.placingText}>Placing your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <StepBadge
          number={1}
          label="Address"
          active={currentStep === 'address'}
          completed={currentStep !== 'address'}
        />
        <View
          style={[
            styles.stepLine,
            currentStep !== 'address' && styles.stepLineActive,
          ]}
        />
        <StepBadge
          number={2}
          label="Delivery"
          active={currentStep === 'delivery'}
          completed={currentStep === 'placing'}
        />
        <View
          style={[
            styles.stepLine,
            currentStep === 'placing' && styles.stepLineActive,
          ]}
        />
        <StepBadge
          number={3}
          label="Confirm"
          active={currentStep === 'placing'}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Address */}
        {currentStep === 'address' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Delivery Address</Text>
            <Text style={styles.stepSubtitle}>
              This address will be used for all {selectedSellers.length}{' '}
              order{selectedSellers.length !== 1 ? 's' : ''}
            </Text>

            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => navigation.navigate('SelectAddress')}
            >
              {sharedDeliveryAddress ? (
                <>
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color="#FF6B35"
                  />
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>Delivery To</Text>
                    <Text style={styles.addressValue}>
                      {sharedDeliveryAddress.address}
                    </Text>
                  </View>
                  <MaterialIcons name="edit" size={18} color="#999" />
                </>
              ) : (
                <>
                  <MaterialIcons name="add-location" size={24} color="#ccc" />
                  <Text style={styles.selectAddressText}>
                    Select delivery address
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextButton,
                !sharedDeliveryAddress && styles.buttonDisabled,
              ]}
              onPress={() => setCurrentStep('delivery')}
              disabled={!sharedDeliveryAddress}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Delivery Partners */}
        {currentStep === 'delivery' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Delivery Partners</Text>
            <Text style={styles.stepSubtitle}>
              Select a delivery partner for each seller
            </Text>

            {carts.map((cart) => (
              <View key={cart.sellerId} style={styles.sellerDeliverySection}>
                <Text style={styles.sellerDeliveryName}>
                  {cart.sellerName}
                </Text>

                {/* Mock delivery options */}
                {[
                  {
                    id: '1',
                    provider: 'uber_direct',
                    displayName: 'Uber Direct',
                    eta: '25 min',
                    price: 45,
                  },
                  {
                    id: '2',
                    provider: 'porter',
                    displayName: 'Porter',
                    eta: '18 min',
                    price: 60,
                  },
                  {
                    id: '3',
                    provider: 'dunzo',
                    displayName: 'Dunzo',
                    eta: '22 min',
                    price: 50,
                  },
                ].map((option) => {
                  const isSelected = selectedPartners.find(
                    (p) =>
                      p.sellerId === cart.sellerId &&
                      p.partner.id === option.id
                  );

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.partnerOption,
                        isSelected && styles.partnerOptionSelected,
                      ]}
                      onPress={() =>
                        handleDeliveryPartnerSelect(cart.sellerId, option)
                      }
                    >
                      <View style={styles.partnerLeft}>
                        <Text style={styles.partnerName}>
                          {option.displayName}
                        </Text>
                        <Text style={styles.partnerEta}>{option.eta}</Text>
                      </View>
                      <View style={styles.partnerRight}>
                        <Text style={styles.partnerPrice}>
                          ₹{option.price}
                        </Text>
                        {isSelected && (
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color="#FF6B35"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.nextButton,
                !allPartnersSelected && styles.buttonDisabled,
              ]}
              onPress={() => setCurrentStep('placing')}
              disabled={!allPartnersSelected}
            >
              <Text style={styles.nextButtonText}>Place Orders</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

interface StepBadgeProps {
  number: number;
  label: string;
  active: boolean;
  completed?: boolean;
}

const StepBadge: React.FC<StepBadgeProps> = ({
  number,
  label,
  active,
  completed,
}) => (
  <View style={styles.stepBadgeContainer}>
    <View
      style={[
        styles.stepBadge,
        active && styles.stepBadgeActive,
        completed && styles.stepBadgeCompleted,
      ]}
    >
      {completed ? (
        <MaterialIcons name="check" size={18} color="#fff" />
      ) : (
        <Text
          style={[
            styles.stepBadgeText,
            active && styles.stepBadgeTextActive,
          ]}
        >
          {number}
        </Text>
      )}
    </View>
    <Text
      style={[styles.stepLabel, active && styles.stepLabelActive]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepBadgeContainer: {
    alignItems: 'center',
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadgeActive: {
    backgroundColor: '#FF6B35',
  },
  stepBadgeCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepBadgeText: {
    fontWeight: '600',
    color: '#999',
    fontSize: 14,
  },
  stepBadgeTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#FF6B35',
  },
  stepLine: {
    height: 2,
    width: 30,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#FF6B35',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  stepContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
  },
  sellerDeliverySection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  sellerDeliveryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  partnerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 6,
  },
  partnerOptionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff5f1',
  },
  partnerLeft: {
    flex: 1,
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  partnerEta: {
    fontSize: 12,
    color: '#999',
  },
  partnerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  partnerPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  nextButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
