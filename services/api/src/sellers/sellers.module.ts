import { Module } from '@nestjs/common';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { SellerRepository } from './repositories/seller.repository';
import { AuthModule } from '@/auth/auth.module';
import { FavoritesModule } from '@/favorites/favorites.module';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '@/common/guards';

@Module({
  imports: [AuthModule, FavoritesModule],
  controllers: [SellersController],
  providers: [
    SellersService,
    SellerRepository,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
  exports: [SellersService, SellerRepository],
})
export class SellersModule {}
