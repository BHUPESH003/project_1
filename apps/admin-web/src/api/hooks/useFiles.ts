import axios from 'axios'
import { apiPost } from '@/api/client'
import type { PresignedUrlResponse } from '@/types/api'

/**
 * Upload an image (shop photo / product image) and return its S3 path.
 * Two steps: presigned URL → PUT to storage. The returned `fileKey` is the S3
 * path stored on the seller/product (imagePath / image).
 */
export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ path: string; url?: string }> {
  const presigned = await apiPost<PresignedUrlResponse>('/internal/files/presigned-url', {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  })

  await axios.put(presigned.uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })

  return { path: presigned.fileKey, url: presigned.publicUrl }
}

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
