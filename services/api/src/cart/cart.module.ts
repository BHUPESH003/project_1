import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';

@Module({
  imports: [AuthModule],
  controllers: [CartController],
  providers: [CartService, JwtAuthGuard, RolesGuard],
  exports: [CartService],
})
export class CartModule {}
