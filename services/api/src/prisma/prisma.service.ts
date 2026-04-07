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

    // Nest already gives us a singleton service instance, so a process-level
    // global cache only increases the chance of reusing a stale pool in watch mode.
    this.pool = new Pool({ connectionString });

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
