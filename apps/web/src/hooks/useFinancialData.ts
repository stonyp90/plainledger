/**
 * React hook for fetching and managing financial data
 * 
 * This hook provides:
 * - Automatic data loading for the current tenant
 * - Loading and error states
 * - Refresh functionality
 * - Caching (via React state)
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { 
  fetchFinancialData, 
  fetchBalanceSheet,
  fetchDashboardSummary,
  type FinancialDataResponse,
  type BalanceSheetData,
  type DashboardSummary,
  type FinancialMetrics,
} from '../lib/financialData';

interface UseFinancialDataResult {
  data: FinancialDataResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
}

interface UseBalanceSheetResult {
  data: BalanceSheetData | null;
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
 */
export function useFinancialData(options: { 
  asOfDate?: string;
  autoFetch?: boolean;
} = {}): UseFinancialDataResult {
  const { asOfDate, autoFetch = true } = options;
  const { currentTenant } = useTenant();
  
  const [data, setData] = useState<FinancialDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentTenant) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFinancialData(
        currentTenant.id,
        currentTenant.name,
        { 
          asOfDate,
          currency: currentTenant.currency || 'CAD'
        }
      );
      setData(result);
      setLastUpdated(result.lastUpdated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch financial data'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, asOfDate]);

  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [loadData, autoFetch]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    lastUpdated,
  };
}

/**
 * Hook to fetch balance sheet data
 */
export function useBalanceSheet(asOfDate: string): UseBalanceSheetResult {
  const { currentTenant } = useTenant();
  
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!currentTenant) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchBalanceSheet(
        currentTenant.id,
        currentTenant.name,
        asOfDate
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch balance sheet'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, asOfDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
  };
}

/**
 * Hook to fetch dashboard summary data
 */
export function useDashboardData(): UseDashboardDataResult {
  const { currentTenant } = useTenant();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [trends, setTrends] = useState<FinancialDataResponse['trends'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!currentTenant) {
      setSummary(null);
      setMetrics(null);
      setTrends(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardSummary(
        currentTenant.id,
        currentTenant.name
      );
      setSummary(result.summary);
      setMetrics(result.metrics);
      setTrends(result.trends);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    summary,
    metrics,
    trends,
    isLoading,
    error,
    refresh: loadData,
  };
}

export default useFinancialData;
