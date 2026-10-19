import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../lib/i18n';
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
  const { language } = useI18n();
  const isEn = language === 'en';
  const { currentTenant } = useTenant();
  const { canAccessPowerBI, isPowerBIEnabled, isLoading: featuresLoading, error: featuresError, refreshFeatures } = useAnalyticsVisibility();
  const toast = useToast();
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generation = useRef(0);
  const loadReports = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setReports([]);
    setSelectedReportId(null);
    setError(null);
    if (!currentTenant?.organizationId || !isPowerBIEnabled || !canAccessPowerBI) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.get<{ reports: AnalyticsReport[] }>('/analytics/reports', {
        params: { organizationId: currentTenant.organizationId },
      });
      if (currentGeneration !== generation.current) return;
      if (!Array.isArray(data.reports)) throw new Error(isEn ? 'The report list response is incomplete.' : 'La réponse de la liste des rapports est incomplète.');
      setReports(data.reports);
      setSelectedReportId(data.reports[0]?.reportId || null);
    } catch (cause) {
      if (currentGeneration === generation.current) setError(cause instanceof Error ? cause.message : (isEn ? 'Failed to load reports.' : 'Échec du chargement des rapports.'));
    } finally { if (currentGeneration === generation.current) setIsLoading(false); }
  }, [currentTenant?.organizationId, isPowerBIEnabled, canAccessPowerBI, isEn]);
  useEffect(() => { void loadReports(); return () => { generation.current += 1; }; }, [loadReports]);

  if (featuresLoading) return <p role="status" className="p-6">{isEn ? 'Loading analytics configuration…' : 'Chargement de la configuration analytique…'}</p>;
  if (featuresError) return <section className="card space-y-3"><h1>{isEn ? 'Analytics configuration unavailable' : 'Configuration analytique indisponible'}</h1><p role="alert">{featuresError}</p><button onClick={() => void refreshFeatures()} className="btn-secondary">{isEn ? 'Try again' : 'Réessayer'}</button></section>;

  const selectedReport = reports.find(r => r.reportId === selectedReportId);

  if (!isPowerBIEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">{isEn ? 'Power BI is not enabled' : 'Power BI n’est pas activé'}</h3>
              <p className="text-yellow-700 text-sm mt-1">
                {isEn ? 'Power BI is not enabled for your organization. Contact your administrator.' : 'Power BI n’est pas activé pour votre organisation. Contactez votre administrateur.'}
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
              <h3 className="font-semibold text-red-900">{isEn ? 'Access denied' : 'Accès refusé'}</h3>
              <p className="text-red-700 text-sm mt-1">
                {isEn ? 'You do not have permission to access Power BI analytics.' : 'Vous n’avez pas la permission d’accéder à Power BI.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              <h3 className="font-semibold text-red-900">{isEn ? 'Reports could not be loaded' : 'Les rapports n’ont pas pu être chargés'}</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg p-8 text-center border" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', borderColor: 'rgb(var(--color-border))' }}>
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{isEn ? 'No reports available' : 'Aucun rapport disponible'}</h3>
          <p className="text-gray-600">
            {isEn ? 'No Power BI reports are configured for your organization.' : 'Aucun rapport Power BI n’est configuré pour votre organisation.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report List Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Reports</h2>
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.reportId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedReportId === report.reportId
                        ? 'font-medium'
                        : ''
                    }`}
                    style={selectedReportId === report.reportId 
                      ? { backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }
                      : { color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {report.reportName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Embed */}
          <div className="lg:col-span-3 min-w-0">
            {selectedReport && currentTenant?.organizationId && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedReport.reportName}
                </h2>
                <PowerBIEmbed
                  reportId={selectedReport.reportId}
                  organizationId={currentTenant.organizationId}
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
