import { Controller, Post, Body, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { FilesService } from './files.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { ValidateFileDto } from './dto/validate-file.dto';

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
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /v1/internal/files/presigned-url
   * Generate presigned URL for direct S3 upload
   * Called by frontend before order creation
   * Internal coordination endpoint
   */
  @Post('presigned-url')
  @ApiTags('Files (Internal)')
  @ApiOperation({
    summary: 'Get presigned URL for file upload',
    description:
      'Generates a presigned S3 URL for direct file upload. Used by frontend before order creation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file size or type' })
  getPresignedUrl(@Body() dto: PresignedUrlDto, @Req() req: Request) {
    // Log the received DTO for debugging
    this.logger.log(`Presigned URL request: ${JSON.stringify(dto)}`);
    this.logger.log(`Request headers: ${JSON.stringify(req.headers)}`);
    this.logger.log(`Raw body: ${req.body}`);
    return this.filesService.getPresignedUrl(dto);
  }

  /**
   * POST /v1/internal/files/validate
   * Validate file after upload (size, type, virus scan)
   * Called before order creation proceeds
   * Internal validation endpoint
   */
  @Post('validate')
  @ApiTags('Files (Internal)')
  @ApiOperation({
    summary: 'Validate uploaded file',
    description:
      'Validates file after upload. Checks size, type, and creates file record in database.',
  })
  @ApiResponse({ status: 200, description: 'File validated successfully' })
  @ApiResponse({ status: 400, description: 'File validation failed' })
  validateFile(@Body() dto: ValidateFileDto) {
    return this.filesService.validateFile(dto);
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
