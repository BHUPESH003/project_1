import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  public readonly prisma: PrismaClient;

  constructor(private configService: ConfigService) {
    // Use direct URL for driver adapter — Neon recommends direct (non-pooler) connection
    // when using @prisma/adapter-pg, since pg.Pool already handles pooling.
    // The pooler URL is for the old query-engine approach (without driver adapters).
    const connectionString =
      this.configService.get<string>('DATABASE_DIRECT_URL') ??
      this.configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error(
        'DATABASE_DIRECT_URL or DATABASE_URL environment variable is not set',
      );
    }

    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      // Neon serverless suspends idle compute and silently drops the TCP
      // socket. Without these the pg.Pool hands out dead connections after an
      // idle period → Prisma fails with an empty "Invalid invocation" error.
      // TCP keepalive keeps the socket warm and surfaces drops promptly.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      // Recycle every connection after 5 min regardless of activity so none
      // lingers long enough to be killed server-side while still pooled.
      maxLifetimeSeconds: 300,
    });

    // A client can error while idle in the pool (e.g. Neon drops it). pg emits
    // this on the Pool; if left unhandled Node crashes the process. Logging it
    // lets pg evict the dead client so the next checkout gets a fresh one.
    this.pool.on('error', (error) => {
      this.logger.warn(
        `Idle Postgres client error (evicted): ${error.message}`,
      );
    });

    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({
      adapter,
      log:
        process.env['NODE_ENV'] === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
    this.logger.log('Prisma Client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();

    try {
      if (!(this.pool as any).ending) {
        await this.pool.end();
      }
    } catch (error) {
      // Silently ignore duplicate close attempts during shutdown.
    }

    this.logger.log('Prisma Client disconnected');
  }
}
