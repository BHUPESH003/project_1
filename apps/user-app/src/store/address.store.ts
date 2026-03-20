/**
 * Global Address Store – single source of truth for addresses across the app.
 *
 * Replaces: location.store.ts, location.service.ts, useLocation.ts, useLocationPermission.ts
 *
 * Persists: selectedAddress + recentAddresses via AsyncStorage.
 * Syncs savedAddresses with backend API.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { usersApi, type UserAddressItem } from '@/api/users.api';
import type { Address } from '@/types/address';

const MAX_RECENT = 5;

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface AddressState {
  /* ── State ─────────────────────────────────────── */
  selectedAddress: Address | null;
  savedAddresses: Address[];
  recentAddresses: Address[];
  locationPermissionStatus: PermissionStatus;
  loading: boolean;
  error: string | null;

  /** Controls AddressSelector modal visibility app-wide. */
  selectorVisible: boolean;

  /* ── Actions ───────────────────────────────────── */
  /** Select an address as the active delivery address. Also adds to recents. */
  selectAddress: (addr: Address) => void;

  /** Request permission → fetch GPS → reverse geocode → set as selected. */
  fetchCurrentLocation: () => Promise<Address | null>;

  /** Load saved addresses from the backend API. */
  loadSavedAddresses: () => Promise<void>;

  /** Save a new address to the backend and select it. */
  saveAddress: (addr: Omit<Address, 'id'>) => Promise<Address | null>;

  /** Delete a saved address from the backend. */
  deleteAddress: (id: string) => Promise<void>;

  /** Show / hide the AddressSelector modal. */
  setSelectorVisible: (v: boolean) => void;
}

/**
 * Convert backend UserAddressItem → canonical Address.
 */
function toAddress(api: UserAddressItem): Address {
  return {
    id: api.id,
    label: api.label,
    fullAddress: api.addressLine,
    lat: api.latitude ?? 0,
    lng: api.longitude ?? 0,
  };
}

/**
 * Add an address to the front of recents, de-duplicate by id, cap at MAX_RECENT.
 */
function pushRecent(recents: Address[], addr: Address): Address[] {
  const filtered = recents.filter((r) => r.id !== addr.id);
  return [addr, ...filtered].slice(0, MAX_RECENT);
}

/**
 * Generate a local id for device-detected or manually-entered addresses.
 */
function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      selectedAddress: null,
      savedAddresses: [],
      recentAddresses: [],
      locationPermissionStatus: 'undetermined',
      loading: false,
      error: null,
      selectorVisible: false,

      /* ── selectAddress ─────────────────────────── */
      selectAddress: (addr: Address) => {
        set({
          selectedAddress: addr,
          recentAddresses: pushRecent(get().recentAddresses, addr),
          selectorVisible: false,
        });
      },

      /* ── fetchCurrentLocation ──────────────────── */
      fetchCurrentLocation: async () => {
        set({ loading: true, error: null });
        try {
          // 1. Request permission
          const { status } = await Location.requestForegroundPermissionsAsync();
          const permStatus: PermissionStatus = status === 'granted' ? 'granted' : 'denied';
          set({ locationPermissionStatus: permStatus });

          if (permStatus !== 'granted') {
            set({ loading: false, error: 'Location permission denied' });
            return null;
          }

          // 2. Get coordinates
          let loc = await Location.getLastKnownPositionAsync();
          if (!loc) {
            loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
          }

          const { latitude, longitude } = loc.coords;

          // 3. Reverse geocode
          let addressLine = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          try {
            const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geo) {
              addressLine =
                [geo.streetNumber, geo.street, geo.district, geo.city]
                  .filter(Boolean)
                  .join(', ') || addressLine;
            }
          } catch {
            // fallback to coords string
          }

          const addr: Address = {
            id: localId(),
            label: 'Current Location',
            fullAddress: addressLine,
            lat: latitude,
            lng: longitude,
          };

          set({
            selectedAddress: addr,
            recentAddresses: pushRecent(get().recentAddresses, addr),
            loading: false,
            error: null,
          });

          return addr;
        } catch (e) {
          // Fail silently — UI will show fallback
          set({ loading: false, error: null, selectedAddress: null });
          return null;
        }
      },

      /* ── loadSavedAddresses ────────────────────── */
      loadSavedAddresses: async () => {
        try {
          const apiAddresses = await usersApi.getMyAddresses();
          set({ savedAddresses: apiAddresses.map(toAddress) });
        } catch {
          // Keep existing savedAddresses on failure
        }
      },

      /* ── saveAddress ───────────────────────────── */
      saveAddress: async (draft) => {
        try {
          const created = await usersApi.addAddress({
            label: draft.label,
            addressLine: draft.fullAddress,
            latitude: draft.lat,
            longitude: draft.lng,
          });

          const addr = toAddress(created);

          set((state) => ({
            savedAddresses: [...state.savedAddresses, addr],
            selectedAddress: addr,
            recentAddresses: pushRecent(state.recentAddresses, addr),
            selectorVisible: false,
          }));

          return addr;
        } catch {
          return null;
        }
      },

      /* ── deleteAddress ─────────────────────────── */
      deleteAddress: async (id: string) => {
        try {
          await usersApi.deleteAddress(id);
          set((state) => ({
            savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
            // If the deleted address was selected, clear it
            selectedAddress: state.selectedAddress?.id === id ? null : state.selectedAddress,
          }));
        } catch {
          // Swallow — UI can refetch
        }
      },

      /* ── setSelectorVisible ────────────────────── */
      setSelectorVisible: (v) => set({ selectorVisible: v }),
    }),
    {
      name: 'address-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedAddress: state.selectedAddress,
        recentAddresses: state.recentAddresses,
      }),
    }
  )
);

export default useAddressStore;
