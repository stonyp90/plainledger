/**
 * Tax Credit Sync Service
 *
 * Dynamically syncs tax credit information from government sources.
 * Supports CRA, Revenu Quebec, Ontario Creates, and other provincial agencies.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";

export interface GovernmentSource {
  id: string;
  agencyName: string;
  jurisdiction: "federal" | "provincial";
  province?: string;
  baseUrl: string;
  apiEndpoint?: string;
  checkFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  lastChecked?: Date;
  lastUpdated?: Date;
}

export interface TaxCreditDefinition {
  id: string;
  nameEn: string;
  nameFr: string;
  shortNameEn: string;
  shortNameFr: string;
  descriptionEn?: string;
  descriptionFr?: string;
  jurisdiction: "federal" | "provincial";
  province?: string;
  creditType: "refundable" | "non-refundable" | "both";
  maxBenefitType: "percentage" | "fixed" | "formula";
  maxBenefitValue?: number;
  maxBenefitCap?: number;
  maxBenefitDescriptionEn?: string;
  maxBenefitDescriptionFr?: string;
  sourceUrl: string;
  sourceAgency: string;
  sourceLastChecked?: Date;
  sourceLastUpdated?: Date;
  partnerReferralEnabled: boolean;
  isActive: boolean;
  applicableIndustries: string[];
}

export interface TaxCreditCriterion {
  id: string;
  taxCreditId: string;
  criterionKey: string;
  metricKey: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between" | "exists";
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  weight: number;
  isRequired: boolean;
  descriptionEn: string;
  descriptionFr: string;
}

export interface SyncResult {
  creditId: string;
  status: "updated" | "no_changes" | "error";
  changesDetected: boolean;
  changesSummary?: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class TaxCreditSyncService {
  private readonly logger = new Logger(TaxCreditSyncService.name);
  private dbPool: Pool | null = null;

  /**
   * Initialize database connection
   */
  async initialize(connectionString?: string): Promise<void> {
    const dbUrl =
      connectionString ||
      process.env.DATABASE_URL ||
      "postgresql://plainledger:plainledger@localhost:5432/plainledger";

    this.dbPool = new Pool({ connectionString: dbUrl });
    this.logger.log("Tax Credit Sync Service initialized");
  }

  /**
   * Get all government sources
   */
  async getGovernmentSources(): Promise<GovernmentSource[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(`
      SELECT id, agency_name, jurisdiction, province, base_url, api_endpoint,
             check_frequency, last_checked, last_updated
      FROM reporting.government_sources
      WHERE is_active = true
      ORDER BY jurisdiction, agency_name
    `);

    return result.rows.map((row) => ({
      id: row.id,
      agencyName: row.agency_name,
      jurisdiction: row.jurisdiction,
      province: row.province,
      baseUrl: row.base_url,
      apiEndpoint: row.api_endpoint,
      checkFrequency: row.check_frequency,
      lastChecked: row.last_checked,
      lastUpdated: row.last_updated,
    }));
  }

  /**
   * Get all active tax credit definitions
   */
  async getTaxCreditDefinitions(
    industryId?: string,
    province?: string,
  ): Promise<TaxCreditDefinition[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    let query = `
      SELECT DISTINCT
        d.id, d.name_en, d.name_fr, d.short_name_en, d.short_name_fr,
        d.description_en, d.description_fr, d.jurisdiction, d.province,
        d.credit_type, d.max_benefit_type, d.max_benefit_value, d.max_benefit_cap,
        d.max_benefit_description_en, d.max_benefit_description_fr,
        d.source_url, d.source_agency, d.source_last_checked, d.source_last_updated,
        d.partner_referral_enabled, d.is_active
      FROM reporting.tax_credit_definitions d
    `;

    const params: (string | undefined)[] = [];
    const conditions: string[] = ["d.is_active = true"];

    if (industryId) {
      query += `
        JOIN reporting.tax_credit_industries i ON d.id = i.tax_credit_id
      `;
      conditions.push(`i.industry_id = $${params.length + 1}`);
      params.push(industryId);
    }

    if (province) {
      conditions.push(
        `(d.jurisdiction = 'federal' OR d.province = $${params.length + 1})`,
      );
      params.push(province);
    }

    query += ` WHERE ${conditions.join(" AND ")}`;
    query += ` ORDER BY d.jurisdiction, d.id`;

    const result = await this.dbPool.query(query, params);

    // Get industries for each credit
    const credits: TaxCreditDefinition[] = [];
    for (const row of result.rows) {
      const industriesResult = await this.dbPool.query(
        `SELECT industry_id FROM reporting.tax_credit_industries WHERE tax_credit_id = $1`,
        [row.id],
      );

      credits.push({
        id: row.id,
        nameEn: row.name_en,
        nameFr: row.name_fr,
        shortNameEn: row.short_name_en,
        shortNameFr: row.short_name_fr,
        descriptionEn: row.description_en,
        descriptionFr: row.description_fr,
        jurisdiction: row.jurisdiction,
        province: row.province,
        creditType: row.credit_type,
        maxBenefitType: row.max_benefit_type,
        maxBenefitValue: row.max_benefit_value,
        maxBenefitCap: row.max_benefit_cap,
        maxBenefitDescriptionEn: row.max_benefit_description_en,
        maxBenefitDescriptionFr: row.max_benefit_description_fr,
        sourceUrl: row.source_url,
        sourceAgency: row.source_agency,
        sourceLastChecked: row.source_last_checked,
        sourceLastUpdated: row.source_last_updated,
        partnerReferralEnabled: row.partner_referral_enabled,
        isActive: row.is_active,
        applicableIndustries: industriesResult.rows.map((r) => r.industry_id),
      });
    }

    return credits;
  }

  /**
   * Get eligibility criteria for a tax credit
   */
  async getTaxCreditCriteria(taxCreditId: string): Promise<TaxCreditCriterion[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const result = await this.dbPool.query(
      `
      SELECT id, tax_credit_id, criterion_key, metric_key, operator,
             threshold_value, threshold_min, threshold_max, weight, is_required,
             description_en, description_fr
      FROM reporting.tax_credit_criteria
      WHERE tax_credit_id = $1
      ORDER BY weight DESC
    `,
      [taxCreditId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      taxCreditId: row.tax_credit_id,
      criterionKey: row.criterion_key,
      metricKey: row.metric_key,
      operator: row.operator,
      thresholdValue: row.threshold_value,
      thresholdMin: row.threshold_min,
      thresholdMax: row.threshold_max,
      weight: row.weight,
      isRequired: row.is_required,
      descriptionEn: row.description_en,
      descriptionFr: row.description_fr,
    }));
  }

  /**
   * Check government source for updates
   * This method fetches the page and checks for changes
   */
  async checkSourceForUpdates(sourceId: string): Promise<SyncResult> {
    if (!this.dbPool) throw new Error("Database not initialized");

    // Get source info
    const sourceResult = await this.dbPool.query(
      `SELECT * FROM reporting.government_sources WHERE id = $1`,
      [sourceId],
    );

    if (sourceResult.rows.length === 0) {
      return {
        creditId: sourceId,
        status: "error",
        changesDetected: false,
        error: "Source not found",
      };
    }

    const source = sourceResult.rows[0];
    const url = source.api_endpoint || source.base_url;

    this.logger.log(`Checking source ${sourceId}: ${url}`);

    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "PlainLedger Tax Credit Sync Bot/1.0 (compliance@plainledger.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract last modified date if available
      const lastModified = response.headers.get("last-modified");

      // Check for changes by comparing content hash
      const contentHash = this.hashContent(html);
      const previousHash = source.content_hash;

      const changesDetected = previousHash && previousHash !== contentHash;

      // Update source record
      await this.dbPool.query(
        `UPDATE reporting.government_sources
         SET last_checked = NOW(),
             last_updated = CASE WHEN $1 THEN NOW() ELSE last_updated END,
             updated_at = NOW()
         WHERE id = $2`,
        [changesDetected, sourceId],
      );

      // Log the sync
      await this.dbPool.query(
        `INSERT INTO reporting.tax_credit_sync_log
         (tax_credit_id, sync_type, source_url, status, changes_detected, changes_summary)
         VALUES ($1, 'incremental', $2, $3, $4, $5)`,
        [
          null, // Will link to specific credit if changes detected
          url,
          changesDetected ? "completed" : "no_changes",
          changesDetected,
          changesDetected
            ? JSON.stringify({
                previousHash,
                newHash: contentHash,
                lastModified,
              })
            : null,
        ],
      );

      if (changesDetected) {
        this.logger.warn(
          `Changes detected in ${source.agency_name}! Manual review required.`,
        );
        // In a real implementation, we'd parse the HTML and extract updated values
        // For now, we flag for manual review
      }

      return {
        creditId: sourceId,
        status: changesDetected ? "updated" : "no_changes",
        changesDetected,
        changesSummary: changesDetected
          ? { lastModified, contentChanged: true }
          : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error(`Error checking source ${sourceId}: ${errorMessage}`);

      // Log the error
      await this.dbPool.query(
        `INSERT INTO reporting.tax_credit_sync_log
         (tax_credit_id, sync_type, source_url, status, error_message)
         VALUES ($1, 'incremental', $2, 'failed', $3)`,
        [null, url, errorMessage],
      );

      return {
        creditId: sourceId,
        status: "error",
        changesDetected: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync all government sources that are due for checking
   */
  async syncAllSources(): Promise<SyncResult[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const results: SyncResult[] = [];

    // Get sources due for checking
    const sourcesResult = await this.dbPool.query(`
      SELECT id FROM reporting.government_sources
      WHERE is_active = true
      AND (
        last_checked IS NULL
        OR (check_frequency = 'daily' AND last_checked < NOW() - INTERVAL '1 day')
        OR (check_frequency = 'weekly' AND last_checked < NOW() - INTERVAL '7 days')
        OR (check_frequency = 'monthly' AND last_checked < NOW() - INTERVAL '30 days')
        OR (check_frequency = 'quarterly' AND last_checked < NOW() - INTERVAL '90 days')
      )
    `);

    this.logger.log(
      `Found ${sourcesResult.rows.length} sources due for sync check`,
    );

    for (const row of sourcesResult.rows) {
      const result = await this.checkSourceForUpdates(row.id);
      results.push(result);

      // Add a small delay between requests to be respectful to government servers
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }

  /**
   * Update a tax credit definition manually (admin function)
   */
  async updateTaxCreditDefinition(
    creditId: string,
    updates: Partial<TaxCreditDefinition>,
  ): Promise<void> {
    if (!this.dbPool) throw new Error("Database not initialized");

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.nameEn !== undefined) {
      setClauses.push(`name_en = $${paramIndex++}`);
      values.push(updates.nameEn);
    }
    if (updates.nameFr !== undefined) {
      setClauses.push(`name_fr = $${paramIndex++}`);
      values.push(updates.nameFr);
    }
    if (updates.descriptionEn !== undefined) {
      setClauses.push(`description_en = $${paramIndex++}`);
      values.push(updates.descriptionEn);
    }
    if (updates.descriptionFr !== undefined) {
      setClauses.push(`description_fr = $${paramIndex++}`);
      values.push(updates.descriptionFr);
    }
    if (updates.maxBenefitValue !== undefined) {
      setClauses.push(`max_benefit_value = $${paramIndex++}`);
      values.push(updates.maxBenefitValue);
    }
    if (updates.maxBenefitCap !== undefined) {
      setClauses.push(`max_benefit_cap = $${paramIndex++}`);
      values.push(updates.maxBenefitCap);
    }
    if (updates.sourceUrl !== undefined) {
      setClauses.push(`source_url = $${paramIndex++}`);
      values.push(updates.sourceUrl);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) return;

    setClauses.push(`updated_at = NOW()`);
    values.push(creditId);

    await this.dbPool.query(
      `UPDATE reporting.tax_credit_definitions
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}`,
      values,
    );

    this.logger.log(`Updated tax credit definition: ${creditId}`);
  }

  /**
   * Get tax credits relevant to an organization
   */
  async getRelevantCreditsForOrganization(
    organizationId: string,
  ): Promise<TaxCreditDefinition[]> {
    if (!this.dbPool) throw new Error("Database not initialized");

    // Get organization's industry and province
    const orgResult = await this.dbPool.query(
      `SELECT industry, 
              COALESCE(
                (SELECT province FROM accounting.user_profiles WHERE organization_id = o.id LIMIT 1),
                'ON'
              ) as province
       FROM accounting.organizations o
       WHERE id = $1`,
      [organizationId],
    );

    if (orgResult.rows.length === 0) {
      return [];
    }

    const { industry, province } = orgResult.rows[0];
    return this.getTaxCreditDefinitions(industry, province);
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    // Simple hash function for change detection
    let hash = 0;
    const cleanContent = content.replace(/\s+/g, " ").trim();
    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.dbPool) {
      await this.dbPool.end();
      this.dbPool = null;
    }
  }
}

/**
 * Standalone function to run the sync job
 * Can be called from a cron job or scheduled task
 */
export async function runTaxCreditSync(): Promise<void> {
  const logger = new Logger("TaxCreditSyncJob");
  const syncService = new TaxCreditSyncService();

  try {
    logger.log("Starting tax credit sync job...");
    await syncService.initialize();

    const results = await syncService.syncAllSources();

    const updated = results.filter((r) => r.changesDetected).length;
    const errors = results.filter((r) => r.status === "error").length;

    logger.log(`Sync complete: ${updated} sources updated, ${errors} errors`);

    if (updated > 0) {
      logger.warn(
        "Changes detected in government sources! Review required for: " +
          results
            .filter((r) => r.changesDetected)
            .map((r) => r.creditId)
            .join(", "),
      );
    }
  } catch (error) {
    logger.error(`Tax credit sync failed: ${error}`);
    throw error;
  } finally {
    await syncService.close();
  }
}
