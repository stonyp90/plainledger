import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { config } from '../../lib/config';
import { useAuth } from '../../lib/keycloak';
import {
  Users,
  Link as LinkIcon,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react';

interface FunnelMetrics {
  signups: number;
  connected: number;
  firstSync: number;
  viewedReport: number;
  converted: number;
}

interface Trial {
  id: string;
  organizationName: string;
  email: string;
  daysRemaining: number;
  progress: number;
  lastActivity: string;
  status: 'active' | 'at_risk' | 'converted' | 'expired';
}

export default function AdminOnboarding() {
  const { language } = useI18n();
  const { token } = useAuth();
  const isEn = language === 'en';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [atRisk, setAtRisk] = useState<Trial[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const baseUrl = config.api.baseUrl;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        // Fetch all data in parallel
        const [funnelRes, trialsRes, atRiskRes] = await Promise.allSettled([
          fetch(`${baseUrl}/api/admin/onboarding/funnel`, { headers }),
          fetch(`${baseUrl}/api/admin/onboarding/trials`, { headers }),
          fetch(`${baseUrl}/api/admin/onboarding/at-risk`, { headers }),
        ]);

        // Process funnel metrics
        if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) {
          const data = await funnelRes.value.json();
          setFunnel(data);
        } else {
          // Use mock data for development
          setFunnel({
            signups: 0,
            connected: 0,
            firstSync: 0,
            viewedReport: 0,
            converted: 0,
          });
        }

        // Process trials
        if (trialsRes.status === 'fulfilled' && trialsRes.value.ok) {
          const data = await trialsRes.value.json();
          setTrials(data.trials || []);
        } else {
          setTrials([]);
        }

        // Process at-risk
        if (atRiskRes.status === 'fulfilled' && atRiskRes.value.ok) {
          const data = await atRiskRes.value.json();
          setAtRisk(data.atRisk || []);
        } else {
          setAtRisk([]);
        }
      } catch (err) {
        console.error('Failed to fetch onboarding data:', err);
        setError(isEn ? 'Failed to load data' : 'Échec du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, isEn]);

  const funnelSteps = [
    { key: 'signups', icon: Users, label: isEn ? 'Signups' : 'Inscriptions', color: 'primary' },
    { key: 'connected', icon: LinkIcon, label: isEn ? 'Connected' : 'Connectés', color: 'info' },
    { key: 'firstSync', icon: RefreshCw, label: isEn ? 'First Sync' : 'Première sync', color: 'warning' },
    { key: 'viewedReport', icon: FileText, label: isEn ? 'Viewed Report' : 'Rapport vu', color: 'accent' },
    { key: 'converted', icon: CheckCircle2, label: isEn ? 'Converted' : 'Convertis', color: 'success' },
  ];

  const getStatusBadge = (status: Trial['status']) => {
    const styles = {
      active: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
      at_risk: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
      converted: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
      expired: { bg: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' },
    };
    const labels = {
      active: isEn ? 'Active' : 'Actif',
      at_risk: isEn ? 'At Risk' : 'À risque',
      converted: isEn ? 'Converted' : 'Converti',
      expired: isEn ? 'Expired' : 'Expiré',
    };
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded-full"
        style={{ backgroundColor: styles[status].bg, color: styles[status].color }}
      >
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Onboarding Tracker' : 'Suivi d\'intégration'}
        </h1>
        <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Monitor trial conversions and onboarding progress' : 'Suivez les conversions d\'essai et la progression'}
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-lg border flex items-center gap-3"
          style={{
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            borderColor: 'rgb(var(--color-error) / 0.2)',
            color: 'rgb(var(--color-error))',
          }}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Conversion Funnel */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <h2 className="text-lg font-semibold mb-6" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Conversion Funnel' : 'Entonnoir de conversion'}
        </h2>

        <div className="flex items-end justify-between gap-4">
          {funnelSteps.map((step, index) => {
            const Icon = step.icon;
            const value = funnel?.[step.key as keyof FunnelMetrics] ?? 0;
            const maxValue = funnel?.signups || 1;
            const height = Math.max(20, (value / maxValue) * 100);

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t-lg transition-all duration-500 flex items-end justify-center pb-3"
                  style={{
                    height: `${height}px`,
                    minHeight: '60px',
                    backgroundColor:
                      step.color === 'primary' ? 'rgb(var(--color-primary-500))' :
                      step.color === 'info' ? 'rgb(var(--color-info))' :
                      step.color === 'warning' ? 'rgb(var(--color-warning))' :
                      step.color === 'accent' ? 'rgb(var(--color-accent-500))' :
                      'rgb(var(--color-success))',
                  }}
                >
                  <span className="text-2xl font-bold text-white">{isLoading ? '...' : value}</span>
                </div>
                <div className="mt-3 text-center">
                  <Icon
                    className="w-5 h-5 mx-auto mb-1"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {step.label}
                  </span>
                </div>
                {index < funnelSteps.length - 1 && (
                  <div
                    className="absolute h-0.5 w-8 right-0 top-1/2"
                    style={{ backgroundColor: 'rgb(var(--color-border))' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Trials Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Active Trials' : 'Essais actifs'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Organization' : 'Organisation'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Days Remaining' : 'Jours restants'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Progress' : 'Progression'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Last Activity' : 'Dernière activité'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    {isEn ? 'Loading...' : 'Chargement...'}
                  </td>
                </tr>
              ) : trials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {isEn ? 'No active trials' : 'Aucun essai actif'}
                  </td>
                </tr>
              ) : (
                trials.map((trial) => (
                  <tr key={trial.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {trial.organizationName}
                      </div>
                      <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {trial.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" style={{ color: trial.daysRemaining <= 3 ? 'rgb(var(--color-error))' : 'rgb(var(--color-text-secondary))' }} />
                        <span
                          className="font-medium"
                          style={{ color: trial.daysRemaining <= 3 ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))' }}
                        >
                          {trial.daysRemaining} {isEn ? 'days' : 'jours'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${trial.progress}%`,
                              backgroundColor: 'rgb(var(--color-primary-500))',
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10" style={{ color: 'rgb(var(--color-text))' }}>
                          {trial.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {trial.lastActivity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Trials */}
      {atRisk.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-warning) / 0.3)',
          }}
        >
          <div
            className="p-6 border-b flex items-center gap-3"
            style={{
              backgroundColor: 'rgb(var(--color-warning) / 0.1)',
              borderColor: 'rgb(var(--color-warning) / 0.2)',
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-warning))' }}>
              {isEn ? 'At-Risk Trials' : 'Essais à risque'}
            </h2>
            <span
              className="ml-auto px-2 py-1 text-xs font-bold rounded-full"
              style={{
                backgroundColor: 'rgb(var(--color-warning))',
                color: 'white',
              }}
            >
              {atRisk.length}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {atRisk.map((trial) => (
              <div
                key={trial.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div>
                  <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {trial.organizationName}
                  </div>
                  <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {trial.daysRemaining} {isEn ? 'days left' : 'jours restants'} • {trial.progress}% {isEn ? 'complete' : 'complété'}
                  </div>
                </div>
                {getStatusBadge(trial.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
