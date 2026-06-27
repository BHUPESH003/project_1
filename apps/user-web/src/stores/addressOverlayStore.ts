import { create } from 'zustand'

interface AddressOverlayState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAddressOverlayStore = create<AddressOverlayState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
