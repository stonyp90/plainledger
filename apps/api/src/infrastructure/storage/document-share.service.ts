/**
 * Document Share Service
 *
 * Handles password-protected document sharing with expiration.
 * Documents are stored in a private S3 bucket and accessed via presigned URLs.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  GoneException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
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
import { SharedDocumentEntity } from "@infrastructure/persistence/postgres/entities/shared-document.entity";

export interface CreateShareOptions {
  organizationId: string;
  createdBy: string;
  file: Buffer;
  filename: string;
  mimeType: string;
  password: string;
  expiresInHours?: number;
  maxDownloads?: number;
  description?: string;
}

export interface ShareResult {
  id: string;
  shareUrl: string;
  shareToken: string;
  expiresAt: Date;
  maxDownloads?: number;
}

export interface AccessShareOptions {
  shareToken: string;
  password: string;
  clientIp?: string;
}

export interface DownloadResult {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  expiresInSeconds: number;
}

export interface ShareInfo {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: Date;
  isActive: boolean;
}

@Injectable()
export class DocumentShareService {
  private readonly logger = new Logger(DocumentShareService.name);
  private readonly s3Client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  private readonly isLocalDev: boolean;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SharedDocumentEntity)
    private readonly sharedDocumentRepo: Repository<SharedDocumentEntity>,
  ) {
    const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    const publicEndpoint = this.configService.get<string>("S3_PUBLIC_ENDPOINT")?.replace(/\/$/, "");
    const s3Region =
      this.configService.get<string>("S3_REGION") || "ca-central-1";
    const accessKeyId =
      this.configService.get<string>("AWS_ACCESS_KEY_ID") || "localstack-test";
    const secretAccessKey =
      this.configService.get<string>("AWS_SECRET_ACCESS_KEY") ||
      "localstack-test";
    const sessionToken = this.configService.get<string>("AWS_SESSION_TOKEN");

    this.bucket =
      this.configService.get<string>("S3_BUCKET_DOCUMENT_SHARE") ||
      "plainledger-document-share";
    this.isLocalDev = !!s3Endpoint;
    this.baseUrl =
      this.configService.get<string>("APP_BASE_URL") || "http://localhost:5173";

    // Build credentials object
    const credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } = {
      accessKeyId,
      secretAccessKey,
    };
    if (sessionToken) {
      credentials.sessionToken = sessionToken;
    }

    this.s3Client = new S3Client({
      ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
      region: s3Region,
      credentials,
      forcePathStyle: this.isLocalDev,
    });

    this.signingClient = publicEndpoint ? new S3Client({
      endpoint: publicEndpoint, region: s3Region, credentials, forcePathStyle: true,
    }) : this.s3Client;

    this.logger.log(
      `DocumentShareService initialized - Bucket: ${this.bucket}, LocalDev: ${this.isLocalDev}`,
    );
  }

  /**
   * Initialize the document share bucket
   */
  async initialize(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Document share bucket ${this.bucket} exists`);
    } catch (error) {
      try {
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created document share bucket ${this.bucket}`);

        await this.s3Client.send(
          new PutBucketCorsCommand({
            Bucket: this.bucket,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedHeaders: ["*"],
                  AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
                  AllowedOrigins: ["*"],
                  ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
                  MaxAgeSeconds: 3600,
                },
              ],
            },
          }),
        );
      } catch (createError) {
        this.logger.error(
          `Failed to create document share bucket: ${createError.message}`,
        );
      }
    }
  }

  /**
   * Create a new password-protected document share
   */
  async createShare(options: CreateShareOptions): Promise<ShareResult> {
    const {
      organizationId,
      createdBy,
      file,
      filename,
      mimeType,
      password,
      expiresInHours = 168, // Default 7 days
      maxDownloads,
      description,
    } = options;

    // Validate file size (max 100MB)
    const maxFileSize = 100 * 1024 * 1024;
    if (!Buffer.isBuffer(file) || file.length === 0 || file.length > maxFileSize) {
      throw new BadRequestException("File size exceeds 100MB limit");
    }

    // Validate password strength
    if (typeof password !== "string" || password.length < 6 || password.length > 1024) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    if (!Number.isFinite(expiresInHours) || expiresInHours <= 0 || expiresInHours > 8760 ||
      (maxDownloads !== undefined && (!Number.isSafeInteger(maxDownloads) || maxDownloads < 1))) {
      throw new BadRequestException("Share expiration and download limit must be positive and within supported limits");
    }
    // eslint-disable-next-line no-control-regex -- User filenames cannot contain path separators or control characters.
    if (typeof filename !== "string" || !filename.trim() || filename.length > 255 || /[\\/\x00-\x1f]/.test(filename)) {
      throw new BadRequestException("Invalid document filename");
    }

    // Generate unique identifiers
    const id = crypto.randomUUID();
    const shareToken = crypto.randomBytes(32).toString("hex");
    const s3Key = `shares/${organizationId}/${id}/${filename}`;

    // Hash password with salt
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(password, salt);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Upload to S3
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: file,
          ContentType: mimeType,
          ContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
          Metadata: {
            "original-filename": filename,
            "organization-id": organizationId,
            "created-by": createdBy,
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to upload document to S3: ${error.message}`);
      throw new BadRequestException("Failed to upload document");
    }

    // Create database record
    const sharedDocument = this.sharedDocumentRepo.create({
      id,
      organizationId,
      createdBy,
      originalFilename: filename,
      fileSize: file.length,
      mimeType,
      s3Key,
      shareToken,
      passwordHash: `${salt}:${passwordHash}`,
      expiresAt,
      maxDownloads,
      description,
      downloadCount: 0,
      isActive: true,
    });

    await this.sharedDocumentRepo.save(sharedDocument);

    const shareUrl = `${this.baseUrl}/shared/${shareToken}`;

    this.logger.log(`Created document share: ${id} for org ${organizationId}`);

    return {
      id,
      shareUrl,
      shareToken,
      expiresAt,
      maxDownloads,
    };
  }

  /**
   * Validate password and get download URL for a shared document
   */
  async accessShare(options: AccessShareOptions): Promise<DownloadResult> {
    const { shareToken, password, clientIp } = options;
    if (typeof shareToken !== "string" || !/^[a-f0-9]{64}$/.test(shareToken) || typeof password !== "string" || password.length > 1024) {
      throw new BadRequestException("Invalid share access request");
    }

    // Find the share
    const share = await this.sharedDocumentRepo.findOne({
      where: { shareToken },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Check if share is active
    if (!share.isActive) {
      throw new GoneException("This share has been deactivated");
    }

    // Check expiration
    if (new Date() >= share.expiresAt) {
      throw new GoneException("This share has expired");
    }

    // Check download limit
    if (share.maxDownloads !== null && share.maxDownloads !== undefined && share.downloadCount >= share.maxDownloads) {
      throw new GoneException("Download limit reached for this share");
    }

    // Validate password
    const [salt, storedHash] = share.passwordHash.split(":");
    const providedHash = this.hashPassword(password, salt);

    const expected = Buffer.from(storedHash || "", "hex");
    const actual = Buffer.from(providedHash, "hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException("Invalid password");
    }

    // Generate presigned URL (valid for 5 minutes)
    const expiresInSeconds = 300;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: share.s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(share.originalFilename)}"`,
    });

    const downloadUrl = await getSignedUrl(this.signingClient, command, {
      expiresIn: expiresInSeconds,
    });

    // Reserve a download atomically so simultaneous requests cannot exceed the
    // limit or access a share that was revoked after the initial read.
    const reserved = await this.sharedDocumentRepo.createQueryBuilder()
      .update(SharedDocumentEntity)
      .set({ downloadCount: () => '"download_count" + 1', lastAccessedAt: new Date(), lastAccessedIp: clientIp })
      .where('"id" = :id AND "is_active" = true AND "expires_at" > :now', { id: share.id, now: new Date() })
      .andWhere('("max_downloads" IS NULL OR "download_count" < "max_downloads")')
      .execute();
    if (reserved.affected !== 1) throw new GoneException("This share is no longer available or its download limit was reached");

    this.logger.log(
      `Document share accessed: ${share.id}, downloads: ${share.downloadCount + 1}`,
    );

    return {
      downloadUrl,
      filename: share.originalFilename,
      mimeType: share.mimeType,
      fileSize: share.fileSize,
      expiresInSeconds,
    };
  }

  /**
   * Get share info (without requiring password, for display purposes)
   */
  async getShareInfo(shareToken: string): Promise<ShareInfo | null> {
    const share = await this.sharedDocumentRepo.findOne({
      where: { shareToken },
    });

    if (!share) {
      return null;
    }

    return {
      id: share.id,
      originalFilename: share.originalFilename,
      fileSize: share.fileSize,
      mimeType: share.mimeType,
      description: share.description,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      createdAt: share.createdAt,
      isActive: share.isActive && new Date() < share.expiresAt,
    };
  }

  /**
   * List shares for an organization
   */
  async listShares(organizationId: string): Promise<ShareInfo[]> {
    const shares = await this.sharedDocumentRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });

    return shares.map((share) => ({
      id: share.id,
      originalFilename: share.originalFilename,
      fileSize: share.fileSize,
      mimeType: share.mimeType,
      description: share.description,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      createdAt: share.createdAt,
      isActive: share.isActive && new Date() < share.expiresAt,
    }));
  }

  /**
   * List shares created by a user
   */
  async listUserShares(userId: string): Promise<ShareInfo[]> {
    const shares = await this.sharedDocumentRepo.find({
      where: { createdBy: userId },
      order: { createdAt: "DESC" },
    });

    return shares.map((share) => ({
      id: share.id,
      originalFilename: share.originalFilename,
      fileSize: share.fileSize,
      mimeType: share.mimeType,
      description: share.description,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      createdAt: share.createdAt,
      isActive: share.isActive && new Date() < share.expiresAt,
    }));
  }

  /**
   * Deactivate a share
   */
  async deactivateShare(
    shareId: string,
    organizationId: string,
    reason?: string,
  ): Promise<void> {
    const share = await this.sharedDocumentRepo.findOne({
      where: { id: shareId, organizationId },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    await this.sharedDocumentRepo.update(shareId, {
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedReason: reason || "Manual deactivation",
    });

    this.logger.log(`Document share deactivated: ${shareId}`);
  }

  /**
   * Delete a share (removes from S3 and database)
   */
  async deleteShare(shareId: string, organizationId: string): Promise<void> {
    const share = await this.sharedDocumentRepo.findOne({
      where: { id: shareId, organizationId },
    });

    if (!share) {
      throw new NotFoundException("Share not found");
    }

    // Delete from S3
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: share.s3Key,
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object: ${error.message}`);
    }

    // Delete from database
    await this.sharedDocumentRepo.delete(shareId);

    this.logger.log(`Document share deleted: ${shareId}`);
  }

  /**
   * Cleanup expired shares (run periodically)
   */
  async cleanupExpiredShares(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days after expiration

    const expiredShares = await this.sharedDocumentRepo.find({
      where: {
        expiresAt: LessThan(cutoffDate),
      },
    });

    let deletedCount = 0;
    for (const share of expiredShares) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: share.s3Key,
          }),
        );
        await this.sharedDocumentRepo.delete(share.id);
        deletedCount++;
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup share ${share.id}: ${error.message}`,
        );
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired document shares`);
    }

    return deletedCount;
  }

  /**
   * Hash password with salt using PBKDF2
   */
  private hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
  }

  /**
   * Get allowed MIME types for uploads
   */
  getAllowedMimeTypes(): string[] {
    return [
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      // Text
      "text/plain",
      "text/csv",
      // Images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      // Archives
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
    ];
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string): boolean {
    return this.getAllowedMimeTypes().includes(mimeType);
  }
}
