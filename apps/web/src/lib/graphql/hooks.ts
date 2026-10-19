/**
 * GraphQL React Hooks
 *
 * Custom hooks for GraphQL queries and mutations.
 * Provides type-safe data fetching with loading and error states.
 */
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import type {
  DashboardSummaryResult, FinancialTrendResult, AccountResult, PageResult,
  TransactionResult, BalanceSheetResult, IncomeStatementResult, DataSourceResult,
  ProviderResult, OperationResult, SyncStats, BenchmarkRefreshStatus,
} from './responseTypes';
import {
  GET_DASHBOARD_SUMMARY,
  GET_FINANCIAL_TRENDS,
  GET_ACCOUNTS,
  GET_ACCOUNT,
  GET_TRANSACTIONS,
  GET_BALANCE_SHEET,
  GET_INCOME_STATEMENT,
  GET_ORGANIZATION,
  GET_ORGANIZATION_FEATURES,
  GET_DATA_SOURCES,
  GET_AVAILABLE_PROVIDERS,
  GET_INDUSTRY_BENCHMARK,
  GET_ALL_INDUSTRY_BENCHMARKS,
  GET_ORGANIZATION_COMPARISON,
  GET_BENCHMARK_REFRESH_STATUS,
  GET_TRIAL_BALANCE,
  GET_CASH_FLOW_WATERFALL,
  GET_RECEIVABLES_AGING,
  GET_PAYABLES_AGING,
  GET_BUDGET_SETTINGS,
  SAVE_BUDGET,
  GET_TAX_DEADLINES,
} from './queries';
import {
  INITIATE_OAUTH,
  COMPLETE_OAUTH,
  SYNC_DATA_SOURCE,
  DISCONNECT_DATA_SOURCE,
  DELETE_DATA_SOURCE,
} from './mutations';

// =====================================================
// DASHBOARD HOOKS
// =====================================================

export interface DashboardFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  period?: string;
  compareWithPrevious?: boolean;
}

export function useDashboardSummary(options?: { filter?: DashboardFilter; skip?: boolean }) {
  return useQuery<{ dashboardSummary: DashboardSummaryResult }>(GET_DASHBOARD_SUMMARY, {
    variables: { filter: options?.filter },
    pollInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    skip: options?.skip,
  });
}

export function useFinancialTrends(
  metrics: string[],
  options?: { dateRange?: { startDate: Date; endDate: Date }; skip?: boolean },
) {
  return useQuery<{ financialTrends: FinancialTrendResult[] }>(GET_FINANCIAL_TRENDS, {
    variables: { metrics, dateRange: options?.dateRange },
    skip: metrics.length === 0 || options?.skip,
  });
}

// =====================================================
// ACCOUNT HOOKS
// =====================================================

export interface AccountFilter {
  types?: string[];
  search?: string;
  isActive?: boolean;
  parentAccountId?: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export function useAccounts(
  filter?: AccountFilter,
  pagination?: PaginationInput,
  options?: { skip?: boolean },
) {
  return useQuery<{ accounts: PageResult<AccountResult> }>(GET_ACCOUNTS, {
    variables: { filter, pagination },
    skip: options?.skip,
  });
}

export function useAccount(id: string) {
  return useQuery<{ account: AccountResult }>(GET_ACCOUNT, {
    variables: { id },
    skip: !id,
  });
}

export function useLazyAccount() {
  return useLazyQuery<{ account: AccountResult }>(GET_ACCOUNT);
}

// =====================================================
// TRANSACTION HOOKS
// =====================================================

export interface TransactionFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  types?: string[];
  accountId?: string;
  contactId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export function useTransactions(filter?: TransactionFilter, pagination?: PaginationInput) {
  return useQuery<{ transactions: PageResult<TransactionResult> }>(GET_TRANSACTIONS, {
    variables: { filter, pagination },
  });
}

// =====================================================
// REPORT HOOKS
// =====================================================

export function useBalanceSheet(asOfDate?: Date, options?: { skip?: boolean }) {
  return useQuery<{ balanceSheet: BalanceSheetResult }>(GET_BALANCE_SHEET, {
    variables: { asOfDate: asOfDate?.toISOString() },
    skip: options?.skip,
  });
}

export function useIncomeStatement(startDate: Date, endDate: Date, options?: { skip?: boolean }) {
  return useQuery<{ incomeStatement: IncomeStatementResult }>(GET_INCOME_STATEMENT, {
    variables: {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
    skip: options?.skip || !startDate || !endDate,
  });
}

// =====================================================
// ORGANIZATION HOOKS
// =====================================================

export function useOrganization() {
  return useQuery(GET_ORGANIZATION);
}

export function useOrganizationFeatures() {
  return useQuery(GET_ORGANIZATION_FEATURES);
}

// =====================================================
// DATA SOURCE HOOKS
// =====================================================

export function useDataSources() {
  return useQuery<{ dataSources: DataSourceResult[] }>(GET_DATA_SOURCES, {
    pollInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

export function useAvailableProviders() {
  return useQuery<{ availableProviders: ProviderResult[] }>(GET_AVAILABLE_PROVIDERS);
}

export function useInitiateOAuth() {
  return useMutation<{ initiateOAuth: { url: string; state: string; provider: string } }>(INITIATE_OAUTH);
}

export function useCompleteOAuth() {
  return useMutation<{ completeOAuth: DataSourceResult }>(COMPLETE_OAUTH, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useSyncDataSource() {
  return useMutation<{ syncDataSource: OperationResult & { stats: SyncStats; syncedAt: string; warnings: string[] } }>(SYNC_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useDisconnectDataSource() {
  return useMutation<{ disconnectDataSource: OperationResult }>(DISCONNECT_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useDeleteDataSource() {
  return useMutation<{ deleteDataSource: OperationResult }>(DELETE_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

// =====================================================
// MARKET ANALYSIS / BENCHMARK HOOKS
// =====================================================

export type RevenueRange = '30k-5m' | '5m-20m';

export interface IndustryBenchmark {
  industryId: string;
  industryName: string;
  revenueRange: string;
  referenceYear: number;
  sampleSize: number;
  dataSource: string;
  profitability: {
    grossMargin: { q1: number; median: number; q3: number };
    netMargin: { q1: number; median: number; q3: number };
  };
  operations: {
    operatingExpenseRatio: number;
    wagesToRevenueRatio: number;
    rentToRevenueRatio: number;
  };
  balanceSheet: {
    currentRatio: { q1: number; median: number; q3: number };
    debtToEquity: { q1: number; median: number; q3: number };
  };
  growth: {
    revenueYoY: number;
    revenueQoQ: number;
  };
  lastUpdated: string;
}

export interface MetricComparison {
  metricName: string;
  userValue: number;
  benchmarkQ1: number;
  benchmarkMedian: number;
  benchmarkQ3: number;
  percentileRank: number;
  status: 'excellent' | 'good' | 'average' | 'below_average' | 'needs_attention';
  insight: string;
}

export interface OrganizationComparison {
  organizationId: string;
  industry: string;
  comparisons: MetricComparison[];
  overallScore: number;
  benchmarkDataDate: string;
}

/**
 * Hook to fetch benchmark data for a specific industry
 */
export function useIndustryBenchmark(industry: string, revenueRange?: RevenueRange) {
  return useQuery<{ industryBenchmark: IndustryBenchmark }>(GET_INDUSTRY_BENCHMARK, {
    variables: { industry, revenueRange },
    skip: !industry,
  });
}

/**
 * Hook to fetch benchmark data for all industries
 */
export function useAllIndustryBenchmarks(revenueRange?: RevenueRange) {
  return useQuery<{ allIndustryBenchmarks: IndustryBenchmark[] }>(GET_ALL_INDUSTRY_BENCHMARKS, {
    variables: { revenueRange },
  });
}

/**
 * Hook to compare organization metrics against industry benchmarks
 */
export function useOrganizationComparison(
  organizationId: string,
  industry: string,
  metrics: {
    grossMargin?: number;
    netMargin?: number;
    currentRatio?: number;
    debtToEquity?: number;
    operatingExpenseRatio?: number;
  },
  revenueRange?: RevenueRange,
) {
  return useQuery<{ organizationComparison: OrganizationComparison }>(GET_ORGANIZATION_COMPARISON, {
    variables: {
      organizationId,
      industry,
      revenueRange,
      ...metrics,
    },
    skip: !organizationId || !industry,
  });
}

/**
 * Hook to fetch benchmark data refresh status
 */
export function useBenchmarkRefreshStatus() {
  return useQuery<{ benchmarkRefreshStatus: BenchmarkRefreshStatus }>(GET_BENCHMARK_REFRESH_STATUS, {
    pollInterval: 60 * 1000, // Refresh every minute
  });
}

// =====================================================
// REAL DATA HOOKS - Trial Balance, Aging, Waterfall
// =====================================================

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceData {
  entries: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface WaterfallItem {
  label: string;
  labelEn: string;
  value: number;
  type: string;
  category: string;
}

export interface AgingBucket {
  label: string;
  labelEn: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
}

export interface AgingData {
  buckets: AgingBucket[];
  total: number;
  totalOverdue: number;
  averageDays: number;
  hasData: boolean;
}

/**
 * Hook to fetch real trial balance data from transactions
 */
export function useTrialBalance(options?: { skip?: boolean }) {
  return useQuery<{ trialBalance: TrialBalanceData }>(GET_TRIAL_BALANCE, {
    pollInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    skip: options?.skip,
  });
}

/**
 * Hook to fetch real cash flow waterfall from transactions
 */
export function useCashFlowWaterfall(options?: {
  startDate?: string;
  endDate?: string;
  skip?: boolean;
}) {
  return useQuery<{ cashFlowWaterfall: WaterfallItem[] }>(GET_CASH_FLOW_WATERFALL, {
    variables: { startDate: options?.startDate, endDate: options?.endDate },
    pollInterval: 5 * 60 * 1000,
    skip: options?.skip,
  });
}

/**
 * Hook to fetch real AR aging from invoices/transactions
 */
export function useReceivablesAging(options?: { skip?: boolean }) {
  return useQuery<{ receivablesAging: AgingData }>(GET_RECEIVABLES_AGING, {
    pollInterval: 5 * 60 * 1000,
    skip: options?.skip,
  });
}

/**
 * Hook to fetch real AP aging from bills/transactions
 * Returns hasData: false if no bills are tracked
 */
export function usePayablesAging(options?: { skip?: boolean }) {
  return useQuery<{ payablesAging: AgingData }>(GET_PAYABLES_AGING, {
    pollInterval: 5 * 60 * 1000,
    skip: options?.skip,
  });
}

// =====================================================
// BUDGET HOOKS
// =====================================================

export interface BudgetCategory {
  categoryId: string;
  categoryName: string;
  categoryNameEn: string;
  monthlyAmount: number;
}

export interface BudgetSettings {
  year: number;
  categories: BudgetCategory[];
  lastUpdated?: string;
  updatedBy?: string;
  hasBudget: boolean;
}

/**
 * Hook to fetch organization budget settings
 */
export function useBudgetSettings(options?: { skip?: boolean }) {
  return useQuery<{ budgetSettings: BudgetSettings }>(GET_BUDGET_SETTINGS, {
    skip: options?.skip,
  });
}

/**
 * Hook to save organization budget settings
 */
export function useSaveBudget() {
  return useMutation(SAVE_BUDGET, {
    refetchQueries: [{ query: GET_BUDGET_SETTINGS }],
  });
}

// =====================================================
// TAX DEADLINES HOOKS
// =====================================================

export interface TaxDeadline {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
  status: 'overdue' | 'urgent' | 'upcoming' | 'future';
  category: 'gst' | 'payroll' | 'corporate' | 'other';
}

export interface TaxDeadlinesResponse {
  deadlines: TaxDeadline[];
  fiscalYearEnd?: string;
  province?: string;
}

/**
 * Hook to fetch upcoming tax deadlines based on fiscal year and province
 */
export function useTaxDeadlines(options?: { skip?: boolean }) {
  return useQuery<{ taxDeadlines: TaxDeadlinesResponse }>(GET_TAX_DEADLINES, {
    pollInterval: 60 * 60 * 1000, // Refresh every hour
    skip: options?.skip,
  });
}
