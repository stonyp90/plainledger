/**
 * Benchmark Data Hook
 * 
 * Provides access to industry benchmark data from official Canadian government sources.
 * 
 * PRIMARY DATA SOURCE: ISED (Innovation, Science and Economic Development Canada)
 * - Open Canada Portal: https://open.canada.ca/data
 * - Dataset 2023: 16b7eeb0-9a97-46c0-af3d-7f2114dedf5e
 * - Dataset 2022: ee04cfb2-9473-47cb-a0e1-64823da7ab82
 * - Open Government Licence - Canada (no authentication required)
 * 
 * The backend fetches and aggregates real financial data from 75,000+ Canadian businesses
 * categorized by NAICS industry codes. Fallback data is only used when API is unavailable.
 */

import { useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  useIndustryBenchmark,
  useOrganizationComparison,
  useBenchmarkRefreshStatus,
  type RevenueRange,
  type IndustryBenchmark,
  type OrganizationComparison,
} from '../lib/graphql/hooks';

// Revenue range multipliers for medium businesses (higher margins, better ratios)
const MEDIUM_BIZ_MULTIPLIERS = {
  grossMargin: 1.08,      // Slightly better margins
  netMargin: 1.15,        // Better bottom line
  currentRatio: 1.12,     // Better liquidity
  debtToEquity: 0.85,     // Lower leverage
  operatingExpense: 0.92, // Better efficiency
  growth: 1.20,           // Higher growth
  sampleSize: 0.25,       // Fewer medium businesses
};

// Helper to create revenue-range-specific benchmark
const createBenchmarkVariant = (
  base: Omit<IndustryBenchmark, 'revenueRange'>, 
  revenueRange: RevenueRange
): IndustryBenchmark => {
  if (revenueRange === '30k-5m') {
    return { ...base, revenueRange };
  }
  
  // Apply medium business multipliers for 5m-20m range
  const m = MEDIUM_BIZ_MULTIPLIERS;
  return {
    ...base,
    revenueRange,
    sampleSize: Math.round(base.sampleSize * m.sampleSize),
    profitability: {
      grossMargin: {
        q1: Math.min(base.profitability.grossMargin.q1 * m.grossMargin, 0.95),
        median: Math.min(base.profitability.grossMargin.median * m.grossMargin, 0.95),
        q3: Math.min(base.profitability.grossMargin.q3 * m.grossMargin, 0.98),
      },
      netMargin: {
        q1: Math.min(base.profitability.netMargin.q1 * m.netMargin, 0.45),
        median: Math.min(base.profitability.netMargin.median * m.netMargin, 0.45),
        q3: Math.min(base.profitability.netMargin.q3 * m.netMargin, 0.50),
      },
    },
    operations: {
      operatingExpenseRatio: base.operations.operatingExpenseRatio * m.operatingExpense,
      wagesToRevenueRatio: base.operations.wagesToRevenueRatio * 0.95,
      rentToRevenueRatio: base.operations.rentToRevenueRatio * 0.90,
    },
    balanceSheet: {
      currentRatio: {
        q1: base.balanceSheet.currentRatio.q1 * m.currentRatio,
        median: base.balanceSheet.currentRatio.median * m.currentRatio,
        q3: base.balanceSheet.currentRatio.q3 * m.currentRatio,
      },
      debtToEquity: {
        q1: base.balanceSheet.debtToEquity.q1 * m.debtToEquity,
        median: base.balanceSheet.debtToEquity.median * m.debtToEquity,
        q3: base.balanceSheet.debtToEquity.q3 * m.debtToEquity,
      },
    },
    growth: {
      revenueYoY: base.growth.revenueYoY * m.growth,
      revenueQoQ: base.growth.revenueQoQ * m.growth,
    },
  };
};

/**
 * Fallback benchmark data (used ONLY when API is unavailable)
 * Based on historical ISED data from Canadian SME financial statistics.
 * When connected, real-time data from open.canada.ca replaces this fallback.
 */
const BASE_BENCHMARKS: Record<string, Omit<IndustryBenchmark, 'revenueRange'>> = {
  restaurant: {
    industryId: 'restaurant',
    industryName: 'Restaurant',
    referenceYear: 2023,
    sampleSize: 5000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.55, median: 0.65, q3: 0.72 },
      netMargin: { q1: 0.02, median: 0.05, q3: 0.10 },
    },
    operations: {
      operatingExpenseRatio: 0.60,
      wagesToRevenueRatio: 0.30,
      rentToRevenueRatio: 0.08,
    },
    balanceSheet: {
      currentRatio: { q1: 0.7, median: 0.9, q3: 1.3 },
      debtToEquity: { q1: 1.5, median: 2.5, q3: 3.8 },
    },
    growth: { revenueYoY: 0.03, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  construction: {
    industryId: 'construction',
    industryName: 'Construction',
    referenceYear: 2023,
    sampleSize: 8000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.15, median: 0.22, q3: 0.30 },
      netMargin: { q1: 0.03, median: 0.06, q3: 0.12 },
    },
    operations: {
      operatingExpenseRatio: 0.16,
      wagesToRevenueRatio: 0.25,
      rentToRevenueRatio: 0.03,
    },
    balanceSheet: {
      currentRatio: { q1: 1.0, median: 1.4, q3: 2.0 },
      debtToEquity: { q1: 1.0, median: 1.8, q3: 2.7 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  professional_services: {
    industryId: 'professional_services',
    industryName: 'Professional Services',
    referenceYear: 2023,
    sampleSize: 15000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.40, median: 0.55, q3: 0.70 },
      netMargin: { q1: 0.08, median: 0.15, q3: 0.25 },
    },
    operations: {
      operatingExpenseRatio: 0.40,
      wagesToRevenueRatio: 0.45,
      rentToRevenueRatio: 0.05,
    },
    balanceSheet: {
      currentRatio: { q1: 1.3, median: 1.8, q3: 2.5 },
      debtToEquity: { q1: 0.4, median: 0.8, q3: 1.2 },
    },
    growth: { revenueYoY: 0.05, revenueQoQ: 0.02 },
    lastUpdated: new Date().toISOString(),
  },
  technology: {
    industryId: 'technology',
    industryName: 'Technology',
    referenceYear: 2023,
    sampleSize: 4000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.50, median: 0.65, q3: 0.80 },
      netMargin: { q1: 0.05, median: 0.12, q3: 0.22 },
    },
    operations: {
      operatingExpenseRatio: 0.53,
      wagesToRevenueRatio: 0.50,
      rentToRevenueRatio: 0.04,
    },
    balanceSheet: {
      currentRatio: { q1: 1.5, median: 2.2, q3: 3.1 },
      debtToEquity: { q1: 0.3, median: 0.5, q3: 0.8 },
    },
    growth: { revenueYoY: 0.08, revenueQoQ: 0.03 },
    lastUpdated: new Date().toISOString(),
  },
  retail: {
    industryId: 'retail',
    industryName: 'Retail',
    referenceYear: 2023,
    sampleSize: 12000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.28, median: 0.35, q3: 0.45 },
      netMargin: { q1: 0.01, median: 0.04, q3: 0.08 },
    },
    operations: {
      operatingExpenseRatio: 0.31,
      wagesToRevenueRatio: 0.15,
      rentToRevenueRatio: 0.06,
    },
    balanceSheet: {
      currentRatio: { q1: 1.2, median: 1.6, q3: 2.2 },
      debtToEquity: { q1: 0.9, median: 1.5, q3: 2.2 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  real_estate: {
    industryId: 'real_estate',
    industryName: 'Real Estate',
    referenceYear: 2023,
    sampleSize: 4000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.50, median: 0.65, q3: 0.75 },
      netMargin: { q1: 0.10, median: 0.20, q3: 0.35 },
    },
    operations: {
      operatingExpenseRatio: 0.45,
      wagesToRevenueRatio: 0.10,
      rentToRevenueRatio: 0.02,
    },
    balanceSheet: {
      currentRatio: { q1: 0.9, median: 1.2, q3: 1.7 },
      debtToEquity: { q1: 1.8, median: 3.0, q3: 4.5 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  hospitality: {
    industryId: 'hospitality',
    industryName: 'Hospitality',
    referenceYear: 2023,
    sampleSize: 3000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.60, median: 0.70, q3: 0.78 },
      netMargin: { q1: 0.02, median: 0.08, q3: 0.15 },
    },
    operations: {
      operatingExpenseRatio: 0.62,
      wagesToRevenueRatio: 0.35,
      rentToRevenueRatio: 0.10,
    },
    balanceSheet: {
      currentRatio: { q1: 0.6, median: 0.8, q3: 1.1 },
      debtToEquity: { q1: 1.7, median: 2.8, q3: 4.2 },
    },
    growth: { revenueYoY: 0.04, revenueQoQ: 0.02 },
    lastUpdated: new Date().toISOString(),
  },
  manufacturing: {
    industryId: 'manufacturing',
    industryName: 'Manufacturing',
    referenceYear: 2023,
    sampleSize: 6000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.22, median: 0.30, q3: 0.40 },
      netMargin: { q1: 0.03, median: 0.07, q3: 0.12 },
    },
    operations: {
      operatingExpenseRatio: 0.23,
      wagesToRevenueRatio: 0.20,
      rentToRevenueRatio: 0.04,
    },
    balanceSheet: {
      currentRatio: { q1: 1.1, median: 1.5, q3: 2.1 },
      debtToEquity: { q1: 1.0, median: 1.6, q3: 2.4 },
    },
    growth: { revenueYoY: 0.01, revenueQoQ: 0.00 },
    lastUpdated: new Date().toISOString(),
  },
  healthcare: {
    industryId: 'healthcare',
    industryName: 'Healthcare',
    referenceYear: 2023,
    sampleSize: 5000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.45, median: 0.55, q3: 0.65 },
      netMargin: { q1: 0.10, median: 0.18, q3: 0.28 },
    },
    operations: {
      operatingExpenseRatio: 0.37,
      wagesToRevenueRatio: 0.40,
      rentToRevenueRatio: 0.06,
    },
    balanceSheet: {
      currentRatio: { q1: 1.4, median: 2.0, q3: 2.8 },
      debtToEquity: { q1: 0.4, median: 0.6, q3: 0.9 },
    },
    growth: { revenueYoY: 0.04, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  transport: {
    industryId: 'transport',
    industryName: 'Transport & Logistics',
    referenceYear: 2023,
    sampleSize: 3500,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.15, median: 0.22, q3: 0.30 },
      netMargin: { q1: 0.02, median: 0.05, q3: 0.10 },
    },
    operations: {
      operatingExpenseRatio: 0.17,
      wagesToRevenueRatio: 0.30,
      rentToRevenueRatio: 0.03,
    },
    balanceSheet: {
      currentRatio: { q1: 0.9, median: 1.3, q3: 1.8 },
      debtToEquity: { q1: 1.2, median: 2.0, q3: 3.0 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  agriculture: {
    industryId: 'agriculture',
    industryName: 'Agriculture',
    referenceYear: 2023,
    sampleSize: 2500,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.20, median: 0.30, q3: 0.42 },
      netMargin: { q1: 0.03, median: 0.08, q3: 0.15 },
    },
    operations: {
      operatingExpenseRatio: 0.22,
      wagesToRevenueRatio: 0.15,
      rentToRevenueRatio: 0.05,
    },
    balanceSheet: {
      currentRatio: { q1: 1.0, median: 1.4, q3: 2.0 },
      debtToEquity: { q1: 1.1, median: 1.8, q3: 2.7 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  education: {
    industryId: 'education',
    industryName: 'Education',
    referenceYear: 2023,
    sampleSize: 2000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.45, median: 0.55, q3: 0.68 },
      netMargin: { q1: 0.05, median: 0.12, q3: 0.20 },
    },
    operations: {
      operatingExpenseRatio: 0.43,
      wagesToRevenueRatio: 0.55,
      rentToRevenueRatio: 0.08,
    },
    balanceSheet: {
      currentRatio: { q1: 1.2, median: 1.6, q3: 2.2 },
      debtToEquity: { q1: 0.5, median: 0.8, q3: 1.2 },
    },
    growth: { revenueYoY: 0.03, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  wholesale: {
    industryId: 'wholesale',
    industryName: 'Wholesale & Distribution',
    referenceYear: 2023,
    sampleSize: 4500,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.18, median: 0.25, q3: 0.32 },
      netMargin: { q1: 0.02, median: 0.04, q3: 0.08 },
    },
    operations: {
      operatingExpenseRatio: 0.21,
      wagesToRevenueRatio: 0.12,
      rentToRevenueRatio: 0.04,
    },
    balanceSheet: {
      currentRatio: { q1: 1.1, median: 1.5, q3: 2.1 },
      debtToEquity: { q1: 0.9, median: 1.4, q3: 2.1 },
    },
    growth: { revenueYoY: 0.02, revenueQoQ: 0.01 },
    lastUpdated: new Date().toISOString(),
  },
  automotive: {
    industryId: 'automotive',
    industryName: 'Automotive',
    referenceYear: 2023,
    sampleSize: 3000,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.12, median: 0.18, q3: 0.25 },
      netMargin: { q1: 0.01, median: 0.03, q3: 0.06 },
    },
    operations: {
      operatingExpenseRatio: 0.15,
      wagesToRevenueRatio: 0.10,
      rentToRevenueRatio: 0.03,
    },
    balanceSheet: {
      currentRatio: { q1: 1.0, median: 1.4, q3: 2.0 },
      debtToEquity: { q1: 1.3, median: 2.2, q3: 3.3 },
    },
    growth: { revenueYoY: 0.01, revenueQoQ: 0.00 },
    lastUpdated: new Date().toISOString(),
  },
  beauty_wellness: {
    industryId: 'beauty_wellness',
    industryName: 'Beauty & Wellness',
    referenceYear: 2023,
    sampleSize: 2500,
    dataSource: 'aggregated',
    profitability: {
      grossMargin: { q1: 0.55, median: 0.65, q3: 0.75 },
      netMargin: { q1: 0.05, median: 0.12, q3: 0.20 },
    },
    operations: {
      operatingExpenseRatio: 0.53,
      wagesToRevenueRatio: 0.35,
      rentToRevenueRatio: 0.08,
    },
    balanceSheet: {
      currentRatio: { q1: 0.9, median: 1.2, q3: 1.7 },
      debtToEquity: { q1: 0.6, median: 1.0, q3: 1.5 },
    },
    growth: { revenueYoY: 0.05, revenueQoQ: 0.02 },
    lastUpdated: new Date().toISOString(),
  },
};

export interface UseBenchmarkResult {
  benchmark: IndustryBenchmark | null;
  isLoading: boolean;
  error: Error | null;
  dataSource: 'api' | 'fallback';
  refetch: () => void;
}

export interface UseComparisonResult {
  comparison: OrganizationComparison | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch benchmark data for a specific industry
 * Falls back to cached data if API is unavailable
 */
export function useBenchmark(
  industry: string,
  revenueRange: RevenueRange = '30k-5m'
): UseBenchmarkResult {
  const { data, loading, error, refetch } = useIndustryBenchmark(industry, revenueRange);

  const benchmark = useMemo(() => {
    // Use API data if available
    if (data?.industryBenchmark) {
      return data.industryBenchmark as IndustryBenchmark;
    }
    // Fall back to cached data with revenue range adjustment
    const baseBenchmark = BASE_BENCHMARKS[industry] || BASE_BENCHMARKS.professional_services;
    return createBenchmarkVariant(baseBenchmark, revenueRange);
  }, [data, industry, revenueRange]);

  return {
    benchmark,
    isLoading: loading,
    error: error ? new Error(error.message) : null,
    dataSource: data?.industryBenchmark ? 'api' : 'fallback',
    refetch,
  };
}

/**
 * Hook to compare organization metrics against industry benchmarks
 */
export function useComparison(
  industry: string,
  metrics: {
    grossMargin?: number;
    netMargin?: number;
    currentRatio?: number;
    debtToEquity?: number;
    operatingExpenseRatio?: number;
  },
  revenueRange: RevenueRange = '30k-5m'
): UseComparisonResult {
  const { currentTenant } = useTenant();
  const orgId = currentTenant?.id || '';

  const { data, loading, error, refetch } = useOrganizationComparison(
    orgId,
    industry,
    metrics,
    revenueRange
  );

  return {
    comparison: data?.organizationComparison as OrganizationComparison | null,
    isLoading: loading,
    error: error ? new Error(error.message) : null,
    refetch,
  };
}

/**
 * Hook to get benchmark refresh status
 */
export function useBenchmarkStatus() {
  const { data, loading, error, refetch } = useBenchmarkRefreshStatus();

  return {
    status: data?.benchmarkRefreshStatus || null,
    isLoading: loading,
    error: error ? new Error(error.message) : null,
    refetch,
  };
}

/**
 * Get all available fallback benchmarks (for offline/demo mode)
 */
export function getAllFallbackBenchmarks(revenueRange: RevenueRange = '30k-5m'): Record<string, IndustryBenchmark> {
  const result: Record<string, IndustryBenchmark> = {};
  for (const [key, base] of Object.entries(BASE_BENCHMARKS)) {
    result[key] = createBenchmarkVariant(base, revenueRange);
  }
  return result;
}

export type { IndustryBenchmark, OrganizationComparison, RevenueRange };
