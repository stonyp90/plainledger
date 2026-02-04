import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Database,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Zap,
  Building2,
} from 'lucide-react';

type ConnectionStatus = 'active' | 'disconnected' | 'error' | 'pending' | 'expired';
type Provider = 'quickbooks' | 'xero' | 'sage' | 'freshbooks' | 'wave' | 'manual';

interface Connection {
  id: string;
  organizationId: string;
  organizationName: string;
  provider: Provider;
  status: ConnectionStatus;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  createdAt: string;
}

// Provider Logo/Icon
function ProviderBadge({ provider }: { provider: Provider }) {
  const providerConfig: Record<Provider, { color: string; label: string }> = {
    quickbooks: { color: '#2CA01C', label: 'QuickBooks' },
    xero: { color: '#13B5EA', label: 'Xero' },
    sage: { color: '#00DC82', label: 'Sage' },
    freshbooks: { color: '#0075DD', label: 'FreshBooks' },
    wave: { color: '#1A6FC1', label: 'Wave' },
    manual: { color: '#6B7280', label: 'Manual' },
  };
  
  const { color, label } = providerConfig[provider];
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{ 
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <Database className="w-3 h-3" />
      {label}
    </span>
  );
}

// Status Badge
function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    active: { color: 'success', icon: CheckCircle, label: 'Active' },
    disconnected: { color: 'text-muted', icon: XCircle, label: 'Disconnected' },
    error: { color: 'error', icon: AlertTriangle, label: 'Error' },
    pending: { color: 'warning', icon: Clock, label: 'Pending' },
    expired: { color: 'warning', icon: AlertTriangle, label: 'Expired' },
  };
  
  const { color, icon: Icon, label } = config[status];
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Sync Status Badge
function SyncStatusBadge({ status }: { status?: 'success' | 'failed' | 'partial' }) {
  if (!status) return null;
  
  const config = {
    success: { color: 'success', label: 'Success' },
    failed: { color: 'error', label: 'Failed' },
    partial: { color: 'warning', label: 'Partial' },
  };
  
  const { color, label } = config[status];
  
  return (
    <span 
      className="text-xs"
      style={{ color: `rgb(var(--color-${color}))` }}
    >
      {label}
    </span>
  );
}

export default function AdminConnections() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        // TODO: Replace with actual API call
        setConnections([
          {
            id: '1',
            organizationId: 'org1',
            organizationName: 'Acme Corp',
            provider: 'quickbooks',
            status: 'active',
            lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
            lastSyncStatus: 'success',
            totalSyncs: 156,
            successfulSyncs: 154,
            failedSyncs: 2,
            createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
          },
          {
            id: '2',
            organizationId: 'org2',
            organizationName: 'Tech Solutions',
            provider: 'xero',
            status: 'active',
            lastSyncAt: new Date(Date.now() - 7200000).toISOString(),
            lastSyncStatus: 'success',
            totalSyncs: 89,
            successfulSyncs: 89,
            failedSyncs: 0,
            createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          },
          {
            id: '3',
            organizationId: 'org3',
            organizationName: 'Bob\'s Diner',
            provider: 'quickbooks',
            status: 'error',
            lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
            lastSyncStatus: 'failed',
            totalSyncs: 45,
            successfulSyncs: 43,
            failedSyncs: 2,
            createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          },
          {
            id: '4',
            organizationId: 'org4',
            organizationName: 'Construction Co',
            provider: 'sage',
            status: 'expired',
            lastSyncAt: new Date(Date.now() - 86400000 * 30).toISOString(),
            lastSyncStatus: 'success',
            totalSyncs: 12,
            successfulSyncs: 12,
            failedSyncs: 0,
            createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
          },
          {
            id: '5',
            organizationId: 'org5',
            organizationName: 'New Client Inc',
            provider: 'quickbooks',
            status: 'pending',
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            createdAt: new Date().toISOString(),
          },
        ]);
        setTotalPages(2);
      } catch (error) {
        console.error('Failed to fetch connections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [currentPage]);

  // Stats
  const stats = {
    total: connections.length,
    active: connections.filter(c => c.status === 'active').length,
    error: connections.filter(c => c.status === 'error' || c.status === 'expired').length,
    totalSyncs: connections.reduce((sum, c) => sum + c.totalSyncs, 0),
    successRate: Math.round(
      (connections.reduce((sum, c) => sum + c.successfulSyncs, 0) /
        Math.max(connections.reduce((sum, c) => sum + c.totalSyncs, 0), 1)) * 100
    ),
  };

  // Filter connections
  const filteredConnections = connections.filter((conn) => {
    const matchesSearch = conn.organizationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conn.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || conn.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Data Connections' : 'Connexions de données'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Monitor data source connections and sync status' : 'Surveiller les connexions et la synchronisation'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          {isEn ? 'Refresh All' : 'Actualiser tout'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isEn ? 'Total Connections' : 'Connexions totales', value: stats.total, color: 'primary' },
          { label: isEn ? 'Active' : 'Actives', value: stats.active, color: 'success' },
          { label: isEn ? 'Needs Attention' : 'Attention requise', value: stats.error, color: 'error' },
          { label: isEn ? 'Success Rate' : 'Taux de succès', value: `${stats.successRate}%`, color: 'success' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="rounded-lg border p-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: `rgb(var(--color-${stat.color}))` }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'rgb(var(--color-text-muted))' }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search connections...' : 'Rechercher...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | 'all')}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Status' : 'Tous les statuts'}</option>
          <option value="active">{isEn ? 'Active' : 'Actif'}</option>
          <option value="error">{isEn ? 'Error' : 'Erreur'}</option>
          <option value="expired">{isEn ? 'Expired' : 'Expiré'}</option>
          <option value="pending">{isEn ? 'Pending' : 'En attente'}</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value as Provider | 'all')}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Providers' : 'Tous les fournisseurs'}</option>
          <option value="quickbooks">QuickBooks</option>
          <option value="xero">Xero</option>
          <option value="sage">Sage</option>
          <option value="freshbooks">FreshBooks</option>
        </select>
      </div>

      {/* Connections Table */}
      <div 
        className="rounded-xl border overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div 
              className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 text-sm font-medium border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              <div className="col-span-2">{isEn ? 'Organization' : 'Organisation'}</div>
              <div>{isEn ? 'Provider' : 'Fournisseur'}</div>
              <div>{isEn ? 'Status' : 'Statut'}</div>
              <div>{isEn ? 'Last Sync' : 'Dernière sync'}</div>
              <div>{isEn ? 'Success Rate' : 'Taux de succès'}</div>
              <div className="text-right">{isEn ? 'Actions' : 'Actions'}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {filteredConnections.map((conn) => {
                const successRate = conn.totalSyncs > 0 
                  ? Math.round((conn.successfulSyncs / conn.totalSyncs) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={conn.id}
                    className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Organization */}
                    <div className="md:col-span-2 flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                          {conn.organizationName}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {conn.totalSyncs} {isEn ? 'syncs' : 'syncs'}
                        </p>
                      </div>
                    </div>

                    {/* Provider */}
                    <div>
                      <ProviderBadge provider={conn.provider} />
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={conn.status} />
                    </div>

                    {/* Last Sync */}
                    <div>
                      {conn.lastSyncAt ? (
                        <div>
                          <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                            {new Date(conn.lastSyncAt).toLocaleDateString()}
                          </p>
                          <SyncStatusBadge status={conn.lastSyncStatus} />
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Never' : 'Jamais'}
                        </span>
                      )}
                    </div>

                    {/* Success Rate */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex-1 h-2 rounded-full"
                          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                        >
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${successRate}%`,
                              backgroundColor: successRate >= 90 
                                ? 'rgb(var(--color-success))' 
                                : successRate >= 70 
                                  ? 'rgb(var(--color-warning))' 
                                  : 'rgb(var(--color-error))',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {successRate}%
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-1">
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Zap className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? `Showing ${filteredConnections.length} connections`
                  : `Affichage de ${filteredConnections.length} connexions`
                }
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </button>
                <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
