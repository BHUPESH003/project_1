import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
