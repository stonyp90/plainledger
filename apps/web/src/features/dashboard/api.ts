/**
 * Dashboard Feature - API Layer
 * 
 * API calls for dashboard data.
 */

import { apiClient } from '../../infrastructure/api';
import type { DashboardData, DashboardSummary } from './types';
import type { FinancialMetrics } from '../reports/types';

// ============================================================================
// DASHBOARD API
// ============================================================================

export const dashboardApi = {
  /**
   * Get full dashboard data
   */
  getDashboard: () =>
    apiClient.get<DashboardData>('/dashboard'),

  /**
   * Get dashboard summary only
   */
  getSummary: () =>
    apiClient.get<DashboardSummary>('/dashboard/summary'),

  /**
   * Get financial metrics
   */
  getMetrics: () =>
    apiClient.get<FinancialMetrics>('/dashboard/metrics'),

  /**
   * Get KPI data for a specific metric
   */
  getKpi: (metric: string, params?: { period?: string }) =>
    apiClient.get<{ value: number; change: number; trend: number[] }>(
      `/dashboard/kpi/${metric}`, 
      { params }
    ),

  /**
   * Refresh dashboard data (invalidate cache)
   */
  refresh: () =>
    apiClient.post<{ refreshedAt: string }>('/dashboard/refresh'),
};

export default dashboardApi;
