import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { latLngToCell } from 'h3-js';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300;
  private readonly CACHE_TIMEOUT = 2000; // 2 second timeout for cache operations
  private isRedisAvailable = false;

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {
    // Check if Redis is available
    this.redisClient.on('ready', () => {
      this.isRedisAvailable = true;
      this.logger.log('✓ Redis is ready for commands');
    });

    this.redisClient.on('error', () => {
      this.isRedisAvailable = false;
    });

    // Initial check
    this.checkRedisAvailable();
  }

  /**
   * Check if Redis is available
   */
  private checkRedisAvailable(): void {
    try {
      if (!this.redisClient) {
        this.isRedisAvailable = false;
        return;
      }
      this.isRedisAvailable = this.redisClient.status === 'ready';
    } catch (err) {
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache with timeout protection
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable) {
      return null; // Return null if Redis not available
    }

    try {
      // Add timeout wrapper to prevent hanging
      const data = await Promise.race([
        this.redisClient.get(key) as Promise<string | null>,
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Cache get timeout')), this.CACHE_TIMEOUT)
        ),
      ]);
      return data ? JSON.parse(data as string) : null;
    } catch (err: any) {
      // Silently fail on timeout or connection issues
      if (err.message?.includes('timeout') || err.message?.includes('Connection')) {
        this.isRedisAvailable = false;
      }
      return null;
    }
  }

  /**
   * Set value to cache with timeout protection
   */
  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.isRedisAvailable) {
      return; // Skip if Redis not available
    }

    try {
      const ttl = Math.max(ttlSeconds, 1);
      
      // Add timeout wrapper to prevent hanging
      await Promise.race([
        this.redisClient.set(key, JSON.stringify(value), 'EX', ttl) as Promise<string>,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Cache set timeout')), this.CACHE_TIMEOUT)
        ),
      ]);
    } catch (err: any) {
      // Silently fail on timeout or connection issues
      if (err.message?.includes('timeout') || err.message?.includes('Connection')) {
        this.isRedisAvailable = false;
      }
      // Don't throw - allow operation to continue without caching
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
    return this.isRedisAvailable;
  }
}
