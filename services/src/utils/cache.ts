import { logger } from './logger';

/**
 * Simple In-Memory Cache for Mobile Apps
 * Great for frequently accessed data
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Set cache value with TTL (time to live in seconds)
   */
  set(key: string, data: any, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
    logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Get cache value
   */
  get(key: string): any {
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Remove from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache REMOVED: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared (${size} entries)`, {});
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new SimpleCache();
