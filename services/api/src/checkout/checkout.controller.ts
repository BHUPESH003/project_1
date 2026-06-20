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

  @Post('payment-intent')
  @ApiOperation({
    summary: 'Create a single consolidated payment intent for all orders',
    description:
      'Creates one Razorpay order covering the total across all provided orders. ' +
      'All orders must be in SELLER_SELECTED state and belong to the authenticated user.',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createPaymentIntent(
    @Req() req: any,
    @Body() body: { orderIds: string[]; provider?: string; payDeliveryFee?: boolean[] },
  ) {
    return this.checkoutService.createMultiPaymentIntent(
      req.user.id, body.orderIds, body.provider, body.payDeliveryFee,
    );
  }

  @Post('verify-payment')
  @ApiOperation({
    summary: 'Verify consolidated payment and settle all orders',
    description:
      'Polls Razorpay to confirm payment capture, then marks all orders as PAID in one call.',
  })
  @ApiResponse({ status: 201, description: 'Payment verified and orders settled' })
  async verifyPayment(
    @Req() req: any,
    @Body()
    body: {
      orderIds: string[];
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
      payDeliveryFee?: boolean[];
    },
  ) {
    return this.checkoutService.verifyMultiPayment(
      req.user.id,
      body.orderIds,
      body.razorpay_payment_id,
      body.razorpay_order_id,
      body.payDeliveryFee,
    );
  }
}
