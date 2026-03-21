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
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAddressStore } from '@/store/address.store';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useThemedStyles } from '@/theme';

const { width } = Dimensions.get('window');

export const MultiCartView: React.FC = () => {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set()
  );

  // Get all carts
  const rawCarts = useMultiCartStore((state) => state.carts);
  const rawSelected = useMultiCartStore((state) => state.selectedForCheckout);
  const selectedForCheckout = rawSelected instanceof Set ? rawSelected : new Set<string>();
  const toggleCheckoutSelection = useMultiCartStore((state) => state.toggleCheckoutSelection);
  const carts = useMemo(() => {
    return Object.values(rawCarts).filter((cart) => cart.items.length > 0);
  }, [rawCarts]);

  // Empty state
  if (carts.length === 0) {
    return null;
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
    const cart = rawCarts[sellerId];
    if (!cart) return;

    const checkoutStore = useCheckoutStore.getState();
    const currentAddr = useAddressStore.getState().selectedAddress;

    checkoutStore.reset();
    checkoutStore.initFromCarts([cart], currentAddr ? {
      label: currentAddr.label || 'Home',
      fullAddress: currentAddr.fullAddress,
      lat: currentAddr.lat,
      lng: currentAddr.lng
    } : null);

    router.push('/(root)/checkout');
  };

  return (
    <View style={styles.container}>
      {carts.map((cart) => {
        const isExpanded = expandedSellers.has(cart.sellerId);
        const isSelected = selectedForCheckout.has(cart.sellerId);
        const itemCount = cart.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const total = useMultiCartStore.getState().getCartTotal(cart.sellerId);

        return (
          <View key={cart.sellerId} style={[styles.cartCard, isSelected && styles.cartCardSelected]}>
            {/* Header */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cartHeader}
              onPress={() => toggleExpand(cart.sellerId)}
            >
              <TouchableOpacity
                style={styles.checkbox}
                activeOpacity={0.6}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleCheckoutSelection(cart.sellerId);
                }}
              >
                <MaterialIcons
                  name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                  size={26}
                  color={isSelected ? colors.primary : '#444'}
                />
              </TouchableOpacity>

              <View style={styles.headerInfo}>
                <Text style={styles.sellerName}>{cart.sellerName}</Text>
                <Text style={styles.itemCount}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{total.toFixed(2)}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.directCheckoutBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCheckout(cart.sellerId);
                  }}
                >
                  <Text style={styles.directCheckoutText}>Checkout</Text>
                </TouchableOpacity>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#999"
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Items */}
            {isExpanded && (
              <View style={styles.itemsSection}>
                {cart.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemMain}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₹{item.price.toFixed(2)}
                        </Text>
                      </View>
                      
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
                          <MaterialIcons name="remove" size={16} color="#ffffff" />
                        </TouchableOpacity>
                        
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => {
                            useMultiCartStore.getState().updateQuantity(cart.sellerId, item.id, item.quantity + 1);
                          }}
                        >
                          <MaterialIcons name="add" size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      <Text style={styles.itemTotalAmount}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          useMultiCartStore.getState().removeItem(cart.sellerId, item.id);
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={styles.cardFooter}>
                  <View style={styles.totalBlock}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>₹{total.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    cartCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 24,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cartCardSelected: {
      borderColor: 'rgba(13, 148, 136, 0.3)',
      backgroundColor: 'rgba(13, 148, 136, 0.02)',
    },
    cartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      gap: 16,
    },
    checkbox: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 2,
    },
    itemCount: {
      fontSize: 12,
      color: '#888',
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    directCheckoutBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(13, 148, 136, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(13, 148, 136, 0.2)',
    },
    directCheckoutText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    itemsSection: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.03)',
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.02)',
    },
    itemMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    itemDetails: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      color: '#eeeeee',
      marginBottom: 2,
      fontWeight: '600',
    },
    itemPrice: {
      fontSize: 12,
      color: '#666',
    },
    quantityControl: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 4,
      gap: 8,
    },
    qtyButton: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qtyText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
      minWidth: 20,
      textAlign: 'center',
    },
    itemRight: {
      alignItems: 'flex-end',
      gap: 8,
      paddingLeft: 12,
    },
    itemTotalAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    deleteBtn: {
      padding: 4,
    },
    cardFooter: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.03)',
    },
    totalBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    subtotalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#888',
    },
    subtotalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primary,
    },
  });
