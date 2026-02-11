/**
 * Files API – presigned URL and validate (internal endpoints).
 */

import client from './client';
import { unwrap } from './unwrap';

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
  orderId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
  publicUrl?: string;
  headers?: Record<string, string>;
}

export const filesApi = {
  async getPresignedUrl(dto: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    const res = await client.post('/internal/files/presigned-url', dto);
    return unwrap(res) as PresignedUrlResponse;
  },

  async validateFile(dto: {
    fileKey: string;
    orderId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    const res = await client.post('/internal/files/validate', dto);
    return unwrap(res);
  },
};
