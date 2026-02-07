import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Link2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'accounting' | 'crm' | 'payment' | 'storage';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  organizationsUsing: number;
}

export default function AdminIntegrations() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    // Mock data for now
    setTimeout(() => {
      setIntegrations([
        { id: '1', name: 'QuickBooks Online', type: 'accounting', status: 'connected', lastSync: '2 hours ago', organizationsUsing: 12 },
        { id: '2', name: 'Xero', type: 'accounting', status: 'connected', lastSync: '1 hour ago', organizationsUsing: 5 },
        { id: '3', name: 'Stripe', type: 'payment', status: 'connected', lastSync: '30 minutes ago', organizationsUsing: 8 },
        { id: '4', name: 'HubSpot', type: 'crm', status: 'disconnected', organizationsUsing: 0 },
        { id: '5', name: 'AWS S3', type: 'storage', status: 'connected', organizationsUsing: 15 },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />;
      case 'error':
        return <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />;
      default:
        return <XCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />;
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    const styles = {
      connected: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
      disconnected: { bg: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' },
      error: { bg: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' },
    };
    const labels = {
      connected: isEn ? 'Connected' : 'Connecté',
      disconnected: isEn ? 'Disconnected' : 'Déconnecté',
      error: isEn ? 'Error' : 'Erreur',
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
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Integrations' : 'Intégrations'}
        </h1>
        <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Manage third-party service integrations' : 'Gérer les intégrations de services tiers'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Active' : 'Actives'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {integrations.filter(i => i.status === 'connected').length}
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Issues' : 'Problèmes'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {integrations.filter(i => i.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <Link2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Total' : 'Total'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{integrations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'All Integrations' : 'Toutes les intégrations'}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            {isEn ? 'Loading...' : 'Chargement...'}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {integrations.map((integration) => (
              <div 
              key={integration.id} 
              className="p-4 flex items-center justify-between transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-subtle))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <div className="flex items-center gap-4">
                  {getStatusIcon(integration.status)}
                  <div>
                    <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{integration.name}</div>
                    <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {integration.organizationsUsing} {isEn ? 'organizations' : 'organisations'}
                      {integration.lastSync && ` • ${isEn ? 'Last sync' : 'Dernière sync'}: ${integration.lastSync}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(integration.status)}
                  <button
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={isEn ? 'Settings' : 'Paramètres'}
                  >
                    <Settings className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
