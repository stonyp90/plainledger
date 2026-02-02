/**
 * DataRetentionJob - Scheduled cleanup job for data retention policies
 *
 * Runs daily to:
 * 1. Permanently delete soft-deleted organizations (after 90-day grace period)
 * 2. Clean up old Bronze layer data (raw data older than 365 days)
 * 3. Remove orphaned S3 objects (data without associated organization)
 * 4. Generate retention audit reports
 *
 * GDPR/PIPEDA Compliance:
 * - Supports right to erasure (soft delete + S3 cleanup after grace period)
 * - Maintains audit logs of all deletions
 * - Configurable retention periods per data type
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, LessThan, Not, IsNull, DataSource } from "typeorm";
import { OrganizationEntity } from "@infrastructure/persistence/postgres/entities/organization.entity";
import { S3OrganizationCleanupService } from "@infrastructure/services/s3-organization-cleanup.service";
import { ConfigService } from "@nestjs/config";

export interface RetentionJobResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  results: {
    softDeletedOrgsProcessed: number;
    softDeletedOrgsCleanedUp: number;
    bronzeObjectsDeleted: number;
    orphanedObjectsDeleted: number;
    errors: string[];
  };
}

@Injectable()
export class DataRetentionJob {
  private readonly logger = new Logger(DataRetentionJob.name);

  // Retention periods (in days)
  private readonly SOFT_DELETE_GRACE_PERIOD: number;
  private readonly BRONZE_DATA_RETENTION: number;
  private readonly AUDIT_LOG_RETENTION: number;

  // Feature flag
  private readonly isEnabled: boolean;

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly s3CleanupService: S3OrganizationCleanupService,
    private readonly configService: ConfigService,
  ) {
    // Configure retention periods from environment
    this.SOFT_DELETE_GRACE_PERIOD = parseInt(
      this.configService.get<string>("RETENTION_SOFT_DELETE_DAYS") || "90",
      10,
    );
    this.BRONZE_DATA_RETENTION = parseInt(
      this.configService.get<string>("RETENTION_BRONZE_DAYS") || "365",
      10,
    );
    this.AUDIT_LOG_RETENTION = parseInt(
      this.configService.get<string>("RETENTION_AUDIT_DAYS") || "730",
      10,
    );

    // Enable/disable via config
    this.isEnabled =
      this.configService.get<string>("RETENTION_JOB_ENABLED") !== "false";

    this.logger.log(
      `DataRetentionJob initialized: enabled=${this.isEnabled}, ` +
        `softDeleteGrace=${this.SOFT_DELETE_GRACE_PERIOD}d, ` +
        `bronzeRetention=${this.BRONZE_DATA_RETENTION}d`,
    );
  }

  /**
   * Run daily at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyRetention(): Promise<RetentionJobResult> {
    if (!this.isEnabled) {
      this.logger.debug("Data retention job is disabled");
      return this.createEmptyResult();
    }

    const runId = `retention-${Date.now()}`;
    const startedAt = new Date();

    this.logger.log(`[${runId}] Starting data retention job`);

    const result: RetentionJobResult = {
      runId,
      startedAt,
      completedAt: new Date(),
      durationMs: 0,
      results: {
        softDeletedOrgsProcessed: 0,
        softDeletedOrgsCleanedUp: 0,
        bronzeObjectsDeleted: 0,
        orphanedObjectsDeleted: 0,
        errors: [],
      },
    };

    try {
      // Step 1: Process soft-deleted organizations past grace period
      await this.processSoftDeletedOrganizations(runId, result);

      // Step 2: Clean up old Bronze data (TODO: implement when needed)
      // await this.cleanupOldBronzeData(runId, result);

      // Step 3: Find and clean orphaned S3 objects (TODO: implement when needed)
      // await this.cleanupOrphanedObjects(runId, result);
    } catch (error) {
      const errorMsg = `Retention job failed: ${error}`;
      this.logger.error(`[${runId}] ${errorMsg}`);
      result.results.errors.push(errorMsg);
    }

    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - startedAt.getTime();

    // Log summary
    this.logger.log(
      `[${runId}] Data retention job completed in ${result.durationMs}ms: ` +
        `orgsProcessed=${result.results.softDeletedOrgsProcessed}, ` +
        `orgsCleanedUp=${result.results.softDeletedOrgsCleanedUp}, ` +
        `errors=${result.results.errors.length}`,
    );

    return result;
  }

  /**
   * Process soft-deleted organizations past the grace period
   */
  private async processSoftDeletedOrganizations(
    runId: string,
    result: RetentionJobResult,
  ): Promise<void> {
    // Calculate cutoff date (grace period ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.SOFT_DELETE_GRACE_PERIOD);

    this.logger.debug(
      `[${runId}] Looking for soft-deleted orgs older than ${cutoffDate.toISOString()}`,
    );

    // Find organizations that were soft-deleted more than GRACE_PERIOD days ago
    const expiredOrgs = await this.organizationRepository.find({
      where: {
        deletedAt: LessThan(cutoffDate),
      },
      withDeleted: true, // Include soft-deleted records
    });

    result.results.softDeletedOrgsProcessed = expiredOrgs.length;

    this.logger.log(
      `[${runId}] Found ${expiredOrgs.length} organizations past retention period`,
    );

    // Process each organization
    for (const org of expiredOrgs) {
      try {
        this.logger.log(
          `[${runId}] Cleaning up organization: ${org.id} (${org.name})`,
        );

        // Delete all S3 data
        const cleanupResult = await this.s3CleanupService.cleanupOrganization(
          org.id,
          false, // Not a dry run
        );

        if (cleanupResult.success) {
          // Cascade delete all related database records
          await this.cascadeDeleteOrganizationData(org.id, runId);

          // Hard delete the organization record
          await this.organizationRepository.delete(org.id);
          result.results.softDeletedOrgsCleanedUp++;

          this.logger.log(
            `[Audit] Organization permanently deleted: ` +
              `id=${org.id}, name=${org.name}, s3Objects=${cleanupResult.deletedObjects.total}`,
          );
        } else {
          result.results.errors.push(
            `Failed to cleanup org ${org.id}: ${cleanupResult.errors.join(", ")}`,
          );
        }
      } catch (error) {
        const errorMsg = `Error processing org ${org.id}: ${error}`;
        this.logger.error(`[${runId}] ${errorMsg}`);
        result.results.errors.push(errorMsg);
      }
    }
  }

  /**
   * Cascade delete all database records related to an organization
   * This ensures complete data removal for GDPR compliance
   */
  private async cascadeDeleteOrganizationData(
    organizationId: string,
    runId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete in order to respect foreign key constraints
      // 1. Delete integration data
      await queryRunner.query(
        `DELETE FROM datasource_sync_logs WHERE connection_id IN (
          SELECT id FROM datasource_connections WHERE organization_id = $1
        )`,
        [organizationId],
      );
      await queryRunner.query(
        `DELETE FROM datasource_connections WHERE organization_id = $1`,
        [organizationId],
      );
      await queryRunner.query(
        `DELETE FROM integration_credentials WHERE organization_id = $1`,
        [organizationId],
      );

      // 2. Delete accounting data
      await queryRunner.query(
        `DELETE FROM accounting.journal_entries WHERE organization_id = $1`,
        [organizationId],
      );
      await queryRunner.query(
        `DELETE FROM accounting.accounts WHERE organization_id = $1`,
        [organizationId],
      );

      // 3. Delete reporting data
      await queryRunner.query(
        `DELETE FROM reporting.shared_report_links WHERE organization_id = $1`,
        [organizationId],
      );
      await queryRunner.query(
        `DELETE FROM reporting.tax_credit_eligibility WHERE organization_id = $1`,
        [organizationId],
      );
      await queryRunner.query(
        `DELETE FROM reporting.tax_credit_leads WHERE organization_id = $1`,
        [organizationId],
      );

      // 4. Delete user organization memberships
      await queryRunner.query(
        `DELETE FROM user_organizations WHERE organization_id = $1`,
        [organizationId],
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[${runId}] Cascade deleted all database records for org ${organizationId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[${runId}] Failed to cascade delete for org ${organizationId}: ${error}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Manual trigger for testing/admin
   */
  async runManually(dryRun: boolean = true): Promise<RetentionJobResult> {
    this.logger.log(`Manual retention job triggered (dryRun: ${dryRun})`);

    if (dryRun) {
      // Just report what would be cleaned up
      return this.generateRetentionReport();
    }

    return this.runDailyRetention();
  }

  /**
   * Generate a report of what would be cleaned up
   */
  async generateRetentionReport(): Promise<RetentionJobResult> {
    const runId = `report-${Date.now()}`;
    const startedAt = new Date();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.SOFT_DELETE_GRACE_PERIOD);

    // Find organizations that would be cleaned up
    const expiredOrgs = await this.organizationRepository.find({
      where: {
        deletedAt: LessThan(cutoffDate),
      },
      withDeleted: true,
    });

    // Get object counts for each
    let totalObjects = 0;
    for (const org of expiredOrgs) {
      const counts = await this.s3CleanupService.getOrganizationObjectCount(
        org.id,
      );
      totalObjects += counts.total;

      this.logger.log(
        `[Report] Org ${org.id} (${org.name}): ${counts.total} objects would be deleted`,
      );
    }

    return {
      runId,
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      results: {
        softDeletedOrgsProcessed: expiredOrgs.length,
        softDeletedOrgsCleanedUp: 0, // None actually cleaned up (dry run)
        bronzeObjectsDeleted: totalObjects,
        orphanedObjectsDeleted: 0,
        errors: [],
      },
    };
  }

  private createEmptyResult(): RetentionJobResult {
    const now = new Date();
    return {
      runId: "disabled",
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      results: {
        softDeletedOrgsProcessed: 0,
        softDeletedOrgsCleanedUp: 0,
        bronzeObjectsDeleted: 0,
        orphanedObjectsDeleted: 0,
        errors: [],
      },
    };
  }
}
