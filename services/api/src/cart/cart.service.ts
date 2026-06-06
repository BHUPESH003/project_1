import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3Bucket =
      this.config.get<string>('S3_BUCKET_NAME') || 'mvp-files-dev';
    const region = this.config.get<string>('AWS_REGION') || 'ap-south-1';
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Get or create cart for user.
   * Cart is multi-seller; each item stores sellerId.
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            seller: {
              select: {
                id: true,
                shopName: true,
                status: true,
                imagePath: true,
                rating: true,
                pricePerPage: true,
                discountThreshold: true,
                discountPercent: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                unit: true,
                price: true,
                mrp: true,
                image: true,
                inStock: true,
                isBestSeller: true,
              },
            },
            files: {
              include: {
                file: {
                  select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    pageCount: true,
                    storageKey: true,
                    storageUrl: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              seller: {
                select: {
                  id: true,
                  shopName: true,
                  status: true,
                  imagePath: true,
                  rating: true,
                  pricePerPage: true,
                  discountThreshold: true,
                  discountPercent: true,
                },
              },
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  category: true,
                  unit: true,
                  price: true,
                  mrp: true,
                  image: true,
                  inStock: true,
                  isBestSeller: true,
                },
              },
              files: {
                include: {
                  file: {
                    select: {
                      id: true,
                      originalName: true,
                      mimeType: true,
                      pageCount: true,
                      storageKey: true,
                      storageUrl: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return cart;
  }

  /**
   * Add product to cart.
   * For non-config items (payload empty), increments quantity if same product already exists.
   */
  async addProductItem(
    userId: string,
    data: {
      productId: string;
      quantity?: number;
      payload?: Record<string, unknown>;
    },
  ) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, sellerId: true, inStock: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    const quantity = Math.max(data.quantity ?? 1, 1);
    const payload = (data.payload ?? {}) as any;

    // If payload is empty, try to merge by incrementing existing item quantity.
    const canMerge = Object.keys(payload).length === 0;
    if (canMerge) {
      const existing = await this.prisma.prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          sellerId: product.sellerId,
          payload: { equals: {} },
        },
      });
      if (existing) {
        return this.prisma.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      }
    }

    return this.prisma.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        sellerId: product.sellerId,
        productId: product.id,
        quantity,
        payload: payload,
      },
    });
  }

  /**
   * Update cart item (quantity/payload)
   */
  async updateItem(
    userId: string,
    itemId: string,
    data: Partial<{
      quantity: number;
      payload: Record<string, unknown>;
    }>,
  ) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    return this.prisma.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantity != null
          ? { quantity: Math.max(data.quantity, 1) }
          : {}),
        ...(data.payload != null ? { payload: data.payload as any } : {}),
      },
    });
  }

  /**
   * Attach a file to a cart item (printing).
   * Stores per-file config in payload JSON.
   */
  async attachFile(
    userId: string,
    cartItemId: string,
    data: { fileId: string; payload?: Record<string, unknown> },
  ) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const file = await this.prisma.prisma.file.findUnique({
      where: { id: data.fileId },
    });
    if (!file) throw new NotFoundException('File not found');

    const payload: any = { ...(data.payload ?? {}) };
    // Populate pages from file if absent
    if (payload.pages == null && file.pageCount != null) {
      payload.pages = file.pageCount;
    }

    return this.prisma.prisma.cartItemFile.upsert({
      where: { cartItemId_fileId: { cartItemId: item.id, fileId: file.id } },
      create: { cartItemId: item.id, fileId: file.id, payload },
      update: { payload },
    });
  }

  async updateAttachedFile(
    userId: string,
    cartItemId: string,
    fileId: string,
    data: { payload?: Record<string, unknown> },
  ) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const row = await this.prisma.prisma.cartItemFile.findUnique({
      where: { cartItemId_fileId: { cartItemId: item.id, fileId } },
      include: { file: true },
    });
    if (!row) throw new NotFoundException('Attached file not found');

    const payload: any = { ...(data.payload ?? (row.payload as any) ?? {}) };
    if (payload.pages == null && row.file.pageCount != null) {
      payload.pages = row.file.pageCount;
    }

    return this.prisma.prisma.cartItemFile.update({
      where: { id: row.id },
      data: { payload },
    });
  }

  /**
   * Remove attached file and delete from S3 + DB.
   */
  async removeAttachedFile(userId: string, cartItemId: string, fileId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const row = await this.prisma.prisma.cartItemFile.findUnique({
      where: { cartItemId_fileId: { cartItemId: item.id, fileId } },
      include: { file: true },
    });
    if (!row) throw new NotFoundException('Attached file not found');

    await this.prisma.prisma.cartItemFile.delete({ where: { id: row.id } });
    await this.deleteFileEverywhere(row.file.id, row.file.storageKey);

    return { success: true, fileId: row.file.id };
  }

  /**
   * Remove item from cart (also deletes any attached files from S3 + DB).
   */
  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { files: { include: { file: true } } },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    // Delete attached files (S3 + DB) first
    for (const f of item.files) {
      await this.deleteFileEverywhere(f.file.id, f.file.storageKey);
    }

    // Delete item (cascade deletes cart_item_files rows)
    await this.prisma.prisma.cartItem.delete({ where: { id: itemId } });

    return { success: true, itemId };
  }

  /**
   * Remove all cart items belonging to the given sellers.
   * Called after successful order placement to clear purchased items.
   *
   * CartItemFile junction rows are cascade-deleted by the DB FK.
   * The underlying File records are intentionally preserved — they are now
   * referenced by the order's orderPayload and must not be deleted.
   */
  async removeItemsBySeller(
    userId: string,
    sellerIds: string[],
  ): Promise<void> {
    if (sellerIds.length === 0) return;
    const cart = await this.prisma.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cart) return;
    await this.prisma.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, sellerId: { in: sellerIds } },
    });
  }

  private async deleteFileEverywhere(fileId: string, storageKey: string) {
    // Delete from S3 (best effort)
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: storageKey }),
      );
      this.logger.log(`Deleted file from S3: ${storageKey}`);
    } catch (e) {
      this.logger.warn(
        `Failed to delete file from S3: ${storageKey}`,
        e as any,
      );
    }

    // Delete from DB
    await this.prisma.prisma.file.delete({ where: { id: fileId } });
  }

  /**
   * Calculate pricing for cart.
   * Returns totals grouped by seller (multi-seller cart).
   * Printing items: if cart item has attached files, uses seller.pricePerPage and per-file payload.
   */
  async calculatePrice(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      return { sellers: [], subtotal: 0, discountAmount: 0, total: 0 };
    }

    const colorMultiplier: Record<string, number> = { 'B&W': 1, Color: 2 };

    // Group by sellerId
    const bySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      if (!bySeller.has(item.sellerId)) bySeller.set(item.sellerId, []);
      bySeller.get(item.sellerId)!.push(item);
    }

    const sellerBreakdowns = [];
    let grandSubtotal = 0;
    let grandDiscount = 0;

    for (const [sellerId, items] of bySeller.entries()) {
      const seller = items[0].seller;
      const pricePerPage = seller.pricePerPage
        ? Number(seller.pricePerPage)
        : 0;

      let sellerSubtotal = 0;
      let printingSubtotal = 0;
      let printingPages = 0;

      const itemBreakdowns = items.map((it) => {
        // If item has attached files, treat as printing-style item.
        if (it.files?.length) {
          let itemPages = 0;
          let itemPrice = 0;

          const fileRows = it.files.map((row) => {
            const p: any = row.payload ?? {};
            const pages = Number(p.pages ?? row.file.pageCount ?? 0);
            const copies = Math.max(Number(p.copies ?? 1), 1);
            const color = String(p.color ?? 'B&W');
            const mult = colorMultiplier[color] ?? 1;
            const totalPages = pages * copies;
            const price = totalPages * pricePerPage * mult;
            itemPages += totalPages;
            itemPrice += price;
            return {
              fileId: row.file.id,
              originalName: row.file.originalName,
              pages,
              copies,
              color,
              paperSize: p.paperSize ?? null,
              price: Math.round(price * 100) / 100,
            };
          });

          itemPrice = Math.round(itemPrice * 100) / 100;
          sellerSubtotal += itemPrice;
          printingSubtotal += itemPrice;
          printingPages += itemPages;

          return {
            id: it.id,
            sellerId: it.sellerId,
            type: 'printing',
            product: it.product
              ? {
                  id: it.product.id,
                  name: it.product.name,
                  price: Number(it.product.price),
                }
              : null,
            files: fileRows,
            totalPages: itemPages,
            itemPrice,
          };
        }

        // Product-style item
        if (!it.product) {
          return {
            id: it.id,
            sellerId: it.sellerId,
            type: 'unknown',
            itemPrice: 0,
          };
        }

        const qty = Math.max(it.quantity ?? 1, 1);
        const itemPrice =
          Math.round(Number(it.product.price) * qty * 100) / 100;
        sellerSubtotal += itemPrice;
        return {
          id: it.id,
          sellerId: it.sellerId,
          type: 'product',
          quantity: qty,
          product: {
            id: it.product.id,
            name: it.product.name,
            unit: it.product.unit,
            price: Number(it.product.price),
            mrp: it.product.mrp != null ? Number(it.product.mrp) : null,
            inStock: it.product.inStock,
            image: it.product.image,
          },
          itemPrice,
        };
      });

      // Seller-specific bulk discount applies to printing portion only.
      let discountAmount = 0;
      if (
        seller.discountThreshold &&
        seller.discountPercent &&
        printingPages >= seller.discountThreshold
      ) {
        const pct = Number(seller.discountPercent);
        discountAmount =
          Math.round(((printingSubtotal * pct) / 100) * 100) / 100;
      }

      const total = Math.round((sellerSubtotal - discountAmount) * 100) / 100;
      grandSubtotal += sellerSubtotal;
      grandDiscount += discountAmount;

      sellerBreakdowns.push({
        seller: {
          id: seller.id,
          shopName: seller.shopName,
          status: seller.status,
        },
        subtotal: Math.round(sellerSubtotal * 100) / 100,
        discountAmount,
        total,
        printingPages,
        items: itemBreakdowns,
      });
    }

    return {
      sellers: sellerBreakdowns,
      subtotal: Math.round(grandSubtotal * 100) / 100,
      discountAmount: Math.round(grandDiscount * 100) / 100,
      total: Math.round((grandSubtotal - grandDiscount) * 100) / 100,
    };
  }
}
