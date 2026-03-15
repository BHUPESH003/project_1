import { create } from 'zustand';

interface FavoriteStore {
  favoriteIds: string[];
  addFavoriteOptimistic: (id: string) => void;
  removeFavoriteOptimistic: (id: string) => void;
  rollbackFavorite: (id: string, wasAdded: boolean) => void;
}

export const useFavoriteStore = create<FavoriteStore>((set) => ({
  favoriteIds: [],
  addFavoriteOptimistic: (id) => set((state) => ({
    favoriteIds: [...state.favoriteIds, id].filter((val, i, arr) => arr.indexOf(val) === i)
  })),
  removeFavoriteOptimistic: (id) => set((state) => ({
    favoriteIds: state.favoriteIds.filter(fId => fId !== id)
  })),
  rollbackFavorite: (id, wasAdded) => set((state) => ({
    favoriteIds: wasAdded 
      ? state.favoriteIds.filter(fId => fId !== id) 
      : [...state.favoriteIds, id].filter((val, i, arr) => arr.indexOf(val) === i)
  }))
}));

interface CartStore {
    cartItems: Record<string, number>;
    setCartItemOptimistic: (id: string, quantity: number) => void;
    rollbackCartItem: (id: string, previousQuantity: number) => void;
}

export const useCartStore = create<CartStore>((set) => ({
    cartItems: {},
    setCartItemOptimistic: (id, quantity) => set((state) => ({
        cartItems: { ...state.cartItems, [id]: quantity }
    })),
    rollbackCartItem: (id, previousQuantity) => set((state) => ({
        cartItems: { ...state.cartItems, [id]: previousQuantity }
    }))
}));