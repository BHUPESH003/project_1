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
        const redisUrl = configService.get('REDIS_URL');
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD');
        
        // Build Redis configuration object
        const redisConfig = redisUrl 
          ? redisUrl  // If REDIS_URL is set, use it directly as connection string
          : {
              host: redisHost,
              port: redisPort,
              password: redisPassword || undefined,
              connectTimeout: 10000,
              commandTimeout: 10000,
              maxRetriesPerRequest: null,
              maxRetries: 0,
              enableReadyCheck: false,
              enableOfflineQueue: false,
              retryStrategy: (times: number) => {
                if (times > 5) {
                  logger.warn(`⚠️ Redis connection failed after ${times} retries. Cache disabled.`);
                  return null;
                }
                const delay = Math.min(times * 500, 5000);
                return delay;
              }
            };

        // Create Redis instance with proper configuration
        const redis = new Redis(redisConfig);
        
        // Setup event handlers
        redis.on('error', (err) => {
          logger.warn(`⚠️ Redis Error: ${err.message}`);
        });
        
        redis.on('connect', () => {
          logger.log('✓ Redis cache connected successfully');
        });

        redis.on('close', () => {
          logger.warn('⚠️ Redis cache connection closed');
        });

        // Set additional timeouts for command operations
        if (typeof redisConfig === 'object') {
          redis.setMaxListeners(10);
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
