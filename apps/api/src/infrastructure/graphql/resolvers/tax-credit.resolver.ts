/**
 * Tax Credit Resolver
 *
 * GraphQL resolver for tax credit eligibility queries and partner referrals.
 * Uses database-driven tax credit definitions synced from government sources.
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable } from "@nestjs/common";
import { Unprotected } from "nest-keycloak-connect";
import { Pool } from "pg";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  TaxCredit,
  TaxCreditEligibility,
  TaxCreditEligibilitySummary,
  ContactInfoInput,
} from "../types";
import {
  TaxCreditSyncService,
  TaxCreditDefinition,
  TaxCreditCriterion,
} from "@application/services/tax-credit-sync.service";

interface GoldMetrics {
  total_revenue: number;
  total_expenses: number;
  gross_profit: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  yoy_revenue_change_pct: number;
  industry_metrics: Record<string, number>;
}

interface EligibilityResult {
  creditId: string;
  credit: TaxCreditDefinition;
  eligibilityStatus: "likely" | "possible" | "unlikely" | "needs_review";
  eligibilityScore: number;
  criteriaMet: string[];
  criteriaNotMet: string[];
  estimatedBenefitMin: number;
  estimatedBenefitMax: number;
}

/**
 * SECURITY NOTE: @Unprotected() bypasses the global Keycloak guard to allow
 * the custom GqlAuthGuard to handle authentication.
 */
@Resolver()
@Unprotected()
@UseGuards(GqlAuthGuard)
@Injectable()
export class TaxCreditResolver {
  private readonly logger = new Logger(TaxCreditResolver.name);
  private syncService: TaxCreditSyncService;
  private dbPool: Pool | null = null;

  constructor() {
    this.syncService = new TaxCreditSyncService();
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbUrl =
        process.env.DATABASE_URL ||
        "postgresql://plainledger:plainledger@localhost:5432/plainledger";
      this.dbPool = new Pool({ connectionString: dbUrl });
      await this.syncService.initialize(dbUrl);
      this.logger.log("Tax Credit Resolver database initialized");
    } catch (error) {
      this.logger.error(`Failed to initialize database: ${error}`);
    }
  }

  /**
   * Get all available tax credits from database, filtered by industry and province
   */
  @Query(() => [TaxCredit], {
    description:
      "Get available tax credits, optionally filtered by industry and province",
  })
  async availableTaxCredits(
    @Args("industryId", { nullable: true }) industryId?: string,
    @Args("province", { nullable: true }) province?: string,
    @Args("language", { nullable: true }) language?: string,
  ): Promise<TaxCredit[]> {
    const isEn = language !== "fr";

    try {
      const credits = await this.syncService.getTaxCreditDefinitions(
        industryId,
        province,
      );

      return credits.map((credit) => ({
        id: credit.id,
        name: isEn ? credit.nameEn : credit.nameFr,
        shortName: isEn ? credit.shortNameEn : credit.shortNameFr,
        jurisdiction: credit.jurisdiction,
        province: credit.province,
        creditType: credit.creditType,
        applicableIndustries: credit.applicableIndustries,
        maxBenefitDescription: (isEn
          ? credit.maxBenefitDescriptionEn
          : credit.maxBenefitDescriptionFr) || "",
        documentationUrl: credit.sourceUrl,
        partnerReferralEnabled: credit.partnerReferralEnabled,
        lastUpdated: credit.sourceLastUpdated?.toISOString() || new Date().toISOString(),
        description: (isEn ? credit.descriptionEn : credit.descriptionFr) || "",
      }));
    } catch (error) {
      this.logger.error(`Error fetching tax credits: ${error}`);
      return [];
    }
  }

  /**
   * Get tax credit eligibility for an organization based on their gold metrics
   */
  @Query(() => [TaxCreditEligibility], {
    description:
      "Get tax credit eligibility for the authenticated organization",
  })
  async organizationTaxCreditEligibility(
    @Context() context: any,
    @Args("fiscalYear", { nullable: true }) fiscalYear?: number,
    @Args("language", { nullable: true }) language?: string,
  ): Promise<TaxCreditEligibility[]> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    const isEn = language !== "fr";
    const year = fiscalYear || new Date().getFullYear();

    try {
      // 1. Get organization's industry and province
      const orgInfo = await this.getOrganizationInfo(organizationId);
      if (!orgInfo) {
        this.logger.warn(`Organization ${organizationId} not found`);
        return [];
      }

      // 2. Get gold metrics for the organization
      const metrics = await this.getGoldMetrics(organizationId, year);

      // 3. Get relevant tax credits
      const credits = await this.syncService.getTaxCreditDefinitions(
        orgInfo.industry,
        orgInfo.province,
      );

      // 4. Calculate eligibility for each credit
      const eligibilityResults: EligibilityResult[] = [];

      for (const credit of credits) {
        const criteria = await this.syncService.getTaxCreditCriteria(credit.id);
        const result = this.calculateEligibility(credit, criteria, metrics);
        eligibilityResults.push(result);
      }

      // 5. Save eligibility results to database for caching
      await this.saveEligibilityResults(organizationId, year, eligibilityResults);

      // 6. Return formatted results
      return eligibilityResults.map((result) => ({
        taxCredit: {
          id: result.credit.id,
          name: isEn ? result.credit.nameEn : result.credit.nameFr,
          shortName: isEn ? result.credit.shortNameEn : result.credit.shortNameFr,
          jurisdiction: result.credit.jurisdiction,
          province: result.credit.province,
          creditType: result.credit.creditType,
          applicableIndustries: result.credit.applicableIndustries,
          maxBenefitDescription: (isEn
            ? result.credit.maxBenefitDescriptionEn
            : result.credit.maxBenefitDescriptionFr) || "",
          documentationUrl: result.credit.sourceUrl,
          partnerReferralEnabled: result.credit.partnerReferralEnabled,
          lastUpdated: result.credit.sourceLastUpdated?.toISOString() || new Date().toISOString(),
          description: (isEn ? result.credit.descriptionEn : result.credit.descriptionFr) || "",
        },
        eligibilityStatus: result.eligibilityStatus,
        eligibilityScore: result.eligibilityScore,
        criteriaMet: result.criteriaMet,
        criteriaNotMet: result.criteriaNotMet,
        criteriaResults: result.criteriaMet.map((key) => ({
          criterionId: key,
          met: true,
          actualValue: undefined,
          expectedValueDescription: "",
          description: key,
          weight: 50,
        })).concat(result.criteriaNotMet.map((key) => ({
          criterionId: key,
          met: false,
          actualValue: undefined,
          expectedValueDescription: "",
          description: key,
          weight: 50,
        }))),
        estimatedBenefitMin: result.estimatedBenefitMin,
        estimatedBenefitMax: result.estimatedBenefitMax,
        calculationTimestamp: new Date(),
      }));
    } catch (error) {
      this.logger.error(
        `Error calculating eligibility for ${organizationId}: ${error}`,
      );
      return [];
    }
  }

  /**
   * Request consultation with a tax credit specialist partner
   */
  @Mutation(() => Boolean, {
    description: "Request consultation with a tax credit specialist partner",
  })
  async requestTaxCreditConsultation(
    @Context() context: any,
    @Args("taxCreditId") taxCreditId: string,
    @Args("contactInfo") contactInfo: ContactInfoInput,
  ): Promise<boolean> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    if (!this.dbPool) {
      throw new Error("Database not initialized");
    }

    // Check credit exists and has partner referral enabled
    const creditResult = await this.dbPool.query(
      `SELECT partner_referral_enabled FROM reporting.tax_credit_definitions WHERE id = $1`,
      [taxCreditId],
    );

    if (creditResult.rows.length === 0) {
      throw new Error(`Tax credit ${taxCreditId} not found`);
    }

    if (!creditResult.rows[0].partner_referral_enabled) {
      throw new Error(`Partner referral not enabled for ${taxCreditId}`);
    }

    // Create lead in database
    await this.dbPool.query(
      `INSERT INTO reporting.tax_credit_leads
       (organization_id, tax_credit_id, contact_email, contact_phone, contact_name, lead_status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [
        organizationId,
        taxCreditId,
        contactInfo.email,
        contactInfo.phone,
        contactInfo.name,
      ],
    );

    this.logger.log(
      `Tax credit consultation requested: org=${organizationId}, credit=${taxCreditId}, contact=${contactInfo.email}`,
    );

    // TODO: Send notification to partner via email/webhook

    return true;
  }

  /**
   * Get tax credit eligibility summary for an organization
   */
  @Query(() => TaxCreditEligibilitySummary, {
    description: "Get summary of tax credit eligibility",
  })
  async taxCreditEligibilitySummary(
    @Context() context: any,
    @Args("fiscalYear", { nullable: true }) fiscalYear?: number,
  ): Promise<TaxCreditEligibilitySummary> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    const year = fiscalYear || new Date().getFullYear();

    // Try to get cached results first
    if (this.dbPool) {
      const cachedResult = await this.dbPool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE eligibility_status = 'likely') as likely_count,
           COUNT(*) FILTER (WHERE eligibility_status = 'possible') as possible_count,
           COUNT(*) FILTER (WHERE eligibility_status = 'needs_review') as review_count,
           COALESCE(SUM(estimated_benefit_min), 0) as total_min,
           COALESCE(SUM(estimated_benefit_max), 0) as total_max
         FROM reporting.tax_credit_eligibility
         WHERE organization_id = $1 AND fiscal_year = $2`,
        [organizationId, year],
      );

      if (cachedResult.rows[0]) {
        const row = cachedResult.rows[0];
        return {
          likelyEligibleCount: parseInt(row.likely_count) || 0,
          possiblyEligibleCount: parseInt(row.possible_count) || 0,
          needsReviewCount: parseInt(row.review_count) || 0,
          totalEstimatedBenefitMin: parseFloat(row.total_min) || 0,
          totalEstimatedBenefitMax: parseFloat(row.total_max) || 0,
          credits: [],
        };
      }
    }

    // Calculate fresh if no cache
    const eligibility = await this.organizationTaxCreditEligibility(
      context,
      fiscalYear,
    );

    return {
      likelyEligibleCount: eligibility.filter(
        (e) => e.eligibilityStatus === "likely",
      ).length,
      possiblyEligibleCount: eligibility.filter(
        (e) => e.eligibilityStatus === "possible",
      ).length,
      needsReviewCount: eligibility.filter(
        (e) => e.eligibilityStatus === "needs_review",
      ).length,
      totalEstimatedBenefitMin: eligibility.reduce(
        (sum, e) => sum + e.estimatedBenefitMin,
        0,
      ),
      totalEstimatedBenefitMax: eligibility.reduce(
        (sum, e) => sum + e.estimatedBenefitMax,
        0,
      ),
      credits: eligibility,
    };
  }

  /**
   * Get organization info (industry, province)
   */
  private async getOrganizationInfo(
    organizationId: string,
  ): Promise<{ industry: string; province: string } | null> {
    if (!this.dbPool) return null;

    const result = await this.dbPool.query(
      `SELECT 
         o.industry,
         COALESCE(u.province, 'ON') as province
       FROM accounting.organizations o
       LEFT JOIN accounting.user_profiles u ON u.organization_id = o.id
       WHERE o.id = $1
       LIMIT 1`,
      [organizationId],
    );

    return result.rows[0] || null;
  }

  /**
   * Get gold metrics for an organization
   */
  private async getGoldMetrics(
    organizationId: string,
    fiscalYear: number,
  ): Promise<GoldMetrics> {
    if (!this.dbPool) {
      return this.getDefaultMetrics();
    }

    // Try to get from gold layer (datalake)
    const result = await this.dbPool.query(
      `SELECT 
         SUM(CASE WHEN a.account_type = 'REVENUE' THEN ab.closing_balance ELSE 0 END) as total_revenue,
         SUM(CASE WHEN a.account_type = 'EXPENSE' THEN ab.closing_balance ELSE 0 END) as total_expenses,
         SUM(CASE WHEN a.account_type = 'ASSET' THEN ab.closing_balance ELSE 0 END) as total_assets,
         SUM(CASE WHEN a.account_type = 'LIABILITY' THEN ab.closing_balance ELSE 0 END) as total_liabilities
       FROM accounting.account_balances ab
       JOIN accounting.accounts a ON ab.account_id = a.id
       WHERE ab.organization_id = $1 AND ab.fiscal_year = $2`,
      [organizationId, fiscalYear],
    );

    if (result.rows[0] && result.rows[0].total_revenue) {
      const row = result.rows[0];
      const revenue = parseFloat(row.total_revenue) || 0;
      const expenses = parseFloat(row.total_expenses) || 0;
      
      return {
        total_revenue: Math.abs(revenue), // Revenue is usually credit (negative in some systems)
        total_expenses: Math.abs(expenses),
        gross_profit: Math.abs(revenue) - Math.abs(expenses) * 0.6, // Estimate
        net_income: Math.abs(revenue) - Math.abs(expenses),
        total_assets: parseFloat(row.total_assets) || 0,
        total_liabilities: Math.abs(parseFloat(row.total_liabilities)) || 0,
        yoy_revenue_change_pct: 0, // Would need prior year data
        industry_metrics: {},
      };
    }

    return this.getDefaultMetrics();
  }

  /**
   * Default metrics for organizations without data
   */
  private getDefaultMetrics(): GoldMetrics {
    return {
      total_revenue: 0,
      total_expenses: 0,
      gross_profit: 0,
      net_income: 0,
      total_assets: 0,
      total_liabilities: 0,
      yoy_revenue_change_pct: 0,
      industry_metrics: {},
    };
  }

  /**
   * Calculate eligibility for a tax credit based on criteria and metrics
   */
  private calculateEligibility(
    credit: TaxCreditDefinition,
    criteria: TaxCreditCriterion[],
    metrics: GoldMetrics,
  ): EligibilityResult {
    const criteriaMet: string[] = [];
    const criteriaNotMet: string[] = [];
    let totalWeight = 0;
    let metWeight = 0;
    let hasRequiredFailure = false;

    for (const criterion of criteria) {
      const metricValue = this.getMetricValue(metrics, criterion.metricKey);
      const isMet = this.evaluateCriterion(criterion, metricValue);

      if (isMet) {
        criteriaMet.push(criterion.criterionKey);
        metWeight += criterion.weight;
      } else {
        criteriaNotMet.push(criterion.criterionKey);
        if (criterion.isRequired) {
          hasRequiredFailure = true;
        }
      }
      totalWeight += criterion.weight;
    }

    // Calculate score
    const eligibilityScore =
      totalWeight > 0 ? Math.round((metWeight / totalWeight) * 100) : 0;

    // Determine status
    let eligibilityStatus: "likely" | "possible" | "unlikely" | "needs_review";
    if (hasRequiredFailure) {
      eligibilityStatus = "unlikely";
    } else if (eligibilityScore >= 70) {
      eligibilityStatus = "likely";
    } else if (eligibilityScore >= 40) {
      eligibilityStatus = "possible";
    } else if (eligibilityScore >= 20) {
      eligibilityStatus = "needs_review";
    } else {
      eligibilityStatus = "unlikely";
    }

    // Estimate benefit
    const { min, max } = this.estimateBenefit(credit, metrics, eligibilityScore);

    return {
      creditId: credit.id,
      credit,
      eligibilityStatus,
      eligibilityScore,
      criteriaMet,
      criteriaNotMet,
      estimatedBenefitMin: min,
      estimatedBenefitMax: max,
    };
  }

  /**
   * Get metric value from gold metrics
   */
  private getMetricValue(
    metrics: GoldMetrics,
    metricKey: string,
  ): number | boolean | null {
    // Check industry-specific metrics first
    if (metrics.industry_metrics && metricKey in metrics.industry_metrics) {
      return metrics.industry_metrics[metricKey];
    }

    // Check standard metrics
    const standardMetrics: Record<string, number | boolean> = {
      total_revenue: metrics.total_revenue,
      total_expenses: metrics.total_expenses,
      gross_profit: metrics.gross_profit,
      net_income: metrics.net_income,
      total_assets: metrics.total_assets,
      total_liabilities: metrics.total_liabilities,
      yoy_revenue_change_pct: metrics.yoy_revenue_change_pct,
      // Boolean flags for province operations
      quebec_operations: false,
      ontario_operations: false,
      bc_operations: false,
      alberta_operations: false,
    };

    return standardMetrics[metricKey] ?? null;
  }

  /**
   * Evaluate a single criterion
   */
  private evaluateCriterion(
    criterion: TaxCreditCriterion,
    value: number | boolean | null,
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    switch (criterion.operator) {
      case "gt":
        return (
          typeof value === "number" &&
          criterion.thresholdValue !== undefined &&
          value > criterion.thresholdValue
        );
      case "gte":
        return (
          typeof value === "number" &&
          criterion.thresholdValue !== undefined &&
          value >= criterion.thresholdValue
        );
      case "lt":
        return (
          typeof value === "number" &&
          criterion.thresholdValue !== undefined &&
          value < criterion.thresholdValue
        );
      case "lte":
        return (
          typeof value === "number" &&
          criterion.thresholdValue !== undefined &&
          value <= criterion.thresholdValue
        );
      case "eq":
        return value === criterion.thresholdValue || value === true;
      case "between":
        return (
          typeof value === "number" &&
          criterion.thresholdMin !== undefined &&
          criterion.thresholdMax !== undefined &&
          value >= criterion.thresholdMin &&
          value <= criterion.thresholdMax
        );
      case "exists":
        return value !== null && value !== undefined && value !== false && value !== 0;
      default:
        return false;
    }
  }

  /**
   * Estimate benefit range for a tax credit
   */
  private estimateBenefit(
    credit: TaxCreditDefinition,
    metrics: GoldMetrics,
    eligibilityScore: number,
  ): { min: number; max: number } {
    if (credit.maxBenefitType === "fixed" && credit.maxBenefitValue) {
      return { min: credit.maxBenefitValue, max: credit.maxBenefitValue };
    }

    if (credit.maxBenefitType === "percentage" && credit.maxBenefitValue) {
      const percentage = credit.maxBenefitValue;
      let baseAmount = 0;

      // Estimate base amount based on credit type
      if (credit.id.includes("sred") || credit.id === "cric") {
        // R&D credits: estimate 10-20% of expenses as eligible
        baseAmount = metrics.total_expenses * 0.15;
      } else if (credit.id === "clean_tech") {
        // Clean tech: estimate capital investments
        baseAmount = metrics.total_assets * 0.1;
      } else if (credit.id === "training_credit") {
        // Training: estimate 1% of expenses
        baseAmount = metrics.total_expenses * 0.01;
      } else {
        // Default: use revenue as base
        baseAmount = metrics.total_revenue * 0.1;
      }

      const maxBenefit = (baseAmount * percentage) / 100;
      const minBenefit = maxBenefit * (eligibilityScore / 100) * 0.5;

      // Apply cap if exists
      const cap = credit.maxBenefitCap || Infinity;

      return {
        min: Math.min(Math.max(0, minBenefit), cap),
        max: Math.min(Math.max(0, maxBenefit), cap),
      };
    }

    return { min: 0, max: 0 };
  }

  /**
   * Save eligibility results to database for caching
   */
  private async saveEligibilityResults(
    organizationId: string,
    fiscalYear: number,
    results: EligibilityResult[],
  ): Promise<void> {
    if (!this.dbPool) return;

    for (const result of results) {
      await this.dbPool.query(
        `INSERT INTO reporting.tax_credit_eligibility
         (organization_id, tax_credit_id, fiscal_year, eligibility_status, eligibility_score,
          criteria_evaluation, estimated_benefit_min, estimated_benefit_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (organization_id, tax_credit_id, fiscal_year)
         DO UPDATE SET
           eligibility_status = EXCLUDED.eligibility_status,
           eligibility_score = EXCLUDED.eligibility_score,
           criteria_evaluation = EXCLUDED.criteria_evaluation,
           estimated_benefit_min = EXCLUDED.estimated_benefit_min,
           estimated_benefit_max = EXCLUDED.estimated_benefit_max,
           updated_at = NOW()`,
        [
          organizationId,
          result.creditId,
          fiscalYear,
          result.eligibilityStatus,
          result.eligibilityScore,
          JSON.stringify({
            criteriaMet: result.criteriaMet,
            criteriaNotMet: result.criteriaNotMet,
          }),
          result.estimatedBenefitMin,
          result.estimatedBenefitMax,
        ],
      );
    }
  }
}
