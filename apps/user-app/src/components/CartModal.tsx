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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMultiCartStore } from '@/store/multiCartStore';

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
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#1f2937" />
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
                        <MaterialIcons name="remove" size={16} color="#2563eb" />
                      </TouchableOpacity>

                      <Text style={styles.quantityText}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQuantity(sellerId, item.id, item.quantity + 1)
                        }
                      >
                        <MaterialIcons name="add" size={16} color="#2563eb" />
                      </TouchableOpacity>
                    </View>

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(sellerId, item.id)}
                    >
                      <MaterialIcons name="delete" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              />

              {/* Footer with Total and Checkout */}
              <View style={styles.footer}>
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => {
                    onClose();
                    onCheckout(sellerId);
                  }}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="shopping-cart" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 6,
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
});
