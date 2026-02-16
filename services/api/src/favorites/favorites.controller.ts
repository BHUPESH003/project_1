import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';

/**
 * Favorites API – user's favorite shops.
 * GET /favorites, POST /favorites/:sellerId, DELETE /favorites/:sellerId
 */
@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my favorite shops' })
  list(@Request() req: { user: { id: string } }) {
    return this.favoritesService.list(req.user.id);
  }

  @Post(':sellerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'sellerId' })
  @ApiOperation({ summary: 'Add shop to favorites' })
  add(
    @Param('sellerId') sellerId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.favoritesService.add(req.user.id, sellerId);
  }

  @Delete(':sellerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'sellerId' })
  @ApiOperation({ summary: 'Remove shop from favorites' })
  remove(
    @Param('sellerId') sellerId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.favoritesService.remove(req.user.id, sellerId);
  }
}
