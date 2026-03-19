/**
 * CartModal Component
 *
 * Modal showing a specific seller's cart items
 * - Displays on seller detail/product pages
 * - Shows only items from that seller
 * - Allows quantity adjustments
 * - Provides checkout button
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useThemeColors, useThemedStyles } from '@/theme';

const { height } = Dimensions.get('window');

interface CartModalProps {
  visible: boolean;
  sellerId: string;
  sellerName: string;
  onClose: () => void;
  onCheckout: (sellerId: string) => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  visible,
  sellerId,
  sellerName,
  onClose,
  onCheckout,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const cart = useMultiCartStore((state) => state.carts[sellerId]);
  const updateQuantity = useMultiCartStore((state) => state.updateQuantity);
  const removeItem = useMultiCartStore((state) => state.removeItem);

  if (!cart) {
    return null;
  }

  const cartTotal = cart.items.reduce((sum, item) => {
    const itemTotal = item.totalPrice
      ? item.totalPrice * item.quantity
      : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{sellerName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Items List */}
          {cart.items.length > 0 ? (
            <>
              <FlatList
                data={cart.items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    {/* Item Image */}
                    {item.image && (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.itemImage}
                      />
                    )}

                    {/* Item Details */}
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text style={styles.itemDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={styles.itemPrice}>
                        ₹{item.price.toFixed(2)}
                      </Text>
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQuantity(sellerId, item.id, item.quantity - 1)
                        }
                      >
                        <MaterialIcons name="remove" size={16} color={colors.primary} />
                      </TouchableOpacity>

                      <Text style={styles.quantityText}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQuantity(sellerId, item.id, item.quantity + 1)
                        }
                      >
                        <MaterialIcons name="add" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(sellerId, item.id)}
                    >
                      <MaterialIcons name="delete" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={true}
                contentContainerStyle={styles.listContent}
              />

              {/* Footer with Total and Checkout */}
              <View style={styles.footer}>
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => {
                    onClose();
                    onCheckout(sellerId);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="shopping-cart" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Your cart is empty</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginRight: 14,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  quantityButton: {
    padding: 6,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  removeButton: {
    padding: 6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
});
