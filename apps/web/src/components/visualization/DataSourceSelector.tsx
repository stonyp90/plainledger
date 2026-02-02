/**
 * DataSourceSelector Component
 * 
 * Data source selection for dashboard wizard with:
 * - QuickBooks sandbox option
 * - Connected data sources display
 * - Connect new source option
 * - Support contact option
 * 
 * Bilingual support (EN/FR)
 */

import { useState } from 'react';
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Plus,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import type { DataSourceInfo } from './types';

// =====================================================
// TYPES
// =====================================================

interface DataSourceSelectorProps {
  dataSources: DataSourceInfo[];
  selectedSource?: string;
  onSelectSource: (sourceId: string) => void;
  onConnectNew?: () => void;
  onContactSupport?: () => void;
  showSandbox?: boolean;
  loading?: boolean;
  hasConnectPermission?: boolean;
}

// =====================================================
// PROVIDER LOGOS
// =====================================================

const PROVIDER_CONFIG: Record<
  string,
  {
    name: string;
    logo: string;
    bgColor: string;
    description: string;
    descriptionFr: string;
  }
> = {
  quickbooks: {
    name: 'QuickBooks',
    logo: '/logos/quickbooks.svg',
    bgColor: '#2CA01C',
    description: 'Intuit QuickBooks Online',
    descriptionFr: 'Intuit QuickBooks en ligne',
  },
  xero: {
    name: 'Xero',
    logo: '/logos/xero.svg',
    bgColor: '#13B5EA',
    description: 'Xero Cloud Accounting',
    descriptionFr: 'Comptabilité cloud Xero',
  },
  sage: {
    name: 'Sage',
    logo: '/logos/sage.svg',
    bgColor: '#00DC82',
    description: 'Sage Business Cloud',
    descriptionFr: 'Sage Business Cloud',
  },
  freshbooks: {
    name: 'FreshBooks',
    logo: '/logos/freshbooks.svg',
    bgColor: '#0075DD',
    description: 'FreshBooks Accounting',
    descriptionFr: 'Comptabilité FreshBooks',
  },
  wave: {
    name: 'Wave',
    logo: '/logos/wave.svg',
    bgColor: '#4286F4',
    description: 'Wave Financial',
    descriptionFr: 'Wave Financial',
  },
  csv: {
    name: 'CSV Import',
    logo: '',
    bgColor: '#6B7280',
    description: 'Manual CSV file import',
    descriptionFr: 'Import manuel de fichier CSV',
  },
  api: {
    name: 'API',
    logo: '',
    bgColor: '#4F46E5',
    description: 'Custom API integration',
    descriptionFr: 'Intégration API personnalisée',
  },
};

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status, isEn }: { status: DataSourceInfo['status']; isEn: boolean }) {
  const config = {
    connected: {
      icon: CheckCircle,
      label: isEn ? 'Connected' : 'Connecté',
      color: 'rgb(var(--color-success))',
      bgColor: 'rgb(var(--color-success) / 0.1)',
    },
    disconnected: {
      icon: AlertCircle,
      label: isEn ? 'Disconnected' : 'Déconnecté',
      color: 'rgb(var(--color-error))',
      bgColor: 'rgb(var(--color-error) / 0.1)',
    },
    pending: {
      icon: Loader2,
      label: isEn ? 'Connecting...' : 'Connexion...',
      color: 'rgb(var(--color-warning))',
      bgColor: 'rgb(var(--color-warning) / 0.1)',
    },
    error: {
      icon: AlertCircle,
      label: isEn ? 'Error' : 'Erreur',
      color: 'rgb(var(--color-error))',
      bgColor: 'rgb(var(--color-error) / 0.1)',
    },
  };

  const { icon: Icon, label, color, bgColor } = config[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bgColor, color }}
    >
      <Icon className={`w-3 h-3 ${status === 'pending' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

// =====================================================
// DATA SOURCE CARD
// =====================================================

interface DataSourceCardProps {
  source: DataSourceInfo;
  isSelected: boolean;
  onSelect: () => void;
  isEn: boolean;
}

function DataSourceCard({ source, isSelected, onSelect, isEn }: DataSourceCardProps) {
  const providerConfig = PROVIDER_CONFIG[source.provider] || PROVIDER_CONFIG.api;

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return isEn ? 'Never synced' : 'Jamais synchronisé';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return isEn ? 'Just now' : 'À l\'instant';
    if (diffMins < 60) return `${diffMins} ${isEn ? 'min ago' : 'min'}`;
    if (diffHours < 24) return `${diffHours}h ${isEn ? 'ago' : ''}`;
    return `${diffDays}${isEn ? 'd ago' : 'j'}`;
  };

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all
        ${isSelected
          ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/20'
          : 'border-transparent hover:border-primary-500/30 hover:bg-[rgb(var(--color-bg-muted))]'
        }
      `}
      style={{
        backgroundColor: isSelected
          ? 'rgb(var(--color-primary-500) / 0.05)'
          : 'rgb(var(--color-surface))',
        border: isSelected
          ? '2px solid rgb(var(--color-primary-500))'
          : '2px solid rgb(var(--color-border))',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Provider Logo */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: providerConfig.bgColor + '15' }}
        >
          {providerConfig.logo ? (
            <img
              src={providerConfig.logo}
              alt={providerConfig.name}
              className="w-8 h-8"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Database
              className="w-6 h-6"
              style={{ color: providerConfig.bgColor }}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-semibold truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {source.companyName || source.name}
            </h3>
            <StatusBadge status={source.status} isEn={isEn} />
          </div>

          <p
            className="text-sm mt-0.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {providerConfig.name}
            {source.isSandbox && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                  color: 'rgb(var(--color-warning))',
                }}
              >
                Sandbox
              </span>
            )}
          </p>

          {/* Last sync */}
          {source.lastSync && (
            <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Clock className="w-3 h-3" />
              {isEn ? 'Last sync:' : 'Dernière sync:'} {formatLastSync(source.lastSync)}
            </div>
          )}
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function DataSourceSelector({
  dataSources,
  selectedSource,
  onSelectSource,
  onConnectNew,
  onContactSupport,
  showSandbox = true,
  loading = false,
  hasConnectPermission = true,
}: DataSourceSelectorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Filter sources
  const connectedSources = dataSources.filter((s) => s.status === 'connected');
  const sandboxSources = dataSources.filter((s) => s.isSandbox);
  const otherSources = dataSources.filter(
    (s) => s.status !== 'connected' && !s.isSandbox
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Select Data Source' : 'Sélectionner la source de données'}
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn
            ? 'Choose a connected data source for your dashboard'
            : 'Choisissez une source de données connectée pour votre tableau de bord'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          />
        </div>
      ) : (
        <>
          {/* Connected Sources */}
          {connectedSources.length > 0 && (
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Connected Sources' : 'Sources connectées'}
              </label>
              <div className="space-y-2">
                {connectedSources.map((source) => (
                  <DataSourceCard
                    key={source.id}
                    source={source}
                    isSelected={selectedSource === source.id}
                    onSelect={() => onSelectSource(source.id)}
                    isEn={isEn}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sandbox Sources */}
          {showSandbox && sandboxSources.length > 0 && (
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Demo / Sandbox' : 'Démo / Sandbox'}
              </label>
              <div className="space-y-2">
                {sandboxSources.map((source) => (
                  <DataSourceCard
                    key={source.id}
                    source={source}
                    isSelected={selectedSource === source.id}
                    onSelect={() => onSelectSource(source.id)}
                    isEn={isEn}
                  />
                ))}
              </div>
              <p
                className="text-xs mt-2 flex items-center gap-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <Shield className="w-3 h-3" />
                {isEn
                  ? 'Sandbox data is sample data for testing purposes'
                  : 'Les données sandbox sont des données de test'}
              </p>
            </div>
          )}

          {/* No sources state */}
          {dataSources.length === 0 && (
            <div
              className="text-center py-8 rounded-xl border-2 border-dashed"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <Database
                className="w-12 h-12 mx-auto mb-3 opacity-30"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              />
              <p
                className="text-sm font-medium mb-1"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'No data sources connected' : 'Aucune source de données connectée'}
              </p>
              <p
                className="text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn
                  ? 'Connect your accounting software to get started'
                  : 'Connectez votre logiciel comptable pour commencer'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {hasConnectPermission ? (
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Connect new source */}
                {onConnectNew && (
                  <Link
                    to="/app/connections"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500))',
                      color: 'white',
                    }}
                  >
                    <Plus className="w-5 h-5" />
                    {isEn ? 'Connect New Source' : 'Connecter une nouvelle source'}
                  </Link>
                )}

                {/* Contact support */}
                {onContactSupport && (
                  <button
                    onClick={onContactSupport}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      border: '1px solid rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  >
                    <HelpCircle className="w-5 h-5" />
                    {isEn ? 'Contact Support' : 'Contacter le support'}
                  </button>
                )}
              </div>
            ) : (
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                  border: '1px solid rgb(var(--color-warning) / 0.2)',
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'rgb(var(--color-warning))' }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn
                        ? 'Permission required to connect sources'
                        : 'Autorisation requise pour connecter des sources'}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {isEn
                        ? 'Contact your administrator or reach out to support'
                        : 'Contactez votre administrateur ou notre support'}
                    </p>
                    {onContactSupport && (
                      <button
                        onClick={onContactSupport}
                        className="mt-2 text-xs font-medium flex items-center gap-1 transition-colors"
                        style={{ color: 'rgb(var(--color-primary-500))' }}
                      >
                        {isEn ? 'Contact Support' : 'Contacter le support'}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security note */}
          <div
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{
              backgroundColor: 'rgb(var(--color-success) / 0.05)',
              border: '1px solid rgb(var(--color-success) / 0.1)',
            }}
          >
            <Shield
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: 'rgb(var(--color-success))' }}
            />
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn
                ? 'Your data is encrypted with AES-256 and we only use read-only access. We never store your credentials.'
                : 'Vos données sont chiffrées avec AES-256 et nous utilisons uniquement un accès en lecture seule. Nous ne stockons jamais vos identifiants.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
