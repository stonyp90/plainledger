/**
 * Reports Feature - Hooks
 * 
 * React hooks for managing report data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { reportsApi } from '../api';
import type { ReportListItem, GenerateReportRequest } from '../types';

// ============================================================================
// USE REPORTS LIST
// ============================================================================

interface UseReportsResult {
  reports: ReportListItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  generateReport: (request: GenerateReportRequest) => Promise<ReportListItem | null>;
  deleteReport: (id: string) => Promise<boolean>;
}

export function useReports(type?: string): UseReportsResult {
  const { currentTenant } = useTenant();
  
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadReports = useCallback(async () => {
    if (!currentTenant) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await reportsApi.list({ type });
      setReports(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, type]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const generateReport = useCallback(async (request: GenerateReportRequest): Promise<ReportListItem | null> => {
    try {
      const response = await reportsApi.generate(request);
      await loadReports(); // Refresh the list
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate report'));
      return null;
    }
  }, [loadReports]);

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      await reportsApi.delete(id);
      await loadReports(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete report'));
      return false;
    }
  }, [loadReports]);

  return {
    reports,
    isLoading,
    error,
    refresh: loadReports,
    generateReport,
    deleteReport,
  };
}

// ============================================================================
// USE REPORT EXPORT
// ============================================================================

interface UseReportExportResult {
  exportReport: (id: string, format: 'pdf' | 'xlsx' | 'csv') => Promise<string | null>;
  isExporting: boolean;
  error: Error | null;
}

export function useReportExport(): UseReportExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportReport = useCallback(async (
    id: string, 
    format: 'pdf' | 'xlsx' | 'csv'
  ): Promise<string | null> => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await reportsApi.export(id, format);
      return response.data.url;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export report'));
      return null;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportReport,
    isExporting,
    error,
  };
}

export default useReports;
