/**
 * Delivery Quotes Cache Service
 * Handles silent API calls and smart caching for delivery partner quotations
 */

import { multiCartApi } from '@/api/multiCart.api';

export interface DeliveryQuote {
  id: string;
  provider: string;
  displayName: string;
  eta: string;
  price: number;
}

export interface CachedQuotes {
  sellerId: string;
  quotes: DeliveryQuote[];
  timestamp: number;
  expiresAt: number;
  userLat: number;
  userLng: number;
}

class DeliveryQuotesCacheService {
  private static instance: DeliveryQuotesCacheService;
  private cache: Map<string, CachedQuotes> = new Map();
  private readonly CACHE_TTL = 70000; // 70 seconds (60-80 range)
  private activeFetches: Map<string, Promise<CachedQuotes>> = new Map();

  private constructor() {}

  static getInstance(): DeliveryQuotesCacheService {
    if (!DeliveryQuotesCacheService.instance) {
      DeliveryQuotesCacheService.instance = new DeliveryQuotesCacheService();
    }
    return DeliveryQuotesCacheService.instance;
  }

  /**
   * Get delivery quotes - returns cached if valid, otherwise fetches silently
   * @param sellerId Seller ID
   * @param sellerLat Seller latitude
   * @param sellerLng Seller longitude
   * @param userLat User latitude
   * @param userLng User longitude
   * @param userAddress User address
   * @returns Delivery quotes for the address pair
   */
  async getDeliveryQuotes(
    sellerId: string,
    sellerLat: number,
    sellerLng: number,
    userLat: number,
    userLng: number,
    userAddress: string,
  ): Promise<DeliveryQuote[]> {
    const cacheKey = this.generateCacheKey(sellerId, userLat, userLng);

    // Check if valid cached data exists
    const cached = this.getValidCached(cacheKey, userLat, userLng);
    if (cached) {
      console.log(`✓ Using cached delivery quotes for ${sellerId}`);
      return cached.quotes;
    }

    // If fetch already in progress for this key, wait for it
    if (this.activeFetches.has(cacheKey)) {
      console.log(`⏳ Waiting for in-progress fetch for ${sellerId}`);
      const result = await this.activeFetches.get(cacheKey)!;
      return result.quotes;
    }

    // Start silent fetch (no loading indicator)
    this.fetchQuotesSilently(
      cacheKey,
      sellerId,
      sellerLat,
      sellerLng,
      userLat,
      userLng,
      userAddress,
    );

    // Return mock data immediately while fetch happens in background
    return this.getMockDeliveryQuotes();
  }

  /**
   * Silently fetch delivery quotes in background
   * Does NOT block UI or show loading indicators
   */
  private async fetchQuotesSilently(
    cacheKey: string,
    sellerId: string,
    sellerLat: number,
    sellerLng: number,
    userLat: number,
    userLng: number,
    userAddress: string,
  ): Promise<void> {
    try {
      // Create fetch promise
      const fetchPromise = (async () => {
        try {
          // Fetch from API
          const response = await multiCartApi.getSellerDeliveryQuotes(
            sellerId,
            userLat, // delivery location (user's location)
            userLng,
            userAddress,
          );

          // Parse response into our format
          const quotes: DeliveryQuote[] = response.providers.map((provider, index) => ({
            id: provider.quoteId || `${provider.provider}-${index}`,
            provider: provider.provider || 'UNKNOWN',
            displayName: provider.displayName || provider.provider || 'Unknown',
            eta: provider.estimatedDurationMinutes 
              ? `${provider.estimatedDurationMinutes} min`
              : 'N/A',
            price: provider.estimatedFee || 0,
          }));

          // Cache the results
          const cached: CachedQuotes = {
            sellerId,
            quotes,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.CACHE_TTL,
            userLat,
            userLng,
          };

          this.cache.set(cacheKey, cached);
          console.log(`✓ Cached delivery quotes for ${sellerId} (${quotes.length} providers)`);

          return cached;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch delivery quotes for ${sellerId}:`, error);
          // Return mock data on error - don't throw
          return {
            sellerId,
            quotes: this.getMockDeliveryQuotes(),
            timestamp: Date.now(),
            expiresAt: Date.now() + this.CACHE_TTL,
            userLat,
            userLng,
          };
        }
      })();

      // Store the fetch promise to prevent duplicate requests
      this.activeFetches.set(cacheKey, fetchPromise);

      // Wait and update cache
      await fetchPromise;

      // Clean up the fetch promise reference after 5 seconds
      setTimeout(() => {
        this.activeFetches.delete(cacheKey);
      }, 5000);
    } catch (error) {
      console.error(`Error in silent fetch for ${sellerId}:`, error);
      this.activeFetches.delete(cacheKey);
    }
  }

  /**
   * Get valid cached quotes if they exist and haven't expired
   */
  private getValidCached(
    cacheKey: string,
    userLat: number,
    userLng: number,
  ): CachedQuotes | null {
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      console.log(`Cache expired for ${cacheKey}`);
      this.cache.delete(cacheKey);
      return null;
    }

    // Check if user location is close enough (within ~1km)
    const distance = this.getDistance(userLat, userLng, cached.userLat, cached.userLng);
    if (distance > 1) {
      console.log(`User moved too far (${distance.toFixed(2)}km), need fresh quotes`);
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Calculate distance between two coordinates (in km)
   * Using Haversine formula
   */
  private getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate cache key based on seller and location
   */
  private generateCacheKey(
    sellerId: string,
    userLat: number,
    userLng: number,
  ): string {
    // Round coordinates to 2 decimal places for cache key
    // (~1km precision, good enough for delivery quotes)
    const latRounded = Math.round(userLat * 100) / 100;
    const lngRounded = Math.round(userLng * 100) / 100;
    return `${sellerId}:${latRounded}:${lngRounded}`;
  }

  /**
   * Get mock delivery quotes (shown while real quotes are being fetched)
   */
  private getMockDeliveryQuotes(): DeliveryQuote[] {
    return [
      {
        id: 'uber-1',
        provider: 'Uber Direct',
        displayName: 'Uber Direct',
        eta: '10-15 min',
        price: 50,
      },
      {
        id: 'porter-1',
        provider: 'Porter',
        displayName: 'Porter',
        eta: '15-20 min',
        price: 40,
      },
      {
        id: 'dunzo-1',
        provider: 'Dunzo',
        displayName: 'Dunzo',
        eta: '20-25 min',
        price: 30,
      },
    ];
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Delivery quotes cache cleared');
  }

  /**
   * Clear cache for specific seller
   */
  clearSellerCache(sellerId: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(sellerId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats (for debugging)
   */
  getCacheStats(): { cacheSize: number; entries: string[] } {
    return {
      cacheSize: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const deliveryQuotesCacheService =
  DeliveryQuotesCacheService.getInstance();
