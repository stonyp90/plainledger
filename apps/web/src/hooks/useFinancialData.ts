/**
 * React hook for fetching and managing financial data
 *
 * This hook provides:
 * - Real-time data loading from GraphQL API
 * - Data from the S3 Gold layer via backend
 * - Loading and error states
 * - Refresh functionality
 * - Fallback to mock data when GraphQL is unavailable
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { isMockAuthEnabled } from '../lib/keycloak';
import { adaptBalanceSheet, adaptIncomeStatement, createEmptyDashboardSummary } from '../lib/financialAdapters';
import {
  useDashboardSummary,
  useFinancialTrends,
  useAccounts,
  useDataSources,
  useBalanceSheet as useBalanceSheetQuery,
  useIncomeStatement as useIncomeStatementQuery,
  useTrialBalance,
  useCashFlowWaterfall,
  useReceivablesAging,
  usePayablesAging,
  useTaxDeadlines,
  useBudgetSettings,
} from '../lib/graphql/hooks';
import {
  generateMockFinancialData,
  type FinancialDataResponse,
  type BalanceSheetData,
  type IncomeStatementData,
  type DashboardSummary,
  type FinancialMetrics,
} from '../lib/financialData';

interface UseFinancialDataResult {
  data: FinancialDataResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
  dataSource: 'graphql' | 'mock';
}

interface UseBalanceSheetResult {
  data: BalanceSheetData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface UseIncomeStatementResult {
  data: IncomeStatementData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface UseDashboardDataResult {
  summary: DashboardSummary | null;
  metrics: FinancialMetrics | null;
  trends: FinancialDataResponse['trends'] | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch complete financial data for the current tenant
 *
 * Data flow:
 * 1. GraphQL API → Backend FinancialResolver
 * 2. Backend → DatalakeDataService → S3 Gold bucket
 * 3. S3 Gold bucket contains data synced from QuickBooks/Xero/etc.
 */
export function useFinancialData(
  options: {
    asOfDate?: string;
    autoFetch?: boolean;
  } = {},
): UseFinancialDataResult {
  const { autoFetch = true } = options;
  const { currentTenant } = useTenant();
  const { isDemoMode } = useDemoMode();

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const hasLoggedMockAuth = useRef(false);

  // Check for real data source connections
  const { data: dataSourcesQueryResult, loading: dataSourcesLoading } = useDataSources();

  // Check if QuickBooks (or any accounting software) is connected
  const hasRealConnection = useMemo(() => {
    if (dataSourcesLoading) return false;
    const dataSources = dataSourcesQueryResult?.dataSources;
    if (!dataSources || !Array.isArray(dataSources)) return false;

    const connected = dataSources.some((ds: { provider: string; status: string }) => {
      const provider = (ds.provider || '').toLowerCase();
      const status = (ds.status || '').toUpperCase();
      const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'connected';
      return (
        (provider === 'quickbooks' ||
          provider === 'xero' ||
          provider === 'sage' ||
          provider === 'freshbooks') &&
        isConnected
      );
    });

    if (connected) {
      console.log('[useFinancialData] Real connection detected:', {
        dataSources: dataSources.map((ds: { provider: string; status: string }) => ({
          provider: ds.provider,
          status: ds.status,
        })),
      });
    }

    return connected;
  }, [dataSourcesQueryResult, dataSourcesLoading]);

  // Financial samples require explicit development mock authentication.
  // Subscription tier and a stored demo preference never override posted ledger data.
  const shouldUseMockData = isMockAuthEnabled();
  const skipQueries = shouldUseMockData || !currentTenant || !autoFetch;

  // Fetch dashboard summary from GraphQL (no filter - use defaults)
  // Skip if using mock data
  const {
    data: summaryQueryData,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary({ filter: undefined, skip: skipQueries });
  const summaryData = shouldUseMockData ? null : summaryQueryData;

  // Fetch financial trends from GraphQL - skip if using mock data
  const {
    data: trendsQueryData,
    loading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useFinancialTrends(['revenue', 'expenses', 'cashFlow'], { skip: skipQueries });
  const trendsData = shouldUseMockData ? null : trendsQueryData;

  // Fetch accounts from GraphQL - skip if using mock data
  const {
    data: accountsQueryData,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAccounts(undefined, { page: 1, pageSize: 100 }, { skip: skipQueries });
  const accountsData = shouldUseMockData ? null : accountsQueryData;

  // Fetch real trial balance data - skip if using mock data
  const {
    data: trialBalanceQueryData,
    loading: trialBalanceLoading,
    refetch: refetchTrialBalance,
  } = useTrialBalance({ skip: skipQueries });
  const trialBalanceData = shouldUseMockData ? null : trialBalanceQueryData?.trialBalance;

  // Fetch real cash flow waterfall data - skip if using mock data
  const {
    data: waterfallQueryData,
    loading: waterfallLoading,
    refetch: refetchWaterfall,
  } = useCashFlowWaterfall({ startDate: undefined, endDate: undefined, skip: skipQueries });
  const waterfallData = shouldUseMockData ? null : waterfallQueryData?.cashFlowWaterfall;

  // Fetch real AR aging data - skip if using mock data
  const {
    data: arAgingQueryData,
    loading: arAgingLoading,
    refetch: refetchARaging,
  } = useReceivablesAging({ skip: skipQueries });
  const arAgingData = shouldUseMockData ? null : arAgingQueryData?.receivablesAging;

  // Fetch real AP aging data (may return hasData: false if no bills tracked) - skip if using mock data
  const {
    data: apAgingQueryData,
    loading: apAgingLoading,
    refetch: refetchAPaging,
  } = usePayablesAging({ skip: skipQueries });
  const apAgingData = shouldUseMockData ? null : apAgingQueryData?.payablesAging;

  // Fetch real tax deadlines (calculated from fiscal year and province) - skip if using mock data
  const {
    data: taxDeadlinesQueryData,
    loading: taxDeadlinesLoading,
    refetch: refetchTaxDeadlines,
  } = useTaxDeadlines({ skip: skipQueries });
  const taxDeadlinesData = shouldUseMockData ? null : taxDeadlinesQueryData?.taxDeadlines;

  // Fetch budget settings - skip if using mock data
  const {
    data: budgetQueryData,
    loading: budgetLoading,
    refetch: refetchBudget,
  } = useBudgetSettings({ skip: skipQueries });
  const budgetData = shouldUseMockData ? null : budgetQueryData?.budgetSettings;

  // Check if we have real data from GraphQL
  // Only consider GraphQL data if queries were NOT skipped (i.e., shouldUseMockData is false)
  // This ensures we're serving from S3 bucket, not mock data
  const hasGraphQLData = useMemo(() => {
    // If we're using mock data, queries are skipped, so we don't have GraphQL data
    if (shouldUseMockData) {
      return false;
    }

    // If queries have completed (not loading) and we have responses (even if empty), we have GraphQL data
    const queriesCompleted = !summaryLoading && !trendsLoading && !accountsLoading;

    // Check if we have actual data (not null - null means query was skipped)
    // When queries are skipped, summaryData is set to null, so we check for !== null
    const hasActualData = !!(
      summaryData?.dashboardSummary ||
      trendsData?.financialTrends ||
      accountsData?.accounts
    );

    // Check if queries completed successfully (no errors)
    const queriesSuccessful = queriesCompleted && !summaryError && !trendsError && !accountsError;

    // Only log when queries are actually running (not skipped) and completed
    if (!shouldUseMockData && queriesCompleted) {
      console.log('[useFinancialData] GraphQL data check:', {
        hasActualData,
        queriesCompleted,
        queriesSuccessful,
        summaryData: summaryData?.dashboardSummary
          ? 'present'
          : summaryData === null
            ? 'skipped'
            : 'empty',
        summaryError: summaryError?.message,
        trendsData: trendsData?.financialTrends?.length || (trendsData === null ? 'skipped' : 0),
        trendsError: trendsError?.message,
        accountsData:
          accountsData?.accounts?.nodes?.length || (accountsData === null ? 'skipped' : 0),
        accountsError: accountsError?.message,
      });
    }

    // Return true if we have actual data OR if queries completed successfully (even if empty)
    // Empty data from S3 is still considered GraphQL data (served from S3, not mock)
    return (
      hasActualData ||
      (queriesSuccessful && summaryData !== null && trendsData !== null && accountsData !== null)
    );
  }, [
    shouldUseMockData,
    summaryData,
    trendsData,
    accountsData,
    summaryError,
    trendsError,
    accountsError,
    summaryLoading,
    trendsLoading,
    accountsLoading,
  ]);

  // Transform GraphQL data to FinancialDataResponse format
  const transformedData = useMemo((): FinancialDataResponse | null => {
    if (!currentTenant) return null;

    // If we should use mock data (no connection AND free tier/demo mode), generate and return it
    if (shouldUseMockData) {
      return generateMockFinancialData(
        currentTenant.id,
        currentTenant.name,
        currentTenant.settings.currency || 'CAD',
        new Date().toISOString().split('T')[0],
        currentTenant.industry || 'real_estate',
      );
    }

    // If we have GraphQL data (from S3), use ONLY real data (no mock fallbacks)
    // This includes cases where GraphQL returns empty arrays (data exists in S3 but is empty)
    if (hasGraphQLData) {
      const hasActualData = !!(
        summaryData?.dashboardSummary ||
        (trendsData?.financialTrends || []).length > 0 ||
        (accountsData?.accounts?.nodes || []).length > 0
      );
      console.log(
        `[useFinancialData] Serving data from S3 Gold bucket via GraphQL${hasActualData ? ' (real data)' : ' (empty - no data in S3 yet)'}`,
        {
          organizationId: currentTenant.id,
          hasSummary: !!summaryData?.dashboardSummary,
          hasTrends: (trendsData?.financialTrends || []).length > 0,
          hasAccounts: (accountsData?.accounts?.nodes || []).length > 0,
        },
      );
      const summary = summaryData?.dashboardSummary;
      const trends = trendsData?.financialTrends || [];
      const accounts = accountsData?.accounts?.nodes || [];

      // Transform GraphQL trends to expected format - return empty array if no data
      const revenueTrend = trends.find(
        (t: { metricName: string }) => t.metricName.toLowerCase() === 'revenue',
      );
      const expensesTrend = trends.find(
        (t: { metricName: string }) => t.metricName.toLowerCase() === 'expenses',
      );
      const cashFlowTrend = trends.find(
        (t: { metricName: string }) => t.metricName.toLowerCase() === 'cashflow',
      );

      const transformTrendData = (
        trendData: { data: Array<{ date: string; value: number }> } | undefined,
      ) => {
        if (!trendData?.data || trendData.data.length === 0) return [];
        return trendData.data.map((d: { date: string; value: number }) => ({
          period: d.date,
          value: d.value,
        }));
      };

      // Initialize absent dashboard sections without inventing account data or ratios.
      const emptySummary = createEmptyDashboardSummary();
      return {
        summary: {
          ...emptySummary,
          revenue: {
            ...emptySummary.revenue,
            current: summary?.totalRevenue?.amount || 0,
            prior: 0,
            ytd: summary?.totalRevenue?.amount || 0,
          },
          expenses: {
            ...emptySummary.expenses,
            current: summary?.totalExpenses?.amount || 0,
            prior: 0,
            ytd: summary?.totalExpenses?.amount || 0,
          },
          netIncome: {
            ...emptySummary.netIncome,
            current: summary?.netIncome?.amount || 0,
            prior: 0,
            ytd: summary?.netIncome?.amount || 0,
          },
          cash: {
            ...emptySummary.cash,
            current: summary?.cashOnHand?.amount || 0,
            prior: 0,
          },
          receivables: {
            ...emptySummary.receivables,
            current: summary?.accountsReceivable?.amount || 0,
            prior: 0,
            hasData: arAgingData?.hasData ?? false,
            ...(arAgingData?.hasData
              ? {
                  aging: arAgingData.buckets.map((b) => ({
                    label: b.label,
                    labelEn: b.labelEn,
                    amount: b.amount,
                    count: b.count,
                    percentage: arAgingData.total > 0 ? (b.amount / arAgingData.total) * 100 : 0,
                  })),
                  totalOverdue: arAgingData.totalOverdue,
                  averageDaysOutstanding: arAgingData.averageDays,
                }
              : {}),
          },
          payables: {
            ...emptySummary.payables,
            current: summary?.accountsPayable?.amount || 0,
            prior: 0,
            hasData: apAgingData?.hasData ?? false,
            ...(apAgingData?.hasData
              ? {
                  aging: apAgingData.buckets.map((b) => ({
                    label: b.label,
                    labelEn: b.labelEn,
                    amount: b.amount,
                    count: b.count,
                    percentage: apAgingData.total > 0 ? (b.amount / apAgingData.total) * 100 : 0,
                  })),
                  totalOverdue: apAgingData.totalOverdue,
                  averageDaysPayable: apAgingData.averageDays,
                }
              : {}),
          },
          trialBalance: trialBalanceData
            ? {
                totalDebits: trialBalanceData.totalDebits,
                totalCredits: trialBalanceData.totalCredits,
                isBalanced: trialBalanceData.isBalanced,
                entries: trialBalanceData.entries.map((e) => ({
                  code: e.accountCode,
                  name: e.accountName,
                  nameEn: e.accountName,
                  debit: e.debitBalance,
                  credit: e.creditBalance,
                  type: e.accountType.toLowerCase() as
                    | 'asset'
                    | 'liability'
                    | 'equity'
                    | 'revenue'
                    | 'expense',
                })),
              }
            : { totalDebits: 0, totalCredits: 0, isBalanced: true, entries: [] },
          upcomingDeadlines: taxDeadlinesData?.deadlines?.length
            ? taxDeadlinesData.deadlines.map((d) => ({
                id: d.id,
                title: d.title,
                titleEn: d.titleEn,
                description: d.description,
                dueDate: d.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                daysRemaining: d.daysRemaining,
                status: d.status === 'overdue' ? 'overdue' as const : 'upcoming' as const,
                type: 'tax' as const,
              }))
            : [],
          hasBudget: budgetData?.hasBudget ?? false,
          budgetYear: budgetData?.year,
          cashFlow: { ...emptySummary.cashFlow, net: summary?.cashFlow?.netCashFlow?.amount ?? 0 },
        },
        trends: {
          revenue: {
            label: 'Revenus',
            labelEn: 'Revenue',
            data: transformTrendData(revenueTrend),
            budget: [], // Real budget data would come from budgetData if available
          },
          expenses: {
            label: 'Dépenses',
            labelEn: 'Expenses',
            data: transformTrendData(expensesTrend),
          },
          cashFlow: {
            label: 'Flux de trésorerie',
            labelEn: 'Cash Flow',
            data: transformTrendData(cashFlowTrend),
          },
          profit: {
            label: 'Bénéfice',
            labelEn: 'Profit',
            data: [], // Would need separate query for profit trend
          },
        },
        accounts: accounts.map(
          (a: {
            code: string;
            name: string;
            type: string;
            balance: number | null;
            isActive: boolean;
          }) => ({
            code: a.code,
            name: a.name,
            nameEn: a.name,
            current: a.balance,
            prior: 0,
            type: a.type?.toLowerCase() as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
          }),
        ),
        cashFlowWaterfall: waterfallData?.length
          ? waterfallData.map((item) => ({
              label: item.label,
              labelEn: item.labelEn,
              value: item.value,
              type: item.type as 'start' | 'increase' | 'decrease' | 'subtotal' | 'end',
              category: item.category as 'operations' | 'investing' | 'financing' | undefined,
            }))
          : [],
        // No demo anomalies for real data - only real anomalies would be detected
        demoAnomalies: [],
        industry: currentTenant.industry || 'real_estate',
        lastUpdated: new Date().toISOString(),
        dataSource: 'graphql-gold-layer',
      };
    }

    // If we have a real connection but no GraphQL data yet
    if (hasRealConnection) {
      // If queries are still loading, return null to show loading state
      if (summaryLoading || trendsLoading || accountsLoading) {
        return null;
      }

      // If queries failed (API server not running), fall back to mock data in local dev
      if (summaryError || trendsError || accountsError) {
        // In local dev with mock auth, use mock data as fallback
        if (isMockAuthEnabled()) {
          console.log(
            '[useFinancialData] GraphQL queries failed, falling back to mock data for local dev',
            {
              organizationId: currentTenant.id,
              summaryError: summaryError?.message,
              trendsError: trendsError?.message,
              accountsError: accountsError?.message,
            },
          );
          return generateMockFinancialData(
            currentTenant.id,
            currentTenant.name,
            currentTenant.settings.currency || 'CAD',
            new Date().toISOString().split('T')[0],
            currentTenant.industry || 'real_estate',
          );
        }
        // In production, return null to show error
        return null;
      }

      // Queries have completed successfully but returned empty data - return empty structure
      // This ensures we're serving from S3 (even if empty) rather than showing error
      console.log(
        '[useFinancialData] Serving empty data structure from S3 Gold bucket - queries completed successfully but returned no data',
        {
          organizationId: currentTenant.id,
          hasConnection: true,
        },
      );
      return {
        summary: createEmptyDashboardSummary(),
        trends: {
          revenue: { label: 'Revenus', labelEn: 'Revenue', data: [], budget: [] },
          expenses: { label: 'Dépenses', labelEn: 'Expenses', data: [] },
          cashFlow: { label: 'Flux de trésorerie', labelEn: 'Cash Flow', data: [] },
          profit: { label: 'Bénéfice', labelEn: 'Profit', data: [] },
        },
        accounts: [],
        cashFlowWaterfall: [],
        demoAnomalies: [],
        industry: currentTenant.industry || 'real_estate',
        lastUpdated: new Date().toISOString(),
        dataSource: 'graphql-gold-layer',
      };
    }

    // No connection and not using mock data - but if in local dev, use mock data anyway
    if (isMockAuthEnabled()) {
      console.log('[useFinancialData] No connection detected, using mock data for local dev', {
        organizationId: currentTenant.id,
        plan: currentTenant?.plan,
      });
      return generateMockFinancialData(
        currentTenant.id,
        currentTenant.name,
        currentTenant.settings.currency || 'CAD',
        new Date().toISOString().split('T')[0],
        currentTenant.industry || 'real_estate',
      );
    }

    return null;
  }, [
    currentTenant,
    hasGraphQLData,
    hasRealConnection,
    shouldUseMockData,
    summaryData,
    trendsData,
    accountsData,
    trialBalanceData,
    waterfallData,
    arAgingData,
    apAgingData,
    taxDeadlinesData,
    budgetData,
  ]);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (transformedData) {
      setLastUpdated(transformedData.lastUpdated);
    }
  }, [transformedData]);

  // Combined loading state - include real data queries
  const isLoading =
    summaryLoading ||
    trendsLoading ||
    accountsLoading ||
    trialBalanceLoading ||
    waterfallLoading ||
    arAgingLoading ||
    apAgingLoading ||
    taxDeadlinesLoading ||
    budgetLoading;

  // Surface partial failures too; a missing financial section is not a zero balance.
  const error = useMemo(() => {
    if (shouldUseMockData) return null;
    const failed = summaryError || trendsError || accountsError;
    return failed ? new Error(failed.message) : null;
  }, [shouldUseMockData, summaryError, trendsError, accountsError]);

  // Refresh function - includes all real data queries
  const refresh = useCallback(async () => {
    if (shouldUseMockData || !currentTenant) return;
    await Promise.all(
      [
        refetchSummary(),
        refetchTrends(),
        refetchAccounts(),
        refetchTrialBalance(),
        refetchWaterfall(),
        refetchARaging(),
        refetchAPaging(),
        refetchTaxDeadlines(),
        refetchBudget(),
      ].filter(Boolean),
    );
  }, [
    shouldUseMockData, currentTenant,
    refetchSummary,
    refetchTrends,
    refetchAccounts,
    refetchTrialBalance,
    refetchWaterfall,
    refetchARaging,
    refetchAPaging,
    refetchTaxDeadlines,
    refetchBudget,
  ]);

  return {
    data: transformedData,
    isLoading: isLoading && !transformedData, // Only show loading on initial load
    error,
    refresh,
    lastUpdated,
    dataSource: hasGraphQLData ? 'graphql' : 'mock',
  };
}

/**
 * Hook to fetch balance sheet data from GraphQL API
 */
export function useBalanceSheet(asOfDate: string): UseBalanceSheetResult {
  const { currentTenant } = useTenant();
  const { isDemoMode } = useDemoMode();
  const asOfDateObj = asOfDate ? new Date(asOfDate) : new Date();

  // Check for real data source connections
  const { data: dataSourcesQueryResult, loading: dataSourcesLoading } = useDataSources();

  const hasRealConnection = useMemo(() => {
    if (dataSourcesLoading) return false;
    const dataSources = dataSourcesQueryResult?.dataSources;
    if (!dataSources || !Array.isArray(dataSources)) return false;
    return dataSources.some((ds: { provider: string; status: string }) => {
      const provider = (ds.provider || '').toLowerCase();
      const status = (ds.status || '').toUpperCase();
      const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'connected';
      return (
        (provider === 'quickbooks' ||
          provider === 'xero' ||
          provider === 'sage' ||
          provider === 'freshbooks') &&
        isConnected
      );
    });
  }, [dataSourcesQueryResult, dataSourcesLoading]);

  const shouldUseMockData = isMockAuthEnabled();

  const {
    data: queryData,
    loading,
    error: queryError,
    refetch,
  } = useBalanceSheetQuery(asOfDateObj, { skip: shouldUseMockData || !currentTenant });

  // Transform GraphQL response to BalanceSheetData format
  const transformedData = useMemo((): BalanceSheetData | null => {
    if (!currentTenant) return null;
    if (!queryData?.balanceSheet) {
      // Only fall back to mock if we should use mock data
      if (shouldUseMockData && currentTenant) {
        const mockData = generateMockFinancialData(
          currentTenant.id,
          currentTenant.name,
          currentTenant.settings.currency || 'CAD',
          asOfDate,
        );
        return mockData.balanceSheet ? { ...mockData.balanceSheet, isDemoData: true } : null;
      }
      // Real connection but no data yet - return null (loading/empty state)
      return null;
    }

    return adaptBalanceSheet(queryData.balanceSheet, currentTenant.id);
  }, [queryData, currentTenant, asOfDate, shouldUseMockData]);

  const error = queryError ? new Error(queryError.message) : null;

  const refresh = useCallback(async () => {
    if (shouldUseMockData || !currentTenant) return;
    await refetch();
  }, [refetch, shouldUseMockData, currentTenant]);

  return {
    data: transformedData,
    isLoading: loading && !transformedData,
    error,
    refresh,
  };
}

/**
 * Hook to fetch income statement data from GraphQL API
 */
export function useIncomeStatement(startDate: string, endDate: string): UseIncomeStatementResult {
  const { currentTenant } = useTenant();
  const { isDemoMode } = useDemoMode();
  const startDateObj = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDateObj = endDate ? new Date(endDate) : new Date();

  // Check for real data source connections
  const { data: dataSourcesQueryResult, loading: dataSourcesLoading } = useDataSources();

  const hasRealConnection = useMemo(() => {
    if (dataSourcesLoading) return false;
    const dataSources = dataSourcesQueryResult?.dataSources;
    if (!dataSources || !Array.isArray(dataSources)) return false;
    return dataSources.some((ds: { provider: string; status: string }) => {
      const provider = (ds.provider || '').toLowerCase();
      const status = (ds.status || '').toUpperCase();
      const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'connected';
      return (
        (provider === 'quickbooks' ||
          provider === 'xero' ||
          provider === 'sage' ||
          provider === 'freshbooks') &&
        isConnected
      );
    });
  }, [dataSourcesQueryResult, dataSourcesLoading]);

  const shouldUseMockData = isMockAuthEnabled();

  const {
    data: queryData,
    loading,
    error: queryError,
    refetch,
  } = useIncomeStatementQuery(startDateObj, endDateObj, { skip: shouldUseMockData || !currentTenant });

  // Transform GraphQL response to IncomeStatementData format
  const transformedData = useMemo((): IncomeStatementData | null => {
    if (!currentTenant) return null;
    if (!queryData?.incomeStatement) {
      // Only fall back to mock if we should use mock data
      if (shouldUseMockData && currentTenant) {
        const mockData = generateMockFinancialData(
          currentTenant.id,
          currentTenant.name,
          currentTenant.settings.currency || 'CAD',
          endDate,
        );
        return mockData.incomeStatement ? { ...mockData.incomeStatement, isDemoData: true } : null;
      }
      // Real connection but no data yet - return null (loading/empty state)
      return null;
    }

    return adaptIncomeStatement(queryData.incomeStatement, currentTenant.id);
  }, [queryData, currentTenant, endDate, shouldUseMockData]);

  const error = queryError ? new Error(queryError.message) : null;

  const refresh = useCallback(async () => {
    if (shouldUseMockData || !currentTenant) return;
    await refetch();
  }, [refetch, shouldUseMockData, currentTenant]);

  return {
    data: transformedData,
    isLoading: loading && !transformedData,
    error,
    refresh,
  };
}

/**
 * Hook to fetch dashboard summary data
 */
export function useDashboardData(): UseDashboardDataResult {
  const { data: fullData, isLoading, error, refresh } = useFinancialData();

  return {
    summary: fullData?.summary || null,
    metrics: fullData?.metrics || null,
    trends: fullData?.trends || null,
    isLoading,
    error,
    refresh,
  };
}

export default useFinancialData;
