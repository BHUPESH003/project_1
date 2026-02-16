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

  @Post('place-order')
  @ApiOperation({
    summary: 'Place order for a seller using cart items',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async placeOrder(@Req() req: any, @Body() body: PlaceOrderDto) {
    return this.checkoutService.placeOrder(req.user.id, body);
  }
}
