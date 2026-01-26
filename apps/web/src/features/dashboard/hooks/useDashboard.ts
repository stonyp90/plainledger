/**
 * Dashboard Feature - Hooks
 * 
 * React hooks for dashboard data management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { 
  fetchFinancialData,
  fetchDashboardSummary,
  type FinancialDataResponse,
} from '../../../lib/financialData';
import type { DashboardSummary } from '../types';
import type { FinancialMetrics } from '../../reports/types';

// ============================================================================
// USE DASHBOARD DATA
// ============================================================================

interface UseDashboardDataResult {
  summary: DashboardSummary | null;
  metrics: FinancialMetrics | null;
  trends: FinancialDataResponse['trends'] | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

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
      setSummary(result.summary as DashboardSummary);
      setMetrics(result.metrics as FinancialMetrics);
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

// ============================================================================
// USE FINANCIAL DATA (Full)
// ============================================================================

interface UseFinancialDataResult {
  data: FinancialDataResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
}

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
          currency: currentTenant.settings?.currency || 'CAD'
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

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
    lastUpdated,
  };
}

export default useDashboardData;
