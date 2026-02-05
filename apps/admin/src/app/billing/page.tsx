'use client';

import { AdminShell } from '@/components/layout/AdminShell';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function BillingPage() {
  // Mock billing data
  const stats = {
    mrr: 12450,
    arr: 149400,
    activeSubscriptions: 48,
    churnRate: 2.3,
    avgRevenuePerUser: 259.38,
    growth: 15.2,
  };

  const recentTransactions = [
    { id: '1', org: 'Acme Corporation', amount: 299, type: 'subscription', date: '2024-02-01', status: 'paid' },
    { id: '2', org: 'Tech Startup Inc', amount: 499, type: 'subscription', date: '2024-02-01', status: 'paid' },
    { id: '3', org: 'Restaurant Group', amount: 199, type: 'subscription', date: '2024-01-28', status: 'failed' },
    { id: '4', org: 'Construction Co', amount: 299, type: 'upgrade', date: '2024-01-25', status: 'paid' },
    { id: '5', org: 'Healthcare Services', amount: 499, type: 'subscription', date: '2024-01-20', status: 'paid' },
  ];

  const planDistribution = [
    { plan: 'Free', count: 156, percentage: 65 },
    { plan: 'Professional', count: 62, percentage: 26 },
    { plan: 'Enterprise', count: 22, percentage: 9 },
  ];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Billing & Revenue</h1>
          <p className="text-admin-400 mt-1">
            Monitor revenue, subscriptions, and billing metrics
          </p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Monthly Recurring Revenue"
            value={`$${stats.mrr.toLocaleString()}`}
            change={`+${stats.growth}%`}
            positive={true}
            icon={DollarSign}
          />
          <StatCard
            title="Annual Recurring Revenue"
            value={`$${stats.arr.toLocaleString()}`}
            icon={TrendingUp}
          />
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions.toString()}
            change="+5"
            positive={true}
            icon={Users}
          />
          <StatCard
            title="Churn Rate"
            value={`${stats.churnRate}%`}
            change="-0.5%"
            positive={true}
            icon={ArrowDownRight}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
            <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
            <div className="space-y-4">
              {planDistribution.map((plan) => (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-admin-300">{plan.plan}</span>
                    <span className="text-white font-medium">{plan.count} orgs ({plan.percentage}%)</span>
                  </div>
                  <div className="w-full bg-admin-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        plan.plan === 'Enterprise' ? 'bg-accent-500' :
                        plan.plan === 'Professional' ? 'bg-primary-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${plan.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-admin-700 last:border-0">
                  <div>
                    <p className="text-white text-sm">{tx.org}</p>
                    <p className="text-admin-500 text-xs capitalize">{tx.type} • {tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">${tx.amount}</p>
                    <p className={`text-xs ${tx.status === 'paid' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-primary-900/20 border border-primary-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-primary-300">Stripe Integration</h3>
              <p className="text-sm text-primary-400/80 mt-1">
                Billing data is synced from Stripe. View detailed reports in the Stripe Dashboard.
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
  positive,
  icon: Icon,
}: { 
  title: string; 
  value: string; 
  change?: string;
  positive?: boolean;
  icon: any;
}) {
  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-admin-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {positive ? (
                <ArrowUpRight className="w-4 h-4 text-green-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-400" />
        </div>
      </div>
    </div>
  );
}
