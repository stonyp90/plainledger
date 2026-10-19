/**
 * Hook to check if real financial data is available
 * 
 * Provides boolean flags for different data types to help components
 * decide whether to show content or empty states.
 * 
 * Also checks for QuickBooks connections and allows sandbox data when no connection exists.
 * Sample data is limited to explicitly enabled development authentication.
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
  const { data: connections } = useDataSources();
  const { currentTenant } = useTenant();
  const isFreeUser = currentTenant?.plan === 'free';
  const hasQuickBooksConnection = (connections?.dataSources || []).some(source => ['CONNECTED', 'ACTIVE'].includes(source.status.toUpperCase()));
  const hasRealData = !!data && dataSource === 'graphql';
  const hasSandboxData = !!data && dataSource === 'mock' && isMockAuthEnabled();
  const shouldShowSandboxData = hasSandboxData;
  const canShowData = hasRealData || shouldShowSandboxData;

  return useMemo(() => {
    const hasAccounts = canShowData && !!data?.accounts.length;
    const hasRevenueTrends = canShowData && !!data?.trends.revenue.data.length;
    const hasExpenseTrends = canShowData && !!data?.trends.expenses.data.length;
    const hasCashFlowTrends = canShowData && !!data?.trends.cashFlow.data.length;
    const hasTrends = hasRevenueTrends || hasExpenseTrends || hasCashFlowTrends;
    const hasTrialBalance = canShowData && !!data?.summary.trialBalance.entries.length;
    const hasReceivables = canShowData && !!data?.summary.receivables.hasData;
    const hasPayables = canShowData && !!data?.summary.payables.hasData;
    const hasBalanceSheet = canShowData && !!data?.balanceSheet && [
      ...data.balanceSheet.assets.currentAssets, ...data.balanceSheet.assets.fixedAssets,
      ...(data.balanceSheet.assets.otherAssets || []), ...(data.balanceSheet.assets.unclassifiedAssets || []),
      ...data.balanceSheet.liabilities.currentLiabilities, ...data.balanceSheet.liabilities.longTermLiabilities,
      ...(data.balanceSheet.liabilities.unclassifiedLiabilities || []), ...data.balanceSheet.equity,
    ].length > 0;
    const hasIncomeStatement = canShowData && !!data?.incomeStatement && [
      ...data.incomeStatement.revenue, ...data.incomeStatement.costOfGoodsSold, ...data.incomeStatement.operatingExpenses,
      ...data.incomeStatement.otherIncome, ...data.incomeStatement.otherExpenses, ...(data.incomeStatement.unclassifiedExpenses || []),
    ].length > 0;
    const hasCashFlowStatement = canShowData && (!!data?.cashFlow || !!data?.cashFlowWaterfall.length);
    const hasObservation = hasAccounts || hasTrends || hasTrialBalance || hasCashFlowStatement || !!data?.summary.bankAccounts.length ||
      !!(data && [data.summary.revenue.current, data.summary.expenses.current, data.summary.cash.current].some(value => Number.isFinite(value) && value !== 0));
    // Zero cash and overdrafts are valid observations. Empty summary defaults are not observations.
    const hasCashBalance = canShowData && hasObservation && Number.isFinite(data?.summary.cash.current);
    const hasSummaryMetrics = canShowData && hasObservation;
    const hasBudget = canShowData && !!data?.summary.hasBudget;
    const sections = [
      { name: 'accounts', has: hasAccounts }, { name: 'balanceSheet', has: hasBalanceSheet },
      { name: 'incomeStatement', has: hasIncomeStatement }, { name: 'cashFlow', has: hasCashFlowStatement },
      { name: 'trends', has: hasTrends }, { name: 'receivables', has: hasReceivables }, { name: 'payables', has: hasPayables },
    ];
    const dataAvailability: DataAvailability = {
      hasAccounts, hasTransactions: hasTrialBalance, hasBalanceSheet, hasIncomeStatement,
      hasCashFlow: hasCashFlowStatement, hasTrends, hasBenchmarks: false,
      hasAnomalies: canShowData && !!data?.demoAnomalies.length,
      completenessScore: Math.round(sections.filter(section => section.has).length / sections.length * 100),
      missingDataSections: sections.filter(section => !section.has).map(section => section.name),
    };
    return {
      hasRealData, hasQuickBooksConnection, hasSandboxData, isFreeUser, shouldShowSandboxData,
      dataAvailability, hasAccounts, hasRevenueTrends, hasExpenseTrends, hasCashFlowTrends, hasTrends,
      hasReceivables, hasPayables, hasBalanceSheet, hasIncomeStatement, hasCashFlowStatement,
      hasTrialBalance, hasCashBalance, hasSummaryMetrics, hasBudget,
    };
  }, [data, canShowData, hasRealData, hasQuickBooksConnection, hasSandboxData, isFreeUser, shouldShowSandboxData]);
}
