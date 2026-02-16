import { Injectable } from '@nestjs/common';
import { CategoryStatus } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';
import { IBaseRepository } from '@/common/repositories/base.repository';

/**
 * Category Entity Type
 */
export interface CategoryEntity {
  id: string;
  name: string;
  description: string | null;
  status: CategoryStatus;
  displayOrder: number;
  iconPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Repository
 *
 * Handles all database operations for Category entity.
 * Abstracts Prisma-specific queries from services.
 */
@Injectable()
export class CategoryRepository implements IBaseRepository<CategoryEntity> {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<CategoryEntity | null> {
    const category = await this.prismaService.prisma.category.findUnique({
      where: { id },
    });
    return category ? this.mapToEntity(category) : null;
  }

  /**
   * Find all categories (with optional status filter)
   */
  async findAll(filters?: {
    status?: CategoryStatus | CategoryStatus[];
  }): Promise<CategoryEntity[]> {
    const where: { status?: { in: CategoryStatus[] } } = {};

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = { in: [filters.status] };
      }
    }

    const categories = await this.prismaService.prisma.category.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: {
        displayOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        displayOrder: true,
        iconPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return categories.map((c) => this.mapToEntity(c));
  }

  /**
   * Find active and coming soon categories
   * This is the most common use case
   */
  async findActiveAndComingSoon(): Promise<CategoryEntity[]> {
    return this.findAll({
      status: [CategoryStatus.ACTIVE, CategoryStatus.COMING_SOON],
    });
  }

  /**
   * Create category
   */
  async create(data: {
    id: string; // Required - Category.id has no default in schema
    name: string;
    description?: string | null;
    status?: CategoryStatus;
    displayOrder?: number;
  }): Promise<CategoryEntity> {
    const category = await this.prismaService.prisma.category.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        status: (data.status ??
          CategoryStatus.COMING_SOON) as unknown as CategoryStatus,
        displayOrder: data.displayOrder ?? 0,
      },
    });
    return this.mapToEntity(category);
  }

  /**
   * Update category
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      status: CategoryStatus;
      displayOrder: number;
    }>,
  ): Promise<CategoryEntity> {
    const category = await this.prismaService.prisma.category.update({
      where: { id },
      data: data.status
        ? { ...data, status: data.status as unknown as CategoryStatus }
        : data,
    });
    return this.mapToEntity(category);
  }

  /**
   * Delete category
   */
  async delete(id: string): Promise<void> {
    await this.prismaService.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Map Prisma category to CategoryEntity
   * Converts Prisma enum to our custom enum type
   */
  private mapToEntity(category: {
    id: string;
    name: string;
    description: string | null;
    status: unknown;
    displayOrder: number;
    iconPath: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryEntity {
    return {
      ...category,
      status: category.status as CategoryStatus,
      iconPath: category.iconPath ?? null,
    };
  }
}
