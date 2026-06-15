/**
 * Order Repository
 *
 * Handles all database operations for Order entity.
 * Abstracts Prisma-specific queries from services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@repo/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Order Entity with relations
 */
export interface OrderEntity {
  id: string;
  userId: string;
  sellerId: string | null;
  categoryId: string;
  orderPayload: unknown; // JSON
  status: OrderStatus;
  itemCost: number | null;
  deliveryFee: number | null;
  totalAmount: number | null;
  dropLatitude: number | null;
  dropLongitude: number | null;
  dropAddress: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  user?: {
    id: string;
    phone: string;
    name: string | null;
  };
  seller?: {
    id: string;
    shopName: string;
    address: string;
    latitude: unknown;
    longitude: unknown;
  };
  category?: {
    id: string;
    name: string;
    status: unknown;
  };
  files?: Array<{
    id: string;
    url: string;
    type: string;
    originalName: string | null;
    pageCount: number | null;
  }>;
  stateHistory?: Array<{
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    triggeredBy: string | null;
    reason: string | null;
    createdAt: Date;
  }>;
  delivery?: {
    id: string;
    status: string;
    providerName: string | null;
    providerTrackingUrl: string | null;
  } | null;
}

/**
 * Create Order Data
 */
export interface CreateOrderData {
  userId: string;
  categoryId: string;
  orderPayload: unknown;
  fileId?: string;
}

/**
 * Update Order Data
 */
export interface UpdateOrderData {
  sellerId?: string | null; // Allow null to clear seller on rejection
  status?: OrderStatus;
  itemCost?: number;
  deliveryFee?: number;
  totalAmount?: number;
  dropLatitude?: number;
  dropLongitude?: number;
  dropAddress?: string;
  failureReason?: string;
  deliveryProvider?: string;
}

@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  private isTransientReadError(error: unknown): boolean {
    const candidate = error as { code?: string; message?: string } | undefined;

    return (
      candidate?.code === 'ETIMEDOUT' ||
      candidate?.code === 'ECONNRESET' ||
      candidate?.code === 'ECONNREFUSED' ||
      candidate?.message?.includes('ETIMEDOUT') === true ||
      candidate?.message?.includes("Can't reach database server") === true
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async findUniqueWithRetry(
    args: Prisma.OrderFindUniqueArgs,
    id: string,
    maxAttempts = 3,
  ) {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      try {
        return await this.prismaService.prisma.order.findUnique(args);
      } catch (error) {
        if (!this.isTransientReadError(error) || attempt === maxAttempts) {
          throw error;
        }

        this.logger.warn(
          `Transient order read failure for ${id} (attempt ${attempt}/${maxAttempts}), retrying...`,
        );
        await this.sleep(150 * attempt);
        attempt += 1;
      }
    }

    return null;
  }

  private async attachUserToOrder<T extends { userId: string }>(
    order: T | null,
  ): Promise<(T & { user?: OrderEntity['user'] }) | null> {
    if (!order?.userId) {
      return order as (T & { user?: OrderEntity['user'] }) | null;
    }

    const user = await this.prismaService.prisma.user.findUnique({
      where: { id: order.userId },
      select: {
        id: true,
        phone: true,
        name: true,
      },
    });

    return {
      ...order,
      user: user || undefined,
    };
  }

  private async attachUsersToOrders<T extends { userId: string }>(
    orders: T[],
  ): Promise<Array<T & { user?: OrderEntity['user'] }>> {
    const userIds = [
      ...new Set(orders.map((order) => order.userId).filter(Boolean)),
    ];

    if (userIds.length === 0) {
      return orders as Array<T & { user?: OrderEntity['user'] }>;
    }

    const users = await this.prismaService.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        phone: true,
        name: true,
      },
    });

    const usersById = new Map(users.map((user) => [user.id, user]));

    return orders.map((order) => ({
      ...order,
      user: usersById.get(order.userId),
    }));
  }

  /**
   * Find order by ID with optional relations
   */
  async findById(
    id: string,
    includeRelations = true,
  ): Promise<OrderEntity | null> {
    if (!id) {
      return null;
    }

    const args: Prisma.OrderFindUniqueArgs = { where: { id } };

    if (includeRelations) {
      args.include = {
        seller: {
          select: {
            id: true,
            shopName: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        files: {
          select: {
            id: true,
            storageUrl: true,
            mimeType: true,
            originalName: true,
            pageCount: true,
          },
        },
        stateHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            triggeredBy: true,
            reason: true,
            createdAt: true,
          },
        },
        delivery: {
          select: {
            id: true,
            status: true,
            providerName: true,
            providerTrackingUrl: true,
          },
        },
      };
    }

    const order = await this.findUniqueWithRetry(args, id);
    const orderWithUser = includeRelations
      ? await this.attachUserToOrder(order)
      : order;

    return orderWithUser ? this.mapToEntity(orderWithUser) : null;
  }

  /**
   * Create new order
   */
  async create(data: CreateOrderData): Promise<OrderEntity> {
    const order = await this.prismaService.prisma.order.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        orderPayload: data.orderPayload as object,
        status: OrderStatus.CREATED,
        // sellerId is null initially (will be set when seller is selected)
        // fileId is handled via File model relation
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return this.mapToEntity(order);
  }

  /**
   * Update order
   */
  async update(id: string, data: UpdateOrderData): Promise<OrderEntity> {
    const updateData: {
      sellerId?: string | null;
      status?: OrderStatus;
      itemCost?: number;
      deliveryFee?: number;
      totalAmount?: number;
      dropLatitude?: number;
      dropLongitude?: number;
      dropAddress?: string;
      failureReason?: string;
    } = {};

    if (data.sellerId !== undefined) {
      updateData.sellerId = data.sellerId;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    // Convert numbers to Decimal for Prisma
    // Prisma accepts numbers and converts them to Decimal automatically
    if (data.itemCost !== undefined) {
      updateData.itemCost = data.itemCost as any;
    }
    if (data.deliveryFee !== undefined) {
      updateData.deliveryFee = data.deliveryFee as any;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = data.totalAmount as any;
    }
    if (data.dropLatitude !== undefined) {
      updateData.dropLatitude = data.dropLatitude as any;
    }
    if (data.dropLongitude !== undefined) {
      updateData.dropLongitude = data.dropLongitude as any;
    }
    if (data.dropAddress !== undefined) {
      updateData.dropAddress = data.dropAddress;
    }
    if (data.failureReason !== undefined) {
      updateData.failureReason = data.failureReason;
    }

    const order = await this.prismaService.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return this.mapToEntity(order);
  }

  /**
   * Find orders by seller ID with status filter
   */
  async findBySellerId(
    sellerId: string,
    status?: OrderStatus,
  ): Promise<OrderEntity[]> {
    const where: { sellerId: string; status?: OrderStatus } = {
      sellerId,
    };

    if (status) {
      where.status = status;
    }

    const orders = await this.prismaService.prisma.order.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        files: {
          select: {
            id: true,
            storageUrl: true,
            mimeType: true,
            originalName: true,
            pageCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersWithUsers = await this.attachUsersToOrders(orders);

    return ordersWithUsers.map((order) => this.mapToEntity(order));
  }

  /**
   * Find orders by user ID
   */
  async findByUserId(userId: string): Promise<OrderEntity[]> {
    const orders = await this.prismaService.prisma.order.findMany({
      where: { userId },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapToEntity(order));
  }

  /**
   * Map Prisma Order to OrderEntity
   */
  private mapToEntity(order: any): OrderEntity {
    return {
      id: order.id,
      userId: order.userId,
      sellerId: order.sellerId,
      categoryId: order.categoryId,
      orderPayload: order.orderPayload,
      status: order.status as OrderStatus,
      itemCost: order.itemCost ? Number(order.itemCost) : null,
      deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : null,
      totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
      dropLatitude: order.dropLatitude ? Number(order.dropLatitude) : null,
      dropLongitude: order.dropLongitude ? Number(order.dropLongitude) : null,
      dropAddress: order.dropAddress,
      failureReason: order.failureReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      completedAt: order.completedAt,
      user: order.user,
      seller: order.seller,
      category: order.category,
      files:
        order.files?.map((f: any) => ({
          id: f.id,
          url: f.storageUrl,
          type: f.mimeType,
          originalName: f.originalName ?? null,
          pageCount: f.pageCount ?? null,
        })) || [],
      stateHistory: order.stateHistory?.map((h: any) => ({
        ...h,
        fromStatus: h.fromStatus as OrderStatus | null,
        toStatus: h.toStatus as OrderStatus,
      })),
      delivery: order.delivery,
    };
  }
}
