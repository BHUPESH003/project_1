import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (toast: { type?: ToastType; message: string; duration?: number }) => void
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: ({ type = 'info', message, duration = 3000 }) => {
    counter += 1
    const id = `t-${counter}-${performance.now().toFixed(0)}`
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative helper usable outside React (e.g. axios interceptors). */
export const toast = {
  success: (message: string) => useToastStore.getState().show({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().show({ type: 'error', message }),
  info: (message: string) => useToastStore.getState().show({ type: 'info', message }),
  warning: (message: string) => useToastStore.getState().show({ type: 'warning', message }),
}
