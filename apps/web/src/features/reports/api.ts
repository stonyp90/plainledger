/**
 * Reports Feature - API Layer
 * 
 * All API calls related to financial reports.
 */

import { apiClient } from '../../infrastructure/api';
import type { 
  ReportListItem, 
  GenerateReportRequest,
  BalanceSheetData,
  IncomeStatementData,
  CashFlowData,
} from './types';

// ============================================================================
// REPORTS API
// ============================================================================

export const reportsApi = {
  /**
   * List all reports for the current tenant
   */
  list: (params?: { type?: string; page?: number; limit?: number }) =>
    apiClient.get<ReportListItem[]>('/reports', { params }),

  /**
   * Get a specific report by ID
   */
  get: (id: string) => 
    apiClient.get<ReportListItem>(`/reports/${id}`),

  /**
   * Generate a new report
   */
  generate: (data: GenerateReportRequest) =>
    apiClient.post<ReportListItem>('/reports/generate', data),

  /**
   * Schedule report generation
   */
  schedule: (data: { reportId: string; schedule: string; recipients: string[] }) =>
    apiClient.post<{ id: string }>('/reports/schedule', data),

  /**
   * Export a report to different formats
   */
  export: (id: string, format: 'pdf' | 'xlsx' | 'csv') =>
    apiClient.get<{ url: string }>(`/reports/${id}/export`, { params: { format } }),

  /**
   * Delete a report
   */
  delete: (id: string) => 
    apiClient.delete(`/reports/${id}`),

  // ============================================================================
  // SPECIFIC REPORT ENDPOINTS
  // ============================================================================

  /**
   * Get balance sheet for a specific date
   */
  getBalanceSheet: (asOfDate: string) =>
    apiClient.get<BalanceSheetData>('/reports/balance-sheet', { params: { asOfDate } }),

  /**
   * Get income statement for a period
   */
  getIncomeStatement: (periodStart: string, periodEnd: string) =>
    apiClient.get<IncomeStatementData>('/reports/income-statement', { 
      params: { periodStart, periodEnd } 
    }),

  /**
   * Get cash flow statement for a period
   */
  getCashFlow: (periodStart: string, periodEnd: string) =>
    apiClient.get<CashFlowData>('/reports/cash-flow', { 
      params: { periodStart, periodEnd } 
    }),
};

export default reportsApi;
