import { Module, forwardRef } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CartModule } from '@/cart/cart.module';
import { SellersModule } from '@/sellers/sellers.module';
import { UsersModule } from '@/users/users.module';
import { DeliveryModule } from '@/delivery/delivery.module';
import { OrdersModule } from '@/orders/orders.module';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard } from '@/common/guards';

@Module({
  imports: [
    PrismaModule,
    CartModule,
    SellersModule,
    UsersModule,
    AuthModule,
    DeliveryModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, JwtAuthGuard],
  exports: [CheckoutService],
})
export class CheckoutModule {}
