import { Module, forwardRef } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './repositories/delivery.repository';
import { DeliveryAdapterRegistry } from './adapters/delivery-adapter.registry';
import { UberDirectAdapter } from './adapters/uber-direct/uber-direct.adapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderStateMachineModule } from '@/orders/state-machine/order-state-machine.module';
import { OrdersModule } from '@/orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    OrderStateMachineModule, // For state machine transitions
    forwardRef(() => OrdersModule), // For OrderRepository (circular dependency)
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    DeliveryRepository,
    DeliveryAdapterRegistry,
    UberDirectAdapter,
    // Register UberDirectAdapter in registry
    {
      provide: 'DELIVERY_ADAPTER_REGISTRATION',
      useFactory: (
        registry: DeliveryAdapterRegistry,
        uberAdapter: UberDirectAdapter,
      ) => {
        registry.register(uberAdapter);
        return true;
      },
      inject: [DeliveryAdapterRegistry, UberDirectAdapter],
    },
  ],
  exports: [DeliveryService, DeliveryRepository],
})
export class DeliveryModule {}
