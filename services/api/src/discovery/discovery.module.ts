import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { SellersModule } from '@/sellers/sellers.module';
import { AuthModule } from '@/auth/auth.module';
import { OptionalJwtAuthGuard } from '@/common/guards';

@Module({
  imports: [AuthModule, SellersModule], // provides JwtService + SellerRepository
  controllers: [DiscoveryController],
  providers: [DiscoveryService, OptionalJwtAuthGuard],
})
export class DiscoveryModule {}
