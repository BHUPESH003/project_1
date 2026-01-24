/**
 * Payment Repository
 *
 * Handles all database operations for Payment entity.
 * Abstracts Prisma-specific queries from services.
 */

import { Injectable } from '@nestjs/common';
import { PaymentStatus, PaymentMethod } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Payment Entity
 */
export interface PaymentEntity {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayName: string | null;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewaySignature: string | null;
  upiId: string | null;
  upiTransactionId: string | null;
  failureReason: string | null;
  failureCode: string | null;
  refundAmount: number | null;
  refundStatus: string | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
}

/**
 * Create Payment Data
 */
export interface CreatePaymentData {
  orderId: string;
  amount: number; // In rupees
  method: PaymentMethod;
  gatewayName: string;
  gatewayOrderId?: string;
}

/**
 * Update Payment Data
 */
export interface UpdatePaymentData {
  status?: PaymentStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  upiId?: string;
  upiTransactionId?: string;
  failureReason?: string;
  failureCode?: string;
  paidAt?: Date;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find payment by order ID
   */
  async findByOrderId(orderId: string): Promise<PaymentEntity | null> {
    const payment = await this.prismaService.prisma.payment.findUnique({
      where: { orderId },
    });

    return payment ? this.mapToEntity(payment) : null;
  }

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<PaymentEntity | null> {
    const payment = await this.prismaService.prisma.payment.findUnique({
      where: { id },
    });

    return payment ? this.mapToEntity(payment) : null;
  }

  /**
   * Find payment by gateway payment ID
   */
  async findByGatewayPaymentId(
    gatewayPaymentId: string,
  ): Promise<PaymentEntity | null> {
    const payment = await this.prismaService.prisma.payment.findFirst({
      where: { gatewayPaymentId },
    });

    return payment ? this.mapToEntity(payment) : null;
  }

  /**
   * Create payment record
   */
  async create(data: CreatePaymentData): Promise<PaymentEntity> {
    const payment = await this.prismaService.prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
        gatewayName: data.gatewayName,
        gatewayOrderId: data.gatewayOrderId || null,
      },
    });

    return this.mapToEntity(payment);
  }

  /**
   * Update payment record
   */
  async update(id: string, data: UpdatePaymentData): Promise<PaymentEntity> {
    const updateData: any = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.gatewayOrderId !== undefined) {
      updateData.gatewayOrderId = data.gatewayOrderId;
    }
    if (data.gatewayPaymentId !== undefined) {
      updateData.gatewayPaymentId = data.gatewayPaymentId;
    }
    if (data.gatewaySignature !== undefined) {
      updateData.gatewaySignature = data.gatewaySignature;
    }
    if (data.upiId !== undefined) {
      updateData.upiId = data.upiId;
    }
    if (data.upiTransactionId !== undefined) {
      updateData.upiTransactionId = data.upiTransactionId;
    }
    if (data.failureReason !== undefined) {
      updateData.failureReason = data.failureReason;
    }
    if (data.failureCode !== undefined) {
      updateData.failureCode = data.failureCode;
    }
    if (data.paidAt !== undefined) {
      updateData.paidAt = data.paidAt;
    }

    const payment = await this.prismaService.prisma.payment.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(payment);
  }

  /**
   * Map Prisma Payment to PaymentEntity
   */
  private mapToEntity(payment: any): PaymentEntity {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      method: payment.method as PaymentMethod,
      status: payment.status as PaymentStatus,
      gatewayName: payment.gatewayName,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewaySignature: payment.gatewaySignature,
      upiId: payment.upiId,
      upiTransactionId: payment.upiTransactionId,
      failureReason: payment.failureReason,
      failureCode: payment.failureCode,
      refundAmount: payment.refundAmount ? Number(payment.refundAmount) : null,
      refundStatus: payment.refundStatus,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paidAt: payment.paidAt,
    };
  }
}
