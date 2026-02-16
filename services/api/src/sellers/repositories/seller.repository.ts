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
  description: string | null;
  latitude: unknown;
  longitude: unknown;
  status: SellerStatus;
  statusUpdatedAt: Date | null;
  pricePerPage: unknown;
  prepTimeMinutes: number;
  imagePath: string | null;
  rating: number | null;
  discountThreshold: number | null;
  discountPercent: number | null;
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
   * Find available sellers (ONLINE only) with optional filters and pagination
   */
  async findAvailable(filters?: {
    categoryId?: string;
    lat?: number;
    lng?: number;
    maxDistanceKm?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ sellers: SellerEntity[]; total: number }> {
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

    const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 100);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const [sellers, total] = await Promise.all([
      this.prismaService.prisma.seller.findMany({
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
        skip: offset,
        take: limit,
      }),
      this.prismaService.prisma.seller.count({ where }),
    ]);

    let result = sellers.map((s) => this.mapToEntity(s));

    // If location provided, calculate distance, optionally filter by radius, and sort by proximity
    if (filters?.lat != null && filters?.lng != null) {
      const maxKm = filters.maxDistanceKm ?? 50;
      result = result
        .map((seller) => {
          const sellerLat = Number(seller.latitude);
          const sellerLng = Number(seller.longitude);
          const distance = this.calculateDistance(
            filters.lat!,
            filters.lng!,
            sellerLat,
            sellerLng,
          );
          return {
            ...seller,
            distanceKm: distance,
          };
        })
        .filter((s) => (s as any).distanceKm <= maxKm)
        .sort((a, b) => (a as any).distanceKm - (b as any).distanceKm);
    }

    return { sellers: result, total };
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
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 - Latitude of point 1
   * @param lng1 - Longitude of point 1
   * @param lat2 - Latitude of point 2
   * @param lng2 - Longitude of point 2
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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
    description?: string | null;
    latitude: unknown;
    longitude: unknown;
    status: unknown;
    statusUpdatedAt: Date | null;
    pricePerPage: unknown;
    prepTimeMinutes: number | null;
    imagePath: string | null;
    rating: unknown;
    discountThreshold?: number | null;
    discountPercent?: unknown;
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
      status: seller.status as SellerStatus,
      prepTimeMinutes: seller.prepTimeMinutes ?? 0,
      imagePath: seller.imagePath ?? null,
      rating: seller.rating != null ? Number(seller.rating) : null,
      description: seller.description ?? null,
      discountThreshold: seller.discountThreshold ?? null,
      discountPercent:
        seller.discountPercent != null ? Number(seller.discountPercent) : null,
    };
  }
}
