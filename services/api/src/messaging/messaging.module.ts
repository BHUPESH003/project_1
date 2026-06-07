import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { WhatsAppProvider } from './providers/whatsapp/whatsapp.provider';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, WhatsAppProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
