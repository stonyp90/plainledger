'use client';

import { useQuery } from '@tanstack/react-query';
import { integrationsApi, organizationsApi } from '@/lib/api';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminShell } from '@/components/layout/AdminShell';
import { Plug, CheckCircle2, XCircle, Clock, Building2, Filter, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function IntegrationsPage() {
  const { token } = useAdmin();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [webhookFilter, setWebhookFilter] = useState<string>('all');

  // Fetch organizations for filter dropdown
  const { data: orgsData } = useQuery({
    queryKey: ['organizations', token],
    queryFn: () => organizationsApi.list({ limit: '100' }),
    enabled: !!token,
  });

  const { data: providersData } = useQuery({
    queryKey: ['admin', 'integrations', 'providers', token],
    queryFn: () => integrationsApi.listProviders(),
    enabled: !!token,
  });

  const { data: connectionsData, refetch: refetchConnections } = useQuery({
    queryKey: ['admin', 'integrations', 'connections', selectedOrg, token],
    queryFn: async () => {
      if (selectedOrg && selectedOrg !== 'all') {
        // Fetch connections for specific org
        const response = await fetch(`${API_URL}/api/admin/organizations/${selectedOrg}/integrations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) return { connections: [] };
        const data = await response.json();
        // Map integrations to connections format
        return { 
          connections: data.integrations?.map((i: any) => ({
            ...i,
            organizationId: selectedOrg,
            organizationName: orgsData?.organizations?.find((o: any) => o.id === selectedOrg)?.name || 'Unknown',
          })) || []
        };
      }
      return integrationsApi.listConnections();
    },
    enabled: !!token,
  });

  const { data: webhookLogs } = useQuery({
    queryKey: ['admin', 'integrations', 'webhooks', webhookFilter, selectedOrg, token],
    queryFn: () =>
      integrationsApi.getWebhookLogs(
        webhookFilter !== 'all' ? { status: webhookFilter } : undefined,
      ),
    enabled: !!token,
  });

  const organizations = orgsData?.organizations || [];

  return (
    <AdminShell>
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Integration Management</h1>
            <p className="text-admin-400">Manage integration providers and monitor connections</p>
          </div>
          
          {/* Organization Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-admin-400" />
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="bg-admin-800 border border-admin-700 rounded-lg px-3 py-2 text-white text-sm min-w-[200px]"
              >
                <option value="all">All Organizations</option>
                {organizations.map((org: any) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => refetchConnections()}
              className="p-2 bg-admin-800/50 border border-admin-700/50 hover:bg-primary-600/20 rounded-lg text-admin-300 hover:text-primary-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Organization Context Banner */}
        {selectedOrg !== 'all' && (
          <div className="mb-6 p-4 bg-primary-600/10 border border-primary-600/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary-400" />
              <div>
                <p className="text-white font-medium">
                  Viewing: {organizations.find((o: any) => o.id === selectedOrg)?.name || 'Unknown Organization'}
                </p>
                <p className="text-sm text-admin-400">Showing connections for this organization only</p>
              </div>
            </div>
            <Link 
              href={`/organizations/${selectedOrg}`}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded text-white text-sm transition-colors"
            >
              View Organization
            </Link>
          </div>
        )}

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
