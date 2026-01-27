import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAnalyticsVisibility } from '../contexts/AnalyticsVisibilityContext';
import { useTenant } from '../contexts/TenantContext';
import { PowerBIEmbed } from '../components/analytics/PowerBIEmbed';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface AnalyticsReport {
  id: string;
  reportId: string;
  reportName: string;
  workspaceId: string;
  datasetId?: string;
  organizationId?: string;
  businessUnitId?: string;
}

export default function PowerBIAnalytics() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { canAccessPowerBI, isPowerBIEnabled } = useAnalyticsVisibility();
  const toast = useToast();
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPowerBIEnabled || !canAccessPowerBI) {
      navigate('/dashboard');
      return;
    }

    loadReports();
  }, [isPowerBIEnabled, canAccessPowerBI, currentTenant?.organizationId]);

  const loadReports = async () => {
    if (!currentTenant?.organizationId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/analytics/reports', {
        params: {
          organizationId: currentTenant.organizationId,
          businessUnitId: currentTenant.businessUnitId,
        },
      });

      setReports(response.data.reports || []);
      
      if (response.data.reports?.length > 0 && !selectedReportId) {
        setSelectedReportId(response.data.reports[0].reportId);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load reports';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedReport = reports.find(r => r.reportId === selectedReportId);

  if (!isPowerBIEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">Power BI Analytics Not Enabled</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Power BI analytics is not enabled for your organization. Contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessPowerBI) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Access Denied</h3>
              <p className="text-red-700 text-sm mt-1">
                You do not have permission to access Power BI analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Power BI Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Interactive reports and dashboards powered by Power BI
          </p>
        </div>
        <button
          onClick={loadReports}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Reports</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Available</h3>
          <p className="text-gray-600">
            No Power BI reports are configured for your organization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Reports</h2>
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.reportId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedReportId === report.reportId
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {report.reportName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Embed */}
          <div className="lg:col-span-3">
            {selectedReport && currentTenant?.organizationId && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedReport.reportName}
                </h2>
                <PowerBIEmbed
                  reportId={selectedReport.reportId}
                  organizationId={currentTenant.organizationId}
                  businessUnitId={currentTenant.businessUnitId}
                  className="min-h-[600px]"
                  onError={(error) => {
                    setError(error.message);
                    toast.error(`Failed to load report: ${error.message}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
