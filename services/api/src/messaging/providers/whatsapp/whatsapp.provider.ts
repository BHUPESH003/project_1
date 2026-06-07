import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  MessagingProvider,
  SendResult,
  IncomingMessage,
} from '../messaging-provider.interface';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

@Injectable()
export class WhatsAppProvider implements MessagingProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly verifyToken: string;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? '';
    this.accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') ?? '';
    this.verifyToken =
      this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? '';
  }

  getProviderName(): string {
    return 'WHATSAPP';
  }

  async sendMessage(to: string, message: string): Promise<SendResult> {
    try {
      const res = await axios.post(
        `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: message },
        },
        { headers: this.authHeaders() },
      );
      const messageId: string = res.data?.messages?.[0]?.id ?? '';
      return { messageId, status: 'sent' };
    } catch (err: any) {
      this.logger.error(
        `WhatsApp sendMessage failed to ${to}: ${err?.message}`,
      );
      return { messageId: '', status: 'failed', error: err?.message };
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: string[],
  ): Promise<SendResult> {
    try {
      const components =
        params.length > 0
          ? [
              {
                type: 'body',
                parameters: params.map((p) => ({ type: 'text', text: p })),
              },
            ]
          : [];

      const res = await axios.post(
        `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components,
          },
        },
        { headers: this.authHeaders() },
      );
      const messageId: string = res.data?.messages?.[0]?.id ?? '';
      return { messageId, status: 'sent' };
    } catch (err: any) {
      this.logger.error(
        `WhatsApp sendTemplate failed to ${to}: ${err?.message}`,
      );
      return { messageId: '', status: 'failed', error: err?.message };
    }
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    type: 'image' | 'document',
    caption?: string,
    filename?: string,
  ): Promise<SendResult> {
    try {
      const mediaObject: any = { link: mediaUrl };
      if (caption) mediaObject.caption = caption;
      if (type === 'document' && filename) mediaObject.filename = filename;

      const res = await axios.post(
        `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type,
          [type]: mediaObject,
        },
        { headers: this.authHeaders() },
      );
      const messageId: string = res.data?.messages?.[0]?.id ?? '';
      return { messageId, status: 'sent' };
    } catch (err: any) {
      this.logger.error(`WhatsApp sendMedia failed to ${to}: ${err?.message}`);
      return { messageId: '', status: 'failed', error: err?.message };
    }
  }

  parseWebhook(payload: any): IncomingMessage | null {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value?.messages?.length) return null;

      const msg = value.messages[0];
      const from: string = msg.from;
      const messageId: string = msg.id;
      const timestamp: number = Number(msg.timestamp);

      if (msg.type === 'text') {
        return {
          from,
          messageId,
          type: 'text',
          text: msg.text?.body ?? '',
          timestamp,
        };
      }

      if (msg.type === 'image' || msg.type === 'document') {
        const media = msg[msg.type];
        return {
          from,
          messageId,
          type: msg.type as 'image' | 'document',
          mediaId: media?.id,
          mimeType: media?.mime_type,
          timestamp,
        };
      }

      if (msg.type === 'audio' || msg.type === 'video') {
        const media = msg[msg.type];
        return {
          from,
          messageId,
          type: msg.type as 'audio' | 'video',
          mediaId: media?.id,
          mimeType: media?.mime_type,
          timestamp,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  async downloadMedia(
    mediaId: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    // Step 1: get the download URL from Graph API
    const metaRes = await axios.get(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: this.authHeaders(),
    });
    const downloadUrl: string = metaRes.data?.url ?? '';
    const mimeType: string =
      metaRes.data?.mime_type ?? 'application/octet-stream';

    // Step 2: download the actual media bytes
    const mediaRes = await axios.get<Buffer>(downloadUrl, {
      headers: this.authHeaders(),
      responseType: 'arraybuffer',
    });

    return { buffer: Buffer.from(mediaRes.data), mimeType };
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}
