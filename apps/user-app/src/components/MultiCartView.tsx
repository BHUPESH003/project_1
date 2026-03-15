/**
 * MultiCartView Component
 *
 * Shows all active carts (from different sellers) in a scrollable list
 * - Collapsible cards per seller showing item count + total
 * - Checkbox to select/deselect each cart for combined checkout
 * - "View Cart" button per seller for individual checkout
 * - "Checkout Selected (X carts)" button at bottom (visible only when 2+ selected)
 * - Empty state messaging
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const MultiCartView: React.FC = () => {
  const navigation = useNavigation<any>();
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set()
  );

  // Get all carts
  const carts = useMultiCartStore((state) =>
    state.getAllCartsWithItems()
  );
  const selectedForCheckout = useMultiCartStore(
    (state) => state.selectedForCheckout
  );
  const toggleSelection = useMultiCartStore(
    (state) => state.toggleCheckoutSelection
  );

  // Empty state
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

  const toggleExpand = (sellerId: string) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  const handleCombinedCheckout = () => {
    if (selectedForCheckout.size < 2) {
      alert('Please select at least 2 carts for combined checkout');
      return;
    }
    navigation.navigate('CombinedCheckout', {
      selectedSellers: Array.from(selectedForCheckout),
    });
  };

  const handleSingleCheckout = (sellerId: string) => {
    navigation.navigate('SingleCheckout', { sellerId });
  };

  return (
    <View style={styles.container}>
      {/* Carts List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {carts.map((cart) => {
          const isSelected = selectedForCheckout.has(cart.sellerId);
          const isExpanded = expandedSellers.has(cart.sellerId);
          const itemCount = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const total = useMultiCartStore((state) =>
            state.getCartTotal(cart.sellerId)
          );

          return (
            <View key={cart.sellerId} style={styles.cartCard}>
              {/* Cart Header - Always Visible */}
              <TouchableOpacity
                style={styles.cartHeader}
                onPress={() => toggleExpand(cart.sellerId)}
              >
                {/* Checkbox */}
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleSelection(cart.sellerId)}
              >
                <MaterialIcons
                  name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={isSelected ? '#2563eb' : '#d1d5db'}
                />
              </TouchableOpacity>

                {/* Header Info */}
                <View style={styles.headerInfo}>
                  <Text style={styles.sellerName}>{cart.sellerName}</Text>
                  <Text style={styles.itemCount}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • ₹
                    {total.toFixed(2)}
                  </Text>
                </View>

                {/* Expand Arrow */}
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {/* Cart Items - Show When Expanded */}
              {isExpanded && (
                <View style={styles.itemsSection}>
                  {cart.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemQty}>
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Cart Total */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>
                      ₹{total.toFixed(2)}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() =>
                        navigation.navigate('Cart', {
                          sellerId: cart.sellerId,
                        })
                      }
                    >
                      <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkoutButton}
                      onPress={() => handleSingleCheckout(cart.sellerId)}
                    >
                      <Text style={styles.checkoutButtonText}>
                        Checkout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Combined Checkout CTA - Visible When 2+ Selected */}
      {selectedForCheckout.size >= 2 && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.combinedCheckoutButton}
            onPress={handleCombinedCheckout}
          >
            <Text style={styles.combinedCheckoutText}>
              Checkout Selected ({selectedForCheckout.size} cart
              {selectedForCheckout.size !== 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cartCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  headerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
  },
  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 11,
    color: '#999',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 12,
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  bottomAction: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  combinedCheckoutButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  combinedCheckoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
