/**
 * File Storage Service
 *
 * Handles file uploads to S3/MinIO for logos, profile pictures, and other assets.
 * Works with both LocalStack/MinIO (local dev) and AWS S3 (production).
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  publicUrl?: string;
  error?: string;
}

export interface FileUploadOptions {
  contentType: string;
  folder: string;
  filename?: string;
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3Client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  private readonly isLocalDev: boolean;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    const publicEndpoint = this.configService.get<string>("S3_PUBLIC_ENDPOINT")?.replace(/\/$/, "");
    const s3Region =
      this.configService.get<string>("S3_REGION") || "ca-central-1";
    const accessKeyId =
      this.configService.get<string>("AWS_ACCESS_KEY_ID") || "localstack-test";
    const secretAccessKey =
      this.configService.get<string>("AWS_SECRET_ACCESS_KEY") ||
      "localstack-test";

    this.bucket =
      this.configService.get<string>("S3_BUCKET_UPLOADS") ||
      "plainledger-uploads";
    this.isLocalDev = !!s3Endpoint;

    // In local dev, use LocalStack/MinIO endpoint; in prod, use default AWS
    this.s3Client = new S3Client({
      ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
      region: s3Region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: this.isLocalDev, // Required for LocalStack/MinIO
    });

    this.signingClient = publicEndpoint ? new S3Client({
      endpoint: publicEndpoint, region: s3Region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true,
    }) : this.s3Client;

    // Public URL base for serving files
    // In local dev, use LocalStack URL; in prod, use CloudFront or S3 URL
    if (publicEndpoint) {
      this.publicBaseUrl = `${publicEndpoint}/${this.bucket}`;
    } else if (this.isLocalDev) {
      // LocalStack exposes files at http://localhost:4566/{bucket}/{key}
      this.publicBaseUrl = `${s3Endpoint}/${this.bucket}`;
    } else {
      // In production, use CloudFront or direct S3 URL
      const cloudFrontDomain =
        this.configService.get<string>("CLOUDFRONT_DOMAIN");
      if (cloudFrontDomain) {
        this.publicBaseUrl = `https://${cloudFrontDomain}`;
      } else {
        this.publicBaseUrl = `https://${this.bucket}.s3.${s3Region}.amazonaws.com`;
      }
    }

    this.logger.log(
      `FileStorageService initialized - Bucket: ${this.bucket}, LocalDev: ${this.isLocalDev}`,
    );
  }

  /**
   * Initialize the uploads bucket (call on app startup)
   * Uses timeout to prevent blocking app startup if S3 is unavailable
   */
  async initialize(): Promise<void> {
    // Skip S3 initialization in production if bucket is not configured
    // This allows the app to start without S3 - uploads will fail gracefully
    const timeoutMs = 5000; // 5 second timeout

    try {
      // Wrap S3 call with timeout to prevent hanging
      const checkBucket = async () => {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} exists and is accessible`);
      };

      await Promise.race([
        checkBucket(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("S3 bucket check timed out")),
            timeoutMs,
          ),
        ),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // In local dev, try to create the bucket
      if (this.isLocalDev) {
        try {
          await Promise.race([
            this.createBucketWithCors(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Bucket creation timed out")),
                timeoutMs,
              ),
            ),
          ]);
        } catch (createError) {
          const createErrorMsg =
            createError instanceof Error
              ? createError.message
              : String(createError);
          this.logger.warn(
            `Failed to create bucket in local dev: ${createErrorMsg}`,
          );
        }
      } else {
        // In production, just log warning and continue
        // File uploads will fail gracefully if bucket isn't accessible
        this.logger.warn(
          `S3 bucket not accessible: ${errorMessage}. File uploads may fail.`,
        );
      }
    }
  }

  /**
   * Create bucket with CORS configuration (for local dev)
   */
  private async createBucketWithCors(): Promise<void> {
    await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    this.logger.log(`Created bucket ${this.bucket}`);

    // Set CORS for web access
    await this.s3Client.send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST"],
              AllowedOrigins: ["*"], // In production, restrict this
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: FileUploadOptions,
  ): Promise<UploadResult> {
    try {
      // Generate unique filename if not provided
      const filename =
        options.filename ||
        `${crypto.randomUUID()}.${this.getExtensionFromMimeType(options.contentType)}`;

      // Build the S3 key path
      let key = options.folder;
      if (options.tenantId) {
        key = `${key}/${options.tenantId}`;
      }
      if (options.userId) {
        key = `${key}/${options.userId}`;
      }
      key = `${key}/${filename}`;

      // Upload to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: options.contentType,
          // Make uploads publicly readable for logos/avatars
          ACL: this.isLocalDev ? undefined : "public-read",
          // Cache for 1 year (immutable content with unique keys)
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      const publicUrl = `${this.publicBaseUrl}/${key}`;

      this.logger.log(`Uploaded file: ${key}`);

      return {
        success: true,
        key,
        url: publicUrl,
        publicUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      return {
        success: false,
        key: "",
        url: "",
        error: error.message,
      };
    }
  }

  /**
   * Upload organization logo
   */
  async uploadLogo(
    fileBuffer: Buffer,
    tenantId: string,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(fileBuffer, {
      contentType,
      folder: "logos",
      tenantId,
      filename: `logo.${this.getExtensionFromMimeType(contentType)}`,
    });
  }

  /**
   * Upload user profile picture
   */
  async uploadProfilePicture(
    fileBuffer: Buffer,
    userId: string,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(fileBuffer, {
      contentType,
      folder: "avatars",
      userId,
      filename: `avatar.${this.getExtensionFromMimeType(contentType)}`,
    });
  }

  /**
   * Get a signed URL for temporary access (useful for private files)
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.signingClient, command, { expiresIn });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted file: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    return mimeToExt[mimeType] || "bin";
  }

  /**
   * Validate image file
   */
  validateImage(
    buffer: Buffer,
    contentType: string,
    maxSizeMB = 5,
  ): { valid: boolean; error?: string } {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
    }

    // Check content type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(contentType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: JPG, PNG, GIF, WebP`,
      };
    }

    // Basic magic number validation
    const header = buffer.slice(0, 12);
    const isPNG =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    const isJPEG =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isGIF =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38;
    const isWebP =
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50;

    if (!isPNG && !isJPEG && !isGIF && !isWebP) {
      return { valid: false, error: "Invalid image file format" };
    }

    return { valid: true };
  }
}
