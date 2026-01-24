import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { PaytmProvider } from './providers/paytm/paytm.provider';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderStateMachineModule } from '@/orders/state-machine/order-state-machine.module';
import { OrdersModule } from '@/orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    OrderStateMachineModule, // For state machine transitions
    forwardRef(() => OrdersModule), // For OrderRepository (circular dependency)
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentRepository,
    PaymentProviderRegistry,
    PaytmProvider,
    // Register PaytmProvider in registry
    {
      provide: 'PAYMENT_PROVIDER_REGISTRATION',
      useFactory: (
        registry: PaymentProviderRegistry,
        paytmProvider: PaytmProvider,
      ) => {
        registry.register(paytmProvider);
        return true;
      },
      inject: [PaymentProviderRegistry, PaytmProvider],
    },
  ],
  exports: [PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
