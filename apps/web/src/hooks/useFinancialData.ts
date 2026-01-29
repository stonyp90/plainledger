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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { 
  useDashboardSummary, 
  useFinancialTrends, 
  useAccounts,
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
export function useFinancialData(options: { 
  asOfDate?: string;
  autoFetch?: boolean;
} = {}): UseFinancialDataResult {
  const { autoFetch = true } = options;
  const { currentTenant } = useTenant();
  const { isDemoMode } = useDemoMode();
  
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Check if we should use mock/demo data
  // Free tier accounts and demo mode users always see demo data
  const shouldUseMockData = useMemo(() => {
    const isFreeAccount = currentTenant?.plan === 'free';
    const hasDemoModeEnabled = currentTenant?.settings?.demoMode === true || isDemoMode;
    const useMock = isFreeAccount || hasDemoModeEnabled;
    if (useMock) {
      console.log('[useFinancialData] Using mock data - free tier or demo mode', {
        isFreeAccount,
        hasDemoModeEnabled,
        plan: currentTenant?.plan,
        isDemoMode,
      });
    }
    return useMock;
  }, [currentTenant?.plan, currentTenant?.settings?.demoMode, isDemoMode]);

  // Fetch dashboard summary from GraphQL (no filter - use defaults)
  // Skip if using mock data
  const { 
    data: summaryQueryData, 
    loading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useDashboardSummary({ filter: undefined, skip: shouldUseMockData });
  const summaryData = shouldUseMockData ? null : summaryQueryData;

  // Fetch financial trends from GraphQL - skip if using mock data
  const { 
    data: trendsQueryData, 
    loading: trendsLoading, 
    error: trendsError,
    refetch: refetchTrends 
  } = useFinancialTrends(['revenue', 'expenses', 'cashFlow'], { skip: shouldUseMockData });
  const trendsData = shouldUseMockData ? null : trendsQueryData;

  // Fetch accounts from GraphQL - skip if using mock data
  const { 
    data: accountsQueryData, 
    loading: accountsLoading, 
    error: accountsError,
    refetch: refetchAccounts 
  } = useAccounts(undefined, { page: 1, pageSize: 100 }, { skip: shouldUseMockData });
  const accountsData = shouldUseMockData ? null : accountsQueryData;

  // Fetch real trial balance data - skip if using mock data
  const {
    data: trialBalanceQueryData,
    loading: trialBalanceLoading,
    refetch: refetchTrialBalance
  } = useTrialBalance({ skip: shouldUseMockData });
  const trialBalanceData = shouldUseMockData ? null : trialBalanceQueryData?.trialBalance;

  // Fetch real cash flow waterfall data - skip if using mock data
  const {
    data: waterfallQueryData,
    loading: waterfallLoading,
    refetch: refetchWaterfall
  } = useCashFlowWaterfall({ startDate: undefined, endDate: undefined, skip: shouldUseMockData });
  const waterfallData = shouldUseMockData ? null : waterfallQueryData?.cashFlowWaterfall;

  // Fetch real AR aging data - skip if using mock data
  const {
    data: arAgingQueryData,
    loading: arAgingLoading,
    refetch: refetchARaging
  } = useReceivablesAging({ skip: shouldUseMockData });
  const arAgingData = shouldUseMockData ? null : arAgingQueryData?.receivablesAging;

  // Fetch real AP aging data (may return hasData: false if no bills tracked) - skip if using mock data
  const {
    data: apAgingQueryData,
    loading: apAgingLoading,
    refetch: refetchAPaging
  } = usePayablesAging({ skip: shouldUseMockData });
  const apAgingData = shouldUseMockData ? null : apAgingQueryData?.payablesAging;

  // Fetch real tax deadlines (calculated from fiscal year and province) - skip if using mock data
  const {
    data: taxDeadlinesQueryData,
    loading: taxDeadlinesLoading,
    refetch: refetchTaxDeadlines
  } = useTaxDeadlines({ skip: shouldUseMockData });
  const taxDeadlinesData = shouldUseMockData ? null : taxDeadlinesQueryData?.taxDeadlines;

  // Fetch budget settings - skip if using mock data
  const {
    data: budgetQueryData,
    loading: budgetLoading,
    refetch: refetchBudget
  } = useBudgetSettings({ skip: shouldUseMockData });
  const budgetData = shouldUseMockData ? null : budgetQueryData?.budgetSettings;

  // Check if we have real data from GraphQL
  const hasGraphQLData = useMemo(() => {
    const hasData = !!(summaryData?.dashboardSummary || trendsData?.financialTrends || accountsData?.accounts);
    console.log('[useFinancialData] GraphQL data check:', {
      hasData,
      summaryData: summaryData?.dashboardSummary,
      summaryError: summaryError?.message,
      trendsData: trendsData?.financialTrends,
      trendsError: trendsError?.message,
      accountsData: accountsData?.accounts?.nodes?.length,
      accountsError: accountsError?.message,
    });
    return hasData;
  }, [summaryData, trendsData, accountsData, summaryError, trendsError, accountsError]);

  // Transform GraphQL data to FinancialDataResponse format
  const transformedData = useMemo((): FinancialDataResponse | null => {
    if (!currentTenant) return null;

    // If we have GraphQL data, use it
    if (hasGraphQLData) {
      const summary = summaryData?.dashboardSummary;
      const trends = trendsData?.financialTrends || [];
      const accounts = accountsData?.accounts?.nodes || [];

      // Get mock data as fallback for fields not yet in GraphQL
      const mockData = generateMockFinancialData(
        currentTenant.id,
        currentTenant.name,
        currentTenant.currency || 'CAD',
        new Date().toISOString().split('T')[0]
      );

      // Transform GraphQL trends to expected format
      const revenueTrend = trends.find((t: { metricName: string }) => t.metricName.toLowerCase() === 'revenue');
      const expensesTrend = trends.find((t: { metricName: string }) => t.metricName.toLowerCase() === 'expenses');
      const cashFlowTrend = trends.find((t: { metricName: string }) => t.metricName.toLowerCase() === 'cashflow');

      const transformTrendData = (trendData: { data: Array<{ date: string; value: number }> } | undefined) => {
        if (!trendData?.data || trendData.data.length === 0) return mockData.trends.revenue.data;
        return trendData.data.map((d: { date: string; value: number }) => ({
          // The date field from GraphQL is already a month abbreviation like "Jan", "Feb"
          // Use it directly instead of trying to parse as ISO date
          period: d.date,
          value: d.value,
        }));
      };

      // Build response with real data where available
      return {
        ...mockData,
        // Override with real data from GraphQL
        summary: summary ? {
          ...mockData.summary,
          revenue: {
            ...mockData.summary.revenue,
            current: summary.totalRevenue?.amount || mockData.summary.revenue.current,
            ytd: summary.totalRevenue?.amount || mockData.summary.revenue.ytd,
          },
          expenses: {
            ...mockData.summary.expenses,
            current: summary.totalExpenses?.amount || mockData.summary.expenses.current,
            ytd: summary.totalExpenses?.amount || mockData.summary.expenses.ytd,
          },
          netIncome: {
            ...mockData.summary.netIncome,
            current: summary.netIncome?.amount || mockData.summary.netIncome.current,
            ytd: summary.netIncome?.amount || mockData.summary.netIncome.ytd,
          },
          cash: {
            ...mockData.summary.cash,
            current: summary.cashOnHand?.amount || mockData.summary.cash.current,
          },
          receivables: {
            ...mockData.summary.receivables,
            current: summary.accountsReceivable?.amount || mockData.summary.receivables.current,
            hasData: arAgingData?.hasData ?? true, // Default to true for mock data
            // Use real AR aging data if available
            ...(arAgingData?.hasData ? {
              aging: arAgingData.buckets.map(b => ({
                label: b.label,
                labelEn: b.labelEn,
                amount: b.amount,
                count: b.count,
              })),
              totalOverdue: arAgingData.totalOverdue,
              averageDaysOutstanding: arAgingData.averageDays,
            } : {}),
          },
          payables: {
            ...mockData.summary.payables,
            current: summary.accountsPayable?.amount || mockData.summary.payables.current,
            hasData: apAgingData?.hasData ?? true, // Will be false if no bills tracked
            // Use real AP aging data if available (hasData: false means no bills tracked)
            ...(apAgingData?.hasData ? {
              aging: apAgingData.buckets.map(b => ({
                label: b.label,
                labelEn: b.labelEn,
                amount: b.amount,
                count: b.count,
              })),
              totalOverdue: apAgingData.totalOverdue,
              averageDaysPayable: apAgingData.averageDays,
            } : {}),
          },
          // Use real trial balance data if available
          trialBalance: trialBalanceData ? {
            totalDebits: trialBalanceData.totalDebits,
            totalCredits: trialBalanceData.totalCredits,
            isBalanced: trialBalanceData.isBalanced,
            entries: trialBalanceData.entries.map(e => ({
              code: e.accountCode,
              name: e.accountName,
              nameEn: e.accountName,
              debit: e.debitBalance,
              credit: e.creditBalance,
              type: e.accountType.toLowerCase() as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
            })),
          } : mockData.summary.trialBalance,
          // Use real tax deadlines if available
          upcomingDeadlines: taxDeadlinesData?.deadlines.length 
            ? taxDeadlinesData.deadlines.map(d => ({
                id: d.id,
                title: d.title,
                titleEn: d.titleEn,
                description: d.description,
                dueDate: d.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                daysRemaining: d.daysRemaining,
                status: d.status as 'upcoming' | 'urgent' | 'overdue',
                category: d.category as 'tax' | 'filing' | 'payroll' | 'other',
              }))
            : mockData.summary.upcomingDeadlines,
          // Budget data
          hasBudget: budgetData?.hasBudget ?? false,
          budgetYear: budgetData?.year,
        } : mockData.summary,
        trends: {
          revenue: {
            label: 'Revenus',
            labelEn: 'Revenue',
            data: transformTrendData(revenueTrend),
            budget: mockData.trends.revenue.budget,
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
          profit: mockData.trends.profit,
        },
        accounts: accounts.length > 0 ? accounts.map((a: {
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
        })) : mockData.accounts,
        // Use real waterfall data if available
        cashFlowWaterfall: waterfallData && waterfallData.length > 0 
          ? waterfallData.map(item => ({
              label: item.label,
              labelEn: item.labelEn,
              value: item.value,
              type: item.type as 'start' | 'increase' | 'decrease' | 'subtotal' | 'end',
              category: item.category as 'operations' | 'investing' | 'financing' | undefined,
            }))
          : mockData.cashFlowWaterfall,
        lastUpdated: new Date().toISOString(),
        dataSource: 'graphql-gold-layer', // Data comes from S3 Gold layer via GraphQL
      };
    }

    // Fall back to mock data if GraphQL fails
    return generateMockFinancialData(
      currentTenant.id,
      currentTenant.name,
      currentTenant.currency || 'CAD',
      new Date().toISOString().split('T')[0]
    );
  }, [currentTenant, hasGraphQLData, summaryData, trendsData, accountsData, trialBalanceData, waterfallData, arAgingData, apAgingData, taxDeadlinesData, budgetData]);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (transformedData) {
      setLastUpdated(transformedData.lastUpdated);
    }
  }, [transformedData]);

  // Combined loading state - include real data queries
  const isLoading = summaryLoading || trendsLoading || accountsLoading || 
    trialBalanceLoading || waterfallLoading || arAgingLoading || apAgingLoading ||
    taxDeadlinesLoading || budgetLoading;

  // Only show error if all queries fail AND we have no data (even fallback)
  // Since we always have mock data fallback, we should rarely show errors
  const error = useMemo(() => {
    // If we have transformed data (either from GraphQL or mock), no error
    if (transformedData) return null;
    
    // Only show error if all queries failed and we somehow have no data
    if (summaryError && trendsError && accountsError) {
      return new Error('Failed to fetch financial data from server');
    }
    return null;
  }, [summaryError, trendsError, accountsError, transformedData]);

  // Refresh function - includes all real data queries
  const refresh = useCallback(async () => {
    await Promise.all([
      refetchSummary(),
      refetchTrends(),
      refetchAccounts(),
      refetchTrialBalance(),
      refetchWaterfall(),
      refetchARaging(),
      refetchAPaging(),
      refetchTaxDeadlines(),
      refetchBudget(),
    ].filter(Boolean));
  }, [refetchSummary, refetchTrends, refetchAccounts, refetchTrialBalance, refetchWaterfall, refetchARaging, refetchAPaging, refetchTaxDeadlines, refetchBudget]);

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
  const asOfDateObj = asOfDate ? new Date(asOfDate) : new Date();
  
  const { 
    data: queryData, 
    loading, 
    error: queryError, 
    refetch 
  } = useBalanceSheetQuery(asOfDateObj);
  
  // Transform GraphQL response to BalanceSheetData format
  const transformedData = useMemo((): BalanceSheetData | null => {
    if (!queryData?.balanceSheet) {
      // Fall back to mock data if no GraphQL data
      if (!currentTenant) return null;
      const mockData = generateMockFinancialData(
        currentTenant.id,
        currentTenant.name,
        currentTenant.currency || 'CAD',
        asOfDate
      );
      return mockData.balanceSheet;
    }

    const bs = queryData.balanceSheet;
    return {
      asOfDate: bs.asOfDate,
      assets: {
        current: bs.assets
          ?.filter((a: { balance: number; level: number }) => a.level <= 2)
          .map((a: { accountCode: string; accountName: string; balance: number; isSubtotal?: boolean }) => ({
            code: a.accountCode || '',
            name: a.accountName,
            nameEn: a.accountName,
            current: a.balance || 0,
            prior: 0,
            isHeader: a.isSubtotal || false,
          })) || [],
        fixed: [],
        total: bs.totalAssets || 0,
      },
      liabilities: {
        current: bs.liabilities
          ?.filter((l: { balance: number; level: number }) => l.level <= 2)
          .map((l: { accountCode: string; accountName: string; balance: number; isSubtotal?: boolean }) => ({
            code: l.accountCode || '',
            name: l.accountName,
            nameEn: l.accountName,
            current: l.balance || 0,
            prior: 0,
            isHeader: l.isSubtotal || false,
          })) || [],
        longTerm: [],
        total: bs.totalLiabilities || 0,
      },
      equity: {
        items: bs.equity
          ?.map((e: { accountCode: string; accountName: string; balance: number; isSubtotal?: boolean }) => ({
            code: e.accountCode || '',
            name: e.accountName,
            nameEn: e.accountName,
            current: e.balance || 0,
            prior: 0,
            isHeader: e.isSubtotal || false,
          })) || [],
        total: bs.totalEquity || 0,
      },
      totalLiabilitiesAndEquity: (bs.totalLiabilities || 0) + (bs.totalEquity || 0),
      currency: bs.currency || 'CAD',
    };
  }, [queryData, currentTenant, asOfDate]);

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
  const startDateObj = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDateObj = endDate ? new Date(endDate) : new Date();
  
  const { 
    data: queryData, 
    loading, 
    error: queryError, 
    refetch 
  } = useIncomeStatementQuery(startDateObj, endDateObj);
  
  // Transform GraphQL response to IncomeStatementData format
  const transformedData = useMemo((): IncomeStatementData | null => {
    if (!queryData?.incomeStatement) {
      // Fall back to mock data if no GraphQL data
      if (!currentTenant) return null;
      const mockData = generateMockFinancialData(
        currentTenant.id,
        currentTenant.name,
        currentTenant.currency || 'CAD',
        endDate
      );
      return mockData.incomeStatement;
    }

    const is = queryData.incomeStatement;
    return {
      periodStart: is.startDate,
      periodEnd: is.endDate,
      revenue: {
        items: is.revenue?.map((r: { accountCode: string; accountName: string; amount: number; budget?: number; variance?: number }) => ({
          code: r.accountCode || '',
          name: r.accountName,
          nameEn: r.accountName,
          current: r.amount || 0,
          budget: r.budget || 0,
          variance: r.variance || 0,
        })) || [],
        total: is.grossRevenue || 0,
      },
      expenses: {
        items: is.expenses?.map((e: { accountCode: string; accountName: string; amount: number; budget?: number; variance?: number }) => ({
          code: e.accountCode || '',
          name: e.accountName,
          nameEn: e.accountName,
          current: e.amount || 0,
          budget: e.budget || 0,
          variance: e.variance || 0,
        })) || [],
        total: is.totalExpenses || 0,
      },
      netIncome: is.netIncome || 0,
      currency: is.currency || 'CAD',
    };
  }, [queryData, currentTenant, endDate]);

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
