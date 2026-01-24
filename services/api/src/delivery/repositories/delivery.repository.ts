/**
 * Delivery Repository
 *
 * Handles all database operations for Delivery entity.
 * Abstracts Prisma-specific queries from services.
 */

import { Injectable } from '@nestjs/common';
import { DeliveryStatus } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Delivery Entity
 */
export interface DeliveryEntity {
  id: string;
  orderId: string;
  providerName: string | null;
  providerTaskId: string | null;
  providerTrackingUrl: string | null;
  status: DeliveryStatus;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  partnerName: string | null;
  partnerPhone: string | null;
  quotedFee: number | null;
  actualFee: number | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
}

/**
 * Create Delivery Data
 */
export interface CreateDeliveryData {
  orderId: string;
  providerName: string;
  providerTaskId: string;
  providerTrackingUrl?: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  quotedFee?: number;
}

/**
 * Update Delivery Data
 */
export interface UpdateDeliveryData {
  status?: DeliveryStatus;
  providerTaskId?: string;
  providerTrackingUrl?: string;
  partnerName?: string;
  partnerPhone?: string;
  actualFee?: number;
  failureReason?: string;
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
}

@Injectable()
export class DeliveryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find delivery by order ID
   */
  async findByOrderId(orderId: string): Promise<DeliveryEntity | null> {
    const delivery = await this.prismaService.prisma.delivery.findUnique({
      where: { orderId },
    });

    return delivery ? this.mapToEntity(delivery) : null;
  }

  /**
   * Find delivery by ID
   */
  async findById(id: string): Promise<DeliveryEntity | null> {
    const delivery = await this.prismaService.prisma.delivery.findUnique({
      where: { id },
    });

    return delivery ? this.mapToEntity(delivery) : null;
  }

  /**
   * Find delivery by provider task ID
   */
  async findByProviderTaskId(
    providerTaskId: string,
  ): Promise<DeliveryEntity | null> {
    const delivery = await this.prismaService.prisma.delivery.findFirst({
      where: { providerTaskId },
    });

    return delivery ? this.mapToEntity(delivery) : null;
  }

  /**
   * Create delivery record
   */
  async create(data: CreateDeliveryData): Promise<DeliveryEntity> {
    const delivery = await this.prismaService.prisma.delivery.create({
      data: {
        orderId: data.orderId,
        providerName: data.providerName,
        providerTaskId: data.providerTaskId,
        providerTrackingUrl: data.providerTrackingUrl || null,
        status: DeliveryStatus.PENDING,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupAddress: data.pickupAddress,
        dropLatitude: data.dropLatitude,
        dropLongitude: data.dropLongitude,
        dropAddress: data.dropAddress,
        quotedFee: data.quotedFee ? data.quotedFee : null,
        assignedAt: new Date(),
      },
    });

    return this.mapToEntity(delivery);
  }

  /**
   * Update delivery record
   */
  async update(id: string, data: UpdateDeliveryData): Promise<DeliveryEntity> {
    const updateData: any = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.providerTaskId !== undefined) {
      updateData.providerTaskId = data.providerTaskId;
    }
    if (data.providerTrackingUrl !== undefined) {
      updateData.providerTrackingUrl = data.providerTrackingUrl;
    }
    if (data.partnerName !== undefined) {
      updateData.partnerName = data.partnerName;
    }
    if (data.partnerPhone !== undefined) {
      updateData.partnerPhone = data.partnerPhone;
    }
    if (data.actualFee !== undefined) {
      updateData.actualFee = data.actualFee;
    }
    if (data.failureReason !== undefined) {
      updateData.failureReason = data.failureReason;
    }
    if (data.assignedAt !== undefined) {
      updateData.assignedAt = data.assignedAt;
    }
    if (data.pickedUpAt !== undefined) {
      updateData.pickedUpAt = data.pickedUpAt;
    }
    if (data.deliveredAt !== undefined) {
      updateData.deliveredAt = data.deliveredAt;
    }

    const delivery = await this.prismaService.prisma.delivery.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(delivery);
  }

  /**
   * Map Prisma Delivery to DeliveryEntity
   */
  private mapToEntity(delivery: any): DeliveryEntity {
    return {
      id: delivery.id,
      orderId: delivery.orderId,
      providerName: delivery.providerName,
      providerTaskId: delivery.providerTaskId,
      providerTrackingUrl: delivery.providerTrackingUrl,
      status: delivery.status as DeliveryStatus,
      pickupLatitude: Number(delivery.pickupLatitude),
      pickupLongitude: Number(delivery.pickupLongitude),
      pickupAddress: delivery.pickupAddress,
      dropLatitude: Number(delivery.dropLatitude),
      dropLongitude: Number(delivery.dropLongitude),
      dropAddress: delivery.dropAddress,
      partnerName: delivery.partnerName,
      partnerPhone: delivery.partnerPhone,
      quotedFee: delivery.quotedFee ? Number(delivery.quotedFee) : null,
      actualFee: delivery.actualFee ? Number(delivery.actualFee) : null,
      failureReason: delivery.failureReason,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      assignedAt: delivery.assignedAt,
      pickedUpAt: delivery.pickedUpAt,
      deliveredAt: delivery.deliveredAt,
    };
  }
}
