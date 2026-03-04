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

  // Check if we should use mock/demo data
  // IMPORTANT BUSINESS RULES:
  // 1. FREE users ALWAYS see demo data (cannot connect datasources)
  // 2. PAID users (professional/enterprise) with connection see ONLY real data
  // 3. PAID users WITHOUT connection see nothing (blocked by PaidNoConnectionGate)
  const shouldUseMockData = useMemo(() => {
    // Determine if user is on free tier - checked FIRST before connection status
    const plan = currentTenant?.plan || 'free';
    const isFreeUser = plan === 'free';

    // FREE USERS ALWAYS GET MOCK DATA - they cannot connect datasources
    if (isFreeUser) {
      console.log('[useFinancialData] FREE tier user - ALWAYS using demo data (cannot connect)', {
        plan,
        isDemoMode,
      });
      return true;
    }

    // Wait for dataSources query to complete before deciding (for paid users only)
    if (dataSourcesLoading) {
      // While loading, assume we'll use real data to avoid skipping queries prematurely
      return false;
    }

    // PAID users with a real connection use real data
    if (hasRealConnection) {
      console.log('[useFinancialData] Using REAL data - paid user with connection', {
        hasConnection: true,
        plan,
      });
      return false;
    }

    // In mock auth mode (local dev), use mock data for paid users without connection
    if (isMockAuthEnabled()) {
      if (!hasLoggedMockAuth.current) {
        console.log('[useFinancialData] No connection detected, using mock data for local dev', {
          plan,
        });
        hasLoggedMockAuth.current = true;
      }
      return true;
    }

    // PAID USERS WITHOUT CONNECTION - return false (they'll be blocked by PaidNoConnectionGate)
    if (!hasLoggedMockAuth.current) {
      console.log(
        '[useFinancialData] PAID user without connection - will be blocked by connection gate',
        {
          plan,
          hasConnection: false,
        },
      );
      hasLoggedMockAuth.current = true;
    }
    return false;
  }, [
    dataSourcesLoading,
    hasRealConnection,
    currentTenant?.plan,
    currentTenant?.settings?.demoMode,
    isDemoMode,
  ]);

  // Fetch dashboard summary from GraphQL (no filter - use defaults)
  // Skip if using mock data
  const {
    data: summaryQueryData,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary({ filter: undefined, skip: shouldUseMockData });
  const summaryData = shouldUseMockData ? null : summaryQueryData;

  // Fetch financial trends from GraphQL - skip if using mock data
  const {
    data: trendsQueryData,
    loading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useFinancialTrends(['revenue', 'expenses', 'cashFlow'], { skip: shouldUseMockData });
  const trendsData = shouldUseMockData ? null : trendsQueryData;

  // Fetch accounts from GraphQL - skip if using mock data
  const {
    data: accountsQueryData,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAccounts(undefined, { page: 1, pageSize: 100 }, { skip: shouldUseMockData });
  const accountsData = shouldUseMockData ? null : accountsQueryData;

  // Fetch real trial balance data - skip if using mock data
  const {
    data: trialBalanceQueryData,
    loading: trialBalanceLoading,
    refetch: refetchTrialBalance,
  } = useTrialBalance({ skip: shouldUseMockData });
  const trialBalanceData = shouldUseMockData ? null : trialBalanceQueryData?.trialBalance;

  // Fetch real cash flow waterfall data - skip if using mock data
  const {
    data: waterfallQueryData,
    loading: waterfallLoading,
    refetch: refetchWaterfall,
  } = useCashFlowWaterfall({ startDate: undefined, endDate: undefined, skip: shouldUseMockData });
  const waterfallData = shouldUseMockData ? null : waterfallQueryData?.cashFlowWaterfall;

  // Fetch real AR aging data - skip if using mock data
  const {
    data: arAgingQueryData,
    loading: arAgingLoading,
    refetch: refetchARaging,
  } = useReceivablesAging({ skip: shouldUseMockData });
  const arAgingData = shouldUseMockData ? null : arAgingQueryData?.receivablesAging;

  // Fetch real AP aging data (may return hasData: false if no bills tracked) - skip if using mock data
  const {
    data: apAgingQueryData,
    loading: apAgingLoading,
    refetch: refetchAPaging,
  } = usePayablesAging({ skip: shouldUseMockData });
  const apAgingData = shouldUseMockData ? null : apAgingQueryData?.payablesAging;

  // Fetch real tax deadlines (calculated from fiscal year and province) - skip if using mock data
  const {
    data: taxDeadlinesQueryData,
    loading: taxDeadlinesLoading,
    refetch: refetchTaxDeadlines,
  } = useTaxDeadlines({ skip: shouldUseMockData });
  const taxDeadlinesData = shouldUseMockData ? null : taxDeadlinesQueryData?.taxDeadlines;

  // Fetch budget settings - skip if using mock data
  const {
    data: budgetQueryData,
    loading: budgetLoading,
    refetch: refetchBudget,
  } = useBudgetSettings({ skip: shouldUseMockData });
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
        currentTenant.currency || 'CAD',
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

      // Build response with ONLY real data - no mock fallbacks
      return {
        summary: {
          revenue: {
            current: summary?.totalRevenue?.amount || 0,
            prior: 0,
            change: 0,
            ytd: summary?.totalRevenue?.amount || 0,
          },
          expenses: {
            current: summary?.totalExpenses?.amount || 0,
            prior: 0,
            change: 0,
            ytd: summary?.totalExpenses?.amount || 0,
          },
          netIncome: {
            current: summary?.netIncome?.amount || 0,
            prior: 0,
            change: 0,
            ytd: summary?.netIncome?.amount || 0,
          },
          cash: {
            current: summary?.cashOnHand?.amount || 0,
            prior: 0,
            change: 0,
          },
          receivables: {
            current: summary?.accountsReceivable?.amount || 0,
            prior: 0,
            change: 0,
            hasData: arAgingData?.hasData ?? false,
            ...(arAgingData?.hasData
              ? {
                  aging: arAgingData.buckets.map((b) => ({
                    label: b.label,
                    labelEn: b.labelEn,
                    amount: b.amount,
                    count: b.count,
                  })),
                  totalOverdue: arAgingData.totalOverdue,
                  averageDaysOutstanding: arAgingData.averageDays,
                }
              : {}),
          },
          payables: {
            current: summary?.accountsPayable?.amount || 0,
            prior: 0,
            change: 0,
            hasData: apAgingData?.hasData ?? false,
            ...(apAgingData?.hasData
              ? {
                  aging: apAgingData.buckets.map((b) => ({
                    label: b.label,
                    labelEn: b.labelEn,
                    amount: b.amount,
                    count: b.count,
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
                status: d.status as 'upcoming' | 'urgent' | 'overdue',
                category: d.category as 'tax' | 'filing' | 'payroll' | 'other',
              }))
            : [],
          hasBudget: budgetData?.hasBudget ?? false,
          budgetYear: budgetData?.year,
          cashBalance: summary?.cashOnHand?.amount || 0,
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
            balance: number;
            isActive: boolean;
          }) => ({
            code: a.code,
            name: a.name,
            nameEn: a.name,
            current: a.balance || 0,
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
            currentTenant.currency || 'CAD',
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
        summary: {
          revenue: { current: 0, prior: 0, change: 0, ytd: 0 },
          expenses: { current: 0, prior: 0, change: 0, ytd: 0 },
          netIncome: { current: 0, prior: 0, change: 0, ytd: 0 },
          cash: { current: 0, prior: 0, change: 0 },
          receivables: { current: 0, prior: 0, change: 0, hasData: false },
          payables: { current: 0, prior: 0, change: 0, hasData: false },
          trialBalance: { totalDebits: 0, totalCredits: 0, isBalanced: true, entries: [] },
          upcomingDeadlines: [],
          hasBudget: false,
          cashBalance: 0,
        },
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
        currentTenant.currency || 'CAD',
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

  // Only show error if all queries fail AND we have no data (even fallback)
  // Since we always have mock data fallback in local dev, we should rarely show errors
  const error = useMemo(() => {
    // If we have transformed data (either from GraphQL or mock), no error
    if (transformedData) return null;

    // In local dev with mock auth, never show errors (always use mock data)
    if (isMockAuthEnabled()) {
      return null;
    }

    // Only show error if all queries failed and we somehow have no data
    if (summaryError && trendsError && accountsError) {
      return new Error('Failed to fetch financial data from server');
    }
    return null;
  }, [summaryError, trendsError, accountsError, transformedData]);

  // Refresh function - includes all real data queries
  const refresh = useCallback(async () => {
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

  // Check if we should use mock data
  // IMPORTANT: Free users ALWAYS get mock data. Paid users see real data or connection gate.
  const shouldUseMockData = useMemo(() => {
    const plan = currentTenant?.plan || 'free';
    const isFreeUser = plan === 'free';

    // FREE users ALWAYS get mock data - they cannot connect datasources
    if (isFreeUser) return true;

    // Paid users with connection get real data
    if (hasRealConnection) return false;

    // In mock auth mode (local dev), use mock data for paid users without connection
    if (isMockAuthEnabled()) return true;

    // Paid users without connection - return false (blocked by connection gate)
    return false;
  }, [hasRealConnection, currentTenant?.plan]);

  const {
    data: queryData,
    loading,
    error: queryError,
    refetch,
  } = useBalanceSheetQuery(asOfDateObj, { skip: shouldUseMockData });

  // Transform GraphQL response to BalanceSheetData format
  const transformedData = useMemo((): BalanceSheetData | null => {
    if (!queryData?.balanceSheet) {
      // Only fall back to mock if we should use mock data
      if (shouldUseMockData && currentTenant) {
        const mockData = generateMockFinancialData(
          currentTenant.id,
          currentTenant.name,
          currentTenant.currency || 'CAD',
          asOfDate,
        );
        return mockData.balanceSheet;
      }
      // Real connection but no data yet - return null (loading/empty state)
      return null;
    }

    const bs = queryData.balanceSheet;
    return {
      asOfDate: bs.asOfDate,
      assets: {
        current:
          bs.assets
            ?.filter((a: { balance: number; level: number }) => a.level <= 2)
            .map(
              (a: {
                accountCode: string;
                accountName: string;
                balance: number;
                isSubtotal?: boolean;
              }) => ({
                code: a.accountCode || '',
                name: a.accountName,
                nameEn: a.accountName,
                current: a.balance || 0,
                prior: 0,
                isHeader: a.isSubtotal || false,
              }),
            ) || [],
        fixed: [],
        total: bs.totalAssets || 0,
      },
      liabilities: {
        current:
          bs.liabilities
            ?.filter((l: { balance: number; level: number }) => l.level <= 2)
            .map(
              (l: {
                accountCode: string;
                accountName: string;
                balance: number;
                isSubtotal?: boolean;
              }) => ({
                code: l.accountCode || '',
                name: l.accountName,
                nameEn: l.accountName,
                current: l.balance || 0,
                prior: 0,
                isHeader: l.isSubtotal || false,
              }),
            ) || [],
        longTerm: [],
        total: bs.totalLiabilities || 0,
      },
      equity: {
        items:
          bs.equity?.map(
            (e: {
              accountCode: string;
              accountName: string;
              balance: number;
              isSubtotal?: boolean;
            }) => ({
              code: e.accountCode || '',
              name: e.accountName,
              nameEn: e.accountName,
              current: e.balance || 0,
              prior: 0,
              isHeader: e.isSubtotal || false,
            }),
          ) || [],
        total: bs.totalEquity || 0,
      },
      totalLiabilitiesAndEquity: (bs.totalLiabilities || 0) + (bs.totalEquity || 0),
      currency: bs.currency || 'CAD',
    };
  }, [queryData, currentTenant, asOfDate, shouldUseMockData]);

  const error = queryError ? new Error(queryError.message) : null;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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

  // Check if we should use mock data
  // IMPORTANT: Free users ALWAYS get mock data. Paid users see real data or connection gate.
  const shouldUseMockData = useMemo(() => {
    const plan = currentTenant?.plan || 'free';
    const isFreeUser = plan === 'free';

    // FREE users ALWAYS get mock data - they cannot connect datasources
    if (isFreeUser) return true;

    // Paid users with connection get real data
    if (hasRealConnection) return false;

    // In mock auth mode (local dev), use mock data for paid users without connection
    if (isMockAuthEnabled()) return true;

    // Paid users without connection - return false (blocked by connection gate)
    return false;
  }, [hasRealConnection, currentTenant?.plan]);

  const {
    data: queryData,
    loading,
    error: queryError,
    refetch,
  } = useIncomeStatementQuery(startDateObj, endDateObj, { skip: shouldUseMockData });

  // Transform GraphQL response to IncomeStatementData format
  const transformedData = useMemo((): IncomeStatementData | null => {
    if (!queryData?.incomeStatement) {
      // Only fall back to mock if we should use mock data
      if (shouldUseMockData && currentTenant) {
        const mockData = generateMockFinancialData(
          currentTenant.id,
          currentTenant.name,
          currentTenant.currency || 'CAD',
          endDate,
        );
        return mockData.incomeStatement;
      }
      // Real connection but no data yet - return null (loading/empty state)
      return null;
    }

    const is = queryData.incomeStatement;
    return {
      periodStart: is.startDate,
      periodEnd: is.endDate,
      revenue: {
        items:
          is.revenue?.map(
            (r: {
              accountCode: string;
              accountName: string;
              amount: number;
              budget?: number;
              variance?: number;
            }) => ({
              code: r.accountCode || '',
              name: r.accountName,
              nameEn: r.accountName,
              current: r.amount || 0,
              budget: r.budget || 0,
              variance: r.variance || 0,
            }),
          ) || [],
        total: is.grossRevenue || 0,
      },
      expenses: {
        items:
          is.expenses?.map(
            (e: {
              accountCode: string;
              accountName: string;
              amount: number;
              budget?: number;
              variance?: number;
            }) => ({
              code: e.accountCode || '',
              name: e.accountName,
              nameEn: e.accountName,
              current: e.amount || 0,
              budget: e.budget || 0,
              variance: e.variance || 0,
            }),
          ) || [],
        total: is.totalExpenses || 0,
      },
      netIncome: is.netIncome || 0,
      currency: is.currency || 'CAD',
    };
  }, [queryData, currentTenant, endDate, shouldUseMockData]);

  const error = queryError ? new Error(queryError.message) : null;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
