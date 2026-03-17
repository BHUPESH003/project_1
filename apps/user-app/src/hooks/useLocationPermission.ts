/**
 * useLocationPermission Hook
 * Request location permission on app load
 */

import { useEffect, useState } from 'react';
import { locationService, UserLocation } from '@/services/location.service';

export const useLocationPermission = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const requestLocation = async () => {
      setIsRequesting(true);
      try {
        // Check current permission
        const hasPermission = await locationService.checkPermission();
        
        if (!hasPermission) {
          // Request permission
          await locationService.requestLocationPermission();
        }

        // Get current location
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Error requesting location:', error);
      } finally {
        setIsRequesting(false);
      }
    };

    requestLocation();

    // Subscribe to location updates
    const unsubscribe = locationService.onLocationUpdate((location) => {
      setUserLocation(location);
    });

    return unsubscribe;
  }, []);

  return { userLocation, isRequesting };
};
