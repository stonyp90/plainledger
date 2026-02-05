'use client';

import { useQuery } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Plug, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';

export default function IntegrationsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [webhookFilter, setWebhookFilter] = useState<string>('all');

  const { data: providersData } = useQuery({
    queryKey: ['admin', 'integrations', 'providers'],
    queryFn: () => integrationsApi.listProviders(),
  });

  const { data: connectionsData } = useQuery({
    queryKey: ['admin', 'integrations', 'connections'],
    queryFn: () => integrationsApi.listConnections(),
  });

  const { data: webhookLogs } = useQuery({
    queryKey: ['admin', 'integrations', 'webhooks', webhookFilter],
    queryFn: () =>
      integrationsApi.getWebhookLogs(
        webhookFilter !== 'all' ? { status: webhookFilter } : undefined,
      ),
  });

  return (
    <AdminShell>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Integration Management</h1>
          <p className="text-admin-400">Manage integration providers and monitor connections</p>
        </div>

        {/* Providers */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {providersData?.providers?.map((provider: any) => (
              <div
                key={provider.id}
                className="bg-admin-800 rounded-lg p-4 border border-admin-700 hover:border-primary-600 cursor-pointer transition-colors"
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{provider.name}</h3>
                  {provider.isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className="text-admin-400 text-sm capitalize">{provider.category}</p>
                {provider.isBeta && (
                  <span className="inline-block mt-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                    Beta
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connections */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Connections</h2>
          <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-admin-800/50 border-b border-admin-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {connectionsData?.connections?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-admin-400">
                      No connections found
                    </td>
                  </tr>
                ) : (
                  connectionsData?.connections?.map((conn: any) => (
                    <tr key={conn.id} className="border-t border-admin-700">
                      <td className="px-4 py-3 text-white">{conn.organizationName || 'N/A'}</td>
                      <td className="px-4 py-3 text-admin-400 capitalize">{conn.provider || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            conn.status === 'connected'
                              ? 'bg-green-600 text-white'
                              : conn.status === 'error'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}
                        >
                          {conn.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-400">
                        {conn.lastSyncAt
                          ? new Date(conn.lastSyncAt).toLocaleString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Logs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Webhook Logs</h2>
            <select
              value={webhookFilter}
              onChange={(e) => setWebhookFilter(e.target.value)}
              className="bg-admin-800/50 border border-admin-700/50 rounded px-3 py-2 text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="received">Received</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-admin-800/50 border-b border-admin-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Event Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Time</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-admin-400">
                      No webhook logs found
                    </td>
                  </tr>
                ) : (
                  webhookLogs?.logs?.map((log: any) => (
                    <tr key={log.id} className="border-t border-admin-700">
                      <td className="px-4 py-3 text-white capitalize">{log.provider}</td>
                      <td className="px-4 py-3 text-admin-400">{log.eventType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === 'processed'
                              ? 'bg-green-600 text-white'
                              : log.status === 'failed'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
