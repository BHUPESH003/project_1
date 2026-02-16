import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CartService } from '@/cart/cart.service';
import { SellerRepository } from '@/sellers/repositories/seller.repository';
import { UserAddressRepository } from '@/users/repositories/user-address.repository';
import { DeliveryQuotationService } from '@/delivery/services/delivery-quotation.service';
import { OrdersService } from '@/orders/orders.service';
import { GetCheckoutQueryDto } from './dto/get-checkout.dto';
import { PlaceOrderDto } from './dto/place-order.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly sellerRepository: SellerRepository,
    private readonly userAddressRepository: UserAddressRepository,
    private readonly deliveryQuotationService: DeliveryQuotationService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Build checkout summary for a single seller from multi-seller cart.
   * Includes price breakdown and delivery options.
   */
  async getCheckoutSummary(userId: string, query: GetCheckoutQueryDto) {
    const cart = await this.cartService.getOrCreateCart(userId);
    const itemsForSeller = cart.items.filter(
      (it) => it.sellerId === query.sellerId,
    );

    if (itemsForSeller.length === 0) {
      throw new NotFoundException('No cart items for this seller');
    }

    const seller = await this.sellerRepository.findById(query.sellerId, false);
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const address = query.deliveryAddressId
      ? await this.userAddressRepository.findByIdAndUser(
          query.deliveryAddressId,
          userId,
        )
      : null;

    if (!address) {
      throw new BadRequestException('Valid delivery address required');
    }

    if (
      address.latitude == null ||
      address.longitude == null ||
      seller.latitude == null ||
      seller.longitude == null
    ) {
      throw new BadRequestException(
        'Missing coordinates for seller or delivery address',
      );
    }

    const pricing = await this.cartService.calculatePrice(userId);
    const sellerPricing = pricing.sellers.find(
      (s) => s.seller.id === query.sellerId,
    );
    if (!sellerPricing) {
      throw new NotFoundException('Pricing not found for this seller');
    }

    const quotations =
      await this.deliveryQuotationService.getAvailableDeliveryPartners({
        pickupLatitude: Number(seller.latitude),
        pickupLongitude: Number(seller.longitude),
        pickupAddress: seller.address,
        dropLatitude: address.latitude,
        dropLongitude: address.longitude,
        dropAddress: address.addressLine,
      });

    return {
      seller: {
        id: seller.id,
        shopName: seller.shopName,
        address: seller.address,
      },
      deliveryAddress: {
        id: address.id,
        label: address.label,
        addressLine: address.addressLine,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      bill: {
        subtotal: sellerPricing.subtotal,
        discountAmount: sellerPricing.discountAmount,
        total: sellerPricing.total,
      },
      deliveryOptions: quotations.partners.map((p) => ({
        quotationId: p.quotationId,
        providerId: p.providerId,
        providerName: p.providerName,
        // Minimal multi-vehicle support: expose a generic "standard" vehicle type.
        vehicleOptions: [
          {
            vehicleType: 'standard',
            deliveryFeeRupees: p.quotedFeeRupees,
            estimatedMinutes: p.estimatedMinutes,
          },
        ],
        raw: p,
      })),
      recommendations: {
        cheapest: quotations.cheapest,
        fastest: quotations.fastest,
        recommended: quotations.recommended,
      },
    };
  }

  /**
   * Place order for a single seller from cart.
   * Stores selected delivery option metadata in orderPayload.
   */
  async placeOrder(userId: string, body: PlaceOrderDto) {
    const cart = await this.cartService.getOrCreateCart(userId);
    const itemsForSeller = cart.items.filter(
      (it) => it.sellerId === body.sellerId,
    );

    if (itemsForSeller.length === 0) {
      throw new BadRequestException('Cart is empty for this seller');
    }

    const address = await this.userAddressRepository.findByIdAndUser(
      body.deliveryAddressId,
      userId,
    );
    if (!address) {
      throw new BadRequestException('Invalid delivery address');
    }

    const pricing = await this.cartService.calculatePrice(userId);
    const sellerPricing = pricing.sellers.find(
      (s) => s.seller.id === body.sellerId,
    );
    if (!sellerPricing) {
      throw new BadRequestException('Pricing not found for this seller');
    }

    const itemsPayload = itemsForSeller.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      cartItemId: it.id,
      payload: it.payload,
    }));

    const orderPayload = {
      items: itemsPayload,
      billing: {
        subtotal: sellerPricing.subtotal,
        discountAmount: sellerPricing.discountAmount,
        total: sellerPricing.total,
      },
      delivery: {
        quotationId: body.quotationId,
        deliveryFeeRupees: body.deliveryFeeRupees,
        estimatedMinutes: body.estimatedMinutes,
        vehicleType: body.vehicleType,
      },
      dropLatitude: address.latitude,
      dropLongitude: address.longitude,
      dropAddress: address.addressLine,
    };

    const order = await this.ordersService.create(userId, {
      sellerId: body.sellerId,
      categoryId: itemsForSeller[0]?.product?.category ?? 'generic',
      orderPayload,
    } as any);

    return order;
  }
}
