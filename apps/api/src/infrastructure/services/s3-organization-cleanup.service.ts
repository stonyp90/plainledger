/**
 * S3OrganizationCleanupService
 *
 * Handles secure deletion of all S3 data for an organization.
 * Used when an organization is deleted or for GDPR data erasure requests.
 *
 * Features:
 * - Deletes data from all medallion layers (Bronze, Silver, Gold)
 * - Deletes uploaded files (logos, documents)
 * - Batch deletion for efficiency
 * - Audit logging of all deletions
 * - Dry-run mode for verification
 * - Progress tracking
 *
 * SECURITY:
 * - Only deletes data scoped to the organization prefix
 * - Validates organization ID format before deletion
 * - Logs all operations for audit trail
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export interface CleanupResult {
  organizationId: string;
  runId: string;
  dryRun: boolean;
  success: boolean;
  deletedObjects: {
    bronze: number;
    silver: number;
    gold: number;
    uploads: number;
    total: number;
  };
  errors: string[];
  durationMs: number;
  deletedPaths: string[];
}

export interface CleanupProgress {
  runId: string;
  organizationId: string;
  currentBucket: string;
  deletedSoFar: number;
  estimatedTotal: number;
  errors: string[];
}

@Injectable()
export class S3OrganizationCleanupService {
  private readonly logger = new Logger(S3OrganizationCleanupService.name);
  private readonly s3Client: S3Client;

  // Bucket configuration
  private readonly bronzeBucket: string;
  private readonly silverBucket: string;
  private readonly goldBucket: string;
  private readonly uploadsBucket: string;

  // Batch size for delete operations (S3 limit is 1000)
  private readonly BATCH_SIZE = 1000;

  // Progress callbacks
  private progressCallbacks: Map<string, (progress: CleanupProgress) => void> =
    new Map();

  constructor(private readonly configService: ConfigService) {
    // Initialize S3 client
    const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    const isLocalDev = !!s3Endpoint;

    this.s3Client = new S3Client({
      endpoint: s3Endpoint || undefined,
      region: this.configService.get<string>("S3_REGION") || "ca-central-1",
      credentials: {
        accessKeyId:
          this.configService.get<string>("AWS_ACCESS_KEY_ID") || "test",
        secretAccessKey:
          this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "test",
      },
      forcePathStyle: isLocalDev,
    });

    // Configure buckets
    this.bronzeBucket =
      this.configService.get<string>("S3_BUCKET_BRONZE") || "plainledger-bronze";
    this.silverBucket =
      this.configService.get<string>("S3_BUCKET_SILVER") || "plainledger-silver";
    this.goldBucket =
      this.configService.get<string>("S3_BUCKET_GOLD") || "plainledger-gold";
    this.uploadsBucket =
      this.configService.get<string>("S3_BUCKET_UPLOADS") ||
      "plainledger-uploads";
  }

  /**
   * Clean up all S3 data for an organization
   *
   * @param organizationId - The organization's unique identifier
   * @param dryRun - If true, only list objects without deleting
   * @param onProgress - Optional callback for progress updates
   */
  async cleanupOrganization(
    organizationId: string,
    dryRun: boolean = false,
    onProgress?: (progress: CleanupProgress) => void,
  ): Promise<CleanupResult> {
    const runId = uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `[${runId}] Starting S3 cleanup for organization: ${organizationId} (dryRun: ${dryRun})`,
    );

    // Validate organization ID format
    if (!this.isValidOrganizationId(organizationId)) {
      throw new Error(`Invalid organization ID format: ${organizationId}`);
    }

    // Store progress callback
    if (onProgress) {
      this.progressCallbacks.set(runId, onProgress);
    }

    const result: CleanupResult = {
      organizationId,
      runId,
      dryRun,
      success: true,
      deletedObjects: {
        bronze: 0,
        silver: 0,
        gold: 0,
        uploads: 0,
        total: 0,
      },
      errors: [],
      durationMs: 0,
      deletedPaths: [],
    };

    try {
      // Clean up each bucket
      result.deletedObjects.bronze = await this.cleanupBucket(
        this.bronzeBucket,
        organizationId,
        dryRun,
        runId,
        result,
      );

      result.deletedObjects.silver = await this.cleanupBucket(
        this.silverBucket,
        organizationId,
        dryRun,
        runId,
        result,
      );

      result.deletedObjects.gold = await this.cleanupBucket(
        this.goldBucket,
        organizationId,
        dryRun,
        runId,
        result,
      );

      result.deletedObjects.uploads = await this.cleanupBucket(
        this.uploadsBucket,
        organizationId,
        dryRun,
        runId,
        result,
      );

      result.deletedObjects.total =
        result.deletedObjects.bronze +
        result.deletedObjects.silver +
        result.deletedObjects.gold +
        result.deletedObjects.uploads;

      this.logger.log(
        `[${runId}] Cleanup completed: ${result.deletedObjects.total} objects ${dryRun ? "would be" : ""} deleted`,
      );
    } catch (error) {
      result.success = false;
      result.errors.push(`Cleanup failed: ${error}`);
      this.logger.error(`[${runId}] Cleanup failed: ${error}`);
    } finally {
      result.durationMs = Date.now() - startTime;
      this.progressCallbacks.delete(runId);
    }

    // Audit log
    this.logger.log(
      `[Audit] Organization cleanup ${dryRun ? "(dry-run)" : ""}: ` +
        `orgId=${organizationId}, runId=${runId}, success=${result.success}, ` +
        `deleted=${result.deletedObjects.total}, duration=${result.durationMs}ms`,
    );

    return result;
  }

  /**
   * Clean up a specific bucket for an organization
   */
  private async cleanupBucket(
    bucket: string,
    organizationId: string,
    dryRun: boolean,
    runId: string,
    result: CleanupResult,
  ): Promise<number> {
    // Organization data is stored under the organization_id prefix
    const prefixes = [
      `organization_id=${organizationId}/`, // Gold layer partitioned format
      `${organizationId}/`, // Simple prefix format
    ];

    let totalDeleted = 0;

    for (const prefix of prefixes) {
      try {
        const deleted = await this.deleteObjectsWithPrefix(
          bucket,
          prefix,
          dryRun,
          runId,
          result,
        );
        totalDeleted += deleted;
      } catch (error) {
        const errorMsg = `Failed to cleanup ${bucket}/${prefix}: ${error}`;
        this.logger.error(`[${runId}] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    return totalDeleted;
  }

  /**
   * Delete all objects with a given prefix
   */
  private async deleteObjectsWithPrefix(
    bucket: string,
    prefix: string,
    dryRun: boolean,
    runId: string,
    result: CleanupResult,
  ): Promise<number> {
    let totalDeleted = 0;
    let continuationToken: string | undefined;

    do {
      // List objects with prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: this.BATCH_SIZE,
        ContinuationToken: continuationToken,
      });

      let response: ListObjectsV2CommandOutput;
      try {
        response = await this.s3Client.send(listCommand);
      } catch (error) {
        // Bucket might not exist in local dev
        this.logger.debug(`Bucket ${bucket} not accessible: ${error}`);
        return 0;
      }

      const objects = response.Contents || [];

      if (objects.length === 0) {
        break;
      }

      // Report progress
      const progressCallback = this.progressCallbacks.get(runId);
      if (progressCallback) {
        progressCallback({
          runId,
          organizationId: result.organizationId,
          currentBucket: bucket,
          deletedSoFar: totalDeleted,
          estimatedTotal: totalDeleted + objects.length,
          errors: result.errors,
        });
      }

      // Track deleted paths (for audit)
      for (const obj of objects) {
        if (obj.Key) {
          result.deletedPaths.push(`s3://${bucket}/${obj.Key}`);
        }
      }

      // Delete objects (unless dry run)
      if (!dryRun && objects.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        });

        try {
          await this.s3Client.send(deleteCommand);
        } catch (error) {
          const errorMsg = `Failed to delete batch from ${bucket}: ${error}`;
          this.logger.error(`[${runId}] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      totalDeleted += objects.length;
      continuationToken = response.NextContinuationToken;

      this.logger.debug(
        `[${runId}] ${dryRun ? "Would delete" : "Deleted"} ${objects.length} objects from ${bucket}/${prefix}`,
      );
    } while (continuationToken);

    return totalDeleted;
  }

  /**
   * Validate organization ID format
   * Prevents injection attacks and accidental deletion of wrong data
   */
  private isValidOrganizationId(organizationId: string): boolean {
    // UUID format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Also allow alphanumeric IDs for legacy support
    const alphanumericRegex = /^[a-zA-Z0-9_-]+$/;

    if (!organizationId || organizationId.length < 3) {
      return false;
    }

    // Prevent path traversal
    if (
      organizationId.includes("..") ||
      organizationId.includes("/") ||
      organizationId.includes("\\")
    ) {
      return false;
    }

    return uuidRegex.test(organizationId) || alphanumericRegex.test(organizationId);
  }

  /**
   * Get estimated object count for an organization (for progress tracking)
   */
  async getOrganizationObjectCount(organizationId: string): Promise<{
    bronze: number;
    silver: number;
    gold: number;
    uploads: number;
    total: number;
  }> {
    const buckets = [
      { name: "bronze", bucket: this.bronzeBucket },
      { name: "silver", bucket: this.silverBucket },
      { name: "gold", bucket: this.goldBucket },
      { name: "uploads", bucket: this.uploadsBucket },
    ];

    const counts: Record<string, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      uploads: 0,
    };

    for (const { name, bucket } of buckets) {
      const prefixes = [
        `organization_id=${organizationId}/`,
        `${organizationId}/`,
      ];

      for (const prefix of prefixes) {
        try {
          let continuationToken: string | undefined;
          do {
            const response = await this.s3Client.send(
              new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
              }),
            );
            counts[name] += response.KeyCount || 0;
            continuationToken = response.NextContinuationToken;
          } while (continuationToken);
        } catch {
          // Bucket might not exist
        }
      }
    }

    return {
      bronze: counts.bronze,
      silver: counts.silver,
      gold: counts.gold,
      uploads: counts.uploads,
      total: counts.bronze + counts.silver + counts.gold + counts.uploads,
    };
  }
}
