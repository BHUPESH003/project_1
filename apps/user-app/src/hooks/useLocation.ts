/**
 * useLocation – fetch and use device location for sellers/delivery.
 */

import { useEffect } from 'react';
import { useLocationStore } from '@/store/location.store';

export function useLocation() {
  const { coords, loading, error, fetchLocation } = useLocationStore();

  useEffect(() => {
    if (coords == null && !loading && !error) {
      fetchLocation();
    }
  }, [coords, loading, error, fetchLocation]);

  return { coords, loading, error, refetch: fetchLocation };
}
