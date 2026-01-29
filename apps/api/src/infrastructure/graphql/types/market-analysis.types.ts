/**
 * Market Analysis GraphQL Types
 *
 * Types for industry benchmarks and market comparison features.
 */

import {
  ObjectType,
  Field,
  Float,
  Int,
  registerEnumType,
} from "@nestjs/graphql";

/**
 * Benchmark status enum
 */
export enum BenchmarkStatus {
  ABOVE_AVERAGE = "ABOVE_AVERAGE",
  AVERAGE = "AVERAGE",
  BELOW_AVERAGE = "BELOW_AVERAGE",
}

registerEnumType(BenchmarkStatus, {
  name: "BenchmarkStatus",
  description: "Performance status relative to industry benchmark",
});

/**
 * Revenue range enum
 */
export enum RevenueRangeEnum {
  SMALL = "30k-5m",
  MEDIUM = "5m-20m",
  ALL = "all",
}

registerEnumType(RevenueRangeEnum, {
  name: "RevenueRange",
  description: "Business revenue range category",
});

/**
 * Quartile data for benchmark metrics
 */
@ObjectType({ description: "Quartile distribution for a metric" })
export class QuartileDataType {
  @Field(() => Float, { description: "25th percentile (bottom quartile)" })
  q1: number;

  @Field(() => Float, { description: "50th percentile (median)" })
  median: number;

  @Field(() => Float, { description: "75th percentile (top quartile)" })
  q3: number;
}

/**
 * Profitability metrics
 */
@ObjectType({ description: "Profitability benchmark metrics" })
export class ProfitabilityMetricsType {
  @Field(() => QuartileDataType, { description: "Gross margin benchmarks" })
  grossMargin: QuartileDataType;

  @Field(() => QuartileDataType, { description: "Net margin benchmarks" })
  netMargin: QuartileDataType;
}

/**
 * Operating efficiency metrics
 */
@ObjectType({ description: "Operating efficiency benchmark metrics" })
export class OperationsMetricsType {
  @Field(() => Float, { description: "Operating expenses as % of revenue" })
  operatingExpenseRatio: number;

  @Field(() => Float, { description: "Wages and benefits as % of revenue" })
  wagesToRevenueRatio: number;

  @Field(() => Float, { description: "Rent and occupancy as % of revenue" })
  rentToRevenueRatio: number;
}

/**
 * Balance sheet metrics
 */
@ObjectType({ description: "Balance sheet benchmark metrics" })
export class BalanceSheetMetricsType {
  @Field(() => Float, { description: "Current ratio (liquidity)" })
  currentRatio: number;

  @Field(() => Float, { description: "Debt-to-equity ratio" })
  debtToEquity: number;
}

/**
 * Growth trend metrics
 */
@ObjectType({ description: "Growth trend metrics" })
export class GrowthMetricsType {
  @Field(() => Float, { description: "Year-over-year revenue growth %" })
  revenueYoY: number;

  @Field(() => Float, { description: "Quarter-over-quarter revenue growth %" })
  revenueQoQ: number;
}

/**
 * Complete industry benchmark
 */
@ObjectType({ description: "Industry benchmark data" })
export class IndustryBenchmarkType {
  @Field({ description: "Unique identifier" })
  id: string;

  @Field({ description: "PlainLedger industry ID" })
  industryId: string;

  @Field({ description: "Industry display name" })
  industryName: string;

  @Field({ description: "NAICS code" })
  naicsCode: string;

  @Field({ description: "Data source (ised or statscan)" })
  dataSource: string;

  @Field(() => Int, {
    nullable: true,
    description: "Reference year for annual data",
  })
  referenceYear?: number;

  @Field(() => String, {
    nullable: true,
    description: "Reference quarter for quarterly data",
  })
  referenceQuarter?: string;

  @Field({ description: "Revenue range category" })
  revenueRange: string;

  @Field(() => ProfitabilityMetricsType, {
    description: "Profitability benchmarks",
  })
  profitability: ProfitabilityMetricsType;

  @Field(() => OperationsMetricsType, {
    description: "Operating efficiency benchmarks",
  })
  operations: OperationsMetricsType;

  @Field(() => BalanceSheetMetricsType, {
    description: "Balance sheet benchmarks",
  })
  balanceSheet: BalanceSheetMetricsType;

  @Field(() => GrowthMetricsType, {
    nullable: true,
    description: "Growth trends",
  })
  growth?: GrowthMetricsType;

  @Field(() => Int, { description: "Number of businesses in sample" })
  sampleSize: number;

  @Field({ description: "Last update timestamp" })
  lastUpdated: Date;
}

/**
 * Single metric comparison result
 */
@ObjectType({ description: "Comparison of user metric to industry benchmark" })
export class BenchmarkComparisonType {
  @Field({ description: "Metric identifier" })
  metricId: string;

  @Field({ description: "Metric display name" })
  metricName: string;

  @Field(() => Float, { description: "User's value for this metric" })
  userValue: number;

  @Field(() => Float, { description: "Industry median value" })
  industryMedian: number;

  @Field(() => Float, { description: "Industry 25th percentile" })
  industryQ1: number;

  @Field(() => Float, { description: "Industry 75th percentile" })
  industryQ3: number;

  @Field(() => Int, { description: "User's percentile rank (0-100)" })
  percentileRank: number;

  @Field(() => BenchmarkStatus, { description: "Status relative to industry" })
  status: BenchmarkStatus;

  @Field({ description: "Whether higher is better for this metric" })
  higherIsBetter: boolean;
}

/**
 * Complete organization benchmark comparison
 */
@ObjectType({ description: "Organization's comparison to industry benchmarks" })
export class OrganizationBenchmarkComparisonType {
  @Field({ description: "Organization ID" })
  organizationId: string;

  @Field({ description: "Organization's industry" })
  industryId: string;

  @Field({ description: "Industry display name" })
  industryName: string;

  @Field(() => Float, { description: "Organization's annual revenue" })
  annualRevenue: number;

  @Field({ description: "Revenue range used for comparison" })
  revenueRange: string;

  @Field(() => [BenchmarkComparisonType], {
    description: "Individual metric comparisons",
  })
  comparisons: BenchmarkComparisonType[];

  @Field(() => Int, { description: "Overall health score (0-100)" })
  overallScore: number;

  @Field({ description: "Benchmark data date" })
  benchmarkDataDate: string;

  @Field({ description: "When comparison was generated" })
  generatedAt: Date;
}

/**
 * Benchmark refresh status
 */
@ObjectType({ description: "Benchmark data refresh status" })
export class BenchmarkRefreshStatusType {
  @Field({ description: "Whether a refresh is currently in progress" })
  isRefreshing: boolean;

  @Field(() => Date, { nullable: true, description: "Last refresh date" })
  lastRefreshDate?: Date;

  @Field(() => String, { nullable: true, description: "Last refresh status" })
  lastRefreshStatus?: string;

  @Field(() => Int, { nullable: true, description: "Records in last refresh" })
  lastRefreshRecordCount?: number;
}

/**
 * Benchmark refresh result
 */
@ObjectType({ description: "Result of benchmark refresh operation" })
export class BenchmarkRefreshResultType {
  @Field({ description: "Whether refresh was successful" })
  success: boolean;

  @Field({ description: "Status message" })
  message: string;

  @Field(() => Int, { description: "Records created" })
  recordsCreated: number;

  @Field(() => Int, { description: "Records updated" })
  recordsUpdated: number;
}

/**
 * NAICS mapping info
 */
@ObjectType({ description: "NAICS code mapping for an industry" })
export class NAICSMappingType {
  @Field({ description: "PlainLedger industry ID" })
  industryId: string;

  @Field({ description: "Primary NAICS code" })
  naicsCode: string;

  @Field({ description: "NAICS description" })
  naicsDescription: string;

  @Field(() => [String], { description: "Alternative NAICS codes" })
  alternativeNaicsCodes: string[];
}

// ============================================================================
// Health Monitoring Types
// ============================================================================

/**
 * Health status enum
 */
export enum HealthStatus {
  HEALTHY = "healthy",
  WARNING = "warning",
  CRITICAL = "critical",
}

registerEnumType(HealthStatus, {
  name: "HealthStatus",
  description: "Overall health status of benchmark data",
});

/**
 * ISED data source status
 */
@ObjectType({ description: "ISED data source health status" })
export class ISEDStatusType {
  @Field({ description: "Whether ISED data is available" })
  isAvailable: boolean;

  @Field(() => Int, { description: "Latest available data year" })
  latestDataYear: number;

  @Field(() => String, {
    nullable: true,
    description: "Last modified date of ISED dataset",
  })
  lastModified: string | null;

  @Field({ description: "Whether data is considered stale" })
  isStale: boolean;

  @Field(() => Int, { description: "Days until expected data update" })
  daysUntilExpectedUpdate: number;

  @Field(() => String, {
    nullable: true,
    description: "Error message if unavailable",
  })
  errorMessage: string | null;
}

/**
 * Statistics Canada API status
 */
@ObjectType({ description: "Statistics Canada API health status" })
export class StatsCanStatusType {
  @Field({ description: "Whether Statistics Canada API is healthy" })
  isHealthy: boolean;

  @Field(() => Int, { description: "API response time in milliseconds" })
  responseTimeMs: number;

  @Field({ description: "Whether the financial table is available" })
  tableAvailable: boolean;

  @Field(() => String, {
    nullable: true,
    description: "Error message if unhealthy",
  })
  errorMessage: string | null;
}

/**
 * Data freshness status
 */
@ObjectType({ description: "Benchmark data freshness status" })
export class DataFreshnessType {
  @Field(() => Date, {
    nullable: true,
    description: "Last ISED data refresh date",
  })
  lastISEDRefresh: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: "Last Statistics Canada refresh date",
  })
  lastStatsCanRefresh: Date | null;

  @Field(() => Int, { description: "Age of oldest benchmark in days" })
  oldestBenchmarkAgeDays: number;

  @Field(() => Int, { description: "Average benchmark age in days" })
  averageBenchmarkAgeDays: number;

  @Field({ description: "Whether data needs refresh" })
  needsRefresh: boolean;
}

/**
 * Data coverage status
 */
@ObjectType({ description: "Benchmark data coverage status" })
export class DataCoverageType {
  @Field(() => Int, { description: "Total number of industries" })
  totalIndustries: number;

  @Field(() => Int, { description: "Industries with any benchmark data" })
  industriesWithData: number;

  @Field(() => Int, { description: "Industries with ISED data" })
  industriesWithISEDData: number;

  @Field(() => Int, { description: "Industries with growth data" })
  industriesWithGrowthData: number;

  @Field(() => Int, { description: "Coverage percentage" })
  coveragePercentage: number;

  @Field(() => [String], { description: "Industries missing data" })
  missingIndustries: string[];
}

/**
 * Complete benchmark health status
 */
@ObjectType({ description: "Complete benchmark data health status" })
export class BenchmarkHealthStatusType {
  @Field({ description: "Overall health status" })
  overallHealth: string;

  @Field({ description: "When health was last checked" })
  lastChecked: Date;

  @Field(() => ISEDStatusType, { description: "ISED data source status" })
  isedStatus: ISEDStatusType;

  @Field(() => StatsCanStatusType, {
    description: "Statistics Canada API status",
  })
  statsCanStatus: StatsCanStatusType;

  @Field(() => DataFreshnessType, { description: "Data freshness status" })
  dataFreshness: DataFreshnessType;

  @Field(() => DataCoverageType, { description: "Data coverage status" })
  coverage: DataCoverageType;

  @Field(() => [String], { description: "Recommended actions" })
  recommendations: string[];
}

/**
 * Validation issue
 */
@ObjectType({ description: "Data validation issue" })
export class ValidationIssueType {
  @Field({ description: "Issue severity (error, warning, info)" })
  severity: string;

  @Field({ description: "Issue category" })
  category: string;

  @Field({ description: "Issue description" })
  message: string;

  @Field(() => String, { nullable: true, description: "Affected industry ID" })
  industryId: string | null;
}

/**
 * Validation result
 */
@ObjectType({ description: "Benchmark data validation result" })
export class BenchmarkValidationResultType {
  @Field({ description: "Whether data passes validation" })
  isValid: boolean;

  @Field({ description: "When validation was performed" })
  checkedAt: Date;

  @Field(() => Int, { description: "Total number of issues" })
  issueCount: number;

  @Field(() => Int, { description: "Number of error-level issues" })
  errorCount: number;

  @Field(() => Int, { description: "Number of warning-level issues" })
  warningCount: number;

  @Field(() => [ValidationIssueType], {
    description: "List of validation issues",
  })
  issues: ValidationIssueType[];
}
