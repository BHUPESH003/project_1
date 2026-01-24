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

    let result = sellers.map((s) => this.mapToEntity(s));

    // If location provided, calculate distance and sort by proximity
    if (filters?.lat && filters?.lng) {
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
        .sort((a, b) => (a as any).distanceKm - (b as any).distanceKm);
    }

    return result;
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
