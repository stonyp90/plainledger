/**
 * TaxCreditSyncJob - Scheduled job for syncing tax credit data from government sources
 *
 * Runs DAILY to:
 * 1. Check government websites for changes (CRA, Revenu Quebec, Ontario Creates, etc.)
 * 2. Flag credits that may have been updated
 * 3. Generate alerts when manual review is needed
 *
 * Data Sources:
 * - Federal: CRA (canada.ca), ISED, Agriculture Canada
 * - Quebec: Revenu Quebec, Investissement Quebec, SODEC
 * - Ontario: Ontario Creates, Ontario Ministry of Finance
 * - BC: Creative BC, BC Ministry of Finance
 * - Alberta: Alberta Jobs, Alberta Film Commission
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import {
  TaxCreditSyncService,
  SyncResult,
} from "@application/services/tax-credit-sync.service";
import { JobConfigurationService } from "@application/services/job-configuration.service";

export interface TaxCreditSyncJobResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  results: {
    sourcesChecked: number;
    changesDetected: number;
    errorsCount: number;
    sourcesWithChanges: string[];
    errors: string[];
  };
}

const JOB_ID = "tax_credit_sync";

@Injectable()
export class TaxCreditSyncJob implements OnModuleInit {
  private readonly logger = new Logger(TaxCreditSyncJob.name);
  private readonly syncService: TaxCreditSyncService;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobConfigService: JobConfigurationService,
  ) {
    this.syncService = new TaxCreditSyncService();
  }

  async onModuleInit(): Promise<void> {
    try {
      const dbUrl =
        this.configService.get<string>("DATABASE_URL") ||
        "postgresql://plainledger:plainledger@localhost:5432/plainledger";
      await this.syncService.initialize(dbUrl);
      this.logger.log("TaxCreditSyncJob initialized");
    } catch (error) {
      this.logger.error(`Failed to initialize sync service: ${error}`);
    }
  }

  /**
   * Run DAILY at 4:00 AM
   * Checks all government sources for updates
   */
  @Cron("0 4 * * *") // Daily at 4 AM
  async runDailySync(): Promise<TaxCreditSyncJobResult> {
    // Check if job is enabled via database config
    const isEnabled = await this.jobConfigService.isJobEnabled(JOB_ID);
    if (!isEnabled) {
      this.logger.debug("Tax credit sync job is disabled");
      return this.createEmptyResult();
    }

    return this.executeSync("scheduled");
  }

  /**
   * Execute the sync with full alerting support
   */
  private async executeSync(
    triggerType: "scheduled" | "manual",
    triggeredBy?: string,
  ): Promise<TaxCreditSyncJobResult> {
    const runId = `tax-credit-sync-${Date.now()}`;
    const startedAt = new Date();

    this.logger.log(`[${runId}] Starting tax credit sync (${triggerType})`);

    // Record job start
    let executionId: string | undefined;
    try {
      executionId = await this.jobConfigService.recordJobStart(
        JOB_ID,
        runId,
        triggerType,
        triggeredBy,
      );
    } catch (e) {
      this.logger.warn(`Could not record job start: ${e}`);
    }

    const result: TaxCreditSyncJobResult = {
      runId,
      startedAt,
      completedAt: new Date(),
      durationMs: 0,
      results: {
        sourcesChecked: 0,
        changesDetected: 0,
        errorsCount: 0,
        sourcesWithChanges: [],
        errors: [],
      },
    };

    try {
      const syncResults = await this.syncService.syncAllSources();

      result.results.sourcesChecked = syncResults.length;
      result.results.changesDetected = syncResults.filter(
        (r) => r.changesDetected,
      ).length;
      result.results.errorsCount = syncResults.filter(
        (r) => r.status === "error",
      ).length;
      result.results.sourcesWithChanges = syncResults
        .filter((r) => r.changesDetected)
        .map((r) => r.creditId);
      result.results.errors = syncResults
        .filter((r) => r.error)
        .map((r) => `${r.creditId}: ${r.error}`);

      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();

      // Record completion
      if (executionId) {
        await this.jobConfigService.recordJobCompletion(
          executionId,
          result.results.errorsCount > 0 ? "failed" : "completed",
          result.results,
          result.results.errors.join("; ") || undefined,
        );
      }

      // Send alerts if changes detected
      if (result.results.changesDetected > 0) {
        await this.sendChangesDetectedAlert(runId, result, syncResults);
      }

      // Send failure alert if there were errors
      if (result.results.errorsCount > 0) {
        await this.sendFailureAlert(runId, result);
      }
    } catch (error) {
      const errorMsg = `Tax credit sync job failed: ${error}`;
      this.logger.error(`[${runId}] ${errorMsg}`);
      result.results.errors.push(errorMsg);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();

      // Record failure
      if (executionId) {
        await this.jobConfigService.recordJobCompletion(
          executionId,
          "failed",
          result.results,
          errorMsg,
        );
      }

      // Send failure alert
      await this.sendFailureAlert(runId, result);
    }

    this.logger.log(
      `[${runId}] Tax credit sync completed in ${result.durationMs}ms: ` +
        `checked=${result.results.sourcesChecked}, ` +
        `changes=${result.results.changesDetected}, ` +
        `errors=${result.results.errorsCount}`,
    );

    return result;
  }

  /**
   * Send changes detected alert
   */
  private async sendChangesDetectedAlert(
    runId: string,
    result: TaxCreditSyncJobResult,
    syncResults: SyncResult[],
  ): Promise<void> {
    const changedSources = syncResults.filter((r) => r.changesDetected);

    this.logger.warn(
      `[${runId}] CHANGES DETECTED in ${changedSources.length} government sources!`,
    );

    try {
      await this.jobConfigService.sendJobAlert(JOB_ID, "changes_detected", runId, {
        changesCount: result.results.changesDetected,
        changesList: changedSources.map((s) => s.creditId),
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });
    } catch (e) {
      this.logger.error(`Failed to send changes alert: ${e}`);
    }
  }

  /**
   * Send failure alert
   */
  private async sendFailureAlert(
    runId: string,
    result: TaxCreditSyncJobResult,
  ): Promise<void> {
    try {
      await this.jobConfigService.sendJobAlert(JOB_ID, "failure", runId, {
        errorMessage: result.results.errors.join("; "),
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });
    } catch (e) {
      this.logger.error(`Failed to send failure alert: ${e}`);
    }
  }

  /**
   * Manual trigger for testing/admin
   */
  async runManually(
    sourceId?: string,
    triggeredBy?: string,
  ): Promise<TaxCreditSyncJobResult> {
    this.logger.log(
      `Manual tax credit sync triggered ${sourceId ? `for source: ${sourceId}` : "for all sources"}`,
    );

    if (sourceId) {
      const runId = `manual-${Date.now()}`;
      const startedAt = new Date();

      const result = await this.syncService.checkSourceForUpdates(sourceId);

      return {
        runId,
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        results: {
          sourcesChecked: 1,
          changesDetected: result.changesDetected ? 1 : 0,
          errorsCount: result.status === "error" ? 1 : 0,
          sourcesWithChanges: result.changesDetected ? [sourceId] : [],
          errors: result.error ? [result.error] : [],
        },
      };
    }

    return this.executeSync("manual", triggeredBy);
  }

  /**
   * Get list of government sources and their last check status
   */
  async getSourcesStatus(): Promise<
    Array<{
      id: string;
      agency: string;
      lastChecked?: Date;
      lastUpdated?: Date;
      checkFrequency: string;
    }>
  > {
    const sources = await this.syncService.getGovernmentSources();
    return sources.map((s) => ({
      id: s.id,
      agency: s.agencyName,
      lastChecked: s.lastChecked,
      lastUpdated: s.lastUpdated,
      checkFrequency: s.checkFrequency,
    }));
  }

  private createEmptyResult(): TaxCreditSyncJobResult {
    const now = new Date();
    return {
      runId: "disabled",
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      results: {
        sourcesChecked: 0,
        changesDetected: 0,
        errorsCount: 0,
        sourcesWithChanges: [],
        errors: [],
      },
    };
  }
}
