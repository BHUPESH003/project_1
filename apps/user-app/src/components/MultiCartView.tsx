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

import React, { useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const MultiCartView: React.FC = () => {
  const router = useRouter();
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set()
  );

  // Get all carts
  const rawCarts = useMultiCartStore((state) => state.carts);
  const carts = useMemo(() => {
    return Object.values(rawCarts).filter((cart) => cart.items.length > 0);
  }, [rawCarts]);

  // Empty state
  if (carts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)/home')}
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

  const handleCheckout = (sellerId: string) => {
    router.push({ pathname: '/single-checkout', params: { sellerId } });
  };

  return (
    <View style={styles.container}>
      {/* Carts List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {carts.map((cart) => {
          const isExpanded = expandedSellers.has(cart.sellerId);
          const itemCount = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          // Use getState() for synchronous access (avoid hook call inside map)
          const total = useMultiCartStore.getState().getCartTotal(cart.sellerId);

          return (
            <View key={cart.sellerId} style={styles.cartCard}>
              {/* Cart Header - Always Visible */}
              <TouchableOpacity
                style={styles.cartHeader}
                onPress={() => toggleExpand(cart.sellerId)}
              >
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
                        <Text style={styles.itemPrice}>
                          ₹{item.price.toFixed(2)} each
                        </Text>
                      </View>
                      
                      {/* Quantity Controls */}
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => {
                            if (item.quantity > 1) {
                              useMultiCartStore.getState().updateQuantity(cart.sellerId, item.id, item.quantity - 1);
                            } else {
                              useMultiCartStore.getState().removeItem(cart.sellerId, item.id);
                            }
                          }}
                        >
                          <MaterialIcons name="remove" size={16} color="#FF6B35" />
                        </TouchableOpacity>
                        
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => {
                            useMultiCartStore.getState().updateQuantity(cart.sellerId, item.id, item.quantity + 1);
                          }}
                        >
                          <MaterialIcons name="add" size={16} color="#FF6B35" />
                        </TouchableOpacity>

                        <Text style={styles.itemTotal}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>

                      {/* Delete Button */}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          useMultiCartStore.getState().removeItem(cart.sellerId, item.id);
                        }}
                      >
                        <MaterialIcons name="delete" size={18} color="#e74c3c" />
                      </TouchableOpacity>
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

                  {/* Checkout Button */}
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
      </ScrollView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 8,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 11,
    color: '#999',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  qtyButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    minWidth: 50,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 6,
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
