/**
 * Market Analysis GraphQL Resolver
 *
 * Provides industry benchmark data, organization comparison, and health monitoring features.
 */

import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  IndustryBenchmarkType,
  OrganizationBenchmarkComparisonType,
  BenchmarkComparisonType,
  BenchmarkRefreshStatusType,
  BenchmarkRefreshResultType,
  NAICSMappingType,
  BenchmarkStatus,
  QuartileDataType,
  ProfitabilityMetricsType,
  OperationsMetricsType,
  BalanceSheetMetricsType,
  GrowthMetricsType,
  BenchmarkHealthStatusType,
  BenchmarkValidationResultType,
} from "../types/market-analysis.types";
import { BenchmarkRefreshService } from "../../services/benchmark-refresh.service";
import { BenchmarkHealthService } from "../../services/benchmark-health.service";
import { IndustryBenchmarkEntity } from "../../persistence/postgres/entities/industry-benchmark.entity";
import {
  NAICS_MAPPINGS,
  getNAICSMapping,
} from "@domain/market-analysis/naics-mapping";
import {
  determineRevenueRange,
  calculatePercentileRank,
  determineBenchmarkStatus,
  RevenueRange,
} from "@domain/market-analysis/benchmark.types";

// Industry name lookup
const INDUSTRY_NAMES: Record<string, { en: string; fr: string }> = {
  real_estate: { en: "Real Estate", fr: "Immobilier" },
  construction: { en: "Construction", fr: "Construction" },
  hospitality: { en: "Hospitality", fr: "Hôtellerie" },
  restaurant: { en: "Restaurant", fr: "Restauration" },
  retail: { en: "Retail", fr: "Commerce de détail" },
  professional_services: {
    en: "Professional Services",
    fr: "Services professionnels",
  },
  manufacturing: { en: "Manufacturing", fr: "Manufacturier" },
  agriculture: { en: "Agriculture", fr: "Agroalimentaire" },
  transport: { en: "Transport & Logistics", fr: "Transport et logistique" },
  healthcare: { en: "Healthcare", fr: "Santé" },
  education: { en: "Education", fr: "Éducation" },
  wholesale: { en: "Wholesale & Distribution", fr: "Commerce de gros" },
  automotive: { en: "Automotive", fr: "Automobile" },
  beauty_wellness: { en: "Beauty & Wellness", fr: "Beauté et bien-être" },
  technology: { en: "Technology", fr: "Technologie" },
};

@Resolver()
export class MarketAnalysisResolver {
  constructor(
    private readonly benchmarkService: BenchmarkRefreshService,
    private readonly healthService: BenchmarkHealthService,
  ) {}

  /**
   * Get industry benchmark data
   */
  @Query(() => IndustryBenchmarkType, {
    nullable: true,
    description: "Get benchmark data for a specific industry",
  })
  @UseGuards(GqlAuthGuard)
  async industryBenchmark(
    @Args("industryId") industryId: string,
    @Args("revenueRange", { nullable: true }) revenueRange?: string,
  ): Promise<IndustryBenchmarkType | null> {
    const benchmarks = await this.benchmarkService.getBenchmarksForIndustry(
      industryId,
      revenueRange as RevenueRange | undefined,
    );

    if (benchmarks.length === 0) {
      return null;
    }

    // Return the most recent benchmark
    const benchmark = benchmarks[0];
    return this.entityToGraphQL(benchmark);
  }

  /**
   * Get all industry benchmarks
   */
  @Query(() => [IndustryBenchmarkType], {
    description: "Get benchmark data for all industries",
  })
  @UseGuards(GqlAuthGuard)
  async allIndustryBenchmarks(
    @Args("revenueRange", { nullable: true }) revenueRange?: string,
  ): Promise<IndustryBenchmarkType[]> {
    const allBenchmarks = await this.benchmarkService.getAllBenchmarks();

    // Filter by revenue range if specified
    const filtered = revenueRange
      ? allBenchmarks.filter((b) => b.revenueRange === revenueRange)
      : allBenchmarks;

    // Group by industry and return most recent for each
    const byIndustry = new Map<string, IndustryBenchmarkEntity>();
    for (const benchmark of filtered) {
      const existing = byIndustry.get(benchmark.industryId);
      if (
        !existing ||
        (benchmark.referenceYear || 0) > (existing.referenceYear || 0)
      ) {
        byIndustry.set(benchmark.industryId, benchmark);
      }
    }

    return Array.from(byIndustry.values()).map((b) => this.entityToGraphQL(b));
  }

  /**
   * Compare organization to industry benchmarks
   */
  @Query(() => OrganizationBenchmarkComparisonType, {
    nullable: true,
    description: "Compare organization metrics to industry benchmarks",
  })
  @UseGuards(GqlAuthGuard)
  async organizationBenchmarkComparison(
    @Args("organizationId") organizationId: string,
    @Args("industryId") industryId: string,
    @Args("annualRevenue") annualRevenue: number,
    @Args("grossMargin") grossMargin: number,
    @Args("netMargin") netMargin: number,
    @Args("currentRatio") currentRatio: number,
    @Args("debtToEquity") debtToEquity: number,
    @Args("operatingExpenseRatio", { nullable: true })
    operatingExpenseRatio?: number,
  ): Promise<OrganizationBenchmarkComparisonType | null> {
    const revenueRange = determineRevenueRange(annualRevenue);

    const benchmarks = await this.benchmarkService.getBenchmarksForIndustry(
      industryId,
      revenueRange,
    );

    if (benchmarks.length === 0) {
      return null;
    }

    const benchmark = benchmarks[0];
    const comparisons: BenchmarkComparisonType[] = [];

    // Gross Margin comparison
    if (benchmark.grossMarginMedian !== null) {
      const grossMarginQuartile = {
        q1: benchmark.grossMarginQ1 || benchmark.grossMarginMedian * 0.75,
        median: benchmark.grossMarginMedian,
        q3: benchmark.grossMarginQ3 || benchmark.grossMarginMedian * 1.25,
      };
      const percentile = calculatePercentileRank(
        grossMargin,
        grossMarginQuartile,
        true,
      );
      comparisons.push({
        metricId: "gross_margin",
        metricName: "Gross Margin",
        userValue: grossMargin,
        industryMedian: grossMarginQuartile.median,
        industryQ1: grossMarginQuartile.q1,
        industryQ3: grossMarginQuartile.q3,
        percentileRank: percentile,
        status: this.toGraphQLStatus(
          determineBenchmarkStatus(percentile, true),
        ),
        higherIsBetter: true,
      });
    }

    // Net Margin comparison
    if (benchmark.netMarginMedian !== null) {
      const netMarginQuartile = {
        q1: benchmark.netMarginQ1 || benchmark.netMarginMedian * 0.75,
        median: benchmark.netMarginMedian,
        q3: benchmark.netMarginQ3 || benchmark.netMarginMedian * 1.25,
      };
      const percentile = calculatePercentileRank(
        netMargin,
        netMarginQuartile,
        true,
      );
      comparisons.push({
        metricId: "net_margin",
        metricName: "Net Margin",
        userValue: netMargin,
        industryMedian: netMarginQuartile.median,
        industryQ1: netMarginQuartile.q1,
        industryQ3: netMarginQuartile.q3,
        percentileRank: percentile,
        status: this.toGraphQLStatus(
          determineBenchmarkStatus(percentile, true),
        ),
        higherIsBetter: true,
      });
    }

    // Current Ratio comparison
    if (benchmark.currentRatioMedian !== null) {
      const currentRatioQuartile = {
        q1: benchmark.currentRatioMedian * 0.7,
        median: benchmark.currentRatioMedian,
        q3: benchmark.currentRatioMedian * 1.4,
      };
      const percentile = calculatePercentileRank(
        currentRatio,
        currentRatioQuartile,
        true,
      );
      comparisons.push({
        metricId: "current_ratio",
        metricName: "Current Ratio",
        userValue: currentRatio,
        industryMedian: currentRatioQuartile.median,
        industryQ1: currentRatioQuartile.q1,
        industryQ3: currentRatioQuartile.q3,
        percentileRank: percentile,
        status: this.toGraphQLStatus(
          determineBenchmarkStatus(percentile, true),
        ),
        higherIsBetter: true,
      });
    }

    // Debt-to-Equity comparison (lower is better)
    if (benchmark.debtToEquityMedian !== null) {
      const deQuartile = {
        q1: benchmark.debtToEquityMedian * 0.6,
        median: benchmark.debtToEquityMedian,
        q3: benchmark.debtToEquityMedian * 1.5,
      };
      const percentile = calculatePercentileRank(
        debtToEquity,
        deQuartile,
        false,
      );
      comparisons.push({
        metricId: "debt_to_equity",
        metricName: "Debt-to-Equity",
        userValue: debtToEquity,
        industryMedian: deQuartile.median,
        industryQ1: deQuartile.q1,
        industryQ3: deQuartile.q3,
        percentileRank: percentile,
        status: this.toGraphQLStatus(
          determineBenchmarkStatus(percentile, false),
        ),
        higherIsBetter: false,
      });
    }

    // Operating Expense Ratio comparison (lower is better)
    if (
      operatingExpenseRatio !== undefined &&
      benchmark.operatingExpenseRatio !== null
    ) {
      const opexQuartile = {
        q1: benchmark.operatingExpenseRatio * 0.8,
        median: benchmark.operatingExpenseRatio,
        q3: benchmark.operatingExpenseRatio * 1.2,
      };
      const percentile = calculatePercentileRank(
        operatingExpenseRatio,
        opexQuartile,
        false,
      );
      comparisons.push({
        metricId: "operating_expense_ratio",
        metricName: "Operating Expense Ratio",
        userValue: operatingExpenseRatio,
        industryMedian: opexQuartile.median,
        industryQ1: opexQuartile.q1,
        industryQ3: opexQuartile.q3,
        percentileRank: percentile,
        status: this.toGraphQLStatus(
          determineBenchmarkStatus(percentile, false),
        ),
        higherIsBetter: false,
      });
    }

    // Calculate overall score (weighted average of percentiles)
    const overallScore = Math.round(
      comparisons.reduce((sum, c) => sum + c.percentileRank, 0) /
        comparisons.length,
    );

    return {
      organizationId,
      industryId,
      industryName: INDUSTRY_NAMES[industryId]?.en || industryId,
      annualRevenue,
      revenueRange,
      comparisons,
      overallScore,
      benchmarkDataDate: benchmark.referenceYear
        ? `${benchmark.referenceYear}`
        : benchmark.referenceQuarter || "Unknown",
      generatedAt: new Date(),
    };
  }

  /**
   * Get benchmark refresh status
   */
  @Query(() => BenchmarkRefreshStatusType, {
    description: "Get benchmark data refresh status",
  })
  @UseGuards(GqlAuthGuard)
  async benchmarkRefreshStatus(): Promise<BenchmarkRefreshStatusType> {
    const status = await this.benchmarkService.getRefreshStatus();

    return {
      isRefreshing: status.isRefreshing,
      lastRefreshDate: status.lastRefresh?.completedAt || undefined,
      lastRefreshStatus: status.lastRefresh?.status,
      lastRefreshRecordCount: status.lastRefresh
        ? (status.lastRefresh.recordsCreated || 0) +
          (status.lastRefresh.recordsUpdated || 0)
        : undefined,
    };
  }

  /**
   * Get NAICS mappings for all industries
   */
  @Query(() => [NAICSMappingType], {
    description: "Get NAICS code mappings for all industries",
  })
  @UseGuards(GqlAuthGuard)
  naicsMappings(): NAICSMappingType[] {
    return NAICS_MAPPINGS.map((m) => ({
      industryId: m.industryId,
      naicsCode: m.naicsCode,
      naicsDescription: m.naicsDescription,
      alternativeNaicsCodes: m.alternativeNaicsCodes,
    }));
  }

  /**
   * Trigger benchmark data refresh (admin only)
   */
  @Mutation(() => BenchmarkRefreshResultType, {
    description: "Trigger benchmark data refresh",
  })
  @UseGuards(GqlAuthGuard)
  async refreshBenchmarks(): Promise<BenchmarkRefreshResultType> {
    const result = await this.benchmarkService.refreshAllBenchmarks();

    return {
      success: result.success,
      message: result.message,
      recordsCreated: result.stats.created,
      recordsUpdated: result.stats.updated,
    };
  }

  /**
   * Get benchmark data health status
   */
  @Query(() => BenchmarkHealthStatusType, {
    description: "Get health status of benchmark data sources and freshness",
  })
  @UseGuards(GqlAuthGuard)
  async benchmarkHealthStatus(
    @Args("forceRefresh", { nullable: true, defaultValue: false })
    forceRefresh: boolean,
  ): Promise<BenchmarkHealthStatusType> {
    const health = await this.healthService.getHealthStatus(forceRefresh);

    return {
      overallHealth: health.overallHealth,
      lastChecked: health.lastChecked,
      isedStatus: {
        isAvailable: health.isedHealth.isAvailable,
        latestDataYear: health.isedHealth.latestDataYear,
        lastModified: health.isedHealth.lastModified || null,
        isStale: health.isedHealth.isStale,
        daysUntilExpectedUpdate: health.isedHealth.daysUntilExpectedUpdate,
        errorMessage: health.isedHealth.errorMessage || null,
      },
      statsCanStatus: {
        isHealthy: health.statsCanHealth.isHealthy,
        responseTimeMs: health.statsCanHealth.responseTimeMs,
        tableAvailable: health.statsCanHealth.tableAvailable,
        errorMessage: health.statsCanHealth.errorMessage || null,
      },
      dataFreshness: {
        lastISEDRefresh: health.dataFreshness.lastISEDRefresh,
        lastStatsCanRefresh: health.dataFreshness.lastStatsCanRefresh,
        oldestBenchmarkAgeDays: health.dataFreshness.oldestBenchmarkAge,
        averageBenchmarkAgeDays: health.dataFreshness.averageBenchmarkAge,
        needsRefresh: health.dataFreshness.needsRefresh,
      },
      coverage: {
        totalIndustries: health.coverage.totalIndustries,
        industriesWithData: health.coverage.industriesWithData,
        industriesWithISEDData: health.coverage.industriesWithISEDData,
        industriesWithGrowthData: health.coverage.industriesWithGrowthData,
        coveragePercentage: health.coverage.coveragePercentage,
        missingIndustries: health.coverage.missingIndustries,
      },
      recommendations: health.recommendations,
    };
  }

  /**
   * Validate benchmark data quality
   */
  @Query(() => BenchmarkValidationResultType, {
    description: "Validate benchmark data quality and completeness",
  })
  @UseGuards(GqlAuthGuard)
  async validateBenchmarkData(): Promise<BenchmarkValidationResultType> {
    const result = await this.healthService.validateData();

    return {
      isValid: result.isValid,
      checkedAt: result.checkedAt,
      issueCount: result.issues.length,
      errorCount: result.issues.filter((i) => i.severity === "error").length,
      warningCount: result.issues.filter((i) => i.severity === "warning")
        .length,
      issues: result.issues.map((i) => ({
        severity: i.severity,
        category: i.category,
        message: i.message,
        industryId: i.industryId || null,
      })),
    };
  }

  /**
   * Convert entity to GraphQL type
   */
  private entityToGraphQL(
    entity: IndustryBenchmarkEntity,
  ): IndustryBenchmarkType {
    const profitability: ProfitabilityMetricsType = {
      grossMargin: {
        q1: entity.grossMarginQ1 || 0,
        median: entity.grossMarginMedian || 0,
        q3: entity.grossMarginQ3 || 0,
      },
      netMargin: {
        q1: entity.netMarginQ1 || 0,
        median: entity.netMarginMedian || 0,
        q3: entity.netMarginQ3 || 0,
      },
    };

    const operations: OperationsMetricsType = {
      operatingExpenseRatio: entity.operatingExpenseRatio || 0,
      wagesToRevenueRatio: entity.wagesToRevenueRatio || 0,
      rentToRevenueRatio: entity.rentToRevenueRatio || 0,
    };

    // Construct quartile data from median values
    // For balance sheet metrics, we estimate Q1/Q3 from median using industry-standard distributions
    const currentRatioMedian = entity.currentRatioMedian || 0;
    const debtToEquityMedian = entity.debtToEquityMedian || 0;
    
    const balanceSheet: BalanceSheetMetricsType = {
      currentRatio: {
        q1: currentRatioMedian * 0.7,  // Lower quartile typically ~70% of median
        median: currentRatioMedian,
        q3: currentRatioMedian * 1.4,   // Upper quartile typically ~140% of median
      },
      debtToEquity: {
        q1: debtToEquityMedian * 0.6,   // Lower quartile typically ~60% of median (less debt is better)
        median: debtToEquityMedian,
        q3: debtToEquityMedian * 1.5,   // Upper quartile typically ~150% of median
      },
    };

    const growth: GrowthMetricsType | undefined =
      entity.revenueYoyGrowth !== null || entity.revenueQoqGrowth !== null
        ? {
            revenueYoY: entity.revenueYoyGrowth || 0,
            revenueQoQ: entity.revenueQoqGrowth || 0,
          }
        : undefined;

    return {
      id: entity.id,
      industryId: entity.industryId,
      industryName: INDUSTRY_NAMES[entity.industryId]?.en || entity.industryId,
      naicsCode: entity.naicsCode,
      dataSource: entity.dataSource,
      referenceYear: entity.referenceYear || undefined,
      referenceQuarter: entity.referenceQuarter || undefined,
      revenueRange: entity.revenueRange || "all",
      profitability,
      operations,
      balanceSheet,
      growth,
      sampleSize: entity.sampleSize || 0,
      lastUpdated: entity.updatedAt,
    };
  }

  /**
   * Convert domain status to GraphQL enum
   */
  private toGraphQLStatus(
    status: "above_average" | "average" | "below_average",
  ): BenchmarkStatus {
    switch (status) {
      case "above_average":
        return BenchmarkStatus.ABOVE_AVERAGE;
      case "average":
        return BenchmarkStatus.AVERAGE;
      case "below_average":
        return BenchmarkStatus.BELOW_AVERAGE;
    }
  }
}
