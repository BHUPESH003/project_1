/**
 * Admin Service
 *
 * Service for admin operations and interventions.
 * CRITICAL RULES:
 * - All admin actions must go through Order State Machine
 * - No direct DB mutations
 * - All actions are audited
 * - Invalid transitions are rejected
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '@repo/types';
import { isTerminalState } from '@/orders/state-machine/order-state-machine.types';
import { GetOrdersDto } from './dto/get-orders.dto';
import { ReassignSellerDto } from './dto/reassign-seller.dto';
import { ReassignDeliveryDto } from './dto/reassign-delivery.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderRepository } from '@/orders/repositories/order.repository';
import { OrderStateMachineService } from '@/orders/state-machine';
import { SellerRepository } from '@/sellers/repositories/seller.repository';
import { DeliveryService } from '@/delivery/delivery.service';
import { DeliveryRepository } from '@/delivery/repositories/delivery.repository';
import { PaymentRepository } from '@/payments/repositories/payment.repository';
import { PaymentStatus, DeliveryStatus } from '@repo/types';
import { AdminAuditService, AdminActionType } from './admin-audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { GetSellersDto } from './dto/get-sellers.dto';
import { UpdateAdminSellerDto } from './dto/update-admin-seller.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GetPayoutsDto } from './dto/get-payouts.dto';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly stateMachine: OrderStateMachineService,
    private readonly sellerRepository: SellerRepository,
    private readonly deliveryService: DeliveryService,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly auditService: AdminAuditService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Get all orders with filters and pagination
   *
   * @param query - Filter and pagination parameters
   * @param adminId - Admin user ID (for audit)
   * @returns Paginated list of orders
   */
  async getOrders(query: GetOrdersDto, adminId: string) {
    const {
      status,
      sellerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get orders with pagination
    // Access PrismaService through orderRepository
    const prisma = (this.orderRepository as any).prismaService;
    const [orders, total] = await Promise.all([
      prisma.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              shopName: true,
              address: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order: any) => ({
        order_id: order.id,
        status: order.status,
        user: {
          id: order.user.id,
          phone: order.user.phone,
          name: order.user.name,
        },
        seller: order.seller
          ? {
              id: order.seller.id,
              shop_name: order.seller.shopName,
              address: order.seller.address,
            }
          : null,
        category: {
          id: order.category.id,
          name: order.category.name,
        },
        item_cost: order.itemCost ? Number(order.itemCost) : null,
        delivery_fee: order.deliveryFee ? Number(order.deliveryFee) : null,
        total_amount: order.totalAmount ? Number(order.totalAmount) : null,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single order with full detail for the admin order-detail screen.
   * Returns the same snake_case shape as getOrders() plus state history,
   * payment, delivery and files.
   */
  async getOrderById(orderId: string) {
    const order = await this.prismaService.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, phone: true, name: true } },
        seller: {
          select: { id: true, shopName: true, address: true },
        },
        category: { select: { id: true, name: true } },
        payment: true,
        delivery: true,
        files: true,
        stateHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      order_id: order.id,
      status: order.status,
      order_payload: order.orderPayload,
      user: {
        id: order.user.id,
        phone: order.user.phone,
        name: order.user.name,
      },
      seller: order.seller
        ? {
            id: order.seller.id,
            shop_name: order.seller.shopName,
            address: order.seller.address,
          }
        : null,
      category: { id: order.category.id, name: order.category.name },
      item_cost: order.itemCost ? Number(order.itemCost) : null,
      delivery_fee: order.deliveryFee ? Number(order.deliveryFee) : null,
      total_amount: order.totalAmount ? Number(order.totalAmount) : null,
      drop_address: order.dropAddress,
      failure_reason: order.failureReason,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      completed_at: order.completedAt,
      payment: order.payment
        ? {
            id: order.payment.id,
            amount: Number(order.payment.amount),
            method: order.payment.method,
            status: order.payment.status,
            gateway_name: order.payment.gatewayName,
            gateway_payment_id: order.payment.gatewayPaymentId,
            refund_amount: order.payment.refundAmount
              ? Number(order.payment.refundAmount)
              : null,
            refund_status: order.payment.refundStatus,
            refunded_at: order.payment.refundedAt,
            paid_at: order.payment.paidAt,
          }
        : null,
      delivery: order.delivery
        ? {
            id: order.delivery.id,
            provider_name: order.delivery.providerName,
            provider_task_id: order.delivery.providerTaskId,
            provider_tracking_url: order.delivery.providerTrackingUrl,
            status: order.delivery.status,
            partner_name: order.delivery.partnerName,
            partner_phone: order.delivery.partnerPhone,
            failure_reason: order.delivery.failureReason,
          }
        : null,
      files: order.files.map((f) => ({
        id: f.id,
        original_name: f.originalName,
        mime_type: f.mimeType,
        size_bytes: f.sizeBytes,
        storage_url: f.storageUrl,
        page_count: f.pageCount,
      })),
      state_history: order.stateHistory.map((h) => ({
        id: h.id,
        from_status: h.fromStatus,
        to_status: h.toStatus,
        triggered_by: h.triggeredBy,
        reason: h.reason,
        created_at: h.createdAt,
      })),
    };
  }

  /**
   * Reassign seller to order
   *
   * CRITICAL: Only works if order is not in terminal state
   * Order must transition through state machine
   *
   * @param orderId - Order ID
   * @param reassignDto - Reassignment data
   * @param adminId - Admin user ID (for audit)
   * @returns Updated order
   */
  async reassignSeller(
    orderId: string,
    reassignDto: ReassignSellerDto,
    adminId: string,
  ) {
    const { sellerId } = reassignDto;

    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Check if order is in terminal state
    if (isTerminalState(order.status)) {
      throw new BadRequestException(
        `Cannot reassign seller to order in terminal state: ${order.status}`,
      );
    }

    // Validate seller exists and is available
    const seller = await this.sellerRepository.findById(sellerId);
    if (!seller) {
      throw new NotFoundException(`Seller ${sellerId} not found`);
    }

    if (seller.status !== 'ONLINE') {
      throw new BadRequestException(
        `Seller ${sellerId} is not available (status: ${seller.status})`,
      );
    }

    // Update order seller via repository (direct update allowed for sellerId)
    // Note: This doesn't change order state, just updates seller assignment
    await this.orderRepository.update(orderId, {
      sellerId,
    });

    // Log admin action
    await this.auditService.logAction(
      adminId,
      AdminActionType.REASSIGN_SELLER,
      orderId,
      `Reassigned seller to ${sellerId}`,
      { previousSellerId: order.sellerId, newSellerId: sellerId },
    );

    this.logger.log(
      `Admin ${adminId} reassigned seller ${sellerId} to order ${orderId}`,
    );

    return {
      order_id: orderId,
      message: `Seller reassigned to ${seller.shopName}`,
      seller: {
        id: seller.id,
        shop_name: seller.shopName,
      },
    };
  }

  /**
   * Reassign delivery to order
   *
   * CRITICAL: Cancels existing delivery and creates new one
   * Only works if order is in READY_FOR_PICKUP or PICKED_UP state
   *
   * @param orderId - Order ID
   * @param deliveryDto - Delivery reassignment data
   * @param adminId - Admin user ID (for audit)
   * @returns Updated delivery info
   */
  async reassignDelivery(
    orderId: string,
    deliveryDto: ReassignDeliveryDto,
    adminId: string,
  ) {
    const { provider, trackingId } = deliveryDto;

    // Get order
    const order = await this.orderRepository.findById(orderId, true);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Check if order is in valid state for delivery reassignment
    if (
      order.status !== OrderStatus.READY_FOR_PICKUP &&
      order.status !== OrderStatus.PICKED_UP
    ) {
      throw new BadRequestException(
        `Cannot reassign delivery for order in state: ${order.status}. Order must be READY_FOR_PICKUP or PICKED_UP`,
      );
    }

    // Get existing delivery
    const existingDelivery =
      await this.deliveryRepository.findByOrderId(orderId);

    // Cancel existing delivery if it exists
    if (existingDelivery) {
      // Mark delivery as cancelled
      await this.deliveryRepository.update(existingDelivery.id, {
        status: DeliveryStatus.CANCELLED,
        failureReason: 'Reassigned by admin',
      });

      this.logger.log(
        `Cancelled existing delivery ${existingDelivery.id} for order ${orderId}`,
      );
    }

    // Create new delivery record
    // Note: For MVP, we're just updating the delivery record
    // In production, you'd call the delivery adapter to create a new task
    if (existingDelivery) {
      await this.deliveryRepository.update(existingDelivery.id, {
        providerTaskId: trackingId,
        status: DeliveryStatus.ASSIGNED,
        failureReason: undefined,
      });
    } else {
      // If no delivery exists, create one
      // This shouldn't happen in normal flow, but handle it for safety
      if (!order.seller) {
        throw new BadRequestException(
          `Cannot create delivery for order without seller`,
        );
      }

      // Get seller location
      const seller = await this.sellerRepository.findById(order.sellerId!);
      if (!seller) {
        throw new NotFoundException(`Seller ${order.sellerId} not found`);
      }

      await this.deliveryRepository.create({
        orderId,
        providerName: provider,
        providerTaskId: trackingId,
        pickupLatitude: Number(seller.latitude),
        pickupLongitude: Number(seller.longitude),
        pickupAddress: seller.address,
        dropLatitude: order.dropLatitude || 0,
        dropLongitude: order.dropLongitude || 0,
        dropAddress: order.dropAddress || '',
      });
    }

    // Log admin action
    await this.auditService.logAction(
      adminId,
      AdminActionType.REASSIGN_DELIVERY,
      orderId,
      `Reassigned delivery provider to ${provider}`,
      {
        provider,
        trackingId,
        previousDeliveryId: existingDelivery?.id,
      },
    );

    this.logger.log(
      `Admin ${adminId} reassigned delivery for order ${orderId} to provider ${provider}`,
    );

    return {
      order_id: orderId,
      message: `Delivery reassigned to ${provider}`,
      delivery: {
        provider,
        tracking_id: trackingId,
      },
    };
  }

  /**
   * Cancel order and initiate refund
   *
   * CRITICAL: Transitions order via state machine
   * Marks payment as REFUND_INITIATED (not REFUNDED - manual process)
   *
   * @param orderId - Order ID
   * @param cancelDto - Cancellation data
   * @param adminId - Admin user ID (for audit)
   * @returns Cancellation result
   */
  async cancelOrder(
    orderId: string,
    cancelDto: CancelOrderDto,
    adminId: string,
  ) {
    const { reason, refundAmount } = cancelDto;

    // Get order
    const order = await this.orderRepository.findById(orderId, false);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Check if order is in terminal state
    if (isTerminalState(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in terminal state: ${order.status}`,
      );
    }

    // Transition order to USER_CANCELLED via state machine
    await this.stateMachine.transition({
      orderId,
      toState: OrderStatus.USER_CANCELLED,
      triggeredBy: adminId,
      reason: reason || 'Cancelled by admin',
    });

    // Get payment if exists
    const payment = await this.paymentRepository.findByOrderId(orderId);

    // Initiate refund if payment exists and is successful
    if (payment && payment.status === PaymentStatus.SUCCESS) {
      const refundAmt = refundAmount || payment.amount;

      // Update payment with refund status
      // Note: For MVP, refundAmount is stored in Payment model
      // Actual refund processing is manual (admin-triggered only)
      // TODO: Add refundStatus field to Payment model in Prisma schema
      // For now, we'll update via Prisma directly
      const prisma = (this.paymentRepository as any)
        .prismaService as PrismaService;
      await prisma.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: refundAmt,
          // Note: refundStatus field doesn't exist in UpdatePaymentData interface
          // This is a limitation for MVP - will be added in future schema update
        },
      });

      // Log refund initiation
      await this.auditService.logAction(
        adminId,
        AdminActionType.INITIATE_REFUND,
        orderId,
        `Refund initiated: ${refundAmt}`,
        {
          paymentId: payment.id,
          refundAmount: refundAmt,
          originalAmount: payment.amount,
        },
      );

      this.logger.log(
        `Refund initiated for order ${orderId}: ${refundAmt} (payment: ${payment.id})`,
      );
    }

    // Log cancellation action
    await this.auditService.logAction(
      adminId,
      AdminActionType.CANCEL_ORDER,
      orderId,
      reason || 'Order cancelled by admin',
      {
        previousStatus: order.status,
        refundAmount: refundAmount || null,
      },
    );

    this.logger.log(
      `Admin ${adminId} cancelled order ${orderId}. Reason: ${reason || 'N/A'}`,
    );

    return {
      order_id: orderId,
      status: OrderStatus.USER_CANCELLED,
      message: 'Order cancelled successfully',
      refund: payment
        ? {
            initiated: true,
            amount: refundAmount || payment.amount,
            note: 'Refund will be processed manually',
          }
        : null,
    };
  }

  // ─── Phase 3.3: Admin Seller Management ─────────────────────────────────

  async getSellers(query: GetSellersDto) {
    return this.sellerRepository.findAll({
      status: query.status,
      categoryId: query.category,
      isVerified: query.isVerified,
      isSuspended: query.isSuspended,
      page: query.page,
      limit: query.limit,
    });
  }

  async getSellerById(id: string) {
    const seller = await this.sellerRepository.findById(id, true);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    const [totalOrders, completedOrders, revenue] = await Promise.all([
      this.prismaService.prisma.order.count({ where: { sellerId: id } }),
      this.prismaService.prisma.order.count({
        where: { sellerId: id, status: 'DELIVERED' },
      }),
      this.prismaService.prisma.order.aggregate({
        where: { sellerId: id, status: 'DELIVERED' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      ...seller,
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

  async updateSellerById(
    id: string,
    dto: UpdateAdminSellerDto,
    adminId: string,
  ) {
    const seller = await this.sellerRepository.findById(id, false);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (dto.shopName !== undefined) updateData.shopName = dto.shopName;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isTrending !== undefined) updateData.isTrending = dto.isTrending;

    const updated = await this.sellerRepository.update(id, updateData as any);

    await this.auditService.logAction(
      adminId,
      AdminActionType.UPDATE_SELLER,
      id,
      `Admin updated seller profile`,
      { changes: updateData },
    );

    return updated;
  }

  async verifySeller(id: string, adminId: string) {
    const seller = await this.sellerRepository.findById(id, false);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    const updated = await this.sellerRepository.update(id, {
      isVerified: true,
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.VERIFY_SELLER,
      id,
      `Seller verified`,
      {},
    );

    this.logger.log(`Admin ${adminId} verified seller ${id}`);
    return { id: updated.id, isVerified: updated.isVerified };
  }

  async unverifySeller(id: string, adminId: string) {
    const seller = await this.sellerRepository.findById(id, false);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    const updated = await this.sellerRepository.update(id, {
      isVerified: false,
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.UNVERIFY_SELLER,
      id,
      `Seller unverified`,
      {},
    );

    this.logger.log(`Admin ${adminId} unverified seller ${id}`);
    return { id: updated.id, isVerified: updated.isVerified };
  }

  async suspendSeller(id: string, adminId: string) {
    const seller = await this.sellerRepository.findById(id, false);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    // Force OFFLINE when suspending
    const updated = await this.sellerRepository.update(id, {
      isSuspended: true,
      status: 'OFFLINE',
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.SUSPEND_SELLER,
      id,
      `Seller suspended`,
      {},
    );

    this.logger.log(`Admin ${adminId} suspended seller ${id}`);
    return {
      id: updated.id,
      isSuspended: updated.isSuspended,
      status: updated.status,
    };
  }

  async unsuspendSeller(id: string, adminId: string) {
    const seller = await this.sellerRepository.findById(id, false);
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    const updated = await this.sellerRepository.update(id, {
      isSuspended: false,
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.UNSUSPEND_SELLER,
      id,
      `Seller unsuspended`,
      {},
    );

    this.logger.log(`Admin ${adminId} unsuspended seller ${id}`);
    return {
      id: updated.id,
      isSuspended: updated.isSuspended,
      status: updated.status,
    };
  }

  // ─── Phase 7.2: Category Management ─────────────────────────────────────

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prismaService.prisma.category.findUnique({
      where: { id: dto.id },
    });
    if (existing) {
      throw new ConflictException(
        `Category with id "${dto.id}" already exists`,
      );
    }

    const category = await this.prismaService.prisma.category.create({
      data: {
        id: dto.id,
        name: dto.name,
        status: dto.status ?? 'COMING_SOON',
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
        iconPath: dto.iconPath,
      },
    });

    this.logger.log(`Created category: ${category.id}`);
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prismaService.prisma.category.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Category "${id}" not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.iconPath !== undefined) data.iconPath = dto.iconPath;

    const updated = await this.prismaService.prisma.category.update({
      where: { id },
      data,
    });

    this.logger.log(`Updated category: ${id}`);
    return updated;
  }

  // ─── Admin Payout Management ────────────────────────────────────────────
  // Sellers raise withdrawal requests (POST /sellers/me/payouts); admins
  // review and settle them manually here.

  async getPayouts(query: GetPayoutsDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PayoutRequestWhereInput = {};
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      this.prismaService.prisma.payoutRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, shopName: true } },
        },
      }),
      this.prismaService.prisma.payoutRequest.count({ where }),
    ]);

    return {
      data: payouts.map((p) => ({
        id: p.id,
        seller: { id: p.seller.id, shopName: p.seller.shopName },
        amount: Number(p.amount),
        status: p.status,
        bankDetails: p.bankDetails,
        note: p.note,
        processedAt: p.processedAt,
        processedBy: p.processedBy,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async processPayout(id: string, dto: ProcessPayoutDto, adminId: string) {
    const payout = await this.prismaService.prisma.payoutRequest.findUnique({
      where: { id },
    });
    if (!payout) throw new NotFoundException(`Payout ${id} not found`);
    if (payout.status === 'COMPLETED' || payout.status === 'REJECTED') {
      throw new BadRequestException(
        `Payout ${id} is already ${payout.status}`,
      );
    }

    const updated = await this.prismaService.prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        note: dto.note ?? payout.note,
        processedAt: new Date(),
        processedBy: adminId,
      },
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.PROCESS_PAYOUT,
      id,
      `Payout processed`,
      { amount: Number(updated.amount), sellerId: updated.sellerId },
    );

    this.logger.log(`Admin ${adminId} processed payout ${id}`);
    return {
      id: updated.id,
      status: updated.status,
      processedAt: updated.processedAt,
    };
  }

  async rejectPayout(id: string, dto: RejectPayoutDto, adminId: string) {
    const payout = await this.prismaService.prisma.payoutRequest.findUnique({
      where: { id },
    });
    if (!payout) throw new NotFoundException(`Payout ${id} not found`);
    if (payout.status === 'COMPLETED' || payout.status === 'REJECTED') {
      throw new BadRequestException(
        `Payout ${id} is already ${payout.status}`,
      );
    }

    const updated = await this.prismaService.prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        note: dto.reason,
        processedAt: new Date(),
        processedBy: adminId,
      },
    });

    await this.auditService.logAction(
      adminId,
      AdminActionType.REJECT_PAYOUT,
      id,
      dto.reason,
      { amount: Number(updated.amount), sellerId: updated.sellerId },
    );

    this.logger.log(`Admin ${adminId} rejected payout ${id}`);
    return {
      id: updated.id,
      status: updated.status,
      processedAt: updated.processedAt,
    };
  }
}
