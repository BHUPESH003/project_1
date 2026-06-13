import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { SellerStatus } from '@repo/types';
import { buildAssetUrl } from '@/common/utils/asset-url.util';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Global search: shops (sellers) and items (products).
   * Query matches shop name, address, product name, product description, category name.
   */
  async search(q: string, limit = 20) {
    const term = q?.trim();
    if (!term || term.length < 2) {
      return { sellers: [], products: [], query: term || '' };
    }

    const [sellers, products] = await Promise.all([
      this.prisma.prisma.seller.findMany({
        where: {
          status: SellerStatus.ONLINE,
          OR: [
            { shopName: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              shopName: true,
              address: true,
              status: true,
              imagePath: true,
              rating: true,
            },
          },
        },
      }),
    ]);

    const bucket = this.config.get<string>('S3_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION');
    const baseUrl = this.config.get<string>('S3_PUBLIC_BASE_URL');
    const opt = {
      s3PublicBaseUrl: baseUrl ?? undefined,
      s3Bucket: bucket ?? undefined,
      s3Region: region ?? undefined,
    };

    const sellerList = sellers.map((s) => ({
      id: s.id,
      shopName: s.shopName,
      address: s.address,
      status: s.status,
      rating: s.rating != null ? Number(s.rating) : null,
      imageUrl: buildAssetUrl(s.imagePath, opt),
      categories: s.categories.map((sc) => ({
        id: sc.category.id,
        name: sc.category.name,
      })),
    }));

    const productList = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: Number(p.price),
      image: p.image,
      sellerId: p.sellerId,
      shopName: p.seller.shopName,
    }));

    return {
      query: term,
      sellers: sellerList,
      products: productList,
    };
  }
}
