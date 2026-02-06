import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Download,
  Filter,
} from 'lucide-react';

export default function AdminBilling() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const stats = {
    mrr: 12450,
    arr: 149400,
    activeSubscriptions: 45,
    churnRate: 2.3,
  };

  const recentTransactions = [
    { id: '1', org: 'Acme Corp', amount: 299, status: 'paid', date: 'Feb 5, 2026' },
    { id: '2', org: 'TechStart Inc', amount: 149, status: 'paid', date: 'Feb 4, 2026' },
    { id: '3', org: 'Global Services', amount: 499, status: 'pending', date: 'Feb 3, 2026' },
    { id: '4', org: 'Local Business', amount: 99, status: 'paid', date: 'Feb 2, 2026' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Billing' : 'Facturation'}
          </h1>
          <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Revenue metrics and subscription management' : 'Métriques de revenus et gestion des abonnements'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
        >
          <Download className="w-4 h-4" />
          {isEn ? 'Export Report' : 'Exporter le rapport'}
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>MRR</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                ${stats.mrr.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>+12% vs last month</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>ARR</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                ${stats.arr.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>+8% vs last year</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
              <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Active Subscriptions' : 'Abonnements actifs'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{stats.activeSubscriptions}</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
              <TrendingUp className="w-5 h-5 rotate-180" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Churn Rate' : 'Taux de désabonnement'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{stats.churnRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Recent Transactions' : 'Transactions récentes'}
          </h2>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>
            <Filter className="w-4 h-4" />
            {isEn ? 'Filter' : 'Filtrer'}
          </button>
        </div>

        <table className="w-full">
          <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Organization' : 'Organisation'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Amount' : 'Montant'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Status' : 'Statut'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Date' : 'Date'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {recentTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4 font-medium" style={{ color: 'rgb(var(--color-text))' }}>{tx.org}</td>
                <td className="px-6 py-4" style={{ color: 'rgb(var(--color-text))' }}>${tx.amount}</td>
                <td className="px-6 py-4">
                  <span
                    className="px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: tx.status === 'paid' ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-warning) / 0.1)',
                      color: tx.status === 'paid' ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))',
                    }}
                  >
                    {tx.status === 'paid' ? (isEn ? 'Paid' : 'Payé') : (isEn ? 'Pending' : 'En attente')}
                  </span>
                </td>
                <td className="px-6 py-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
