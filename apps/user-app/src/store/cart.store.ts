/**
 * Cart store – manage cart items, quantities, and checkout flow
 */

import { create } from 'zustand';

export interface CartItem {
  id: string;
  sellerId: string;
  shopName: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  totalPrice?: number; // Calculated total for print services (total pages × price per page)
}

interface CartState {
  items: CartItem[];
  orderId?: string | null; // Track the draft order ID for cart items
  selectedSellerId?: string | null;
  selectedShopName?: string | null;
  selectedDeliveryProvider?: string | null;
  deliveryFee?: number | null;
  paymentMethod?: 'prepay' | 'postpay';
  deliveryAddress?: string | null;
  pickupLocation?: { lat: number; lng: number; label: string } | null;
  dropLocation?: { lat: number; lng: number; address: string } | null;
  
  // Cart operations
  addItem: (item: Omit<CartItem, 'quantity'>) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Order operations
  setOrderId: (orderId: string | null) => void;
  
  // Seller operations
  setSelectedSeller: (sellerId: string | null, shopName: string | null) => void;
  
  // Delivery operations
  setDeliveryProvider: (provider: string | null) => void;
  setDeliveryFee: (fee: number | null) => void;
  setPaymentMethod: (method: 'prepay' | 'postpay') => void;
  setDeliveryAddress: (address: string | null) => void;
  setPickupLocation: (location: { lat: number; lng: number; label: string } | null) => void;
  setDropLocation: (location: { lat: number; lng: number; address: string } | null) => void;
  
  // Getters
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderId: null,
  selectedSellerId: null,
  selectedShopName: null,
  selectedDeliveryProvider: null,
  deliveryFee: null,
  paymentMethod: 'prepay',
  deliveryAddress: null,
  pickupLocation: null,
  dropLocation: null,

  addItem: (item) => {
    const state = get();
    const existing = state.items.find((i) => i.id === item.id);

    // If cart is empty, allow adding the first item and set the seller
    if (state.items.length === 0) {
      set({
        items: [{ ...item, quantity: 1 }],
        selectedSellerId: item.sellerId,
        selectedShopName: item.shopName,
      });
      return { success: true };
    }

    // If user is trying to add from a different shop, reject
    if (state.selectedSellerId && state.selectedSellerId !== item.sellerId) {
      const errorMessage = `You can only order from ${state.selectedShopName} at a time. Clear your cart to order from another shop.`;
      return { success: false, message: errorMessage };
    }

    // If same item exists, increase quantity
    if (existing) {
      set({
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
      return { success: true };
    }

    // Add new item from same shop
    set({
      items: [...state.items, { ...item, quantity: 1 }],
    });
    return { success: true };
  },

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i
      ).filter((i) => i.quantity > 0),
    })),

  clearCart: () =>
    set({
      items: [],
      orderId: null,
      selectedSellerId: null,
      selectedShopName: null,
      selectedDeliveryProvider: null,
      deliveryFee: null,
      paymentMethod: 'prepay',
      deliveryAddress: null,
      pickupLocation: null,
      dropLocation: null,
    }),

  setOrderId: (orderId) =>
    set({ orderId }),

  setSelectedSeller: (sellerId, shopName) =>
    set({ selectedSellerId: sellerId, selectedShopName: shopName }),

  setDeliveryProvider: (provider) =>
    set({ selectedDeliveryProvider: provider }),

  setDeliveryFee: (fee) =>
    set({ deliveryFee: fee }),

  setPaymentMethod: (method) =>
    set({ paymentMethod: method }),

  setDeliveryAddress: (address) =>
    set({ deliveryAddress: address }),

  setPickupLocation: (location) =>
    set({ pickupLocation: location }),

  setDropLocation: (location) =>
    set({ dropLocation: location }),

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      // Use totalPrice if available (for print services), otherwise use price × quantity
      const itemTotal = item.totalPrice ? item.totalPrice * item.quantity : item.price * item.quantity;
      return sum + itemTotal;
    }, 0);
  },

  getTotal: () => {
    const { items, deliveryFee } = get();
    const subtotal = items.reduce((sum, item) => {
      // Use totalPrice if available (for print services), otherwise use price × quantity
      const itemTotal = item.totalPrice ? item.totalPrice * item.quantity : item.price * item.quantity;
      return sum + itemTotal;
    }, 0);
    return subtotal + (deliveryFee || 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
