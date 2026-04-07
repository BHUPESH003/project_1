/**
 * Checkout Store – Per-seller delivery selection, payment, and flow state
 *
 * Manages the multi-seller checkout flow:
 * 1. Checkout screen (review items per seller + address)
 * 2. Delivery options (fetch & select per-seller delivery)
 * 3. Payment (select method, pay)
 * 4. Success / Failure
 */

import { create } from 'zustand';
import type { Cart, CartItem } from './multiCartStore';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type CheckoutStep = 'checkout' | 'delivery' | 'payment' | 'success' | 'failure';

export interface DeliveryOption {
  id: string;            // provider key e.g. 'UBER_DIRECT'
  provider: string;
  displayName: string;
  estimatedFee: number;
  estimatedDurationMinutes: number;
  rating?: number;
  quoteId?: string;
  badge?: 'FASTEST' | 'BEST VALUE' | null;
}

export interface CheckoutSeller {
  sellerId: string;
  sellerName: string;
  sellerLogo?: string;
  category?: string;
  items: CartItem[];
  subtotal: number;
  deliveryOptions: DeliveryOption[];
  selectedDeliveryOptionId: string | null;
}

export interface CheckoutAddress {
  id?: string;
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

export type PaymentMethod =
  | 'UPI_GPAY'
  | 'UPI_PHONEPE'
  | 'UPI_PAYTM'
  | 'CARD'
  | null;

export interface CreatedOrder {
  orderId: string;
  sellerId: string;
  sellerName: string;
  subtotal: number;
  pricing?: {
    itemCost: number;
    deliveryFee: number;
    totalAmount: number;
  };
}

interface CheckoutState {
  // ── Flow State ──────────────────────────────────────
  step: CheckoutStep;
  sellers: CheckoutSeller[];
  selectedAddress: CheckoutAddress | null; // "Same for all" address
  addressMode: 'same' | 'different';
  perSellerAddresses: Record<string, CheckoutAddress>;
  orders: CreatedOrder[];

  // ── Totals ──────────────────────────────────────────
  itemTotal: number;
  deliveryTotal: number;
  taxesAndFees: number;
  serviceFee: number;
  grandTotal: number;

  // ── Payment ─────────────────────────────────────────
  selectedPaymentMethod: PaymentMethod;

  // ── Actions ─────────────────────────────────────────

  /** Initialize checkout from multi-cart carts */
  initFromCarts: (
    carts: Cart[], 
    address: CheckoutAddress | null, 
    mode?: 'same' | 'different',
    perSeller?: Record<string, CheckoutAddress>
  ) => void;

  /** Set the step */
  setStep: (step: CheckoutStep) => void;

  /** Update the "Same for all" address */
  setAddress: (address: CheckoutAddress) => void;

  /** Set address mode */
  setAddressMode: (mode: 'same' | 'different') => void;

  /** Set address for a specific seller */
  setPerSellerAddress: (sellerId: string, address: CheckoutAddress) => void;

  /** Set delivery options for a seller (from API) */
  setDeliveryOptions: (sellerId: string, options: DeliveryOption[]) => void;

  /** Select a delivery option for a seller */
  selectDeliveryOption: (sellerId: string, optionId: string) => void;

  /** Store created orders from API */
  setOrders: (orders: CreatedOrder[]) => void;

  /** Set explicit fees (from API) */
  setFees: (taxes: number, service: number) => void;

  /** Select payment method */
  selectPaymentMethod: (method: PaymentMethod) => void;

  /** Recalculate all totals */
  recalculateTotals: () => void;

  /** Reset the entire checkout state */
  reset: () => void;

  // ── Getters ─────────────────────────────────────────

  /** Get the selected delivery option for a seller */
  getSelectedDeliveryOption: (sellerId: string) => DeliveryOption | null;

  /** Get total delivery fee across all sellers */
  getTotalDeliveryFee: () => number;

  /** Check if all sellers have a delivery option selected */
  allDeliveryOptionsSelected: () => boolean;

  /** Get the address for a seller based on current mode */
  getSellerAddress: (sellerId: string) => CheckoutAddress | null;
}

// ============================================================
// HELPERS
// ============================================================

function calculateItemTotal(sellers: CheckoutSeller[]): number {
  return sellers.reduce((sum, s) => sum + s.subtotal, 0);
}

function calculateDeliveryTotal(sellers: CheckoutSeller[]): number {
  return sellers.reduce((sum, s) => {
    const selected = s.deliveryOptions.find((o) => o.id === s.selectedDeliveryOptionId);
    return sum + (selected?.estimatedFee ?? 0);
  }, 0);
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const itemTotal = item.totalPrice
      ? item.totalPrice * item.quantity
      : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);
}

// ============================================================
// STORE
// ============================================================

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  // ── Initial State ─────────────────────────────────
  step: 'checkout',
  sellers: [],
  selectedAddress: null,
  addressMode: 'same',
  perSellerAddresses: {},
  orders: [],
  itemTotal: 0,
  deliveryTotal: 0,
  taxesAndFees: 0,
  serviceFee: 0,
  grandTotal: 0,
  selectedPaymentMethod: null,

  // ── Actions ─────────────────────────────────────────

  initFromCarts: (carts, address, mode = 'same', perSeller = {}) => {
    const sellers: CheckoutSeller[] = carts
      .filter((c) => c.items.length > 0)
      .map((cart) => ({
        sellerId: cart.sellerId,
        sellerName: cart.sellerName,
        sellerLogo: cart.sellerLogo,
        category: cart.items[0]?.category ?? undefined,
        items: cart.items,
        subtotal: calculateSubtotal(cart.items),
        deliveryOptions: [],
        selectedDeliveryOptionId: null,
      }));

    const itemTotal = calculateItemTotal(sellers);

    set({
      step: 'checkout',
      sellers,
      selectedAddress: address,
      addressMode: mode,
      perSellerAddresses: perSeller,
      orders: [],
      itemTotal,
      deliveryTotal: 0,
      taxesAndFees: 0,
      serviceFee: 0,
      grandTotal: itemTotal, // Initial total without taxes/delivery
      selectedPaymentMethod: null,
    });
  },

  setStep: (step) => set({ step }),

  setAddress: (address) => set({ selectedAddress: address }),

  setAddressMode: (addressMode) => set({ addressMode }),

  setPerSellerAddress: (sellerId, address) => {
    set((state) => ({
      perSellerAddresses: {
        ...state.perSellerAddresses,
        [sellerId]: address,
      },
    }));
  },

  setDeliveryOptions: (sellerId, options) => {
    set((state) => {
      // Tag badges
      const tagged = options.map((opt) => {
        const badge = opt.badge ?? null;
        return { ...opt, badge };
      });

      // Identify cheapest and fastest
      if (tagged.length > 0) {
        const cheapest = [...tagged].sort((a, b) => a.estimatedFee - b.estimatedFee)[0];
        const fastest = [...tagged].sort(
          (a, b) => a.estimatedDurationMinutes - b.estimatedDurationMinutes,
        )[0];

        tagged.forEach((opt) => {
          if (opt.id === cheapest!.id && opt.id !== fastest!.id) {
            opt.badge = 'BEST VALUE';
          } else if (opt.id === fastest!.id && opt.id !== cheapest!.id) {
            opt.badge = 'FASTEST';
          }
        });
      }

      const updatedSellers = state.sellers.map((s) => {
        if (s.sellerId !== sellerId) return s;

        // Auto-select cheapest
        const cheapest = [...tagged].sort((a, b) => a.estimatedFee - b.estimatedFee)[0];

        return {
          ...s,
          deliveryOptions: tagged,
          selectedDeliveryOptionId: cheapest?.id ?? null,
        };
      });

      const deliveryTotal = calculateDeliveryTotal(updatedSellers);

      return {
        sellers: updatedSellers,
        deliveryTotal,
        grandTotal: state.itemTotal + state.taxesAndFees + state.serviceFee + deliveryTotal,
      };
    });
  },

  selectDeliveryOption: (sellerId, optionId) => {
    set((state) => {
      const updatedSellers = state.sellers.map((s) => {
        if (s.sellerId !== sellerId) return s;
        return { ...s, selectedDeliveryOptionId: optionId };
      });

      const deliveryTotal = calculateDeliveryTotal(updatedSellers);

      return {
        sellers: updatedSellers,
        deliveryTotal,
        grandTotal: state.itemTotal + state.taxesAndFees + state.serviceFee + deliveryTotal,
      };
    });
  },

  setOrders: (orders) => {
    let totalTaxesAndFees = 0;
    orders.forEach((o) => {
      if (o.pricing) {
        // taxes = total - itemCost - deliveryFee
        const orderTaxes = o.pricing.totalAmount - (o.pricing.itemCost + o.pricing.deliveryFee);
        totalTaxesAndFees += Math.max(0, orderTaxes);
      }
    });

    set((state) => ({
      orders,
      taxesAndFees: totalTaxesAndFees,
      grandTotal:
        state.itemTotal + state.deliveryTotal + totalTaxesAndFees + state.serviceFee,
    }));
  },

  setFees: (taxesAndFees, serviceFee) => {
    set((state) => ({
      taxesAndFees,
      serviceFee,
      grandTotal: state.itemTotal + state.deliveryTotal + taxesAndFees + serviceFee,
    }));
  },

  selectPaymentMethod: (method) => set({ selectedPaymentMethod: method }),

  recalculateTotals: () => {
    set((state) => {
      const itemTotal = calculateItemTotal(state.sellers);
      const deliveryTotal = calculateDeliveryTotal(state.sellers);
      return {
        itemTotal,
        deliveryTotal,
        grandTotal: itemTotal + deliveryTotal + state.taxesAndFees + state.serviceFee,
      };
    });
  },

  reset: () =>
    set({
      step: 'checkout',
      sellers: [],
      selectedAddress: null,
      addressMode: 'same',
      perSellerAddresses: {},
      orders: [],
      itemTotal: 0,
      deliveryTotal: 0,
      taxesAndFees: 0,
      serviceFee: 0,
      grandTotal: 0,
      selectedPaymentMethod: null,
    }),

  // ── Getters ─────────────────────────────────────────

  getSelectedDeliveryOption: (sellerId) => {
    const seller = get().sellers.find((s) => s.sellerId === sellerId);
    if (!seller || !seller.selectedDeliveryOptionId) return null;
    return seller.deliveryOptions.find((o) => o.id === seller.selectedDeliveryOptionId) ?? null;
  },

  getTotalDeliveryFee: () => {
    return calculateDeliveryTotal(get().sellers);
  },

  allDeliveryOptionsSelected: () => {
    return get().sellers.every((s) => s.selectedDeliveryOptionId !== null);
  },

  getSellerAddress: (sellerId) => {
    const state = get();
    if (state.addressMode === 'different') {
      return state.perSellerAddresses[sellerId] ?? null;
    }
    return state.selectedAddress;
  },
}));
