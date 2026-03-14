import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard, RolesGuard, Roles, OptionalJwtAuthGuard } from '@/common/guards';
import { UserRole } from '@repo/types';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Deals Hub
  @Get('deals')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get best deals from nearby sellers' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getDeals(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getDeals(
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      limit ? Number(limit) : undefined
    );
  }

  // Wishlist
  @Get('wishlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my product wishlist' })
  listWishlist(@Request() req: { user: { id: string } }) {
    return this.productsService.listWishlist(req.user.id);
  }

  @Post(':id/wishlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOperation({ summary: 'Add product to wishlist' })
  addWishlist(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.productsService.addToWishlist(req.user.id, id);
  }

  @Delete(':id/wishlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeWishlist(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.productsService.removeFromWishlist(req.user.id, id);
  }

  // Notify me
  @Get('notify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my notify-me subscriptions' })
  listNotify(@Request() req: { user: { id: string } }) {
    return this.productsService.listNotify(req.user.id);
  }

  @Post(':id/notify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOperation({ summary: 'Subscribe to notify-me for product' })
  notify(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.productsService.notifyMe(req.user.id, id);
  }

  @Delete(':id/notify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOperation({ summary: 'Cancel notify-me subscription' })
  cancelNotify(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.productsService.cancelNotify(req.user.id, id);
  }
}
