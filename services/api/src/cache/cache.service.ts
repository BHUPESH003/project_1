import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { latLngToCell } from 'h3-js';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300;
  private readonly CACHE_TIMEOUT = 1000; // 1 second timeout for cache operations

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  /**
   * Get value from cache with timeout protection
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Add timeout wrapper to prevent hanging
      const data = await Promise.race([
        this.redisClient.get(key),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Cache get timeout')), this.CACHE_TIMEOUT)
        ),
      ]);
      return data ? JSON.parse(data as string) : null;
    } catch (err: any) {
      // Don't log every cache miss, only actual errors
      if (err.message !== 'Cache get timeout' && !err.message.includes('read')) {
        this.logger.debug(`Cache get issue (${key}): ${err.message}`);
      }
      return null; // Graceful fallback
    }
  }

  /**
   * Set value to cache with timeout protection
   */
  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const ttl = Math.max(ttlSeconds, 1);
      
      // Add timeout wrapper to prevent hanging
      await Promise.race([
        this.redisClient.set(key, JSON.stringify(value), 'EX', ttl),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Cache set timeout')), this.CACHE_TIMEOUT)
        ),
      ]);
    } catch (err: any) {
      // Don't block operations if cache fails
      this.logger.debug(`Cache set issue (${key}): ${err.message}`);
    }
  }

  /**
   * Get geo-hash zone key for location-based caching
   */
  getZoneKey(lat: number, lng: number, resolution: number = 8): string {
    try {
      const h3Index = latLngToCell(lat, lng, resolution);
      return 'zone:' + h3Index + ':stores';
    } catch (err: any) {
      this.logger.warn(`Failed to generate zone key: ${err.message}`);
      return '';
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.redisClient?.status === 'ready';
  }
}
