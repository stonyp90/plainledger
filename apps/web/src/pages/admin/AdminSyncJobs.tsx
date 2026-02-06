import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  Filter,
} from 'lucide-react';

interface SyncJob {
  id: string;
  name: string;
  provider: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  lastRun: string;
  duration?: string;
  recordsProcessed?: number;
}

export default function AdminSyncJobs() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [jobs, setJobs] = useState<SyncJob[]>([]);

  useEffect(() => {
    setJobs([
      { id: '1', name: 'QuickBooks Full Sync', provider: 'QuickBooks', status: 'completed', lastRun: '10 minutes ago', duration: '2m 34s', recordsProcessed: 1234 },
      { id: '2', name: 'Xero Incremental', provider: 'Xero', status: 'running', lastRun: 'Now', recordsProcessed: 456 },
      { id: '3', name: 'Stripe Transactions', provider: 'Stripe', status: 'queued', lastRun: '1 hour ago' },
      { id: '4', name: 'HubSpot Contacts', provider: 'HubSpot', status: 'failed', lastRun: '30 minutes ago', duration: '0m 12s' },
    ]);
  }, []);

  const getStatusIcon = (status: SyncJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />;
      case 'running':
        return <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-600))' }} />;
      case 'failed':
        return <XCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />;
      case 'queued':
        return <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />;
    }
  };

  const getStatusBadge = (status: SyncJob['status']) => {
    const styles = {
      completed: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
      running: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
      failed: { bg: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' },
      queued: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
    };
    const labels = {
      completed: isEn ? 'Completed' : 'Terminé',
      running: isEn ? 'Running' : 'En cours',
      failed: isEn ? 'Failed' : 'Échoué',
      queued: isEn ? 'Queued' : 'En file',
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

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    running: jobs.filter(j => j.status === 'running').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Sync Jobs' : 'Jobs de synchronisation'}
          </h1>
          <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Monitor data synchronization jobs' : 'Surveiller les tâches de synchronisation'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
        >
          <Play className="w-4 h-4" />
          {isEn ? 'Run All' : 'Tout exécuter'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Total Jobs' : 'Total'}</p>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{stats.total}</p>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Completed' : 'Terminés'}</p>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>{stats.completed}</p>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Failed' : 'Échoués'}</p>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-error))' }}>{stats.failed}</p>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Running' : 'En cours'}</p>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{stats.running}</p>
        </div>
      </div>

      {/* Jobs List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Recent Jobs' : 'Jobs récents'}
          </h2>
        </div>

        <table className="w-full">
          <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Job Name' : 'Nom du job'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Provider' : 'Fournisseur'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Status' : 'Statut'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Last Run' : 'Dernière exécution'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Actions' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{job.name}</div>
                      {job.recordsProcessed && (
                        <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {job.recordsProcessed.toLocaleString()} {isEn ? 'records' : 'enregistrements'}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>{job.provider}</td>
                <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                <td className="px-6 py-4">
                  <div style={{ color: 'rgb(var(--color-text-secondary))' }}>{job.lastRun}</div>
                  {job.duration && (
                    <div className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{job.duration}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={isEn ? 'Run Now' : 'Exécuter'}
                    disabled={job.status === 'running'}
                  >
                    <Play className="w-4 h-4" style={{ color: job.status === 'running' ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-primary-600))' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
