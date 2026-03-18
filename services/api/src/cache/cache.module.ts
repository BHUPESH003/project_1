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
        // Always use host/port/password approach (no REDIS_URL)
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD');

        // Log environment variables being loaded
        logger.log('📋 Redis Configuration Loading:');
        logger.log(`   REDIS_HOST: ${redisHost}`);
        logger.log(`   REDIS_PORT: ${redisPort}`);
        logger.log(
          `   REDIS_PASSWORD: ${redisPassword ? '✓ Set' : '✗ Not set'}`,
        );
        logger.log(`   🔗 Using host/port/password approach (no REDIS_URL)`);

        // Build Redis configuration object - using proven simple approach
        // Mirrors the working test code structure
        const redisConfig: any = {
          connectTimeout: 15000,
          commandTimeout: 30000,
          maxRetriesPerRequest: null,
          maxRetries: 3, // Allow retries for transient failures
          enableReadyCheck: false,
          enableOfflineQueue: true, // Allow commands to queue while connecting
          retryStrategy: (times: number) => {
            // Use exponential backoff: 100, 200, 400, 800, 1600, 3200, 5000, 5000, ...
            // This allows indefinite reconnection attempts with increasing delays
            // Prevents connection storms and allows Redis to recover
            const delay = Math.min(Math.pow(2, Math.min(times, 5)) * 100, 5000);
            const endpoint = `${redisHost}:${redisPort}`;

            if (times === 1) {
              logger.log(
                `🔄 Connection attempt failed. Retrying ${endpoint}...`,
              );
            } else if (times % 5 === 0) {
              logger.warn(
                `⚠️ Redis reconnection attempt ${times} (${endpoint}), next retry in ${delay}ms`,
              );
            }

            return delay; // Returns delay, never returns null (allows indefinite retries)
          },
          lazyConnect: false,
        };

        // Always use host/port/password approach
        // CRITICAL: This matches the working test code structure
        redisConfig.host = redisHost;
        redisConfig.port = redisPort;
        if (redisPassword) {
          redisConfig.password = redisPassword;
        }
        logger.log(`✅ Using host/port/password connection format`);

        // Log exact connection endpoint before attempting connection
        logger.log('🔗 Redis Connection Endpoint:');
        logger.log(`   Host: ${redisHost}`);
        logger.log(`   Port: ${redisPort}`);
        logger.log(`   Database: 0 (default)`);
        logger.log(`   Has Auth: ${redisPassword ? '✓ Yes' : '✗ No'}`);
        logger.log(`   Connection String: ${redisHost}:${redisPort}`);

        // Create Redis instance with proper configuration
        logger.log('');
        logger.log('🔌 Creating Redis client...');
        logger.log(
          `   Configuration: lazyConnect=${redisConfig.lazyConnect}, enableOfflineQueue=${redisConfig.enableOfflineQueue}`,
        );
        logger.log(
          `   Timeouts: connect=${redisConfig.connectTimeout}ms, command=${redisConfig.commandTimeout}ms`,
        );
        logger.log(
          '   Starting connection attempt with credentials from .env...',
        );
        const redis = new Redis(redisConfig);

        // Track connection state
        let hasEverConnected = false;
        const startTime = Date.now();

        // Setup comprehensive event handlers BEFORE any operation
        redis.on('connecting', () => {
          const elapsed = Date.now() - startTime;
          logger.log(`⏳ Redis connecting... (${elapsed}ms)`);
        });

        redis.on('ready', () => {
          hasEverConnected = true;
          const elapsed = Date.now() - startTime;
          logger.log(
            `✅ Redis cache is ready for commands (${elapsed}ms elapsed)`,
          );

          // Only ping AFTER ready event to avoid timeout
          redis.ping().catch((err: any) => {
            logger.warn(`⚠️ Redis ping failed after ready: ${err.message}`);
          });
        });

        redis.on('error', (err: any) => {
          logger.warn(`❌ Redis Error [${err.code}]: ${err.message}`);
        });

        redis.on('connect', () => {
          const elapsed = Date.now() - startTime;
          logger.log(`✅ Redis cache connected successfully (${elapsed}ms)`);
        });

        redis.on('reconnecting', () => {
          logger.warn('🔄 Redis reconnecting...');
        });

        redis.on('close', () => {
          logger.warn('⭕ Redis cache connection closed');
        });

        // Set additional timeouts for command operations
        if (typeof redisConfig === 'object') {
          redis.setMaxListeners(15); // Increased listeners for multiple modules
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
