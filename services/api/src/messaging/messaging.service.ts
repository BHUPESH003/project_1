import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { WhatsAppProvider } from './providers/whatsapp/whatsapp.provider';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { IncomingMessage } from './providers/messaging-provider.interface';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppProvider,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.s3Bucket =
      this.configService.get<string>('S3_BUCKET_NAME') ?? 'mvp-files-dev';
    this.s3Region =
      this.configService.get<string>('AWS_REGION') ?? 'ap-south-1';
    this.s3Client = new S3Client({
      region: this.s3Region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async createConversation(userId: string, dto: CreateConversationDto) {
    // Verify seller exists
    const seller = await this.prisma.prisma.seller.findUnique({
      where: { id: dto.sellerId },
      include: { user: { select: { phone: true } } },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    // Reuse any existing active conversation between this user + seller pair
    let conversation = await this.prisma.prisma.conversation.findFirst({
      where: {
        userId,
        sellerId: dto.sellerId,
        status: 'active',
        ...(dto.orderId ? { orderId: dto.orderId } : {}),
      },
    });

    if (!conversation) {
      conversation = await this.prisma.prisma.conversation.create({
        data: {
          userId,
          sellerId: dto.sellerId,
          orderId: dto.orderId ?? null,
          status: 'active',
        },
      });
    }

    // If an initial message was provided, send it
    if (dto.initialMessage?.trim()) {
      await this.sendMessage(userId, 'user', conversation.id, {
        content: dto.initialMessage,
        contentType: 'text',
      });
    }

    return this.getConversationById(conversation.id);
  }

  async listConversations(actorId: string, actorType: 'user' | 'seller') {
    const where =
      actorType === 'user' ? { userId: actorId } : { sellerId: actorId };
    return this.prisma.prisma.conversation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        seller: { select: { id: true, shopName: true, imagePath: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Preview last message
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(
    conversationId: string,
    actorId: string,
    page = 1,
    limit = 50,
  ) {
    await this.assertAccess(conversationId, actorId);
    const skip = (page - 1) * limit;
    return this.prisma.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
  }

  // ─── Send message (user or seller via app) ────────────────────────────────

  async sendMessage(
    senderId: string,
    senderType: 'user' | 'seller',
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        seller: {
          select: {
            id: true,
            shopName: true,
            user: { select: { phone: true } },
          },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify the sender has access
    if (
      (senderType === 'user' && conversation.userId !== senderId) ||
      (senderType === 'seller' && conversation.sellerId !== senderId)
    ) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Store in DB
    const message = await this.prisma.prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderId,
        content: dto.content,
        contentType: dto.contentType ?? 'text',
        mediaUrl: dto.mediaUrl ?? null,
      },
    });

    // Touch conversation updatedAt
    await this.prisma.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Relay to seller's WhatsApp (best-effort, non-blocking)
    if (senderType === 'user') {
      const sellerPhone = conversation.seller.user?.phone;
      if (sellerPhone) {
        this.relayToWhatsApp(
          sellerPhone,
          dto,
          conversation.user.name ?? 'Customer',
          conversation.seller.shopName,
        ).catch((e) =>
          this.logger.error(`WhatsApp relay failed: ${e?.message}`),
        );
      }
    }

    return message;
  }

  // ─── Webhook handlers ─────────────────────────────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    return this.whatsapp.verifyWebhook(mode, token, challenge);
  }

  async handleWebhook(payload: any): Promise<void> {
    const incoming: IncomingMessage | null =
      this.whatsapp.parseWebhook(payload);
    if (!incoming) return;

    // Find the seller by their WhatsApp phone (stored on User)
    const sellerUser = await this.prisma.prisma.user.findFirst({
      where: { phone: incoming.from },
      include: { seller: true },
    });
    if (!sellerUser?.seller) {
      this.logger.warn(
        `Webhook from unknown phone ${incoming.from} — no seller found`,
      );
      return;
    }
    const seller = sellerUser.seller;

    // Find the most recent active conversation for this seller
    const conversation = await this.prisma.prisma.conversation.findFirst({
      where: { sellerId: seller.id, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!conversation) {
      this.logger.warn(`No active conversation found for seller ${seller.id}`);
      return;
    }

    // Download media to S3 if present (Phase 4.2)
    let mediaUrl: string | null = null;
    if (incoming.mediaId) {
      mediaUrl = await this.downloadAndStoreMedia(
        incoming.mediaId,
        incoming.mimeType ?? 'application/octet-stream',
        conversation.id,
      );
    }

    const contentType =
      incoming.type === 'text'
        ? 'text'
        : incoming.type === 'image'
          ? 'image'
          : 'file';

    // Store seller's reply
    await this.prisma.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'seller',
        senderId: seller.id,
        content: incoming.text ?? '',
        contentType,
        mediaUrl,
        whatsappMessageId: incoming.messageId,
        status: 'delivered',
      },
    });

    await this.prisma.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Push-notify user (best-effort)
    this.notifications
      .sendPushNotification(
        conversation.userId,
        `New message from ${seller.shopName ?? 'Seller'}`,
        incoming.text ?? 'Sent a file',
        { conversationId: conversation.id, type: 'NEW_MESSAGE' },
      )
      .catch((e) =>
        this.logger.warn(`Push notification failed: ${e?.message}`),
      );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async relayToWhatsApp(
    sellerPhone: string,
    dto: SendMessageDto,
    userName: string,
    shopName: string,
  ): Promise<void> {
    if (dto.contentType === 'text' || !dto.contentType) {
      const text = `[${userName} → ${shopName}]: ${dto.content}`;
      await this.whatsapp.sendMessage(sellerPhone, text);
    } else if (
      (dto.contentType === 'image' || dto.contentType === 'file') &&
      dto.mediaUrl
    ) {
      const type = dto.contentType === 'image' ? 'image' : 'document';
      await this.whatsapp.sendMedia(
        sellerPhone,
        dto.mediaUrl,
        type,
        `[${userName}]: ${dto.content}`,
      );
    }
  }

  private async downloadAndStoreMedia(
    mediaId: string,
    mimeType: string,
    conversationId: string,
  ): Promise<string | null> {
    try {
      const { buffer } = await this.whatsapp.downloadMedia(mediaId);
      const ext = mimeType.split('/')[1] ?? 'bin';
      const key = `messaging/${conversationId}/${mediaId}.${ext}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;
    } catch (e: any) {
      this.logger.error(`Media download/upload failed: ${e?.message}`);
      return null;
    }
  }

  private async getConversationById(id: string) {
    return this.prisma.prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        seller: { select: { id: true, shopName: true, imagePath: true } },
      },
    });
  }

  private async assertAccess(conversationId: string, actorId: string) {
    const convo = await this.prisma.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.userId !== actorId && convo.sellerId !== actorId) {
      throw new ForbiddenException('Access denied');
    }
    return convo;
  }
}
