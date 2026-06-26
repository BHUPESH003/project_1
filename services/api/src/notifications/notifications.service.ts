import { Injectable, Logger } from '@nestjs/common';
import { NotificationProviderRegistry } from './providers/notification-provider.registry';
import {
  PushNotificationRequest,
  SmsNotificationRequest,
} from './providers/notification-provider.interface';
import { UserRepository } from '@/users/repositories/user.repository';
import { PrismaService } from '@/prisma/prisma.service';

export type NotificationType = 'ORDER_UPDATE' | 'MARKETING' | 'SYSTEM';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly providerRegistry: NotificationProviderRegistry,
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Persistence ─────────────────────────────────────────────────────────

  async persistNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    opts?: { orderId?: string; data?: Record<string, unknown> },
  ) {
    try {
      return await this.prisma.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          orderId: opts?.orderId ?? null,
          data: opts?.data ? (opts.data as any) : undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to persist notification for user ${userId}`, err);
      return null;
    }
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // ─── Push / SMS delivery ─────────────────────────────────────────────────

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const provider = this.providerRegistry.getDefaultPushProvider();
      const request: PushNotificationRequest = { userId, title, body, data };
      const response = await provider.sendPush(request);
      if (response.success) {
        this.logger.log(`Push sent to ${userId} via ${provider.getProviderName()}`);
        return true;
      }
      this.logger.warn(`Push failed for ${userId}: ${response.error}`);
      return false;
    } catch (error) {
      this.logger.error(`Push error for ${userId}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  async sendSmsNotification(userId: string, message: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user?.phone) {
        this.logger.warn(`No phone for SMS to user ${userId}`);
        return false;
      }
      const provider = this.providerRegistry.getDefaultSmsProvider();
      const request: SmsNotificationRequest = { phoneNumber: user.phone, message };
      const response = await provider.sendSms(request);
      if (response.success) {
        this.logger.log(`SMS sent to ${userId}`);
        return true;
      }
      this.logger.warn(`SMS failed for ${userId}: ${response.error}`);
      return false;
    } catch (error) {
      this.logger.error(`SMS error for ${userId}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  async sendNotificationIntent(intent: {
    type: 'PUSH' | 'SMS' | 'BOTH';
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<boolean> {
    let success = false;
    if (intent.type === 'PUSH' || intent.type === 'BOTH') {
      success = (await this.sendPushNotification(intent.userId, intent.title, intent.body, intent.data)) || success;
    }
    if (intent.type === 'SMS' || intent.type === 'BOTH') {
      success = (await this.sendSmsNotification(intent.userId, intent.body)) || success;
    }
    return success;
  }
}
