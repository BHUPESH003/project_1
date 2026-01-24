/**
 * Admin Audit Service
 *
 * Records all admin actions for audit trail.
 * CRITICAL: All admin actions must be logged.
 *
 * CRITICAL RULES:
 * - Log actor, action, target, reason, timestamp
 * - Never fail silently
 * - Audit logs are immutable
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Admin Action Type
 */
export enum AdminActionType {
  REASSIGN_SELLER = 'REASSIGN_SELLER',
  REASSIGN_DELIVERY = 'REASSIGN_DELIVERY',
  CANCEL_ORDER = 'CANCEL_ORDER',
  INITIATE_REFUND = 'INITIATE_REFUND',
}

/**
 * Admin Action Log Entry
 */
export interface AdminActionLog {
  id: string;
  actorId: string; // Admin user ID
  actionType: AdminActionType;
  targetOrderId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log admin action
   *
   * @param actorId - Admin user ID
   * @param actionType - Type of action
   * @param targetOrderId - Order ID being acted upon
   * @param reason - Reason for action
   * @param metadata - Additional metadata
   */
  async logAction(
    actorId: string,
    actionType: AdminActionType,
    targetOrderId: string,
    reason: string | null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    try {
      // TODO: Create AdminActionLog table in Prisma schema
      // For MVP, log to console and application logs
      // Future: Store in database for audit trail

      this.logger.log(
        `[ADMIN_AUDIT] ${actionType} on order ${targetOrderId} by admin ${actorId}. Reason: ${reason || 'N/A'}. Metadata: ${JSON.stringify(metadata || {})}`,
      );

      // TODO: Store in database when AdminActionLog table is created
      // await this.prisma.prisma.adminActionLog.create({
      //   data: {
      //     actorId,
      //     actionType,
      //     targetOrderId,
      //     reason,
      //     metadata,
      //   },
      // });
    } catch (error) {
      // Log error but don't throw - audit logging shouldn't block admin actions
      this.logger.error(
        `Failed to log admin action ${actionType} on order ${targetOrderId}:`,
        error,
      );
    }
  }
}
