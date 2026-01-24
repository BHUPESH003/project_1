import { Module } from '@nestjs/common';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { SellerRepository } from './repositories/seller.repository';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SellersController],
  providers: [SellersService, SellerRepository],
  exports: [SellersService, SellerRepository], // Export repository for use in OrdersModule
})
export class SellersModule {}
