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
