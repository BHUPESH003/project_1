import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDRESS_KEY = '@app/selected_address';
const RECENT_KEY = '@app/recent_addresses';
const MAX_RECENT = 5;

export interface SelectedAddress {
  lat: number;
  lng: number;
  label: string;
  fullAddress: string;
  placeId?: string;
}

interface AddressState {
  selectedAddress: SelectedAddress | null;
  hasAddress: boolean;
  recentAddresses: SelectedAddress[];

  setAddress: (address: SelectedAddress) => Promise<void>;
  clearAddress: () => Promise<void>;
  restoreAddress: () => Promise<void>;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  selectedAddress: null,
  hasAddress: false,
  recentAddresses: [],

  async setAddress(address) {
    await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(address));

    // Maintain recents (dedupe by placeId or fullAddress)
    const current = get().recentAddresses;
    const deduped = current.filter(
      (a) =>
        a.fullAddress !== address.fullAddress &&
        !(address.placeId && a.placeId === address.placeId),
    );
    const next = [address, ...deduped].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));

    set({ selectedAddress: address, hasAddress: true, recentAddresses: next });
  },

  async clearAddress() {
    await AsyncStorage.removeItem(ADDRESS_KEY);
    set({ selectedAddress: null, hasAddress: false });
  },

  async restoreAddress() {
    try {
      const [addrJson, recentJson] = await AsyncStorage.multiGet([
        ADDRESS_KEY,
        RECENT_KEY,
      ]);
      const addr = addrJson[1] ? (JSON.parse(addrJson[1]) as SelectedAddress) : null;
      const recent = recentJson[1]
        ? (JSON.parse(recentJson[1]) as SelectedAddress[])
        : [];
      set({
        selectedAddress: addr,
        hasAddress: Boolean(addr),
        recentAddresses: recent,
      });
    } catch {
      // ignore
    }
  },
}));
