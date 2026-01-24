/**
 * Order State Machine Module
 *
 * Provides OrderStateMachineService as the single source of truth
 * for order state transitions.
 */

import { Module, forwardRef } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { QueueModule } from '@/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QueueModule), // For QueueService (circular dependency)
  ],
  providers: [OrderStateMachineService],
  exports: [OrderStateMachineService], // Export for use in OrdersService
})
export class OrderStateMachineModule {}
