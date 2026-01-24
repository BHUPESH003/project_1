import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SellerStatus } from '@repo/types';
import { SetStatusDto } from './dto/set-status.dto';
import { FindAvailableSellersDto } from './dto/find-available-sellers.dto';
import { SellerRepository } from './repositories/seller.repository';

/**
 * Sellers Service
 *
 * Handles seller availability management and discovery.
 * Business rule: Only ONLINE sellers can receive orders.
 */
@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(private readonly sellerRepository: SellerRepository) {}

  /**
   * Find available sellers (ONLINE only)
   * Filters by category and optionally by location
   */
  async findAvailableSellers(query: FindAvailableSellersDto) {
    // Use repository to find available sellers
    const sellers = await this.sellerRepository.findAvailable({
      categoryId: query.category,
      lat: query.lat,
      lng: query.lng,
    });

    this.logger.log(`Found ${sellers.length} available sellers`);

    return sellers.map((seller) => ({
      id: seller.id,
      shopName: seller.shopName,
      address: seller.address,
      latitude: seller.latitude,
      longitude: seller.longitude,
      pricePerPage: seller.pricePerPage,
      prepTimeMinutes: seller.prepTimeMinutes,
      status: seller.status,
      user: seller.user,
      categories: seller.categories?.map((sc) => sc.category) ?? [],
    }));
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
