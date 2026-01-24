import { Injectable, Logger } from '@nestjs/common';
import { CategoryStatus } from '@repo/types';
import { CategoryRepository } from './repositories/category.repository';

/**
 * Categories Service
 *
 * Returns static category list from database.
 * Categories are seeded and managed by admin, not via API.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * Get all categories with their status
   * Returns categories sorted by displayOrder
   */
  async findAll() {
    // Use repository to find active and coming soon categories
    const categories = await this.categoryRepository.findActiveAndComingSoon();

    this.logger.log(`Returned ${categories.length} categories`);

    return categories;
  }
}
