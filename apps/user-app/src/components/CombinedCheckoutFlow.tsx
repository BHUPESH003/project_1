/**
 * Multi-Cart Combined Checkout Flow
 * 
 * Orchestrates checkout for items from multiple sellers:
 * 1. User confirms delivery address
 * 2. Create orders for all sellers
 * 3. Show delivery options per seller
 * 4. User selects providers
 * 5. Process unified payment
 * 6. Clear carts
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MultiCartCheckoutService } from '@/services/multiCartCheckout.service';
import { showToast } from '@/lib/toast';

interface CombinedCheckoutFlowProps {
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  /** Per-seller addresses (when user chooses different address per seller) */
  deliveryAddresses?: Record<string, { latitude: number; longitude: number; address: string }>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const CombinedCheckoutFlow: React.FC<CombinedCheckoutFlowProps> = ({
  deliveryAddress,
  deliveryAddresses,
  onSuccess,
  onError,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<
    'create_orders' | 'delivery_quotes' | 'select_providers' | 'payment' | 'complete'
  >('create_orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<any>({});
  const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Fetch all carts from store
  const carts = useMultiCartStore((state) => state.carts);
  const activeCarts = Object.values(carts)
    .filter((cart) => cart.items.length > 0)
    .map((cart) => ({
      sellerId: cart.sellerId,
      sellerName: cart.sellerName,
      items: cart.items,
      subtotal: cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    }));

  // Step 1: Create Orders for all sellers
  const createOrdersMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      try {
        const createdOrders =
          await MultiCartCheckoutService.createAllOrders(deliveryAddress, deliveryAddresses);
        setOrders(createdOrders);
        showToast({
          type: 'success',
          message: `${createdOrders.length} orders created`,
          duration: 2000,
        });
        setStep('delivery_quotes');
      } catch (error: any) {
        showToast({
          type: 'error',
          message: `Failed to create orders: ${error.message}`,
          duration: 3000,
        });
        if (onError) onError(error.message);
      } finally {
        setLoading(false);
      }
    },
  });

  // Step 2: Fetch Delivery Quotes
  const fetchQuotesMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      try {
        const orderRefs = orders.map((o) => ({ orderId: o.orderId, sellerId: o.sellerId }));
        const quotes = await MultiCartCheckoutService.getDeliveryQuotes(
          orderRefs,
          deliveryAddress,
        );

        const quotesMap: Record<string, any> = {};
        quotes.forEach((q) => {
          quotesMap[q.orderId] = q.providers;
          // Auto-select cheapest provider
          const cheapest = q.cheapest;
          if (cheapest) {
            setSelectedProviders((prev) => ({
              ...prev,
              [q.orderId]: cheapest.provider,
            }));
          }
        });
        setDeliveryOptions(quotesMap);
        showToast({
          type: 'success',
          message: 'Delivery options loaded',
          duration: 2000,
        });
        setStep('select_providers');
      } catch (error: any) {
        showToast({
          type: 'error',
          message: `Failed to fetch delivery quotes: ${error.message}`,
          duration: 3000,
        });
        if (onError) onError(error.message);
      } finally {
        setLoading(false);
      }
    },
  });

  // Step 3: Confirm Orders with Payment
  const confirmOrdersMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      try {
        const confirmations = orders.map((order) => {
          const provider = selectedProviders[order.orderId];
          const option = deliveryOptions[order.orderId]?.find(
            (o: any) => o.provider === provider,
          );

          return {
            orderId: order.orderId,
            sellerId: order.sellerId,
            deliveryPartner: provider,
            deliveryFee: option?.estimatedFee || 0,
          };
        });

        const response = await MultiCartCheckoutService.confirmAllOrders(
          confirmations,
          'UPI',
        );

        showToast({
          type: 'success',
          message: `${response.confirmedOrders.length} orders confirmed!`,
          duration: 2000,
        });

        // Clear cart after success
        MultiCartCheckoutService.clearCheckoutCarts();
        setStep('complete');

        if (onSuccess) onSuccess();
        setTimeout(() => {
          router.replace('/(tabs)/orders');
        }, 1000);
      } catch (error: any) {
        showToast({
          type: 'error',
          message: `Failed to confirm orders: ${error.message}`,
          duration: 3000,
        });
        if (onError) onError(error.message);
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    // Auto-start creation on mount
    if (step === 'create_orders' && !loading) {
      createOrdersMutation.mutate();
    }
  }, []);

  useEffect(() => {
    // Auto-fetch delivery quotes when orders are created
    if (step === 'delivery_quotes' && orders.length > 0 && !loading) {
      fetchQuotesMutation.mutate();
    }
  }, [step, orders.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepBadge, step && styles.stepBadgeActive]}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <View
          style={[styles.stepLine, (step === 'delivery_quotes' || step === 'select_providers' || step === 'payment') && styles.stepLineActive]}
        />
        <View style={[styles.stepBadge, (step === 'delivery_quotes' || step === 'select_providers' || step === 'payment') && styles.stepBadgeActive]}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <View
          style={[styles.stepLine, (step === 'select_providers' || step === 'payment') && styles.stepLineActive]}
        />
        <View style={[styles.stepBadge, (step === 'select_providers' || step === 'payment') && styles.stepBadgeActive]}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
      </View>

      {/* Orders Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orders Summary</Text>
        {orders.map((order) => {
          const isExpanded = expandedOrders.has(order.orderId);
          return (
            <TouchableOpacity
              key={order.orderId}
              style={styles.orderCard}
              onPress={() => {
                const newExpanded = new Set(expandedOrders);
                if (newExpanded.has(order.orderId)) {
                  newExpanded.delete(order.orderId);
                } else {
                  newExpanded.add(order.orderId);
                }
                setExpandedOrders(newExpanded);
              }}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderInfo}>
                  <Text style={styles.orderSeller}>{order.sellerName}</Text>
                  <Text style={styles.orderItems}>{order.items.length} items</Text>
                </View>
                <View style={styles.orderHeaderRight}>
                  <Text style={styles.orderPrice}>₹{order.subtotal.toFixed(2)}</Text>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={20}
                    color="#666"
                  />
                </View>
              </View>

              {/* Expanded Items */}
              {isExpanded && (
                <View style={styles.itemsExpandedSection}>
                  {order.items.map((item: any) => (
                    <View key={item.id} style={styles.expandedItemRow}>
                      <View style={styles.expandedItemDetails}>
                        <Text style={styles.expandedItemName}>{item.name}</Text>
                        <Text style={styles.expandedItemUnit}>₹{item.price.toFixed(2)} each</Text>
                      </View>
                      <View style={styles.expandedItemQty}>
                        <Text style={styles.expandedQtyText}>x{item.quantity}</Text>
                      </View>
                      <Text style={styles.expandedItemPrice}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Delivery Provider Selection */}
      {step === 'select_providers' && orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Delivery Partner</Text>
          <Text style={styles.sectionSubtext}>Each seller can have different delivery partner</Text>

          {orders.map((order) => (
            <View key={order.orderId} style={styles.providerSection}>
              <Text style={styles.providerTitle}>{order.sellerName}</Text>
              <View style={styles.providerOptions}>
                {(deliveryOptions[order.orderId] || []).map((provider: any) => (
                  <TouchableOpacity
                    key={provider.provider}
                    style={[
                      styles.providerOption,
                      selectedProviders[order.orderId] === provider.provider &&
                        styles.providerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedProviders((prev) => ({
                        ...prev,
                        [order.orderId]: provider.provider,
                      }));
                    }}
                  >
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName}>{provider.displayName}</Text>
                      <Text style={styles.providerTime}>
                        ~{provider.estimatedDurationMinutes} min
                      </Text>
                    </View>
                    <Text style={styles.providerFee}>₹{provider.estimatedFee}</Text>
                    {selectedProviders[order.orderId] === provider.provider && (
                      <MaterialIcons name="check-circle" size={24} color="#e74c3c" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {step === 'select_providers' && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => confirmOrdersMutation.mutate()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Proceed to Payment</Text>
          </TouchableOpacity>
        )}
        {step === 'complete' && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/orders')}
          >
            <Text style={styles.buttonText}>View Orders</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#e74c3c',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#e74c3c',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  orderHeaderInfo: {
    flex: 1,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderSeller: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
  orderItems: {
    fontSize: 12,
    color: '#999',
  },
  itemsExpandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    gap: 8,
  },
  expandedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  expandedItemDetails: {
    flex: 1,
  },
  expandedItemName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  expandedItemUnit: {
    fontSize: 11,
    color: '#9ca3af',
  },
  expandedItemQty: {
    minWidth: 40,
    alignItems: 'center',
  },
  expandedQtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  expandedItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 55,
    textAlign: 'right',
  },
  providerSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  providerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  providerOptions: {
    gap: 8,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  providerOptionSelected: {
    backgroundColor: '#fff3f0',
    borderColor: '#e74c3c',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  providerTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  providerFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
    marginRight: 12,
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
