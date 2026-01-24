import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FilesService } from './files.service';

/**
 * Files Controller - MVP Scope
 * 
 * ⚠️ NO FILE ENDPOINTS IN API CONTRACT v1
 * 
 * File handling in MVP:
 * - User uploads file during order creation
 * - File URL is part of order_payload
 * - File storage handled by external service (S3/CloudFront)
 * 
 * This module may handle:
 * - Presigned URL generation (internal)
 * - File validation (internal)
 * - Temporary storage coordination
 * 
 * NOT exposed as public CRUD API
 * 
 * Removed:
 * - All public file CRUD operations
 * - File listing (privacy concern)
 * - File deletion (handled via order lifecycle)
 */
@Controller('internal/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /v1/internal/files/presigned-url
   * Generate presigned URL for direct S3 upload
   * Called by frontend before order creation
   * Internal coordination endpoint
   */
  @Post('presigned-url')
  getPresignedUrl() {
    return this.filesService.getPresignedUrl();
  }

  /**
   * POST /v1/internal/files/validate
   * Validate file after upload (size, type, virus scan)
   * Called before order creation proceeds
   * Internal validation endpoint
   */
  @Post('validate')
  validateFile() {
    return this.filesService.validateFile();
  }

  // ❌ REMOVED: upload() - Direct S3 upload via presigned URLs
  // ❌ REMOVED: findAll() - Privacy concern, no file listing
  // ❌ REMOVED: findOne() - Files accessed via CDN, not API
  // ❌ REMOVED: remove() - File lifecycle tied to order lifecycle
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - getPresignedUrl() - Enables secure file upload
 *    - validateFile() - Ensures order quality and security
 * 
 * Note: These are internal coordination endpoints, not in API Contract v1
 * May be moved to order flow directly in future
 */
