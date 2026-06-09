import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { WhatsAppProvider } from './providers/whatsapp/whatsapp.provider';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, WhatsAppProvider, JwtAuthGuard, RolesGuard],
  exports: [MessagingService],
})
export class MessagingModule {}
