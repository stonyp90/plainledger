/**
 * Hook to check if real financial data is available
 * 
 * Provides boolean flags for different data types to help components
 * decide whether to show content or empty states.
 * 
 * Also checks for QuickBooks connections and allows sandbox data when no connection exists.
 * IMPORTANT: Sandbox data is ONLY shown to free users. Paid users see empty states.
 */

import { useMemo } from 'react';
import { useFinancialData } from './useFinancialData';
import { useDataSources } from '../lib/graphql/hooks';
import { useTenant } from '../contexts/TenantContext';
import { isMockAuthEnabled } from '../lib/keycloak';

export interface DataAvailability {
  // Core financial data
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasBalanceSheet: boolean;
  hasIncomeStatement: boolean;
  hasCashFlow: boolean;
  
  // Analysis data
  hasTrends: boolean;        // Needs 3+ months
  hasBenchmarks: boolean;    // Needs industry + metrics
  hasAnomalies: boolean;     // Needs transactions
  
  // Completeness indicators
  completenessScore: number; // 0-100%
  missingDataSections: string[];
}

export interface HasRealDataResult {
  /** True if data source is GraphQL (real data), false if mock */
  hasRealData: boolean;
  /** True if QuickBooks (or any accounting software) is connected */
  hasQuickBooksConnection: boolean;
  /** True if sandbox/mock data is available (fallback when no connection) */
  hasSandboxData: boolean;
  /** True if user is on free plan */
  isFreeUser: boolean;
  /** True if sandbox data should be shown (only for free users without connection) */
  shouldShowSandboxData: boolean;
  /** Detailed breakdown of data availability */
  dataAvailability: DataAvailability;
  /** True if accounts data exists (real or sandbox) */
  hasAccounts: boolean;
  /** True if revenue trends data exists (real or sandbox) */
  hasRevenueTrends: boolean;
  /** True if expense trends data exists (real or sandbox) */
  hasExpenseTrends: boolean;
  /** True if cash flow trends data exists (real or sandbox) */
  hasCashFlowTrends: boolean;
  /** True if any trends data exists (real or sandbox) */
  hasTrends: boolean;
  /** True if receivables aging data exists */
  hasReceivables: boolean;
  /** True if payables aging data exists */
  hasPayables: boolean;
  /** True if balance sheet data exists */
  hasBalanceSheet: boolean;
  /** True if income statement data exists */
  hasIncomeStatement: boolean;
  /** True if cash flow statement data exists */
  hasCashFlowStatement: boolean;
  /** True if trial balance data exists */
  hasTrialBalance: boolean;
  /** True if cash balance data exists */
  hasCashBalance: boolean;
  /** True if summary metrics exist */
  hasSummaryMetrics: boolean;
  /** True if budget data exists */
  hasBudget: boolean;
}

/**
 * Hook to check availability of real financial data
 * 
 * @returns Object with boolean flags for different data types
 */
export function useHasRealData(): HasRealDataResult {
  const { data, dataSource } = useFinancialData();
  const { data: dataSourcesQueryResult, loading: dataSourcesLoading } = useDataSources();
  const { currentTenant } = useTenant();
  
  const hasRealData = dataSource === 'graphql';
  
  // Determine if user is on free tier
  const isFreeUser = useMemo(() => {
    const plan = currentTenant?.plan || 'free';
    return plan === 'free';
  }, [currentTenant?.plan]);
  
  // Check if QuickBooks (or any accounting software) is connected
  const hasQuickBooksConnection = useMemo(() => {
    // If still loading, assume no connection yet
    if (dataSourcesLoading) return false;
    
    // Check if we have connected data sources
    const dataSources = dataSourcesQueryResult?.dataSources;
    if (!dataSources || !Array.isArray(dataSources)) return false;
    
    return dataSources.some(
      (ds: { provider: string; status: string }) => {
        const provider = (ds.provider || '').toLowerCase();
        const status = (ds.status || '').toUpperCase();
        // Status can be 'ACTIVE', 'connected', 'CONNECTED', etc.
        const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'connected';
        return (
          (provider === 'quickbooks' || provider === 'xero' || provider === 'sage' || provider === 'freshbooks') &&
          isConnected
        );
      }
    );
  }, [dataSourcesQueryResult, dataSourcesLoading]);
  
  // Check if sandbox/mock data is available (when no connection exists)
  const hasSandboxData = useMemo(() => {
    // If we have a connection, we don't need sandbox data
    if (hasQuickBooksConnection) return false;
    
    // If we have real data, we don't need sandbox data
    if (hasRealData) return false;
    
    // Sandbox data is available if we have mock data (dataSource === 'mock') with actual content
    if (!data || dataSource !== 'mock') return false;
    
    // Check if mock data has meaningful content
    const hasMockAccounts = (data.accounts?.length ?? 0) > 0;
    const hasMockTrends = (data.trends?.revenue?.data?.length ?? 0) > 0 || 
                         (data.trends?.expenses?.data?.length ?? 0) > 0 ||
                         (data.trends?.cashFlow?.data?.length ?? 0) > 0;
    const hasMockSummary = !!(data.summary?.revenue || data.summary?.expenses || data.summary?.cash);
    
    return hasMockAccounts || hasMockTrends || hasMockSummary;
  }, [data, dataSource, hasQuickBooksConnection, hasRealData]);
  
  // Sandbox data should be shown:
  // 1. Free users when no connection exists
  // 2. ALL users in mock auth mode (local dev) when no connection exists
  const shouldShowSandboxData = useMemo(() => {
    // In mock auth mode (local dev), always show sandbox data if available (for all users)
    if (isMockAuthEnabled() && hasSandboxData) {
      return true;
    }
    
    // Otherwise, only show to free users
    return isFreeUser && !hasQuickBooksConnection && hasSandboxData;
  }, [isFreeUser, hasQuickBooksConnection, hasSandboxData]);
  
  return useMemo(() => {
    // Calculate data availability
    const calculateDataAvailability = (): DataAvailability => {
      if (!data) {
        return {
          hasAccounts: false,
          hasTransactions: false,
          hasBalanceSheet: false,
          hasIncomeStatement: false,
          hasCashFlow: false,
          hasTrends: false,
          hasBenchmarks: false,
          hasAnomalies: false,
          completenessScore: 0,
          missingDataSections: [],
        };
      }
      
      const hasAccounts = (data.accounts?.length ?? 0) > 0;
      const hasTransactions = hasAccounts; // Transactions inferred from accounts
      const hasBalanceSheet = hasAccounts;
      const hasRevenueTrends = (data.trends?.revenue?.data?.length ?? 0) >= 3; // Need 3+ months for trends
      const hasExpenseTrends = (data.trends?.expenses?.data?.length ?? 0) >= 3;
      const hasCashFlowTrends = (data.trends?.cashFlow?.data?.length ?? 0) >= 3;
      const hasTrends = hasRevenueTrends || hasExpenseTrends || hasCashFlowTrends;
      const hasIncomeStatement = hasRevenueTrends || hasExpenseTrends;
      const hasCashFlow = hasCashFlowTrends || (data.cashFlowWaterfall?.length ?? 0) > 0;
      const hasBenchmarks = hasRealData && !!(currentTenant?.industry && data.summary);
      const hasAnomalies = hasTransactions && (data.demoAnomalies?.length ?? 0) > 0;
      
      // Calculate completeness score
      const sections = [
        { name: 'accounts', has: hasAccounts },
        { name: 'balanceSheet', has: hasBalanceSheet },
        { name: 'incomeStatement', has: hasIncomeStatement },
        { name: 'cashFlow', has: hasCashFlow },
        { name: 'trends', has: hasTrends },
        { name: 'receivables', has: hasRealData && (data.summary?.receivables?.hasData ?? false) },
        { name: 'payables', has: hasRealData && (data.summary?.payables?.hasData ?? false) },
      ];
      
      const completedSections = sections.filter(s => s.has).length;
      const completenessScore = Math.round((completedSections / sections.length) * 100);
      const missingDataSections = sections.filter(s => !s.has).map(s => s.name);
      
      return {
        hasAccounts,
        hasTransactions,
        hasBalanceSheet,
        hasIncomeStatement,
        hasCashFlow,
        hasTrends,
        hasBenchmarks,
        hasAnomalies,
        completenessScore,
        missingDataSections,
      };
    };
    
    const dataAvailability = calculateDataAvailability();
    
    if (!data) {
      return {
        hasRealData: false,
        hasQuickBooksConnection: false,
        hasSandboxData: false,
        isFreeUser,
        shouldShowSandboxData: false,
        dataAvailability,
        hasAccounts: false,
        hasRevenueTrends: false,
        hasExpenseTrends: false,
        hasCashFlowTrends: false,
        hasTrends: false,
        hasReceivables: false,
        hasPayables: false,
        hasBalanceSheet: false,
        hasIncomeStatement: false,
        hasCashFlowStatement: false,
        hasTrialBalance: false,
        hasCashBalance: false,
        hasSummaryMetrics: false,
        hasBudget: false,
      };
    }
    
    // If we have real data, use it
    // If we don't have real data but should show sandbox data (free users only), allow showing sandbox data
    const canShowData = hasRealData || shouldShowSandboxData;
    
    const hasAccounts = canShowData && (data.accounts?.length ?? 0) > 0;
    const hasRevenueTrends = canShowData && (data.trends?.revenue?.data?.length ?? 0) > 0;
    const hasExpenseTrends = canShowData && (data.trends?.expenses?.data?.length ?? 0) > 0;
    const hasCashFlowTrends = canShowData && (data.trends?.cashFlow?.data?.length ?? 0) > 0;
    const hasTrends = hasRevenueTrends || hasExpenseTrends || hasCashFlowTrends;
    
    // For receivables/payables, only show if real data (not sandbox)
    const hasReceivables = hasRealData && (data.summary?.receivables?.hasData ?? false);
    const hasPayables = hasRealData && (data.summary?.payables?.hasData ?? false);
    
    // Balance sheet: check if we have accounts data (needed for balance sheet)
    const hasBalanceSheet = hasAccounts;
    
    // Income statement: check if we have revenue/expense trends
    const hasIncomeStatement = hasRevenueTrends || hasExpenseTrends;
    
    // Cash flow: check if we have cash flow trends or waterfall data
    const hasCashFlowStatement = hasCashFlowTrends || (canShowData && (data.cashFlowWaterfall?.length ?? 0) > 0);
    
    // Trial balance: check if we have accounts
    const hasTrialBalance = hasAccounts;
    
    // Cash balance: check summary cash (allow sandbox)
    const hasCashBalance = canShowData && (data.summary?.cash?.current ?? 0) > 0;
    
    // Summary metrics: check if we have any summary data (allow sandbox)
    const hasSummaryMetrics = canShowData && !!(
      data.summary?.revenue ||
      data.summary?.expenses ||
      data.summary?.netIncome ||
      data.summary?.cash
    );
    
    // Budget: check if budget exists (only real data)
    const hasBudget = hasRealData && (data.summary?.hasBudget ?? false);
    
    return {
      hasRealData,
      hasQuickBooksConnection,
      hasSandboxData,
      isFreeUser,
      shouldShowSandboxData,
      dataAvailability,
      hasAccounts,
      hasRevenueTrends,
      hasExpenseTrends,
      hasCashFlowTrends,
      hasTrends,
      hasReceivables,
      hasPayables,
      hasBalanceSheet,
      hasIncomeStatement,
      hasCashFlowStatement,
      hasTrialBalance,
      hasCashBalance,
      hasSummaryMetrics,
      hasBudget,
    };
  }, [data, hasRealData, hasQuickBooksConnection, hasSandboxData, isFreeUser, shouldShowSandboxData, currentTenant?.industry]);
}
