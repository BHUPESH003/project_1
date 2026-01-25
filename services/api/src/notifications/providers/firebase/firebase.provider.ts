/**
 * Firebase Cloud Messaging (FCM) Provider
 *
 * Push notification provider using Firebase Cloud Messaging.
 * Handles sending push notifications to Android and iOS devices.
 *
 * CRITICAL RULES:
 * - Failures are logged, not thrown (notifications are non-critical)
 * - Provider-specific logic is isolated here
 * - No Firebase-specific fields leak outside this adapter
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  NotificationProvider,
  PushNotificationRequest,
  PushNotificationResponse,
  SmsNotificationRequest,
  SmsNotificationResponse,
} from '../notification-provider.interface';

/**
 * Firebase Configuration
 */
interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  apiKey?: string; // Optional for REST API
}

/**
 * Firebase Configuration
 */
interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  apiKey?: string; // Optional for REST API
}

@Injectable()
export class FirebaseProvider implements NotificationProvider, OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);
  private readonly config: FirebaseConfig;
  private firebaseApp!: admin.app.App;

  constructor(private readonly configService: ConfigService) {
    // Load Firebase configuration from environment
    this.config = {
      projectId:
        this.configService.get<string>('FIREBASE_PROJECT_ID') || 'stub-project',
      privateKey:
        this.configService.get<string>('FIREBASE_PRIVATE_KEY') || 'stub-key',
      clientEmail:
        this.configService.get<string>('FIREBASE_CLIENT_EMAIL') ||
        'stub@example.com',
      apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
    };

    this.logger.log(
      `FirebaseProvider initialized (project: ${this.config.projectId})`,
    );
  }

  async onModuleInit() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.projectId,
          privateKey: this.config.privateKey.replace(/\\n/g, '\n'),
          clientEmail: this.config.clientEmail,
        }),
        projectId: this.config.projectId,
      });
      this.logger.log('Firebase Admin SDK initialized successfully');
    } else {
      this.firebaseApp = admin.app();
    }
  }

  getProviderName(): string {
    return 'FIREBASE';
  }

  async sendPush(
    request: PushNotificationRequest,
  ): Promise<PushNotificationResponse> {
    this.logger.log(
      `Sending push notification via Firebase to user ${request.userId}`,
    );

    try {
      // Get FCM token for user
      const fcmToken = await this.getUserFcmToken(request.userId);
      if (!fcmToken) {
        this.logger.warn(`No FCM token found for user ${request.userId}`);
        return {
          success: false,
          error: 'No FCM token available for user',
        };
      }

      // Send push notification via Firebase Admin SDK
      const message: admin.messaging.Message = {
        notification: {
          title: request.title,
          body: request.body,
        },
        data: request.data ? Object.fromEntries(
          Object.entries(request.data).map(([k, v]) => [k, String(v)])
        ) : {},
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);

      this.logger.log(
        `Firebase push notification sent successfully to user ${request.userId}, messageId: ${response}`,
      );

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      // Log error but don't throw - notifications are non-critical
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send Firebase push notification to user ${request.userId}:`,
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendSms(
    request: SmsNotificationRequest,
  ): Promise<SmsNotificationResponse> {
    // Firebase does not support SMS - return failure
    this.logger.warn(
      `FirebaseProvider does not support SMS. Requested SMS to ${request.phoneNumber}`,
    );

    return {
      success: false,
      error: 'Firebase does not support SMS notifications',
    };
  }

  /**
   * Get FCM token for user (stubbed for MVP)
   * TODO: Sprint 4 - Implement token storage/retrieval
   */
  private async getUserFcmToken(userId: string): Promise<string> {
    // TODO: Retrieve FCM token from database
    // For MVP, return stub token
    return `fcm-token-${userId}`;
  }
}
