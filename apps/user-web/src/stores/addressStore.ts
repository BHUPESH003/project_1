import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** A resolved delivery location — either a saved address or an ad-hoc pin. */
export interface SelectedAddress {
  id?: string
  label: string
  /** Full delivery address: flat/building/street. Required before placing an order. */
  addressLine: string
  /** Set after the user confirms full details at order time. */
  receiverName?: string | null
  receiverPhone?: string | null
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
