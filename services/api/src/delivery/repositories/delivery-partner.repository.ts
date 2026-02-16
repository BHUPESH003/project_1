/**
 * Delivery Partner Repository
 *
 * Handles database operations for delivery partners and quotations
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DeliveryPartnerRepository {
  private readonly logger = new Logger(DeliveryPartnerRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get all active delivery partners ordered by priority
   */
  async getActivePartners(): Promise<any[]> {
    return this.prismaService.prisma.deliveryPartner.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Get delivery partner by ID or provider name
   */
  async getPartner(idOrName: string): Promise<any | null> {
    return this.prismaService.prisma.deliveryPartner.findFirst({
      where: {
        OR: [{ id: idOrName }, { providerName: idOrName }],
      },
    });
  }

  /**
   * Save a new quotation
   */
  async saveQuotation(data: {
    orderId?: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupAddress: string;
    dropLatitude: number;
    dropLongitude: number;
    dropAddress: string;
    deliveryPartnerId: string;
    quotedFeeRupees: number;
    estimatedMinutes: number;
    providerQuoteId?: string;
    expiresAt: Date;
  }): Promise<any> {
    return this.prismaService.prisma.deliveryQuotation.create({
      data: {
        orderId: data.orderId,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupAddress: data.pickupAddress,
        dropLatitude: data.dropLatitude,
        dropLongitude: data.dropLongitude,
        dropAddress: data.dropAddress,
        deliveryPartnerId: data.deliveryPartnerId,
        quotedFeeRupees: data.quotedFeeRupees,
        estimatedMinutes: data.estimatedMinutes,
        providerQuoteId: data.providerQuoteId,
        expiresAt: data.expiresAt,
      },
      include: {
        deliveryPartner: true,
      },
    });
  }

  /**
   * Get valid quotations for a location pair (not expired)
   */
  async getValidQuotations(
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    limitMinutes: number = 5, // Cache valid for 5 minutes
  ): Promise<any[]> {
    const since = new Date(Date.now() - limitMinutes * 60 * 1000);

    return this.prismaService.prisma.deliveryQuotation.findMany({
      where: {
        orderId: null, // Only cached quotations (not tied to a specific order)
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        dropLatitude: dropLat,
        dropLongitude: dropLng,
        expiresAt: { gt: new Date() },
        createdAt: { gte: since },
      },
      include: {
        deliveryPartner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get quotations for a specific order
   */
  async getQuotationsForOrder(orderId: string): Promise<any[]> {
    return this.prismaService.prisma.deliveryQuotation.findMany({
      where: { orderId },
      include: {
        deliveryPartner: true,
      },
      orderBy: { quotedFeeRupees: 'asc' },
    });
  }

  /**
   * Invalidate old cached quotations
   */
  async cleanupExpiredQuotations(): Promise<void> {
    await this.prismaService.prisma.deliveryQuotation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        orderId: null,
      },
    });
  }
}
