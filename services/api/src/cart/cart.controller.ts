import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import {
  AddCartProductItemDto,
  AttachCartItemFileDto,
  UpdateCartItemDto,
  UpdateCartItemFileDto,
} from './dto/add-cart-item.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';

/**
 * Cart API – server-side, multi-seller, generic cart.
 * - Product catalog items: add/update/remove
 * - Printing specialization: attach files to a cart item with per-file config
 */
@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my cart' })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  getCart(@Request() req: { user: { id: string } }) {
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  addItem(
    @Body() dto: AddCartProductItemDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.addProductItem(req.user.id, dto);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiOperation({ summary: 'Update cart item (quantity/payload)' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.updateItem(req.user.id, id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiOperation({
    summary:
      'Remove item from cart (also deletes any attached files from S3+DB)',
  })
  @ApiResponse({ status: 200, description: 'Item removed' })
  removeItem(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Post('items/:id/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiOperation({ summary: 'Attach file to cart item (printing)' })
  attachFile(
    @Param('id') id: string,
    @Body() dto: AttachCartItemFileDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.attachFile(req.user.id, id, dto);
  }

  @Patch('items/:id/files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiOperation({ summary: 'Update attached file config (printing)' })
  updateAttachedFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateCartItemFileDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.updateAttachedFile(req.user.id, id, fileId, dto);
  }

  @Delete('items/:id/files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiOperation({
    summary: 'Remove attached file (also deletes from S3+DB)',
  })
  removeAttachedFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.cartService.removeAttachedFile(req.user.id, id, fileId);
  }

  @Get('calculate-price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate cart pricing (grouped by seller, supports printing)',
  })
  @ApiResponse({ status: 200, description: 'Price breakdown' })
  calculatePrice(@Request() req: { user: { id: string } }) {
    return this.cartService.calculatePrice(req.user.id);
  }
}
