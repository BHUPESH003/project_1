/**
 * MULTI-CART STORE – Manage multiple seller carts with Zustand + AsyncStorage persistence
 * 
 * This replaces the single-cart model with a multi-cart system where:
 * - Each seller has its own isolated cart
 * - Active cart = the cart for the currently browsed seller
 * - Inactive carts = carts from other sellers, accessible from dashboard
 * - Support for combined checkout (multiple carts -> multiple orders)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface CartItem {
  id: string; // Product/item ID
  productId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  totalPrice?: number; // Calculated for services (e.g., prints)
}

export interface Cart {
  sellerId: string;
  sellerName: string;
  sellerLogo?: string;
  items: CartItem[];
  updatedAt: number; // Timestamp
}

export interface CheckoutSelection {
  sellerId: string;
  deliveryAddress: { lat: number; lng: number; address: string };
  deliveryPartner: string; // 'uber_direct' | 'porter' | 'dunzo'
  deliveryFee: number;
}

interface MultiCartState {
  // ──────────────────────────────────
  // STATE
  // ──────────────────────────────────
  carts: Record<string, Cart>; // { [sellerId]: Cart }
  activeCartSellerId: string | null; // Current seller's cart being viewed
  selectedForCheckout: Set<string>; // Seller IDs selected for combined checkout

  // Shared checkout data (across multiple carts)
  sharedDeliveryAddress: { lat: number; lng: number; address: string } | null;
  checkoutSelections: Record<string, CheckoutSelection>; // { [sellerId]: CheckoutSelection }

  // ──────────────────────────────────
  // CART OPERATIONS
  // ──────────────────────────────────
  
  /**
   * Set which seller's cart is currently active
   * Used when user navigates to a seller detail/product page
   */
  setActiveCart: (sellerId: string) => void;

  /**
   * Add item to a specific seller's cart
   * If cart doesn't exist, create it
   */
  addItem: (
    sellerId: string,
    sellerName: string,
    item: Omit<CartItem, 'quantity'>,
    sellerLogo?: string
  ) => void;

  /**
   * Remove item from a specific seller's cart
   */
  removeItem: (sellerId: string, itemId: string) => void;

  /**
   * Update item quantity in a specific seller's cart
   */
  updateQuantity: (sellerId: string, itemId: string, quantity: number) => void;

  /**
   * Clear all items from a specific seller's cart but keep cart structure
   */
  clearCart: (sellerId: string) => void;

  /**
   * Clear all carts
   */
  clearAllCarts: () => void;

  // ──────────────────────────────────
  // GETTERS
  // ──────────────────────────────────

  /**
   * Get cart total (items price only, no delivery fee)
   */
  getCartTotal: (sellerId: string) => number;

  /**
   * Get item count in a seller's cart
   */
  getCartCount: (sellerId: string) => number;

  /**
   * Get all carts that have at least 1 item
   */
  getAllCartsWithItems: () => Cart[];

  /**
   * Get active cart's total item count
   */
  getActiveCartItemCount: () => number;

  /**
   * Get total number of active carts (sellers with items)
   */
  getActiveCarts: () => string[];

  // ──────────────────────────────────
  // CHECKOUT OPERATIONS
  // ──────────────────────────────────

  /**
   * Select/deselect a seller's cart for combined checkout
   */
  toggleCheckoutSelection: (sellerId: string) => void;

  /**
   * Set shared delivery address for all carts
   */
  setSharedDeliveryAddress: (
    address: { lat: number; lng: number; address: string } | null
  ) => void;

  /**
   *Set delivery partner and fee for a specific seller's cart
   */
  setCheckoutSelection: (
    sellerId: string,
    deliveryPartner: string,
    deliveryFee: number
  ) => void;

  /**
   * Get all checkout selections for selected carts
   */
  getCheckoutSelections: () => CheckoutSelection[];

  /**
   * Calculate total to pay (across all selected carts)
   */
  getTotalCheckoutAmount: () => number;

  /**
   * Clear checkout state after successful order placement
   */
  clearCheckoutState: (sellerIds?: string[]) => void;
}

// ============================================================
// ZUSTAND STORE WITH PERSISTENCE
// ============================================================

export const useMultiCartStore = create<MultiCartState>()(
  persist(
    (set, get) => ({
      // ──────────────────────────────────
      // INITIAL STATE
      // ──────────────────────────────────
      carts: {},
      activeCartSellerId: null,
      selectedForCheckout: new Set(),
      sharedDeliveryAddress: null,
      checkoutSelections: {},

      // ──────────────────────────────────
      // CART OPERATIONS
      // ──────────────────────────────────

      setActiveCart: (sellerId) => set({ activeCartSellerId: sellerId }),

      addItem: (sellerId, sellerName, item, sellerLogo) => {
        const state = get();
        const existingCart = state.carts[sellerId];

        if (!existingCart) {
          // Create new cart for this seller
          set({
            carts: {
              ...state.carts,
              [sellerId]: {
                sellerId,
                sellerName,
                sellerLogo,
                items: [{ ...item, quantity: 1 }],
                updatedAt: Date.now(),
              },
            },
            activeCartSellerId: sellerId,
          });
        } else {
          // Add to existing cart
          const existingItem = existingCart.items.find(
            (i) => i.id === item.id
          );

          const updatedItems = existingItem
            ? existingCart.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              )
            : [...existingCart.items, { ...item, quantity: 1 }];

          set({
            carts: {
              ...state.carts,
              [sellerId]: {
                ...existingCart,
                items: updatedItems,
                updatedAt: Date.now(),
              },
            },
          });
        }
      },

      removeItem: (sellerId, itemId) => {
        const state = get();
        const cart = state.carts[sellerId];

        if (!cart) return;

        const updatedItems = cart.items.filter((i) => i.id !== itemId);

        set({
          carts: {
            ...state.carts,
            [sellerId]: {
              ...cart,
              items: updatedItems,
              updatedAt: Date.now(),
            },
          },
        });
      },

      updateQuantity: (sellerId, itemId, quantity) => {
        const state = get();
        const cart = state.carts[sellerId];

        if (!cart || quantity < 0) return;

        const updatedItems = cart.items
          .map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i
          )
          .filter((i) => i.quantity > 0);

        set({
          carts: {
            ...state.carts,
            [sellerId]: {
              ...cart,
              items: updatedItems,
              updatedAt: Date.now(),
            },
          },
        });
      },

      clearCart: (sellerId) => {
        const state = get();
        const cart = state.carts[sellerId];

        if (!cart) return;

        set({
          carts: {
            ...state.carts,
            [sellerId]: {
              ...cart,
              items: [],
              updatedAt: Date.now(),
            },
          },
        });
      },

      clearAllCarts: () => {
        set({
          carts: {},
          activeCartSellerId: null,
          selectedForCheckout: new Set(),
          sharedDeliveryAddress: null,
          checkoutSelections: {},
        });
      },

      // ──────────────────────────────────
      // GETTERS
      // ──────────────────────────────────

      getCartTotal: (sellerId) => {
        const state = get();
        const cart = state.carts[sellerId];

        if (!cart) return 0;

        return cart.items.reduce((sum, item) => {
          const itemTotal = item.totalPrice
            ? item.totalPrice * item.quantity
            : item.price * item.quantity;
          return sum + itemTotal;
        }, 0);
      },

      getCartCount: (sellerId) => {
        const state = get();
        const cart = state.carts[sellerId];

        if (!cart) return 0;

        return cart.items.reduce((count, item) => count + item.quantity, 0);
      },

      getAllCartsWithItems: () => {
        const state = get();
        return Object.values(state.carts).filter((cart) => cart.items.length > 0);
      },

      getActiveCartItemCount: () => {
        const state = get();
        if (!state.activeCartSellerId) return 0;
        return get().getCartCount(state.activeCartSellerId);
      },

      getActiveCarts: () => {
        const state = get();
        return Object.keys(state.carts).filter(
          (sellerId) => state.carts[sellerId].items.length > 0
        );
      },

      // ──────────────────────────────────
      // CHECKOUT OPERATIONS
      // ──────────────────────────────────

      toggleCheckoutSelection: (sellerId) => {
        const state = get();
        const newSelection = new Set(state.selectedForCheckout);

        if (newSelection.has(sellerId)) {
          newSelection.delete(sellerId);
        } else {
          newSelection.add(sellerId);
        }

        set({ selectedForCheckout: newSelection });
      },

      setSharedDeliveryAddress: (address) => {
        set({ sharedDeliveryAddress: address });
      },

      setCheckoutSelection: (sellerId, deliveryPartner, deliveryFee) => {
        const state = get();
        set({
          checkoutSelections: {
            ...state.checkoutSelections,
            [sellerId]: {
              sellerId,
              deliveryAddress: state.sharedDeliveryAddress || {
                lat: 0,
                lng: 0,
                address: '',
              },
              deliveryPartner,
              deliveryFee,
            },
          },
        });
      },

      getCheckoutSelections: () => {
        const state = get();
        return Array.from(state.selectedForCheckout).map(
          (sellerId) => state.checkoutSelections[sellerId]
        );
      },

      getTotalCheckoutAmount: () => {
        const state = get();
        let total = 0;

        state.selectedForCheckout.forEach((sellerId) => {
          total += get().getCartTotal(sellerId);
          const selection = state.checkoutSelections[sellerId];
          if (selection) {
            total += selection.deliveryFee;
          }
        });

        return total;
      },

      clearCheckoutState: (sellerIds) => {
        set((state) => {
          const sellersToClear = sellerIds || Array.from(state.selectedForCheckout);

          // Remove cleared carts
          const updatedCarts = { ...state.carts };
          sellersToClear.forEach((sellerId) => {
            delete updatedCarts[sellerId];
          });

          // Remove from selections
          const newSelection = new Set(state.selectedForCheckout);
          sellersToClear.forEach((sellerId) => {
            newSelection.delete(sellerId);
          });

          return {
            carts: updatedCarts,
            selectedForCheckout: newSelection,
            checkoutSelections: {},
            sharedDeliveryAddress: null,
          };
        });
      },
    }),
    {
      name: 'multi-cart-store', // LocalStorage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        carts: state.carts,
        activeCartSellerId: state.activeCartSellerId,
        // Don't persist checkout state (temporary)
      }),
    }
  )
);
