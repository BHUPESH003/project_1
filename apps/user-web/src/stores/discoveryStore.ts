import { create } from 'zustand'

/**
 * Lightweight cross-component channel for home-discovery signals that the
 * global Header needs but can't compute itself (it has no access to the seller
 * list). HomePage publishes the nearest-seller delivery ETA here; the Header
 * reads it to render "Delivery in ~X min".
 */
interface DiscoveryState {
  /** Nearest available seller's estimated delivery time in minutes, or null. */
  nearestEtaMins: number | null
  setNearestEta: (mins: number | null) => void
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  nearestEtaMins: null,
  setNearestEta: (nearestEtaMins) => set({ nearestEtaMins }),
}))
