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
import { GetMultiCheckoutQueryDto } from './dto/get-multi-checkout.dto';
import { PlaceMultiOrderDto } from './dto/place-multi-order.dto';

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
   * Build checkout summaries for ALL sellers currently in the cart.
   *
   * Mirrors getCheckoutSummary but fans out across every seller group in the
   * cart in parallel. Each seller gets independent pricing + delivery quotes
   * against the same delivery address.
   *
   * Returns the per-seller breakdown plus a combinedTotal (sum of item totals,
   * delivery fees NOT included — those are chosen per seller at order placement).
   */
  async getMultiSellerCheckoutSummary(
    userId: string,
    query: GetMultiCheckoutQueryDto,
  ) {
    // Validate delivery address
    const address = await this.userAddressRepository.findByIdAndUser(
      query.deliveryAddressId,
      userId,
    );
    if (!address) {
      throw new BadRequestException('Valid delivery address required');
    }
    if (address.latitude == null || address.longitude == null) {
      throw new BadRequestException('Delivery address is missing coordinates');
    }

    // calculatePrice groups the entire cart by seller and applies per-seller
    // discount rules — reuse it so the pricing logic lives in one place.
    const pricing = await this.cartService.calculatePrice(userId);
    if (pricing.sellers.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    // Fan out: fetch seller details + delivery quotes for each seller in parallel.
    const sellerSummaries = await Promise.all(
      pricing.sellers.map(async (sp) => {
        const seller = await this.sellerRepository.findById(
          sp.seller.id,
          false,
        );

        // Seller missing or has no coordinates — return billing only, no quotes.
        if (!seller || seller.latitude == null || seller.longitude == null) {
          return {
            seller: {
              id: sp.seller.id,
              shopName: sp.seller.shopName,
              address: seller?.address ?? '',
            },
            items: sp.items,
            bill: {
              subtotal: sp.subtotal,
              discountAmount: sp.discountAmount,
              total: sp.total,
            },
            deliveryOptions: [],
            recommendations: {
              cheapest: undefined,
              fastest: undefined,
              recommended: undefined,
            },
          };
        }

        const quotations =
          await this.deliveryQuotationService.getAvailableDeliveryPartners(
            {
              pickupLatitude: Number(seller.latitude),
              pickupLongitude: Number(seller.longitude),
              pickupAddress: seller.address,
              dropLatitude: address.latitude!,
              dropLongitude: address.longitude!,
              dropAddress: address.addressLine,
            },
            undefined,
            seller.id,
          );

        return {
          seller: {
            id: seller.id,
            shopName: seller.shopName,
            address: seller.address,
          },
          items: sp.items,
          bill: {
            subtotal: sp.subtotal,
            discountAmount: sp.discountAmount,
            total: sp.total,
          },
          deliveryOptions: quotations.partners.map((p) => ({
            quotationId: p.quotationId,
            providerId: p.providerId,
            providerName: p.providerName,
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
      }),
    );

    return {
      sellers: sellerSummaries,
      deliveryAddress: {
        id: address.id,
        label: address.label,
        addressLine: address.addressLine,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      // Sum of all seller item totals — delivery fees are chosen per-seller
      // at order placement and are NOT included here.
      combinedTotal: pricing.total,
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

    // Phase 2.3: clear purchased items from cart
    await this.cartService.removeItemsBySeller(userId, [body.sellerId]);

    return order;
  }

  /**
   * Place orders for ALL sellers currently in the cart in a single call.
   *
   * Each seller order is independent after creation — separate payment,
   * delivery, and state machine lifecycle. The "multi" is only at checkout.
   *
   * All inputs are validated before any order is written. Orders are created
   * sequentially so a failure on seller N is surfaced immediately. Cart items
   * for all ordered sellers are cleared on full success.
   */
  async placeMultiSellerOrder(userId: string, body: PlaceMultiOrderDto) {
    const address = await this.userAddressRepository.findByIdAndUser(
      body.deliveryAddressId,
      userId,
    );
    if (!address) throw new BadRequestException('Invalid delivery address');

    const cart = await this.cartService.getOrCreateCart(userId);
    const pricing = await this.cartService.calculatePrice(userId);
    if (pricing.sellers.length === 0)
      throw new NotFoundException('Cart is empty');

    // Validate every requested seller has items in cart before touching the DB.
    const cartSellerIds = new Set(pricing.sellers.map((s) => s.seller.id));
    for (const input of body.sellers) {
      if (!cartSellerIds.has(input.sellerId)) {
        throw new BadRequestException(
          `No cart items for seller ${input.sellerId}`,
        );
      }
    }

    const sellerPricingMap = new Map(
      pricing.sellers.map((s) => [s.seller.id, s]),
    );
    const itemsBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      if (!itemsBySeller.has(item.sellerId))
        itemsBySeller.set(item.sellerId, []);
      itemsBySeller.get(item.sellerId)!.push(item);
    }

    const createdOrders: any[] = [];
    for (const sellerInput of body.sellers) {
      const sp = sellerPricingMap.get(sellerInput.sellerId)!;
      const sellerItems = itemsBySeller.get(sellerInput.sellerId)!;

      const orderPayload = {
        items: sellerItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          cartItemId: it.id,
          payload: it.payload,
        })),
        billing: {
          subtotal: sp.subtotal,
          discountAmount: sp.discountAmount,
          total: sp.total,
        },
        delivery: {
          quotationId: sellerInput.quotationId,
          deliveryFeeRupees: sellerInput.deliveryFeeRupees,
          estimatedMinutes: sellerInput.estimatedMinutes,
          vehicleType: sellerInput.vehicleType,
        },
        dropLatitude: address.latitude,
        dropLongitude: address.longitude,
        dropAddress: address.addressLine,
      };

      const order = await this.ordersService.create(userId, {
        sellerId: sellerInput.sellerId,
        categoryId: sellerItems[0]?.product?.category ?? 'generic',
        orderPayload,
      } as any);

      createdOrders.push(order);
    }

    // Phase 2.3: clear purchased items for all ordered sellers
    await this.cartService.removeItemsBySeller(
      userId,
      body.sellers.map((s) => s.sellerId),
    );

    return { orders: createdOrders, count: createdOrders.length };
  }
}
