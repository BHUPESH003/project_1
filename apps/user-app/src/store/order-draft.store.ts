/**
 * Order draft – file + options before create order.
 * Cleared after order is created or user abandons flow.
 */

import { create } from 'zustand';

export interface OrderDraftFile {
  fileKey: string;
  publicUrl: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  pageCount?: number;
}

export interface OrderDraftOptions {
  pages: number;
  copies: number;
  color: boolean;
}

interface OrderDraftState {
  file: OrderDraftFile | null;
  options: OrderDraftOptions;
  orderId: string | null;
  deliveryProvider?: string | null;
  deliveryFee?: number | null;
  deliveryAddressId?: string | null;
  setFile: (file: OrderDraftFile | null) => void;
  setOptions: (options: Partial<OrderDraftOptions>) => void;
  setOrderId: (id: string | null) => void;
  setDeliveryProvider: (provider: string | null) => void;
  setDeliveryFee: (fee: number | null) => void;
  setDeliveryAddressId: (id: string | null) => void;
  reset: () => void;
}

const defaultOptions: OrderDraftOptions = {
  pages: 1,
  copies: 1,
  color: false,
};

export const useOrderDraftStore = create<OrderDraftState>((set) => ({
  file: null,
  options: defaultOptions,
  orderId: null,
  deliveryProvider: null,
  deliveryFee: null,
  deliveryAddressId: null,
  setFile: (file) => set({ file }),
  setOptions: (opts) => set((s) => ({ options: { ...s.options, ...opts } })),
  setOrderId: (orderId) => set({ orderId }),
  setDeliveryProvider: (deliveryProvider) => set({ deliveryProvider }),
  setDeliveryFee: (deliveryFee) => set({ deliveryFee }),
  setDeliveryAddressId: (deliveryAddressId) => set({ deliveryAddressId }),
  reset: () => set({ file: null, options: defaultOptions, orderId: null, deliveryProvider: null, deliveryFee: null, deliveryAddressId: null }),
}));
