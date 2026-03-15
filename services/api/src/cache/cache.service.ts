import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { cellToLatLng, latLngToCell } from 'h3-js';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300; 

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err: any) {
      this.logger.error('Redis Get Error: ' + err.message);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    try {
      if (ttlSeconds > 0) {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', this.DEFAULT_TTL);
      }
    } catch (err: any) {
      this.logger.error('Redis Set Error: ' + err.message);
    }
  }

  getZoneKey(lat: number, lng: number, resolution: number = 8): string {
    const h3Index = latLngToCell(lat, lng, resolution);
    return 'zone:' + h3Index + ':stores';
  }
}
