export interface SendResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface IncomingMessage {
  from: string; // E.164 phone number of the sender
  messageId: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: string;
  mediaId?: string; // WhatsApp media ID for downloading
  mimeType?: string; // MIME type of the media
  timestamp: number; // Unix epoch
}

export interface MessagingProvider {
  getProviderName(): string;

  /** Send a plain text message */
  sendMessage(to: string, message: string): Promise<SendResult>;

  /** Send a WhatsApp template message (required for first contact) */
  sendTemplate(
    to: string,
    templateName: string,
    params: string[],
  ): Promise<SendResult>;

  /** Send a media message (image or document) via a public URL */
  sendMedia(
    to: string,
    mediaUrl: string,
    type: 'image' | 'document',
    caption?: string,
    filename?: string,
  ): Promise<SendResult>;

  /** Parse a raw WhatsApp webhook payload into an IncomingMessage. Returns null if not a message event. */
  parseWebhook(payload: any): IncomingMessage | null;

  /** Verify the GET challenge from WhatsApp. Returns the challenge string if token matches, else null. */
  verifyWebhook(mode: string, token: string, challenge: string): string | null;

  /** Download media bytes from WhatsApp by mediaId */
  downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }>;
}
