import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoryStatus } from '@repo/types';
import { CategoryRepository } from './repositories/category.repository';
import { buildAssetUrl } from '@/common/utils/asset-url.util';

/**
 * Categories Service
 *
 * Returns static category list from database.
 * Categories are seeded and managed by admin, not via API.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get all categories with their status and iconUrl (for Shop by Category).
   * Returns categories sorted by displayOrder
   */
  async findAll() {
    const categories = await this.categoryRepository.findActiveAndComingSoon();
    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    const baseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

    const list = categories.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      description: c.description,
      displayOrder: c.displayOrder,
      iconPath: c.iconPath,
      iconUrl: buildAssetUrl(c.iconPath, {
        s3PublicBaseUrl: baseUrl ?? undefined,
        s3Bucket: bucket ?? undefined,
        s3Region: region ?? undefined,
      }),
    }));

    this.logger.log(`Returned ${list.length} categories`);
    return list;
  }
}
