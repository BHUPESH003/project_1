import { create } from 'zustand'
import type { SellerOrderSummary } from '@/types/api'

interface AlertState {
  /** The order currently being announced full-screen (null = no alert). */
  alertingOrder: SellerOrderSummary | null
  /** Has the user gestured at least once so the AudioContext can play? */
  audioUnlocked: boolean
  triggerAlert: (order: SellerOrderSummary) => void
  dismissAlert: () => void
  setAudioUnlocked: (v: boolean) => void
}

/**
 * Client-only state for the new-order alert overlay. The order data itself is
 * owned by React Query; this store only tracks which order (if any) is being
 * announced and whether audio has been unlocked by a user gesture.
 */
export const useAlertStore = create<AlertState>((set) => ({
  alertingOrder: null,
  audioUnlocked: false,
  triggerAlert: (order) => set({ alertingOrder: order }),
  dismissAlert: () => set({ alertingOrder: null }),
  setAudioUnlocked: (v) => set({ audioUnlocked: v }),
}))
