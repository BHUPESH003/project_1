import axios from 'axios'
import { apiPost } from '@/api/client'
import type { PresignedUrlResponse, ValidatedFile } from '@/api/types'

export interface UploadProgress {
  (percent: number): void
}

/**
 * Three-step upload: presigned URL → PUT to storage → validate.
 * Returns the validated file (with server-detected page count).
 */
export async function uploadFile(file: File, onProgress?: UploadProgress): Promise<ValidatedFile> {
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

  const validated = await apiPost<ValidatedFile>('/internal/files/validate', {
    fileKey: presigned.fileKey,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  })
  return validated
}

export const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png'
export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
