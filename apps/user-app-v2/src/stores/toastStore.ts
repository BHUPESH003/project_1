import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  hide: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show(toast) {
    const id = String(++counter);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 3000);
  },
  hide(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

// Convenience helper
export function showToast(toast: Omit<ToastItem, 'id'>) {
  useToastStore.getState().show(toast);
}
