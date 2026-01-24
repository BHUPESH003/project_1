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
    const connectionString = this.configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const globalForPool = globalThis as unknown as {
      pool: Pool | undefined;
    };

    this.pool = globalForPool.pool ?? new Pool({ connectionString });

    if (process.env['NODE_ENV'] !== 'production') {
      globalForPool.pool = this.pool;
    }

    const adapter = new PrismaPg(this.pool);
    const globalForPrisma = globalThis as unknown as {
      prisma: PrismaClient | undefined;
    };

    this.prisma =
      globalForPrisma.prisma ??
      new PrismaClient({
        adapter,
        log:
          process.env['NODE_ENV'] === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });

    if (process.env['NODE_ENV'] !== 'production') {
      globalForPrisma.prisma = this.prisma;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
    this.logger.log('Prisma Client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
    await this.pool.end();
    this.logger.log('Prisma Client disconnected');
  }
}
