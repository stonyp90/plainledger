'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { billingApi } from '@/lib/api';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Users,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// Default empty stats
const emptyStats = {
  mrr: 0,
  arr: 0,
  activeSubscriptions: 0,
  churnRate: 0,
  avgRevenuePerUser: 0,
  growth: 0,
};

export default function BillingPage() {
  const { token } = useAdmin();

  // Fetch billing stats
  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['admin', 'billing', 'stats', token],
    queryFn: () => billingApi.getStats(),
    enabled: !!token,
  });

  // Fetch transactions
  const { data: transactionsData } = useQuery({
    queryKey: ['admin', 'billing', 'transactions', token],
    queryFn: () => billingApi.getTransactions({ limit: '5' }),
    enabled: !!token,
  });

  // Fetch plan distribution
  const { data: plansData } = useQuery({
    queryKey: ['admin', 'billing', 'plans', token],
    queryFn: () => billingApi.getPlanDistribution(),
    enabled: !!token,
  });

  const stats = statsData || emptyStats;
  const recentTransactions = transactionsData?.transactions || [];
  const planDistribution = plansData?.plans || [];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Billing & Revenue</h1>
            <p className="text-admin-400 mt-1">
              Monitor revenue, subscriptions, and billing metrics
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded-lg text-primary-400 text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                  <div className="w-full bg-admin-800/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        plan.plan === 'Enterprise' ? 'bg-accent-500' :
                        plan.plan === 'Professional' ? 'bg-primary-500' : plan.plan === 'Free' ? 'bg-admin-500' : 'bg-accent-500'
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
