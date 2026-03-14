import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeals(lat?: number, lng?: number, limit = 10) {
    const products = await this.prisma.prisma.product.findMany({
      where: {
        mrp: { not: null },
        inStock: true,
        seller: {
          status: 'ONLINE',
        },
      },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            latitude: true,
            longitude: true,
            rating: true,
            prepTimeMinutes: true,
          },
        },
      },
    });

    const deals = products
      .map((p) => {
        const mrpNum = Number(p.mrp);
        const priceNum = Number(p.price);
        const discountPercent = mrpNum > priceNum ? ((mrpNum - priceNum) / mrpNum) * 100 : 0;
        
        let distanceKm = null;
        let estimatedDeliveryMins = p.seller.prepTimeMinutes || 0;
        if (lat != null && lng != null && p.seller.latitude && p.seller.longitude) {
            distanceKm = this.calculateDistance(lat, lng, Number(p.seller.latitude), Number(p.seller.longitude));
            estimatedDeliveryMins += Math.ceil(distanceKm * 5);
        }

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          unit: p.unit,
          price: priceNum,
          mrp: mrpNum,
          discountPercent: Math.round(discountPercent),
          image: p.image,
          inStock: p.inStock,
          seller: {
            id: p.seller.id,
            shopName: p.seller.shopName,
            rating: p.seller.rating != null ? Number(p.seller.rating) : null,
            distanceKm,
            estimatedDeliveryMins,
          }
        };
      })
      .filter((p) => p.discountPercent > 0)
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, limit);

    return deals;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    try {
      await this.prisma.prisma.userProductWishlist.create({
        data: { userId, productId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('Already wishlisted');
      throw e;
    }
    return { success: true, productId };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.prisma.userProductWishlist.deleteMany({
      where: { userId, productId },
    });
    return { success: true, productId };
  }

  async listWishlist(userId: string) {
    const rows = await this.prisma.prisma.userProductWishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            sellerId: true,
            name: true,
            description: true,
            category: true,
            unit: true,
            price: true,
            mrp: true,
            image: true,
            inStock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      productId: r.productId,
      createdAt: r.createdAt,
      product: {
        ...r.product,
        price: Number(r.product.price),
        mrp: r.product.mrp != null ? Number(r.product.mrp) : null,
      },
    }));
  }

  async notifyMe(userId: string, productId: string) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    try {
      await this.prisma.prisma.userProductNotify.create({
        data: { userId, productId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('Already subscribed');
      throw e;
    }
    return { success: true, productId };
  }

  async cancelNotify(userId: string, productId: string) {
    await this.prisma.prisma.userProductNotify.deleteMany({
      where: { userId, productId },
    });
    return { success: true, productId };
  }

  async listNotify(userId: string) {
    const rows = await this.prisma.prisma.userProductNotify.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            sellerId: true,
            name: true,
            category: true,
            unit: true,
            price: true,
            mrp: true,
            image: true,
            inStock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      productId: r.productId,
      createdAt: r.createdAt,
      product: {
        ...r.product,
        price: Number(r.product.price),
        mrp: r.product.mrp != null ? Number(r.product.mrp) : null,
      },
    }));
  }
}
