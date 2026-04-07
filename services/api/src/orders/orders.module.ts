import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderStateMachineModule } from './state-machine/order-state-machine.module';
import { CategoriesModule } from '@/categories/categories.module';
import { SellersModule } from '@/sellers/sellers.module';
import { AuthModule } from '@/auth/auth.module';
import { PaymentsModule } from '@/payments/payments.module';
import { DeliveryModule } from '@/delivery/delivery.module';
import { QueueModule } from '@/queue/queue.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    OrderStateMachineModule,
    CategoriesModule, // For CategoryRegistry
    SellersModule, // For SellerRepository
    forwardRef(() => PaymentsModule), // For PaymentsService (circular dependency)
    forwardRef(() => DeliveryModule), // For DeliveryService (circular dependency)
    forwardRef(() => QueueModule), // For QueueService (circular dependency)
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository],
  exports: [OrdersService, OrderRepository],
})
export class OrdersModule {}
