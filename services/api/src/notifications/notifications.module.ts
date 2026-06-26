import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationProviderRegistry } from './providers/notification-provider.registry';
import { FirebaseProvider } from './providers/firebase/firebase.provider';
import { TwilioNotificationProvider } from './providers/twilio/twilio-notification.provider';
import { UsersModule } from '@/users/users.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProviderRegistry,
    FirebaseProvider,
    TwilioNotificationProvider,
    // Register providers in registry
    {
      provide: 'NOTIFICATION_PROVIDER_REGISTRATION',
      useFactory: (
        registry: NotificationProviderRegistry,
        firebaseProvider: FirebaseProvider,
        twilioProvider: TwilioNotificationProvider,
      ) => {
        registry.register(firebaseProvider);
        registry.register(twilioProvider);
        return true;
      },
      inject: [
        NotificationProviderRegistry,
        FirebaseProvider,
        TwilioNotificationProvider,
      ],
    },
  ],
  exports: [NotificationsService, NotificationProviderRegistry],
})
export class NotificationsModule {}
