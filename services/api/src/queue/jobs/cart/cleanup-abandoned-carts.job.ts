import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '@/prisma/prisma.service';

export const CLEANUP_ABANDONED_CARTS_JOB = 'cleanup-abandoned-carts';
export const CART_QUEUE_NAME = 'cart';

/** Abandon threshold in days */
const ABANDON_DAYS = 7;

/**
 * Cleanup Abandoned Carts Job
 *
 * Runs daily (scheduled via BullMQ repeatable job).
 * Deletes carts inactive for >7 days, removes CartItems, CartItemFiles,
 * deletes the underlying File records, and removes the objects from S3.
 */
@Processor(CART_QUEUE_NAME)
export class CleanupAbandonedCartsJob extends WorkerHost {
  private readonly logger = new Logger(CleanupAbandonedCartsJob.name);
  private readonly s3: S3Client;
  private readonly s3Bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.s3Bucket =
      this.configService.get<string>('S3_BUCKET_NAME') ?? 'mvp-files-dev';
    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async process(_job: Job): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ABANDON_DAYS);

    this.logger.log(
      `Running abandoned cart cleanup — cutoff: ${cutoff.toISOString()}`,
    );

    // Find abandoned carts: active status, not updated within the threshold
    const abandonedCarts = await this.prisma.prisma.cart.findMany({
      where: {
        status: 'active',
        updatedAt: { lt: cutoff },
      },
      include: {
        items: {
          include: {
            files: {
              include: {
                file: { select: { id: true, storageKey: true } },
              },
            },
          },
        },
      },
    });

    if (abandonedCarts.length === 0) {
      this.logger.log('No abandoned carts found');
      return;
    }

    this.logger.log(
      `Found ${abandonedCarts.length} abandoned cart(s) to clean up`,
    );

    let filesDeleted = 0;
    let cartsDeleted = 0;

    for (const cart of abandonedCarts) {
      try {
        // Collect all file storageKeys to delete from S3
        const storageKeys: string[] = [];
        const fileIds: string[] = [];

        for (const item of cart.items) {
          for (const cif of item.files) {
            if (cif.file.storageKey) {
              storageKeys.push(cif.file.storageKey);
              fileIds.push(cif.file.id);
            }
          }
        }

        // Delete S3 objects (best-effort — don't abort if one fails)
        for (const key of storageKeys) {
          try {
            await this.s3.send(
              new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: key }),
            );
          } catch (e: any) {
            this.logger.warn(`S3 delete failed for key ${key}: ${e?.message}`);
          }
        }

        // Delete File records (CartItemFile rows cascade-deleted via FK)
        if (fileIds.length > 0) {
          await this.prisma.prisma.file.deleteMany({
            where: { id: { in: fileIds } },
          });
        }

        // Delete the cart (CartItems + CartItemFiles cascade-deleted via FK)
        await this.prisma.prisma.cart.delete({ where: { id: cart.id } });

        filesDeleted += storageKeys.length;
        cartsDeleted++;
      } catch (e: any) {
        this.logger.error(`Failed to clean up cart ${cart.id}: ${e?.message}`);
      }
    }

    this.logger.log(
      `Abandoned cart cleanup complete — ${cartsDeleted} cart(s) deleted, ${filesDeleted} file(s) removed`,
    );
  }
}
