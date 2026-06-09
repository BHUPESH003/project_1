import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthModule } from '@/auth/auth.module';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '@/common/guards';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
