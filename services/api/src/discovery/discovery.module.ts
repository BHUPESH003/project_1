import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { SellersModule } from '@/sellers/sellers.module';

@Module({
  imports: [SellersModule], // provides SellerRepository
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
