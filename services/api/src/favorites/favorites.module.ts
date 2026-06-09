import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [AuthModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, JwtAuthGuard, RolesGuard],
  exports: [FavoritesService],
})
export class FavoritesModule {}
