/**
 * Web Push Provider (replaces Firebase FCM for web PWA notifications)
 *
 * Uses the VAPID protocol (RFC 8030) via the `web-push` library.
 * Queries user_devices for stored browser PushSubscriptions and delivers
 * directly to the browser's push service — no Firebase SDK on the client.
 *
 * CRITICAL RULES:
 * - Failures are logged, not thrown (notifications are non-critical)
 * - Expired/invalid subscriptions are silently removed from DB (410 Gone)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '@/prisma/prisma.service';
import {
  NotificationProvider,
  PushNotificationRequest,
  PushNotificationResponse,
  SmsNotificationRequest,
  SmsNotificationResponse,
} from '../notification-provider.interface';

@Injectable()
export class FirebaseProvider implements NotificationProvider, OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY', '');
    const subject = this.configService.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@example.com',
    );

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('Web Push VAPID details configured');
    } else {
      this.logger.warn('VAPID keys not set — web push will be skipped');
    }
  }

  getProviderName(): string {
    return 'FIREBASE';
  }

  async sendPush(
    request: PushNotificationRequest,
  ): Promise<PushNotificationResponse> {
    this.logger.log(`Sending web push to user ${request.userId}`);

    try {
      const devices = await this.prisma.prisma.userDevice.findMany({
        where: { userId: request.userId, platform: 'web' },
      });

      if (devices.length === 0) {
        this.logger.warn(`No web push subscriptions for user ${request.userId}`);
        return { success: false, error: 'No web push subscription for user' };
      }

      const payload = JSON.stringify({
        title: request.title,
        body: request.body,
        data: request.data ?? {},
      });

      const results = await Promise.allSettled(
        devices.map(async (d) => {
          const subscription: webpush.PushSubscription = {
            endpoint: d.endpoint,
            keys: { p256dh: d.p256dhKey, auth: d.authKey },
          };

          try {
            await webpush.sendNotification(subscription, payload);
          } catch (err: unknown) {
            const httpErr = err as { statusCode?: number };
            if (httpErr?.statusCode === 410 || httpErr?.statusCode === 404) {
              // Subscription expired or gone — remove it
              await this.prisma.prisma.userDevice.delete({
                where: { id: d.id },
              });
              this.logger.log(`Removed stale subscription for device ${d.id}`);
            }
            throw err;
          }
        }),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      this.logger.log(
        `Web push: ${succeeded}/${devices.length} succeeded for user ${request.userId}`,
      );

      return { success: succeeded > 0, messageId: `sent:${succeeded}` };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Web push failed for user ${request.userId}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async sendSms(
    request: SmsNotificationRequest,
  ): Promise<SmsNotificationResponse> {
    this.logger.warn(
      `WebPushProvider does not support SMS for ${request.phoneNumber}`,
    );
    return { success: false, error: 'Use TwilioProvider for SMS' };
  }
}
