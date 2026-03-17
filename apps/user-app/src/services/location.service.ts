/**
 * Location Service
 * Handles user location permissions and coordinates
 */

import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

class LocationService {
  private static instance: LocationService;
  private userLocation: UserLocation | null = null;
  private locationUpdateListeners: ((location: UserLocation) => void)[] = [];

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permission from user
   * Called once on app load/dashboard
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return false;
      }

      // Get current location
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get user's current location
   */
  async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get reverse geocode for address
      let address = `${location.coords.latitude}, ${location.coords.longitude}`;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          address = [geo.street, geo.city, geo.postalCode]
            .filter(Boolean)
            .join(', ') || address;
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed:', geoError);
      }

      this.userLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        timestamp: Date.now(),
      };

      // Notify listeners
      this.notifyListeners();

      return this.userLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get cached user location (doesn't make new location request)
   */
  getUserLocation(): UserLocation | null {
    return this.userLocation;
  }

  /**
   * Set user location (for testing or manual override)
   */
  setUserLocation(location: UserLocation): void {
    this.userLocation = location;
    this.notifyListeners();
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: (location: UserLocation) => void): () => void {
    this.locationUpdateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.locationUpdateListeners = this.locationUpdateListeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  /**
   * Notify all listeners of location update
   */
  private notifyListeners(): void {
    if (this.userLocation) {
      this.locationUpdateListeners.forEach((listener) =>
        listener(this.userLocation!)
      );
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }
}

export const locationService = LocationService.getInstance();
