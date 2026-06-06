import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { GetCheckoutQueryDto } from './dto/get-checkout.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { GetMultiCheckoutQueryDto } from './dto/get-multi-checkout.dto';
import { PlaceMultiOrderDto } from './dto/place-multi-order.dto';
import { JwtAuthGuard } from '@/common/guards';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get()
  @ApiOperation({
    summary: 'Get checkout summary for a seller from cart',
  })
  @ApiResponse({ status: 200, description: 'Checkout summary returned' })
  async getCheckout(@Req() req: any, @Query() query: GetCheckoutQueryDto) {
    return this.checkoutService.getCheckoutSummary(req.user.id, query);
  }

  @Get('multi')
  @ApiOperation({
    summary: 'Get checkout summaries for all sellers in cart',
    description:
      'Returns per-seller pricing and delivery quotes for every seller currently in the cart, against a single delivery address. Run before multi-seller place-order to show the user a full breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-seller checkout summary returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing delivery address',
  })
  @ApiResponse({ status: 404, description: 'Cart is empty' })
  async getMultiCheckout(
    @Req() req: any,
    @Query() query: GetMultiCheckoutQueryDto,
  ) {
    return this.checkoutService.getMultiSellerCheckoutSummary(
      req.user.id,
      query,
    );
  }

  @Post('place-order')
  @ApiOperation({
    summary: 'Place order for a seller using cart items',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async placeOrder(@Req() req: any, @Body() body: PlaceOrderDto) {
    return this.checkoutService.placeOrder(req.user.id, body);
  }

  @Post('place-order/multi')
  @ApiOperation({
    summary: 'Place orders for all sellers in cart (multi-seller)',
    description:
      'Creates one independent order per seller in a single call. All inputs are validated before any order is written. Cart items for all ordered sellers are cleared on success.',
  })
  @ApiResponse({ status: 201, description: 'All orders created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or missing cart items',
  })
  async placeMultiOrder(@Req() req: any, @Body() body: PlaceMultiOrderDto) {
    return this.checkoutService.placeMultiSellerOrder(req.user.id, body);
  }
}
