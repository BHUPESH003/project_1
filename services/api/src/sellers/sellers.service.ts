import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SellerStatus } from '@repo/types';
import { Prisma } from '@prisma/client';
import { SetStatusDto } from './dto/set-status.dto';
import { FindAvailableSellersDto } from './dto/find-available-sellers.dto';
import { SellerRepository } from './repositories/seller.repository';
import { PrismaService } from '@/prisma/prisma.service';

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
  ) {}

  /**
   * Find available sellers (ONLINE only)
   * Filters by category and optionally by location
   * When lat/lng provided: filters by distance within maxDistanceKm (default 50km)
   * When lat/lng not provided: returns all sellers in category
   */
  async findAvailableSellers(query: FindAvailableSellersDto) {
    // Log request parameters
    const hasLocation = query.lat != null && query.lng != null;
    if (hasLocation) {
      this.logger.log(
        `Finding sellers for location: ${query.lat}, ${query.lng}, maxDistance: ${query.maxDistanceKm ?? 50}km`,
      );
    }

    // Use repository to find available sellers
    const sellers = await this.sellerRepository.findAvailable({
      categoryId: query.category === 'all' ? undefined : query.category,
      lat: query.lat,
      lng: query.lng,
      maxDistanceKm: query.maxDistanceKm,
    });

    // Log filtering results
    if (hasLocation) {
      this.logger.log(
        `Found ${sellers.length} sellers within ${query.maxDistanceKm ?? 50}km radius`,
      );
    } else {
      this.logger.log(`Found ${sellers.length} available sellers`);
    }

    return sellers.map((seller) => {
      const result: any = {
        seller_id: seller.id,
        shop_name: seller.shopName,
        address: seller.address,
        price_breakdown: {
          per_page: seller.pricePerPage ? Number(seller.pricePerPage) : 0,
        },
        prep_time_min: seller.prepTimeMinutes,
        status: seller.status,
      };

      // Include distance if calculated (only when lat/lng provided)
      if ('distanceKm' in seller) {
        result.distance_km = Math.round((seller as any).distanceKm * 100) / 100;
      }

      return result;
    });
  }

  /**
   * Get seller profile by ID
   */
  async findOne(id: string) {
    const seller = await this.sellerRepository.findById(id, true);

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${id} not found`);
    }

    return {
      id: seller.id,
      shopName: seller.shopName,
      address: seller.address,
      latitude: seller.latitude,
      longitude: seller.longitude,
      pricePerPage: seller.pricePerPage,
      prepTimeMinutes: seller.prepTimeMinutes,
      status: seller.status,
      statusUpdatedAt: seller.statusUpdatedAt,
      user: seller.user,
      categories: seller.categories?.map((sc) => sc.category) ?? [],
    };
  }

  /**
   * Get all products for a specific seller
   */
  async getSellerProducts(sellerId: string) {
    // Verify seller exists
    const seller = await this.sellerRepository.findById(sellerId, false);
    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    // Fetch all products for this seller
    const products = await this.prismaService.prisma.product.findMany({
      where: { sellerId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        image: true,
        inStock: true,
      },
      orderBy: { category: 'asc' },
    });

    type ProductSelect = Prisma.ProductGetPayload<{
      select: {
        id: true;
        name: true;
        description: true;
        category: true;
        price: true;
        image: true;
        inStock: true;
      };
    }>;

    return products.map((product: ProductSelect) => ({
      id: product.id,
      sellerId,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      image: product.image,
      inStock: product.inStock,
    }));
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
}
