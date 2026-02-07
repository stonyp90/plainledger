'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { AdminShell } from '@/components/layout/AdminShell';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DashboardPage() {
  const { admin, isLoading, token } = useAdmin();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['admin', 'dashboard-stats', token],
    queryFn: async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add auth token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
          headers,
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch stats: ${res.status}`);
        }
        const data = await res.json();
        return {
          organizations: data.organizations?.total || 0,
          users: data.users?.total || 0,
          activeToday: data.users?.activeToday || 0,
          mrr: data.billing?.mrr || 0,
          health: data.health,
          syncJobs: data.syncJobs,
          onboarding: data.onboarding,
        };
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        return {
          organizations: 0,
          users: 0,
          activeToday: 0,
          mrr: 0,
          health: { overallStatus: 'unknown', degradedServices: 0, unhealthyServices: 0 },
          syncJobs: { total24h: 0, completed: 0, failed: 0, running: 0 },
          onboarding: { trialsActive: 0, conversionsThisMonth: 0, conversionRate: 0, atRiskCount: 0 },
        };
      }
    },
    enabled: !!token,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-admin-400 mt-1">
              Welcome back, {admin?.user?.displayName || 'Admin'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Organizations"
            value={statsLoading ? '...' : formatNumber(stats?.organizations || 0)}
            change="+12%"
            icon={Building2}
            color="primary"
          />
          <StatCard
            title="Total Users"
            value={statsLoading ? '...' : formatNumber(stats?.users || 0)}
            change="+8%"
            icon={Users}
            color="primary"
          />
          <StatCard
            title="MRR"
            value={statsLoading ? '...' : `$${formatNumber(stats?.mrr || 0)}`}
            change="+15%"
            icon={CreditCard}
            color="accent"
          />
          <StatCard
            title="Active Today"
            value={statsLoading ? '...' : formatNumber(stats?.activeToday || 0)}
            icon={Activity}
            color="primary"
          />
          {stats?.health && (
            <StatCard
              title="System Health"
              value={statsLoading ? '...' : stats.health.overallStatus.toUpperCase()}
              change={`${stats.health.unhealthyServices || 0} unhealthy`}
              icon={Activity}
              color={stats.health.overallStatus === 'healthy' ? 'green' : stats.health.overallStatus === 'degraded' ? 'yellow' : 'red'}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <QuickAction
                href="/organizations/new"
                title="Create Organization"
                description="Create an organization on behalf of a customer"
              />
              <QuickAction
                href="/users/invite"
                title="Invite User"
                description="Invite a user to an organization"
              />
              <QuickAction
                href="/audit"
                title="View Audit Logs"
                description="Review recent platform activity"
              />
            </div>
          </div>

          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Sync Jobs (Last 24h)</h2>
            {stats?.syncJobs ? (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-admin-400 text-sm">Total</p>
                  <p className="text-xl font-bold text-white">{stats.syncJobs.total24h || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Completed</p>
                  <p className="text-xl font-bold text-green-400">{stats.syncJobs.completed || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Failed</p>
                  <p className="text-xl font-bold text-red-400">{stats.syncJobs.failed || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Running</p>
                  <p className="text-xl font-bold text-primary-400">{stats.syncJobs.running || 0}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-admin-400">
                <p className="text-sm">Loading sync stats...</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health Alert */}
        {stats?.health && stats.health.unhealthyServices > 0 && (
          <div className="mt-6 bg-red-900/20 border border-red-600 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-semibold">System Health Alert</p>
                <p className="text-admin-400 text-sm">
                  {stats.health.unhealthyServices} service(s) are unhealthy. Check the System Health page for details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Development Notice - only show in non-production */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-400">Development Mode</h3>
                <p className="text-sm text-yellow-500/80 mt-1">
                  You are running in development mode. Some features may behave differently.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  change?: string; 
  icon: any; 
  color: string;
}) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-400',
    accent: 'bg-accent-500/10 text-accent-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-admin-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">{change}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 transition-colors border border-primary-600/20 hover:border-primary-600/40"
    >
      <h3 className="font-medium text-white">{title}</h3>
      <p className="text-sm text-admin-400 mt-1">{description}</p>
    </a>
  );
}
