import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AuthModule } from '@/auth/auth.module';
import { OrdersModule } from '@/orders/orders.module';
import { OrderStateMachineModule } from '@/orders/state-machine/order-state-machine.module';
import { SellersModule } from '@/sellers/sellers.module';
import { DeliveryModule } from '@/delivery/delivery.module';
import { PaymentsModule } from '@/payments/payments.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { BannersModule } from '@/banners/banners.module';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';

@Module({
  imports: [
    AuthModule,
    OrdersModule, // For OrderRepository
    OrderStateMachineModule, // For OrderStateMachineService
    SellersModule, // For SellerRepository
    DeliveryModule, // For DeliveryService and DeliveryRepository
    PaymentsModule, // For PaymentRepository
    PrismaModule, // For AdminAuditService
    BannersModule, // For admin banner CRUD
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAuditService,
    AdminAnalyticsService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AdminService],
})
export class AdminModule {}
