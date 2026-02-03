'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { AdminShell } from '@/components/layout/AdminShell';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { admin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-admin-400 mt-1">
            Welcome back, {admin?.user?.displayName || 'Admin'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Organizations"
            value="--"
            change="+12%"
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Total Users"
            value="--"
            change="+8%"
            icon={Users}
            color="green"
          />
          <StatCard
            title="MRR"
            value="$--"
            change="+15%"
            icon={CreditCard}
            color="purple"
          />
          <StatCard
            title="Active Today"
            value="--"
            icon={Activity}
            color="orange"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
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

          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3 text-admin-400">
              <p className="text-sm">No recent activity to display.</p>
              <p className="text-sm">Activity will appear here once you start using the admin console.</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">Admin Console in Development</h3>
              <p className="text-sm text-yellow-500/80 mt-1">
                This admin console is under active development. Some features may not be fully functional yet.
              </p>
            </div>
          </div>
        </div>
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
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
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
      className="block p-4 rounded-lg bg-admin-700/50 hover:bg-admin-700 transition-colors border border-admin-600/50"
    >
      <h3 className="font-medium text-white">{title}</h3>
      <p className="text-sm text-admin-400 mt-1">{description}</p>
    </a>
  );
}
