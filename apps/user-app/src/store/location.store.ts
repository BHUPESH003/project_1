/**
 * Location store – device location for sellers discovery and delivery quote.
 * Uses expo-location; no backend for "saved addresses" in MVP (backend has no addresses API).
 */

import { create } from 'zustand';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  label?: string;
}

interface LocationState {
  coords: LocationCoords | null;
  loading: boolean;
  error: string | null;
  fetchLocation: () => Promise<LocationCoords | null>;
  setLabel: (label: string) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  loading: false,
  error: null,

  fetchLocation: async () => {
    set({ loading: true, error: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ loading: false, error: 'Location permission denied', coords: null });
        return null;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      set({ coords, loading: false, error: null });
      return coords;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to get location';
      set({ loading: false, error: message, coords: null });
      return null;
    }
  },

  setLabel: (label: string) => {
    const { coords } = get();
    if (coords) set({ coords: { ...coords, label } });
  },
}));
