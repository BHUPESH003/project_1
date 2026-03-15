import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

const logger = new Logger('CacheModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const url = configService.get('REDIS_URL');
        
        const redisConfig = url 
          ? url 
          : {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
              connectTimeout: 2000,
              commandTimeout: 2000,
              maxRetriesPerRequest: 1,
              enableReadyCheck: true,
              enableOfflineQueue: false,
              lazyConnect: true, // Don't connect immediately on instantiation
              retryStrategy: (times: number) => {
                if (times > 2) {
                  logger.warn(`⚠️ Redis connection failed after ${times} retries. Cache disabled - operations will continue without caching.`);
                  return null;
                }
                const delay = Math.min(times * 100, 1000);
                return delay;
              }
            };

        const redis = new Redis(redisConfig);
        
        // Setup event handlers for non-blocking monitoring
        redis.on('error', (err) => {
          logger.warn(`⚠️ Redis Error: ${err.message}`);
        });
        
        redis.on('connect', () => {
          logger.log('✓ Redis cache connected successfully');
        });

        redis.on('close', () => {
          logger.warn('⚠️ Redis cache connection closed');
        });

        // Try to connect asynchronously without blocking app startup
        if (!url && redisConfig !== url) {
          redis.connect()
            .then(() => logger.log('✓ Redis cache ready'))
            .catch((err) => logger.warn(`⚠️ Redis initial connection failed (will retry): ${err.message}`));
        }

        return redis;
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: ['REDIS_CLIENT', CacheService],
})
export class CacheModule {}
