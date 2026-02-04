import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  adminEmail: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  targetOrgName?: string;
  targetUserEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Action Badge
function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    create: 'success',
    update: 'primary',
    delete: 'error',
    view: 'text-secondary',
    enable: 'success',
    disable: 'warning',
    send: 'primary',
  };
  
  const actionType = action.split(':')[1] || action;
  const color = colorMap[actionType] || 'primary';
  
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      {action}
    </span>
  );
}

// Detail Modal
function AuditDetailModal({ 
  log, 
  onClose 
}: { 
  log: AuditLog | null; 
  onClose: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div 
        className="relative w-full max-w-lg rounded-xl shadow-xl p-6"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Audit Log Details' : 'Détails du journal d\'audit'}
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Action' : 'Action'}
              </label>
              <div className="mt-1">
                <ActionBadge action={log.action} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Status' : 'Statut'}
              </label>
              <p className="mt-1" style={{ color: log.success ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
                {log.success ? (isEn ? 'Success' : 'Succès') : (isEn ? 'Failed' : 'Échoué')}
              </p>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Admin' : 'Admin'}
            </label>
            <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>{log.adminEmail}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Resource Type' : 'Type de ressource'}
              </label>
              <p className="mt-1 capitalize" style={{ color: 'rgb(var(--color-text))' }}>{log.resourceType}</p>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Resource' : 'Ressource'}
              </label>
              <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>{log.resourceName || log.resourceId || '-'}</p>
            </div>
          </div>
          
          {log.targetOrgName && (
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Target Organization' : 'Organisation cible'}
              </label>
              <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>{log.targetOrgName}</p>
            </div>
          )}
          
          {log.targetUserEmail && (
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Target User' : 'Utilisateur cible'}
              </label>
              <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>{log.targetUserEmail}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'IP Address' : 'Adresse IP'}
              </label>
              <p className="mt-1 font-mono text-sm" style={{ color: 'rgb(var(--color-text))' }}>{log.ipAddress || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Duration' : 'Durée'}
              </label>
              <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>
                {log.durationMs ? `${log.durationMs}ms` : '-'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Timestamp' : 'Horodatage'}
            </label>
            <p className="mt-1" style={{ color: 'rgb(var(--color-text))' }}>
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
          
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Metadata' : 'Métadonnées'}
              </label>
              <pre 
                className="mt-1 p-2 rounded text-xs overflow-auto max-h-32"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAudit() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Available filters (would come from API)
  const actions = ['user:create', 'user:update', 'user:disable', 'org:create', 'org:update', 'notification:send', 'chat:assign', 'chat:close'];
  const resourceTypes = ['user', 'organization', 'notification', 'chat_session', 'admin'];

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // TODO: Replace with actual API call
        setLogs([
          {
            id: '1',
            action: 'user:create',
            adminEmail: 'admin@example.com',
            resourceType: 'user',
            resourceName: 'John Doe',
            targetUserEmail: 'john.doe@example.com',
            ipAddress: '192.168.1.1',
            success: true,
            durationMs: 234,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            action: 'org:update',
            adminEmail: 'admin@example.com',
            resourceType: 'organization',
            resourceId: 'org-123',
            resourceName: 'Acme Corp',
            targetOrgName: 'Acme Corp',
            ipAddress: '192.168.1.1',
            success: true,
            durationMs: 156,
            metadata: { fieldChanged: 'industry', oldValue: 'retail', newValue: 'real_estate' },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            action: 'notification:send',
            adminEmail: 'admin@example.com',
            resourceType: 'notification',
            resourceName: 'System Update',
            success: true,
            durationMs: 89,
            metadata: { recipientsCount: 523, channel: 'in_app' },
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '4',
            action: 'user:disable',
            adminEmail: 'admin@example.com',
            resourceType: 'user',
            targetUserEmail: 'bob@example.com',
            resourceName: 'Bob Wilson',
            ipAddress: '192.168.1.1',
            success: true,
            durationMs: 45,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '5',
            action: 'chat:close',
            adminEmail: 'admin@example.com',
            resourceType: 'chat_session',
            resourceId: 'session-456',
            success: true,
            durationMs: 23,
            metadata: { resolutionNotes: 'Issue resolved' },
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ]);
        setTotalPages(5);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [currentPage, actionFilter, resourceFilter]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetUserEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resourceType === resourceFilter;
    return matchesSearch && matchesAction && matchesResource;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Audit Logs' : 'Journaux d\'audit'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Track all admin activity' : 'Suivre toute l\'activité admin'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <Download className="w-4 h-4" />
          {isEn ? 'Export Logs' : 'Exporter les journaux'}
        </button>
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
            placeholder={isEn ? 'Search logs...' : 'Rechercher...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Actions' : 'Toutes les actions'}</option>
          {actions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Resources' : 'Toutes les ressources'}</option>
          {resourceTypes.map((type) => (
            <option key={type} value={type} className="capitalize">{type}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
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
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 mb-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'No audit logs found' : 'Aucun journal trouvé'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div 
              className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              <div>{isEn ? 'Action' : 'Action'}</div>
              <div>{isEn ? 'Admin' : 'Admin'}</div>
              <div>{isEn ? 'Resource' : 'Ressource'}</div>
              <div>{isEn ? 'Target' : 'Cible'}</div>
              <div>{isEn ? 'Time' : 'Heure'}</div>
              <div className="text-right">{isEn ? 'Details' : 'Détails'}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <ActionBadge action={log.action} />
                  </div>
                  <div className="text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                    {log.adminEmail}
                  </div>
                  <div className="text-sm capitalize" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {log.resourceType}
                  </div>
                  <div className="text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                    {log.resourceName || log.targetUserEmail || log.targetOrgName || '-'}
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? `Page ${currentPage} of ${totalPages}`
                  : `Page ${currentPage} sur ${totalPages}`
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

      {/* Detail Modal */}
      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
