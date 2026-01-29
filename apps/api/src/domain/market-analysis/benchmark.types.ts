/**
 * Industry Benchmark Types
 *
 * TypeScript interfaces for industry benchmark data from ISED and Statistics Canada.
 */

/**
 * Data source identifiers
 */
export type BenchmarkDataSource = "ised" | "statscan";

/**
 * Revenue range categories used by ISED
 */
export type RevenueRange = "30k-5m" | "5m-20m" | "all";

/**
 * Quartile data for benchmark metrics
 */
export interface QuartileData {
  /** 25th percentile - bottom quartile threshold */
  q1: number;
  /** 50th percentile - median/industry average */
  median: number;
  /** 75th percentile - top quartile threshold */
  q3: number;
}

/**
 * Profitability metrics from benchmark data
 */
export interface ProfitabilityMetrics {
  /** Gross margin = (Revenue - COGS) / Revenue */
  grossMargin: QuartileData;
  /** Net margin = Net Income / Revenue */
  netMargin: QuartileData;
}

/**
 * Operating efficiency metrics
 */
export interface OperationsMetrics {
  /** Operating expenses as % of revenue */
  operatingExpenseRatio: number;
  /** Wages and benefits as % of revenue */
  wagesToRevenueRatio: number;
  /** Rent and occupancy as % of revenue */
  rentToRevenueRatio: number;
}

/**
 * Balance sheet health metrics
 */
export interface BalanceSheetMetrics {
  /** Current ratio = Current Assets / Current Liabilities */
  currentRatio: number;
  /** Debt-to-equity = Total Debt / Total Equity */
  debtToEquity: number;
}

/**
 * Growth trend metrics (from Statistics Canada quarterly data)
 */
export interface GrowthMetrics {
  /** Year-over-year revenue change % */
  revenueYoY: number;
  /** Quarter-over-quarter revenue change % */
  revenueQoQ: number;
}

/**
 * Complete industry benchmark record
 */
export interface IndustryBenchmark {
  /** Unique identifier */
  id: string;
  /** PlainLedger industry ID */
  industryId: string;
  /** NAICS code */
  naicsCode: string;
  /** Data source */
  dataSource: BenchmarkDataSource;
  /** Reference year (for ISED annual data) */
  referenceYear?: number;
  /** Reference quarter (for Stats Can quarterly data) */
  referenceQuarter?: string;
  /** Revenue range category */
  revenueRange: RevenueRange;

  /** Profitability metrics */
  profitability: ProfitabilityMetrics;
  /** Operating efficiency metrics */
  operations: OperationsMetrics;
  /** Balance sheet metrics */
  balanceSheet: BalanceSheetMetrics;
  /** Growth metrics (optional, from Stats Can) */
  growth?: GrowthMetrics;

  /** Number of businesses in the sample */
  sampleSize: number;
  /** When this record was created */
  createdAt: Date;
  /** When this record was last updated */
  updatedAt: Date;
}

/**
 * Benchmark comparison result for a single metric
 */
export type BenchmarkStatus = "above_average" | "average" | "below_average";

export interface BenchmarkComparison {
  /** Metric identifier */
  metricId: string;
  /** Metric display name */
  metricName: string;
  /** User's value for this metric */
  userValue: number;
  /** Industry median value */
  industryMedian: number;
  /** Industry Q1 (25th percentile) */
  industryQ1: number;
  /** Industry Q3 (75th percentile) */
  industryQ3: number;
  /** User's percentile rank within industry (0-100) */
  percentileRank: number;
  /** Status relative to industry average */
  status: BenchmarkStatus;
  /** Whether higher is better for this metric */
  higherIsBetter: boolean;
}

/**
 * Complete benchmark comparison for an organization
 */
export interface OrganizationBenchmarkComparison {
  /** Organization ID */
  organizationId: string;
  /** Organization's industry */
  industryId: string;
  /** Organization's annual revenue (for range matching) */
  annualRevenue: number;
  /** Revenue range used for comparison */
  revenueRange: RevenueRange;
  /** Individual metric comparisons */
  comparisons: BenchmarkComparison[];
  /** Overall health score (0-100) */
  overallScore: number;
  /** Benchmark data freshness */
  benchmarkDataDate: string;
  /** When comparison was generated */
  generatedAt: Date;
}

/**
 * ISED CSV row structure (after parsing)
 */
export interface ISEDRawRow {
  naicsCode: string;
  naicsDescription: string;
  revenueRange: string;
  profitMarginCategory: string;
  sampleSize: number;
  // Income statement items (as % of revenue)
  grossProfit: number;
  operatingExpenses: number;
  wagesAndBenefits: number;
  rentAndOccupancy: number;
  netIncome: number;
  // Balance sheet ratios
  currentRatio: number;
  debtToEquity: number;
}

/**
 * Statistics Canada API response structure
 */
export interface StatsCanDataPoint {
  refPer: string; // Reference period (e.g., "2025-09")
  value: number;
  status?: string;
}

export interface StatsCanSeriesInfo {
  productId: string;
  coordinate: string;
  vectorId: number;
  frequencyCode: number;
  seriesTitle: string;
}

/**
 * Determine revenue range from annual revenue amount
 */
export function determineRevenueRange(annualRevenue: number): RevenueRange {
  if (annualRevenue < 30000) return "30k-5m"; // Default to small
  if (annualRevenue <= 5000000) return "30k-5m";
  if (annualRevenue <= 20000000) return "5m-20m";
  return "5m-20m"; // Cap at largest available range
}

/**
 * Calculate percentile rank given a value and quartile data
 */
export function calculatePercentileRank(
  value: number,
  quartileData: QuartileData,
  higherIsBetter: boolean = true,
): number {
  const { q1, median, q3 } = quartileData;

  // Normalize value to 0-100 scale based on quartile positions
  let percentile: number;

  if (value <= q1) {
    // Below Q1: 0-25 percentile
    percentile = (value / q1) * 25;
  } else if (value <= median) {
    // Q1 to median: 25-50 percentile
    percentile = 25 + ((value - q1) / (median - q1)) * 25;
  } else if (value <= q3) {
    // Median to Q3: 50-75 percentile
    percentile = 50 + ((value - median) / (q3 - median)) * 25;
  } else {
    // Above Q3: 75-100 percentile
    // Use Q3 + (Q3 - median) as estimated max
    const estimatedMax = q3 + (q3 - median);
    percentile = 75 + Math.min(((value - q3) / (estimatedMax - q3)) * 25, 25);
  }

  // Clamp to 0-100
  percentile = Math.max(0, Math.min(100, percentile));

  // For metrics where lower is better, invert the percentile
  if (!higherIsBetter) {
    percentile = 100 - percentile;
  }

  return Math.round(percentile);
}

/**
 * Determine benchmark status from percentile rank
 */
export function determineBenchmarkStatus(
  percentileRank: number,
  higherIsBetter: boolean = true,
): BenchmarkStatus {
  // For metrics where higher is better:
  // - Above 60th percentile = above average
  // - 40th-60th percentile = average
  // - Below 40th percentile = below average
  if (higherIsBetter) {
    if (percentileRank >= 60) return "above_average";
    if (percentileRank >= 40) return "average";
    return "below_average";
  } else {
    // For metrics where lower is better (e.g., expense ratios):
    // Lower percentile = better
    if (percentileRank <= 40) return "above_average";
    if (percentileRank <= 60) return "average";
    return "below_average";
  }
}
