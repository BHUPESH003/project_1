import { Injectable } from '@nestjs/common';
import { SellerStatus } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Seller Entity with relations
 */
export interface SellerEntity {
  id: string;
  userId: string;
  shopName: string;
  address: string;
  latitude: unknown;
  longitude: unknown;
  status: SellerStatus;
  statusUpdatedAt: Date | null;
  pricePerPage: unknown;
  prepTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    phone: string;
    name: string | null;
  };
  categories?: Array<{
    category: {
      id: string;
      name: string;
      status: unknown;
    };
  }>;
}

/**
 * Seller Repository
 *
 * Handles all database operations for Seller entity.
 * Abstracts Prisma-specific queries from services.
 */
@Injectable()
export class SellerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find seller by ID with relations
   */
  async findById(
    id: string,
    includeRelations = true,
  ): Promise<SellerEntity | null> {
    const seller = await this.prismaService.prisma.seller.findUnique({
      where: { id },
      include: includeRelations
        ? {
            user: {
              select: {
                id: true,
                phone: true,
                name: true,
              },
            },
            categories: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          }
        : undefined,
    });
    return seller ? this.mapToEntity(seller) : null;
  }

  /**
   * Find seller by user ID
   */
  async findByUserId(userId: string): Promise<SellerEntity | null> {
    const seller = await this.prismaService.prisma.seller.findUnique({
      where: { userId },
    });
    return seller ? this.mapToEntity(seller) : null;
  }

  /**
   * Find available sellers (ONLINE only) with optional filters
   */
  async findAvailable(filters?: {
    categoryId?: string;
    lat?: number;
    lng?: number;
  }): Promise<SellerEntity[]> {
    const where: {
      status: SellerStatus;
      categories?: {
        some: {
          categoryId: string;
        };
      };
    } = {
      status: SellerStatus.ONLINE,
    };

    if (filters?.categoryId) {
      where.categories = {
        some: {
          categoryId: filters.categoryId,
        },
      };
    }

    // TODO: Add location-based filtering when lat/lng provided

    const sellers = await this.prismaService.prisma.seller.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return sellers.map((s) => this.mapToEntity(s));
  }

  /**
   * Update seller status
   */
  async updateStatus(id: string, status: SellerStatus): Promise<SellerEntity> {
    const seller = await this.prismaService.prisma.seller.update({
      where: { id },
      data: {
        status: status as unknown as SellerStatus, // Map to Prisma enum
        statusUpdatedAt: new Date(),
      },
    });
    return this.mapToEntity(seller);
  }

  /**
   * Create seller
   */
  async create(data: {
    userId: string;
    shopName: string;
    address: string;
    latitude: number;
    longitude: number;
    pricePerPage: number;
    prepTimeMinutes: number;
    status?: SellerStatus;
  }): Promise<SellerEntity> {
    const seller = await this.prismaService.prisma.seller.create({
      data: {
        userId: data.userId,
        shopName: data.shopName,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        pricePerPage: data.pricePerPage,
        prepTimeMinutes: data.prepTimeMinutes,
        status: (data.status ??
          SellerStatus.OFFLINE) as unknown as SellerStatus,
      },
    });
    return this.mapToEntity(seller);
  }

  /**
   * Update seller
   */
  async update(
    id: string,
    data: Partial<{
      shopName: string;
      address: string;
      latitude: number;
      longitude: number;
      pricePerPage: number;
      prepTimeMinutes: number;
    }>,
  ): Promise<SellerEntity> {
    const seller = await this.prismaService.prisma.seller.update({
      where: { id },
      data,
    });
    return this.mapToEntity(seller);
  }

  /**
   * Map Prisma seller to SellerEntity
   * Converts Prisma enum to our custom enum type
   */
  private mapToEntity(seller: {
    id: string;
    userId: string;
    shopName: string;
    address: string;
    latitude: unknown;
    longitude: unknown;
    status: unknown;
    statusUpdatedAt: Date | null;
    pricePerPage: unknown;
    prepTimeMinutes: number | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
      id: string;
      phone: string;
      name: string | null;
    };
    categories?: Array<{
      category: {
        id: string;
        name: string;
        status: unknown;
      };
    }>;
  }): SellerEntity {
    return {
      ...seller,
      status: seller.status as SellerStatus, // Type assertion for enum compatibility
      prepTimeMinutes: seller.prepTimeMinutes ?? 0,
    };
  }
}
