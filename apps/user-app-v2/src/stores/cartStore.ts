import { create } from 'zustand';
import { apiClient } from '@/api/client';
import type { CartItemApi, PrintConfig, PrintingAddToCartPayload } from '@/api/types';

export interface CartItem {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  price: number;
  quantity: number;
  isPrinting: boolean;
  printConfig?: PrintConfig;
  fileKeys?: string[];
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  total: number;
  count: number;
}

interface AddItemPayload {
  productId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  price: number;
  quantity?: number;
  isPrinting?: boolean;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;

  fetchCart: () => Promise<void>;
  addItem: (payload: AddItemPayload) => Promise<void>;
  addPrintingItem: (
    base: Omit<AddItemPayload, 'isPrinting'>,
    printConfig: PrintConfig,
    fileKeys: string[],
  ) => Promise<void>;
  updateQuantity: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => void;

  getItemByProduct: (productId: string, sellerId: string) => CartItem | undefined;
  getSellerItems: (sellerId: string) => CartItem[];
  getSellerGroups: () => SellerGroup[];
  getTotalCount: () => number;
  getTotalPrice: () => number;
  getSellerCount: (sellerId: string) => number;
  getSellerTotal: (sellerId: string) => number;
}

function apiToLocal(i: CartItemApi): CartItem {
  return {
    id: i.id,
    productId: i.productId,
    sellerId: i.sellerId,
    sellerName: i.sellerName,
    productName: i.productName,
    price: i.price,
    quantity: i.quantity,
    isPrinting: i.isPrinting,
    printConfig: i.printConfig,
    fileKeys: i.fileKeys,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,

  async fetchCart() {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<CartItemApi[]>('/cart');
      set({ items: res.data.map(apiToLocal), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  async addItem(payload) {
    const existing = get().getItemByProduct(payload.productId, payload.sellerId);
    if (existing) {
      await get().updateQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const tempId = `temp_${payload.productId}_${Date.now()}`;
    const newItem: CartItem = {
      id: tempId,
      productId: payload.productId,
      sellerId: payload.sellerId,
      sellerName: payload.sellerName,
      productName: payload.productName,
      price: payload.price,
      quantity: payload.quantity ?? 1,
      isPrinting: false,
    };
    set((s) => ({ items: [...s.items, newItem] }));

    try {
      const res = await apiClient.post<CartItemApi>('/cart/items', {
        productId: payload.productId,
        sellerId: payload.sellerId,
        quantity: payload.quantity ?? 1,
      });
      set((s) => ({
        items: s.items.map((it) =>
          it.id === tempId ? apiToLocal(res.data) : it,
        ),
      }));
    } catch {
      set((s) => ({ items: s.items.filter((it) => it.id !== tempId) }));
    }
  },

  async addPrintingItem(base, printConfig, fileKeys) {
    const tempId = `temp_print_${base.productId}_${Date.now()}`;
    const newItem: CartItem = {
      id: tempId,
      productId: base.productId,
      sellerId: base.sellerId,
      sellerName: base.sellerName,
      productName: base.productName,
      price: base.price,
      quantity: base.quantity ?? 1,
      isPrinting: true,
      printConfig,
      fileKeys,
    };
    set((s) => ({ items: [...s.items, newItem] }));

    try {
      const body: PrintingAddToCartPayload = {
        productId: base.productId,
        sellerId: base.sellerId,
        quantity: base.quantity ?? 1,
        fileKeys,
        printConfig,
      };
      const res = await apiClient.post<CartItemApi>('/cart/items', body);
      set((s) => ({
        items: s.items.map((it) =>
          it.id === tempId ? apiToLocal(res.data) : it,
        ),
      }));
    } catch {
      set((s) => ({ items: s.items.filter((it) => it.id !== tempId) }));
    }
  },

  async updateQuantity(itemId, qty) {
    if (qty <= 0) {
      await get().removeItem(itemId);
      return;
    }
    const prev = get().items.find((it) => it.id === itemId);
    set((s) => ({
      items: s.items.map((it) =>
        it.id === itemId ? { ...it, quantity: qty } : it,
      ),
    }));
    try {
      await apiClient.patch(`/cart/items/${itemId}`, { quantity: qty });
    } catch {
      if (prev) {
        set((s) => ({
          items: s.items.map((it) => (it.id === itemId ? prev : it)),
        }));
      }
    }
  },

  async removeItem(itemId) {
    const prev = get().items.find((it) => it.id === itemId);
    set((s) => ({ items: s.items.filter((it) => it.id !== itemId) }));
    try {
      if (!itemId.startsWith('temp_')) {
        await apiClient.delete(`/cart/items/${itemId}`);
      }
    } catch {
      if (prev) {
        set((s) => ({ items: [...s.items, prev] }));
      }
    }
  },

  clear: () => set({ items: [] }),

  getItemByProduct: (productId, sellerId) =>
    get().items.find(
      (it) => it.productId === productId && it.sellerId === sellerId,
    ),

  getSellerItems: (sellerId) =>
    get().items.filter((it) => it.sellerId === sellerId),

  getSellerGroups: () => {
    const items = get().items;
    const map = new Map<string, SellerGroup>();
    for (const item of items) {
      const existing = map.get(item.sellerId);
      if (existing) {
        existing.items.push(item);
        existing.total += item.price * item.quantity;
        existing.count += item.quantity;
      } else {
        map.set(item.sellerId, {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          items: [item],
          total: item.price * item.quantity,
          count: item.quantity,
        });
      }
    }
    return Array.from(map.values());
  },

  getTotalCount: () =>
    get().items.reduce((sum, it) => sum + it.quantity, 0),

  getTotalPrice: () =>
    get().items.reduce((sum, it) => sum + it.price * it.quantity, 0),

  getSellerCount: (sellerId) =>
    get()
      .items.filter((it) => it.sellerId === sellerId)
      .reduce((sum, it) => sum + it.quantity, 0),

  getSellerTotal: (sellerId) =>
    get()
      .items.filter((it) => it.sellerId === sellerId)
      .reduce((sum, it) => sum + it.price * it.quantity, 0),
}));
