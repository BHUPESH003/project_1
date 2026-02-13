import { Module, forwardRef } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './repositories/delivery.repository';
import { DeliveryPartnerRepository } from './repositories/delivery-partner.repository';
import { DeliveryQuotationService } from './services/delivery-quotation.service';
import { DeliveryAdapterRegistry } from './adapters/delivery-adapter.registry';
import { UberDirectAdapter } from './adapters/uber-direct/uber-direct.adapter';
import { DunzoAdapter } from './adapters/dunzo/dunzo.adapter';
import { PorterAdapter } from './adapters/porter/porter.adapter';
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
    DeliveryPartnerRepository,
    DeliveryQuotationService,
    DeliveryAdapterRegistry,
    UberDirectAdapter,
    DunzoAdapter,
    PorterAdapter,
    // Register all adapters in registry
    {
      provide: 'DELIVERY_ADAPTER_REGISTRATION',
      useFactory: (
        registry: DeliveryAdapterRegistry,
        uberAdapter: UberDirectAdapter,
        dunzoAdapter: DunzoAdapter,
        porterAdapter: PorterAdapter,
      ) => {
        // Register all delivery adapters
        registry.register(uberAdapter);
        registry.register(dunzoAdapter);
        registry.register(porterAdapter);
        return true;
      },
      inject: [
        DeliveryAdapterRegistry,
        UberDirectAdapter,
        DunzoAdapter,
        PorterAdapter,
      ],
    },
  ],
  exports: [DeliveryService, DeliveryRepository, DeliveryPartnerRepository, DeliveryQuotationService],
})
export class DeliveryModule {}
