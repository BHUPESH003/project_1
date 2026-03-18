import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { latLngToCell } from 'h3-js';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300;
  private readonly CACHE_TIMEOUT = 5000; // 5 second timeout for cache operations (prevents premature timeouts)
  private isRedisAvailable = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {
    this.logger.log('🚀 CacheService initialized');

    // Create a promise that resolves when Redis is ready
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    // Setup event handlers
    this.redisClient.on('ready', () => {
      this.isRedisAvailable = true;
      this.logger.log('✅ CacheService: Redis is ready for commands');
      // Resolve the ready promise
      if (this.readyResolve) {
        this.readyResolve();
        this.logger.log(
          '✅ CacheService: readyPromise resolved - cache operations can proceed',
        );
      }
    });

    this.redisClient.on('error', (err: any) => {
      this.isRedisAvailable = false;
      this.logger.warn(`⚠️ CacheService: Redis error: ${err.message}`);
    });

    this.redisClient.on('close', () => {
      this.isRedisAvailable = false;
      this.logger.warn('⭕ CacheService: Redis connection closed');
    });

    // Initial check - but don't rely on immediate status
    this.logger.log('📊 CacheService: Initial status check...');
    this.checkRedisAvailable();
  }

  /**
   * Check if Redis is available
   * Note: This might return false even if connection is in progress
   * For guaranteed readiness, use waitForReady()
   */
  private checkRedisAvailable(): void {
    try {
      if (!this.redisClient) {
        this.isRedisAvailable = false;
        this.logger.warn('⚠️ Redis client not available');
        return;
      }
      // Check multiple status conditions since status changes during connection
      this.isRedisAvailable =
        this.redisClient.status === 'ready' ||
        (this.redisClient.status !== 'close' &&
          this.redisClient.status !== 'end');
      this.logger.log(
        `📊 Redis status check: ${this.redisClient.status} | Available: ${this.isRedisAvailable ? '✅' : '❌'}`,
      );
    } catch (err) {
      this.isRedisAvailable = false;
      this.logger.warn(`⚠️ Error checking Redis availability: ${err}`);
    }
  }

  /**
   * Wait for Redis to be ready before performing operations
   * THIS SHOULD BE CALLED IN MODULES THAT DEPEND ON REDIS
   */
  async waitForReady(timeoutMs: number = 10000): Promise<void> {
    try {
      await Promise.race([
        this.readyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis readiness timeout')),
            timeoutMs,
          ),
        ),
      ]);
    } catch (err: any) {
      this.logger.error(`Failed to wait for Redis ready: ${err.message}`);
      throw err;
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
        this.redisClient.get(key),
        new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache get timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);
      return data ? JSON.parse(data) : null;
    } catch (err: any) {
      // Silently fail on timeout or connection issues
      if (
        err.message?.includes('timeout') ||
        err.message?.includes('Connection')
      ) {
        this.isRedisAvailable = false;
      }
      return null;
    }
  }

  /**
   * Set value to cache with timeout protection
   */
  async set(
    key: string,
    value: any,
    ttlSeconds: number = this.DEFAULT_TTL,
  ): Promise<void> {
    if (!this.isRedisAvailable) {
      return; // Skip if Redis not available
    }

    try {
      const ttl = Math.max(ttlSeconds, 1);

      // Add timeout wrapper to prevent hanging
      await Promise.race([
        this.redisClient.set(
          key,
          JSON.stringify(value),
          'EX',
          ttl,
        ) as Promise<string>,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache set timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);
    } catch (err: any) {
      // Silently fail on timeout or connection issues
      if (
        err.message?.includes('timeout') ||
        err.message?.includes('Connection')
      ) {
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
   * Delete a key from cache
   * @param key Cache key to delete
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      const result = await Promise.race([
        this.redisClient.del(key),
        new Promise<number>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache delete timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);
      return result > 0; // Returns 1 if key existed and was deleted
    } catch (err: any) {
      if (err.message?.includes('timeout') || err.code) {
        this.isRedisAvailable = false;
      }
      this.logger.warn(`Failed to delete cache key: ${err.message}`);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   * @param keys Array of cache keys to delete
   * @returns Number of keys deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    if (!this.isRedisAvailable || keys.length === 0) {
      return 0;
    }

    try {
      const result = await Promise.race([
        this.redisClient.del(...keys),
        new Promise<number>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache deleteMany timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);
      return result;
    } catch (err: any) {
      if (err.message?.includes('timeout') || err.code) {
        this.isRedisAvailable = false;
      }
      this.logger.warn(`Failed to delete multiple cache keys: ${err.message}`);
      return 0;
    }
  }

  /**
   * Delete keys matching a pattern
   * WARNING: This operation is O(N) and can be slow on large datasets
   * @param pattern Redis pattern (e.g. 'user:*', '*:quotes')
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isRedisAvailable) {
      return 0;
    }

    try {
      const keys = await Promise.race([
        this.redisClient.keys(pattern),
        new Promise<string[]>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache deletePattern timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);

      if (keys.length === 0) {
        return 0;
      }

      return await this.deleteMany(keys);
    } catch (err: any) {
      if (err.message?.includes('timeout') || err.code) {
        this.isRedisAvailable = false;
      }
      this.logger.warn(
        `Failed to delete cache pattern "${pattern}": ${err.message}`,
      );
      return 0;
    }
  }

  /**
   * Clear all cache (DANGEROUS - use with caution)
   */
  async clear(): Promise<void> {
    if (!this.isRedisAvailable) {
      return;
    }

    try {
      await Promise.race([
        this.redisClient.flushdb() as Promise<string>,
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache clear timeout')),
            this.CACHE_TIMEOUT,
          ),
        ),
      ]);
      this.logger.warn('Cache cleared (FLUSHDB executed)');
    } catch (err: any) {
      if (err.message?.includes('timeout') || err.code) {
        this.isRedisAvailable = false;
      }
      this.logger.error(`Failed to clear cache: ${err.message}`);
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.isRedisAvailable;
  }
}
