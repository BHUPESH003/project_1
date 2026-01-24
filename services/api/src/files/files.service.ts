/**
 * Files Service
 *
 * Handles file upload coordination via S3 presigned URLs.
 * Files are uploaded directly to S3 by frontend, not through API.
 *
 * Sprint 2: Basic S3 integration (stubbed for MVP)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { FILE_CONFIG } from '@/common/constants';

/**
 * Presigned URL request
 */
export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
  orderId?: string; // Optional: if file is for existing order
}

/**
 * Presigned URL response
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number; // Seconds until URL expires
  headers?: Record<string, string>; // Required headers for upload
}

/**
 * File validation request
 */
export interface ValidateFileRequest {
  fileKey: string;
  orderId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Get S3 configuration from environment
    this.s3Bucket =
      this.configService.get<string>('S3_BUCKET_NAME') || 'mvp-files-dev';
    this.s3Region =
      this.configService.get<string>('AWS_REGION') || 'ap-south-1';
  }

  /**
   * Generate presigned URL for direct S3 upload
   *
   * Sprint 2: Stubbed implementation
   * Future: Integrate AWS SDK for real presigned URLs
   */
  async getPresignedUrl(
    request: PresignedUrlRequest,
  ): Promise<PresignedUrlResponse> {
    // Validate file size
    if (request.fileSize > FILE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size ${request.fileSize} bytes exceeds maximum ${FILE_CONFIG.MAX_FILE_SIZE_BYTES} bytes`,
      );
    }

    // Generate unique file key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = request.fileName.split('.').pop() || 'bin';
    const fileKey = `orders/${request.orderId || 'draft'}/${timestamp}-${randomId}.${fileExtension}`;

    // Sprint 2: Stubbed presigned URL
    // In production, use AWS SDK:
    // const s3 = new S3Client({ region: this.s3Region });
    // const command = new PutObjectCommand({
    //   Bucket: this.s3Bucket,
    //   Key: fileKey,
    //   ContentType: request.mimeType,
    // });
    // const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    const uploadUrl = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${fileKey}?presigned=true`;

    this.logger.log(
      `Generated presigned URL for file: ${fileKey} (${request.fileSize} bytes)`,
    );

    return {
      uploadUrl,
      fileKey,
      expiresIn: 3600, // 1 hour
      headers: {
        'Content-Type': request.mimeType,
      },
    };
  }

  /**
   * Validate file after upload
   *
   * Sprint 2: Basic validation (type, size)
   * Future: Virus scanning, content validation
   */
  async validateFile(request: ValidateFileRequest): Promise<{
    valid: boolean;
    error?: string;
    fileId?: string;
  }> {
    // Validate file size
    if (request.sizeBytes > FILE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds maximum ${FILE_CONFIG.MAX_FILE_SIZE_MB}MB`,
      };
    }

    // Validate file type
    const allowedTypes = [
      ...FILE_CONFIG.ALLOWED_IMAGE_TYPES,
      ...FILE_CONFIG.ALLOWED_DOCUMENT_TYPES,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    ];

    if (!allowedTypes.includes(request.mimeType)) {
      return {
        valid: false,
        error: `File type ${request.mimeType} is not allowed`,
      };
    }

    // Create file record in database
    const file = await this.prisma.prisma.file.create({
      data: {
        orderId: request.orderId,
        originalName: request.originalName,
        mimeType: request.mimeType,
        sizeBytes: request.sizeBytes,
        storageKey: request.fileKey,
        storageUrl: `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${request.fileKey}`,
        bucket: this.s3Bucket,
        validated: true,
      },
    });

    this.logger.log(`File validated and recorded: ${file.id}`);

    return {
      valid: true,
      fileId: file.id,
    };
  }
}
