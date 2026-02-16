import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { buildAssetUrl } from '@/common/utils/asset-url.util';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getBaseUrl(): string | null {
    const base = this.config.get<string>('S3_PUBLIC_BASE_URL');
    if (base) return base;
    const bucket = this.config.get<string>('S3_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION');
    if (bucket && region) return `https://${bucket}.s3.${region}.amazonaws.com`;
    return null;
  }

  /** Public: list active banners for carousel (by displayOrder) */
  async findActive() {
    const now = new Date();
    const list = await this.prisma.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startAt: null, endAt: null },
          { startAt: { lte: now }, endAt: null },
          { startAt: null, endAt: { gte: now } },
          { startAt: { lte: now }, endAt: { gte: now } },
        ],
      },
      orderBy: { displayOrder: 'asc' },
    });
    const base = this.getBaseUrl();
    return list.map((b) => ({
      id: b.id,
      badge: b.badge,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: base
        ? `${base}/${b.imagePath.replace(/^\//, '')}`
        : b.imagePath,
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
      displayOrder: b.displayOrder,
    }));
  }

  /** Admin: list all banners */
  async findAll() {
    const list = await this.prisma.prisma.banner.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    const base = this.getBaseUrl();
    return list.map((b) => ({
      ...b,
      imageUrl: base
        ? `${base}/${b.imagePath.replace(/^\//, '')}`
        : b.imagePath,
    }));
  }

  /** Admin: get one */
  async findOne(id: string) {
    const b = await this.prisma.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Banner not found');
    const base = this.getBaseUrl();
    return {
      ...b,
      imageUrl: base
        ? `${base}/${b.imagePath.replace(/^\//, '')}`
        : b.imagePath,
    };
  }

  /** Admin: create */
  async create(data: {
    badge?: string;
    title: string;
    subtitle?: string;
    imagePath: string;
    ctaText?: string;
    ctaLink?: string;
    displayOrder?: number;
    isActive?: boolean;
    startAt?: Date;
    endAt?: Date;
  }) {
    const b = await this.prisma.prisma.banner.create({
      data: {
        badge: data.badge ?? null,
        title: data.title,
        subtitle: data.subtitle ?? null,
        imagePath: data.imagePath,
        ctaText: data.ctaText ?? null,
        ctaLink: data.ctaLink ?? null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
      },
    });
    return b;
  }

  /** Admin: update */
  async update(
    id: string,
    data: Partial<{
      badge: string;
      title: string;
      subtitle: string;
      imagePath: string;
      ctaText: string;
      ctaLink: string;
      displayOrder: number;
      isActive: boolean;
      startAt: Date;
      endAt: Date;
    }>,
  ) {
    await this.findOne(id);
    return this.prisma.prisma.banner.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /** Admin: delete */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.prisma.banner.delete({ where: { id } });
    return { success: true };
  }
}
