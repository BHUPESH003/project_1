import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** A resolved delivery location — either a saved address or an ad-hoc pin. */
export interface SelectedAddress {
  id?: string
  label: string
  addressLine: string
  latitude: number
  longitude: number
}

interface AddressState {
  selectedAddress: SelectedAddress | null
  setAddress: (address: SelectedAddress) => void
  clear: () => void
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      selectedAddress: null,
      setAddress: (selectedAddress) => set({ selectedAddress }),
      clear: () => set({ selectedAddress: null }),
    }),
    { name: 'address-storage' },
  ),
)
