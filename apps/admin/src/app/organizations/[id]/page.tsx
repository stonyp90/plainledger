'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  Building2,
  Users,
  Database,
  Calendar,
  Globe,
  DollarSign,
  ArrowLeft,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  Unlink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Organization {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  industry?: string;
  currency: string;
  timezone?: string;
  fiscalYearEndMonth?: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  settings?: Record<string, unknown>;
}

interface Integration {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  connectedAt?: string;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
}

const INTEGRATION_ICONS: Record<string, string> = {
  quickbooks: '📊',
  xero: '📈',
  stripe: '💳',
  hubspot: '📞',
  slack: '💬',
  sage: '📗',
};

const INTEGRATION_NAMES: Record<string, string> = {
  quickbooks: 'QuickBooks',
  xero: 'Xero',
  stripe: 'Stripe',
  hubspot: 'HubSpot',
  slack: 'Slack',
  sage: 'Sage',
};

export default function OrganizationDetailPage() {
  const params = useParams();
  const { token } = useAdmin();
  const [activeTab, setActiveTab] = useState<'overview' | 'integrations' | 'users'>('overview');

  const { data: org, isLoading, refetch } = useQuery({
    queryKey: ['organization', params.id, token],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/organizations/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json() as Promise<Organization>;
    },
    enabled: !!token && !!params.id,
  });

  const { data: integrationsData } = useQuery({
    queryKey: ['organization', params.id, 'integrations', token],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/organizations/${params.id}/integrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return { integrations: [] };
      return response.json();
    },
    enabled: !!token && !!params.id,
  });

  const integrations: Integration[] = integrationsData?.integrations || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'users', label: 'Users', icon: Users },
  ];

  if (isLoading) {
    return (
      <AdminShell>
        <div className="p-6 flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-admin-400" />
        </div>
      </AdminShell>
    );
  }

  if (!org) {
    return (
      <AdminShell>
        <div className="p-6">
          <p className="text-admin-400">Organization not found</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/organizations"
            className="inline-flex items-center gap-2 text-admin-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-600/20 border border-primary-600/30 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                <p className="text-admin-400">{org.tenantId}</p>
                {org.deletedAt && (
                  <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs bg-red-500/20 text-red-400">
                    Deleted
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-admin-700 hover:bg-admin-600 rounded-lg text-admin-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-admin-700 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-admin-400 hover:bg-admin-700 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Details Card */}
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <h2 className="text-lg font-semibold text-white mb-4">Organization Details</h2>
              <div className="space-y-4">
                <DetailRow icon={Building2} label="Legal Name" value={org.legalName || org.name} />
                <DetailRow icon={Globe} label="Industry" value={org.industry || 'Not set'} />
                <DetailRow icon={DollarSign} label="Currency" value={org.currency || 'CAD'} />
                <DetailRow icon={Clock} label="Timezone" value={org.timezone || 'America/Toronto'} />
                <DetailRow 
                  icon={Calendar} 
                  label="Fiscal Year End" 
                  value={org.fiscalYearEndMonth ? `Month ${org.fiscalYearEndMonth}` : 'December'} 
                />
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
              <div className="space-y-4">
                <DetailRow 
                  icon={Calendar} 
                  label="Created" 
                  value={org.createdAt ? format(new Date(org.createdAt), 'PPP') : '--'} 
                />
                <DetailRow 
                  icon={RefreshCw} 
                  label="Last Updated" 
                  value={org.updatedAt ? formatDistanceToNow(new Date(org.updatedAt), { addSuffix: true }) : '--'} 
                />
                {org.deletedAt && (
                  <DetailRow 
                    icon={XCircle} 
                    label="Deleted" 
                    value={format(new Date(org.deletedAt), 'PPP')} 
                  />
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickStat label="Connected Integrations" value={integrations.filter(i => i.status === 'connected').length} />
              <QuickStat label="Users" value="--" />
              <QuickStat label="Sync Jobs" value="--" />
              <QuickStat label="Last Activity" value="--" />
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <h2 className="text-lg font-semibold text-white mb-4">Connected Integrations</h2>
              <p className="text-sm text-admin-400 mb-6">
                Data sources and third-party services connected to this organization
              </p>
              
              {integrations.length === 0 ? (
                <div className="text-center py-8 text-admin-400">
                  <Unlink className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No integrations connected yet</p>
                  <p className="text-sm mt-1">The organization hasn&apos;t connected any data sources</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
                </div>
              )}
            </div>

            {/* Available Integrations */}
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <h2 className="text-lg font-semibold text-white mb-4">Available Integrations</h2>
              <p className="text-sm text-admin-400 mb-6">
                Integrations that can be connected by the organization
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['quickbooks', 'xero', 'sage', 'stripe', 'hubspot', 'slack'].map((provider) => {
                  const isConnected = integrations.some(i => i.provider === provider && i.status === 'connected');
                  return (
                    <div 
                      key={provider}
                      className={`p-4 rounded-lg border ${
                        isConnected 
                          ? 'bg-primary-600/10 border-primary-600/30' 
                          : 'bg-admin-900 border-admin-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{INTEGRATION_ICONS[provider]}</span>
                        <div>
                          <p className="font-medium text-white">{INTEGRATION_NAMES[provider]}</p>
                          <p className={`text-xs ${isConnected ? 'text-green-400' : 'text-admin-500'}`}>
                            {isConnected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
            <h2 className="text-lg font-semibold text-white mb-4">Organization Users</h2>
            <p className="text-admin-400">
              User management for this organization coming soon...
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-admin-700 last:border-0">
      <div className="flex items-center gap-2 text-admin-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-white">{value}</span>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-admin-800 rounded-lg p-4 border border-admin-700">
      <p className="text-sm text-admin-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusColors = {
    connected: 'text-green-400',
    disconnected: 'text-admin-500',
    error: 'text-red-400',
    pending: 'text-yellow-400',
  };

  const statusIcons = {
    connected: CheckCircle,
    disconnected: Unlink,
    error: XCircle,
    pending: Clock,
  };

  const StatusIcon = statusIcons[integration.status];

  return (
    <div className="flex items-center justify-between p-4 bg-admin-900 rounded-lg border border-admin-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{INTEGRATION_ICONS[integration.provider] || '🔌'}</span>
        <div>
          <p className="font-medium text-white">{INTEGRATION_NAMES[integration.provider] || integration.provider}</p>
          <div className="flex items-center gap-1">
            <StatusIcon className={`w-3 h-3 ${statusColors[integration.status]}`} />
            <span className={`text-sm ${statusColors[integration.status]}`}>
              {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right text-sm text-admin-400">
        {integration.lastSyncAt && (
          <p>Last sync: {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}</p>
        )}
        {integration.connectedAt && (
          <p>Connected: {format(new Date(integration.connectedAt), 'MMM d, yyyy')}</p>
        )}
      </div>
    </div>
  );
}
