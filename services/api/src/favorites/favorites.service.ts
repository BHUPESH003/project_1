import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { buildAssetUrl } from '@/common/utils/asset-url.util';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async add(userId: string, sellerId: string) {
    const seller = await this.prisma.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException('Seller not found');
    try {
      await this.prisma.prisma.userFavorite.create({
        data: { userId, sellerId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('Already in favorites');
      throw e;
    }
    return { success: true, sellerId };
  }

  async remove(userId: string, sellerId: string) {
    await this.prisma.prisma.userFavorite.deleteMany({
      where: { userId, sellerId },
    });
    return { success: true, sellerId };
  }

  async list(userId: string) {
    const rows = await this.prisma.prisma.userFavorite.findMany({
      where: { userId },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            address: true,
            status: true,
            imagePath: true,
            rating: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const bucket = this.config.get<string>('S3_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION');
    const baseUrl = this.config.get<string>('S3_PUBLIC_BASE_URL');
    const opt = {
      s3PublicBaseUrl: baseUrl ?? undefined,
      s3Bucket: bucket ?? undefined,
      s3Region: region ?? undefined,
    };

    return rows.map((r) => ({
      sellerId: r.sellerId,
      createdAt: r.createdAt,
      seller: {
        id: r.seller.id,
        shopName: r.seller.shopName,
        address: r.seller.address,
        status: r.seller.status,
        imagePath: r.seller.imagePath,
        imageUrl: buildAssetUrl(r.seller.imagePath, opt),
        rating: r.seller.rating != null ? Number(r.seller.rating) : null,
        latitude: r.seller.latitude,
        longitude: r.seller.longitude,
      },
    }));
  }

  /** Return set of seller IDs favorited by user (for isFavorited in seller list) */
  async getFavoriteSellerIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.prisma.userFavorite.findMany({
      where: { userId },
      select: { sellerId: true },
    });
    return new Set(rows.map((r) => r.sellerId));
  }
}
