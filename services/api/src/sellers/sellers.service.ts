import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SellerStatus } from '@repo/types';
import { Prisma } from '@prisma/client';
import { SetStatusDto } from './dto/set-status.dto';
import { FindAvailableSellersDto } from './dto/find-available-sellers.dto';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { CreateProductDto } from '@/products/dto/create-product.dto';
import { UpdateProductDto } from '@/products/dto/update-product.dto';
import { SellerRepository } from './repositories/seller.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { FavoritesService } from '@/favorites/favorites.service';
import { buildAssetUrl } from '@/common/utils/asset-url.util';

/**
 * Sellers Service
 *
 * Handles seller availability management and discovery.
 * Business rule: Only ONLINE sellers can receive orders.
 */
@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly favoritesService: FavoritesService,
  ) {}

  /**
   * Find available sellers (ONLINE only) with pagination.
   * Optionally pass userId to include isFavorited per seller.
   */
  async findAvailableSellers(
    query: FindAvailableSellersDto,
    userId?: string,
    options?: { isTrending?: boolean; orderBy?: 'distance' | 'newest' },
  ) {
    const hasLocation = query.lat != null && query.lng != null;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const { sellers, total } = await this.sellerRepository.findAvailable({
      categoryId: query.category === 'all' ? undefined : query.category,
      lat: query.lat,
      lng: query.lng,
      maxDistanceKm: query.maxDistanceKm,
      limit,
      offset,
      isTrending: options?.isTrending,
      orderBy: options?.orderBy,
    });

    const favoriteIds =
      userId != null
        ? await this.favoritesService.getFavoriteSellerIds(userId)
        : new Set<string>();

    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    const baseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

    const list = sellers.map((seller) => {
      const result: Record<string, unknown> = {
        seller_id: seller.id,
        shop_name: seller.shopName,
        address: seller.address,
        description: seller.description ?? null,
        price_breakdown: {
          per_page: seller.pricePerPage ? Number(seller.pricePerPage) : 0,
        },
        prep_time_min: seller.prepTimeMinutes,
        status: seller.status,
        rating: seller.rating,
        image_url: buildAssetUrl(seller.imagePath, {
          s3PublicBaseUrl: baseUrl ?? undefined,
          s3Bucket: bucket ?? undefined,
          s3Region: region ?? undefined,
        }),
        categories: (seller.categories ?? []).map((sc) => ({
          id: sc.category.id,
          name: sc.category.name,
        })),
        is_favorited: userId != null ? favoriteIds.has(seller.id) : undefined,
      };
      if ('distanceKm' in seller) {
        const dist = (seller as any).distanceKm;
        result.distance_km = Math.round(dist * 100) / 100;
        result.estimated_delivery_time_mins =
          seller.prepTimeMinutes + Math.ceil(dist * 5);
      } else {
        result.estimated_delivery_time_mins = seller.prepTimeMinutes;
      }
      return result;
    });

    return {
      sellers: list,
      pagination: { total, limit, offset },
    };
  }

  async findNewlyAddedSellers(query: FindAvailableSellersDto, userId?: string) {
    return this.findAvailableSellers(query, userId, { orderBy: 'newest' });
  }

  async findTrendingSellers(query: FindAvailableSellersDto, userId?: string) {
    return this.findAvailableSellers(query, userId, { isTrending: true });
  }

  /**
   * Get seller profile by ID
   * Optionally calculates distance if lat/lng provided
   */
  async findOne(id: string, lat?: number, lng?: number) {
    const seller = await this.sellerRepository.findById(id, true);

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    const baseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

    const result: any = {
      id: seller.id,
      shopName: seller.shopName,
      address: seller.address,
      description: (seller as any).description ?? null,
      latitude: seller.latitude,
      longitude: seller.longitude,
      pricePerPage: seller.pricePerPage,
      prepTimeMinutes: seller.prepTimeMinutes,
      status: seller.status,
      statusUpdatedAt: seller.statusUpdatedAt,
      imagePath: seller.imagePath,
      imageUrl: buildAssetUrl(seller.imagePath, {
        s3PublicBaseUrl: baseUrl ?? undefined,
        s3Bucket: bucket ?? undefined,
        s3Region: region ?? undefined,
      }),
      rating: seller.rating != null ? Number(seller.rating) : null,
      discountThreshold: (seller as any).discountThreshold ?? null,
      discountPercent:
        (seller as any).discountPercent != null
          ? Number((seller as any).discountPercent)
          : null,
      user: seller.user,
      categories: seller.categories?.map((sc) => sc.category) ?? [],
    };

    // Calculate distance if lat/lng provided
    if (lat != null && lng != null) {
      const sellerLat = Number(seller.latitude);
      const sellerLng = Number(seller.longitude);
      const distance = this.calculateDistance(lat, lng, sellerLat, sellerLng);
      result.distance_km = Math.round(distance * 100) / 100;
    }

    return result;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
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
    return Math.round(R * c * 100) / 100;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Seller catalog products for a specific seller (pagination + filter chips).
   * If userId provided, includes wishlist/notify flags.
   */
  async getSellerProducts(
    sellerId: string,
    query: { filter?: string; limit?: number; offset?: number },
    userId?: string,
  ) {
    // Verify seller exists
    const seller = await this.sellerRepository.findById(sellerId, false);
    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: any = { sellerId };
    if (query.filter === 'best_sellers') {
      where.isBestSeller = true;
    }
    if (query.filter === 'on_sale') {
      where.mrp = { not: null };
      // We can't compare fields easily without raw SQL; do partial filter here and finalize in-memory.
    }
    if (query.filter === 'new_arrivals') {
      const days = 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: since };
    }

    // Fetch all products for this seller
    const [rows, total] = await Promise.all([
      this.prismaService.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          unit: true,
          price: true,
          mrp: true,
          image: true,
          inStock: true,
          isBestSeller: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prismaService.prisma.product.count({ where }),
    ]);

    // Apply on_sale filter in-memory (mrp > price)
    const filtered =
      query.filter === 'on_sale'
        ? rows.filter((p) => p.mrp != null && Number(p.mrp) > Number(p.price))
        : rows;

    const productIds = filtered.map((p) => p.id);
    const [wishSet, notifySet] =
      userId && productIds.length
        ? await Promise.all([
            this.prismaService.prisma.userProductWishlist.findMany({
              where: { userId, productId: { in: productIds } },
              select: { productId: true },
            }),
            this.prismaService.prisma.userProductNotify.findMany({
              where: { userId, productId: { in: productIds } },
              select: { productId: true },
            }),
          ])
        : [[], []];

    const wishIds = new Set(wishSet.map((x) => x.productId));
    const notifyIds = new Set(notifySet.map((x) => x.productId));

    return {
      items: filtered.map((p) => ({
        id: p.id,
        sellerId,
        name: p.name,
        description: p.description,
        category: p.category,
        unit: p.unit,
        price: Number(p.price),
        mrp: p.mrp != null ? Number(p.mrp) : null,
        discountPercent:
          p.mrp != null && Number(p.mrp) > 0
            ? Math.round(
                ((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100,
              )
            : null,
        image: p.image,
        inStock: p.inStock,
        isBestSeller: p.isBestSeller,
        isWishlisted: userId ? wishIds.has(p.id) : undefined,
        notifyRequested: userId ? notifyIds.has(p.id) : undefined,
      })),
      pagination: { total, limit, offset },
    };
  }

  /**
   * Set seller availability status
   * Business rule: Default status is OFFLINE after login
   * Only ONLINE sellers receive orders
   */
  async setStatus(userId: string, dto: SetStatusDto) {
    // Find seller by userId via repository
    const seller = await this.sellerRepository.findByUserId(userId);

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Update status via repository
    const updatedSeller = await this.sellerRepository.updateStatus(
      seller.id,
      dto.status,
    );

    this.logger.log(
      `Seller ${seller.id} status updated to ${dto.status} by user ${userId}`,
    );

    // Return data - TransformInterceptor will wrap in standard format
    return {
      id: updatedSeller.id,
      status: updatedSeller.status,
      statusUpdatedAt: updatedSeller.statusUpdatedAt,
    };
  }

  async getSellerProductsDifferential(sellerId: string, sinceDate: Date) {
    const seller = await this.sellerRepository.findById(sellerId, false);
    if (!seller)
      throw new NotFoundException('Seller with ID ' + sellerId + ' not found');

    const rows = await this.prismaService.prisma.product.findMany({
      where: { sellerId, updatedAt: { gt: sinceDate } },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        unit: true,
        price: true,
        mrp: true,
        image: true,
        inStock: true,
        isBestSeller: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    return { products: rows, sync_timestamp: new Date().toISOString() };
  }

  // ─── Phase 3.1: Seller Self-Registration ──────────────────────────────────

  async registerSeller(userId: string, dto: RegisterSellerDto) {
    const existing = await this.sellerRepository.findByUserId(userId);
    if (existing) throw new ConflictException('Seller profile already exists');

    if (dto.categoryIds.length === 0) {
      throw new BadRequestException('At least one category is required');
    }

    const seller = await this.sellerRepository.create({
      userId,
      shopName: dto.shopName,
      address: dto.address,
      description: dto.description,
      latitude: dto.latitude,
      longitude: dto.longitude,
      pricePerPage: dto.pricePerPage,
      prepTimeMinutes: dto.prepTimeMinutes,
      status: SellerStatus.OFFLINE,
    });

    // Validate categories exist and create junction records
    const categories = await this.prismaService.prisma.category.findMany({
      where: { id: { in: dto.categoryIds } },
      select: { id: true },
    });
    const validIds = new Set(categories.map((c) => c.id));
    const invalid = dto.categoryIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown category IDs: ${invalid.join(', ')}`,
      );
    }

    await this.prismaService.prisma.sellerCategory.createMany({
      data: dto.categoryIds.map((categoryId) => ({
        sellerId: seller.id,
        categoryId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Seller registered: ${seller.id} by user ${userId}`);

    return this.sellerRepository.findByUserId(userId, true);
  }

  async getMyProfile(userId: string) {
    const seller = await this.sellerRepository.findByUserId(userId, true);
    if (!seller) throw new NotFoundException('Seller profile not found');

    const [totalOrders, completedOrders, revenue] = await Promise.all([
      this.prismaService.prisma.order.count({ where: { sellerId: seller.id } }),
      this.prismaService.prisma.order.count({
        where: { sellerId: seller.id, status: 'DELIVERED' },
      }),
      this.prismaService.prisma.order.aggregate({
        where: { sellerId: seller.id, status: 'DELIVERED' },
        _sum: { totalAmount: true },
      }),
    ]);

    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    const baseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

    return {
      id: seller.id,
      shopName: seller.shopName,
      address: seller.address,
      description: seller.description,
      latitude: seller.latitude,
      longitude: seller.longitude,
      pricePerPage: seller.pricePerPage,
      prepTimeMinutes: seller.prepTimeMinutes,
      status: seller.status,
      statusUpdatedAt: seller.statusUpdatedAt,
      isTrending: seller.isTrending,
      isVerified: seller.isVerified,
      isSuspended: seller.isSuspended,
      imagePath: seller.imagePath,
      imageUrl: buildAssetUrl(seller.imagePath, {
        s3PublicBaseUrl: baseUrl ?? undefined,
        s3Bucket: bucket ?? undefined,
        s3Region: region ?? undefined,
      }),
      rating: seller.rating,
      categories: seller.categories?.map((sc) => sc.category) ?? [],
      stats: {
        totalOrders,
        completedOrders,
        totalRevenue:
          revenue._sum.totalAmount != null
            ? Number(revenue._sum.totalAmount)
            : 0,
      },
    };
  }

  async updateMyProfile(userId: string, dto: UpdateSellerDto) {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) throw new NotFoundException('Seller profile not found');

    if (seller.isSuspended) {
      throw new ForbiddenException(
        'Suspended sellers cannot update their profile',
      );
    }

    const updateData: Partial<{
      shopName: string;
      address: string;
      description: string;
      latitude: number;
      longitude: number;
      pricePerPage: number;
      prepTimeMinutes: number;
      imagePath: string;
    }> = {};

    if (dto.shopName !== undefined) updateData.shopName = dto.shopName;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.pricePerPage !== undefined)
      updateData.pricePerPage = dto.pricePerPage;
    if (dto.prepTimeMinutes !== undefined)
      updateData.prepTimeMinutes = dto.prepTimeMinutes;
    if (dto.imagePath !== undefined) updateData.imagePath = dto.imagePath;

    return this.sellerRepository.update(seller.id, updateData);
  }

  // ─── Phase 3.2: Seller Product Management ─────────────────────────────────

  private async getSellerForUser(userId: string) {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const seller = await this.getSellerForUser(userId);

    return this.prismaService.prisma.product.create({
      data: {
        sellerId: seller.id,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        unit: dto.unit ?? null,
        price: dto.price,
        mrp: dto.mrp ?? null,
        image: dto.image ?? null,
        inStock: dto.inStock ?? true,
        isBestSeller: dto.isBestSeller ?? false,
      },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const seller = await this.getSellerForUser(userId);

    const product = await this.prismaService.prisma.product.findFirst({
      where: { id: productId, sellerId: seller.id },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.mrp !== undefined) updateData.mrp = dto.mrp;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.inStock !== undefined) updateData.inStock = dto.inStock;
    if (dto.isBestSeller !== undefined)
      updateData.isBestSeller = dto.isBestSeller;

    return this.prismaService.prisma.product.update({
      where: { id: productId },
      data: updateData,
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const seller = await this.getSellerForUser(userId);

    const product = await this.prismaService.prisma.product.findFirst({
      where: { id: productId, sellerId: seller.id },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Mark out of stock rather than hard-delete to preserve order history integrity
    await this.prismaService.prisma.product.update({
      where: { id: productId },
      data: { inStock: false },
    });

    return { success: true, productId };
  }

  async listMyProducts(
    userId: string,
    query: { filter?: string; limit?: number; offset?: number },
  ) {
    const seller = await this.getSellerForUser(userId);
    return this.getSellerProducts(seller.id, query);
  }
}
