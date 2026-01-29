/**
 * Tax Credit Eligibility Service
 *
 * Calculates tax credit eligibility based on company financial metrics
 * and industry-specific criteria.
 */

import {
  TaxCredit,
  TaxCreditId,
  EligibilityStatus,
  EligibilityCriterion,
  CanadianProvince,
  getTaxCreditsByIndustryAndProvince,
} from "@domain/datalake/tax-credits";
import {
  IndustryId,
  getRelevantTaxCreditIds,
} from "@domain/datalake/industry-account-mapping";
import { FactMonthlyMetrics } from "@domain/datalake/gold-metrics";

export interface EligibilityCriterionResult {
  criterionId: string;
  met: boolean;
  actualValue?: number | boolean;
  expectedValue: number | [number, number] | boolean;
  description: { en: string; fr: string };
  weight: number;
}

export interface TaxCreditEligibilityResult {
  creditId: TaxCreditId;
  taxCredit: TaxCredit;
  eligibilityStatus: EligibilityStatus;
  eligibilityScore: number; // 0-100
  criteriaMet: string[];
  criteriaNotMet: string[];
  criteriaResults: EligibilityCriterionResult[];
  estimatedBenefitMin: number;
  estimatedBenefitMax: number;
  calculationTimestamp: Date;
}

export class TaxCreditEligibilityService {
  /**
   * Calculate eligibility for all relevant tax credits
   */
  calculateTaxCreditEligibility(
    goldMetrics: FactMonthlyMetrics,
    industryId: IndustryId,
    province?: CanadianProvince,
  ): TaxCreditEligibilityResult[] {
    // Get relevant credits for industry + jurisdiction
    const relevantCreditIds = getRelevantTaxCreditIds(industryId);
    const allCredits = getTaxCreditsByIndustryAndProvince(industryId, province);

    // Filter to only relevant credits
    const creditsToEvaluate = allCredits.filter(
      (credit) =>
        relevantCreditIds.includes(credit.id) || credit.industries === "all",
    );

    return creditsToEvaluate.map((credit) =>
      this.evaluateTaxCreditEligibility(credit, goldMetrics, industryId),
    );
  }

  /**
   * Evaluate eligibility for a single tax credit
   */
  evaluateTaxCreditEligibility(
    taxCredit: TaxCredit,
    goldMetrics: FactMonthlyMetrics,
    _industryId: IndustryId,
  ): TaxCreditEligibilityResult {
    const criteriaResults: EligibilityCriterionResult[] = [];
    let totalWeight = 0;
    let metWeight = 0;
    const criteriaMet: string[] = [];
    const criteriaNotMet: string[] = [];
    let hasRequiredFailure = false;

    // Evaluate each criterion
    for (const criterion of taxCredit.eligibilityCriteria) {
      const result = this.evaluateCriterion(criterion, goldMetrics);
      criteriaResults.push(result);
      totalWeight += criterion.weight;

      if (result.met) {
        criteriaMet.push(criterion.id);
        metWeight += criterion.weight;
      } else {
        criteriaNotMet.push(criterion.id);
        if (criterion.isRequired) {
          hasRequiredFailure = true;
        }
      }
    }

    // Calculate eligibility score
    const eligibilityScore =
      totalWeight > 0 ? Math.round((metWeight / totalWeight) * 100) : 0;

    // Determine status
    let eligibilityStatus: EligibilityStatus;
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

    // Estimate benefit range
    const { min, max } = this.estimateBenefitRange(
      taxCredit,
      goldMetrics,
      criteriaMet,
      criteriaResults,
    );

    return {
      creditId: taxCredit.id,
      taxCredit,
      eligibilityStatus,
      eligibilityScore,
      criteriaMet,
      criteriaNotMet,
      criteriaResults,
      estimatedBenefitMin: min,
      estimatedBenefitMax: max,
      calculationTimestamp: new Date(),
    };
  }

  /**
   * Evaluate a single eligibility criterion
   */
  private evaluateCriterion(
    criterion: EligibilityCriterion,
    metrics: FactMonthlyMetrics,
  ): EligibilityCriterionResult {
    const metricValue = this.getMetricValue(metrics, criterion.metricKey);
    const met = this.checkCriterion(criterion, metricValue);

    return {
      criterionId: criterion.id,
      met,
      actualValue: metricValue ?? undefined,
      expectedValue: criterion.value,
      description: criterion.description,
      weight: criterion.weight,
    };
  }

  /**
   * Get metric value from gold metrics
   */
  private getMetricValue(
    metrics: FactMonthlyMetrics,
    metricKey: string,
  ): number | boolean | null {
    // Check industry metrics first
    if (metrics.industry_metrics && metricKey in metrics.industry_metrics) {
      return metrics.industry_metrics[metricKey];
    }

    // Check standard metrics
    const metricMap: Record<string, number | boolean> = {
      total_revenue: metrics.total_revenue,
      total_expenses: metrics.total_expenses,
      gross_profit: metrics.gross_profit,
      net_income: metrics.net_income,
      total_assets: metrics.total_assets,
      total_liabilities: metrics.total_liabilities,
      total_equity: metrics.total_equity,
      cash_on_hand: metrics.cash_on_hand,
      accounts_receivable: metrics.accounts_receivable,
      accounts_payable: metrics.accounts_payable,
      gross_margin_pct: metrics.gross_margin_pct,
      net_margin_pct: metrics.net_margin_pct,
      mom_revenue_change_pct: metrics.mom_revenue_change_pct,
      yoy_revenue_change_pct: metrics.yoy_revenue_change_pct,
    };

    if (metricKey in metricMap) {
      return metricMap[metricKey];
    }

    // Check for derived metrics
    // These would need to be calculated from account categories
    // For now, return null if not found
    return null;
  }

  /**
   * Check if criterion is met
   */
  private checkCriterion(
    criterion: EligibilityCriterion,
    value: number | boolean | null,
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    switch (criterion.operator) {
      case "gt":
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value > criterion.value
        );
      case "gte":
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value >= criterion.value
        );
      case "lt":
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value < criterion.value
        );
      case "lte":
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value <= criterion.value
        );
      case "eq":
        return value === criterion.value;
      case "between":
        if (typeof value === "number" && Array.isArray(criterion.value)) {
          const [min, max] = criterion.value;
          return value >= min && value <= max;
        }
        return false;
      case "exists":
        return value !== null && value !== undefined && value !== false;
      default:
        return false;
    }
  }

  /**
   * Estimate benefit range for a tax credit
   */
  private estimateBenefitRange(
    taxCredit: TaxCredit,
    metrics: FactMonthlyMetrics,
    criteriaMet: string[],
    _criteriaResults: EligibilityCriterionResult[],
  ): { min: number; max: number } {
    if (taxCredit.maxBenefit.type === "fixed") {
      const fixedValue =
        typeof taxCredit.maxBenefit.value === "number"
          ? taxCredit.maxBenefit.value
          : 0;
      return { min: fixedValue, max: fixedValue };
    }

    if (taxCredit.maxBenefit.type === "percentage") {
      const percentage =
        typeof taxCredit.maxBenefit.value === "number"
          ? taxCredit.maxBenefit.value
          : 0;

      // Estimate base amount based on credit type
      let baseAmount = 0;

      if (taxCredit.id === "sred" || taxCredit.id === "cric") {
        // R&D credits: use development costs or a percentage of revenue
        baseAmount =
          metrics.industry_metrics?.development_costs ||
          metrics.total_expenses * 0.1; // Estimate 10% of expenses
      } else if (taxCredit.id === "cdae" || taxCredit.id === "oidmtc") {
        // Digital media credits: use technology revenue or total revenue
        baseAmount =
          metrics.industry_metrics?.technology_revenue ||
          metrics.industry_metrics?.digital_media_revenue ||
          metrics.total_revenue * 0.3; // Estimate 30% of revenue
      } else if (taxCredit.id === "ommitc") {
        // Manufacturing credit: use capital expenditures
        baseAmount = metrics.industry_metrics?.capital_expenditures || 0;
      } else if (taxCredit.id === "apprenticeship") {
        // Apprenticeship: fixed per apprentice
        const apprenticeCount = metrics.industry_metrics?.apprentice_count || 0;
        baseAmount = apprenticeCount * 2000;
      } else if (taxCredit.id === "training_credit") {
        // Training credit: use training expenses
        baseAmount = metrics.industry_metrics?.training_expenses || 0;
      } else {
        // Default: use total revenue as base
        baseAmount = metrics.total_revenue;
      }

      const benefit = (baseAmount * percentage) / 100;

      // Apply eligibility score as a multiplier for min estimate
      const eligibilityMultiplier =
        criteriaMet.length / taxCredit.eligibilityCriteria.length;
      const minBenefit = benefit * Math.max(0.3, eligibilityMultiplier);
      const maxBenefit = benefit;

      return { min: Math.max(0, minBenefit), max: Math.max(0, maxBenefit) };
    }

    // Formula type - would need more complex evaluation
    // For now, return conservative estimate
    return { min: 0, max: metrics.total_revenue * 0.1 };
  }
}
