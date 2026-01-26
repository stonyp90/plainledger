/**
 * Accounting-Focused Dashboard Widgets
 * Provides visual components for key accounting metrics
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Landmark,
  FileText,
  DollarSign,
} from 'lucide-react';
import type { 
  AgingBucket, 
  BankReconciliation, 
  BudgetComparison, 
  AccountingDeadline,
} from '../lib/financialData';

// =====================================================
// AR/AP AGING WIDGET
// =====================================================

interface AgingWidgetProps {
  title: string;
  titleEn: string;
  data: AgingBucket[];
  totalOverdue: number;
  averageDays: number;
  type: 'receivable' | 'payable';
  isEn: boolean;
  onViewDetails?: () => void;
}

export function AgingWidget({ 
  title, 
  titleEn,
  data, 
  totalOverdue,
  averageDays,
  type,
  isEn,
  onViewDetails 
}: AgingWidgetProps) {
  const total = data.reduce((sum, bucket) => sum + bucket.amount, 0);
  const overduePercent = total > 0 ? (totalOverdue / total) * 100 : 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getBarColor = (index: number) => {
    const colors = [
      'rgb(var(--color-success))',
      'rgb(var(--color-warning))',
      'rgb(var(--color-error) / 0.7)',
      'rgb(var(--color-error))',
    ];
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {type === 'receivable' ? (
            <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          ) : (
            <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          )}
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? titleEn : title}
          </h3>
        </div>
        {onViewDetails && (
          <button onClick={onViewDetails} className="text-sm flex items-center gap-1 text-muted hover:text-secondary">
            {isEn ? 'Details' : 'Détails'} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Total</p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatCurrency(total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            {isEn ? 'Overdue' : 'En retard'}
          </p>
          <p className="text-lg font-bold" style={{ color: overduePercent > 20 ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))' }}>
            {formatCurrency(totalOverdue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            {type === 'receivable' ? 'DSO' : 'DPO'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {averageDays}d
          </p>
        </div>
      </div>

      {/* Aging Breakdown */}
      <div className="space-y-3">
        {data.map((bucket, index) => (
          <div key={index}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? bucket.labelEn : bucket.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">
                  {bucket.count} {isEn ? 'invoices' : 'factures'}
                </span>
                <span className="font-medium tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatCurrency(bucket.amount)}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${bucket.percentage}%`,
                  backgroundColor: getBarColor(index)
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Warning if high overdue */}
      {overduePercent > 15 && (
        <div 
          className="mt-4 p-3 rounded-lg flex items-start gap-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning) / 0.1)',
            border: '1px solid rgb(var(--color-warning) / 0.2)'
          }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-warning))' }} />
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `${overduePercent.toFixed(0)}% of ${type === 'receivable' ? 'receivables' : 'payables'} are overdue. Consider following up.`
              : `${overduePercent.toFixed(0)}% des ${type === 'receivable' ? 'créances' : 'dettes'} sont en retard. Envisagez un suivi.`}
          </p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// BANK RECONCILIATION WIDGET
// =====================================================

interface BankReconciliationWidgetProps {
  accounts: BankReconciliation[];
  isEn: boolean;
}

export function BankReconciliationWidget({ accounts, isEn }: BankReconciliationWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasDiscrepancy = accounts.some(a => a.status === 'discrepancy');
  const totalDifference = accounts.reduce((sum, a) => sum + Math.abs(a.difference), 0);

  return (
    <div className="card">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Bank Reconciliation' : 'Rapprochement bancaire'}
          </h3>
          {hasDiscrepancy && (
            <span className="badge-error text-xs">
              {isEn ? 'Discrepancy' : 'Écart'}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        )}
      </button>

      {/* Summary */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {totalDifference === 0 ? (
            <CheckCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
          ) : (
            <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
          )}
          <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {accounts.length} {isEn ? 'accounts' : 'comptes'}
          </span>
        </div>
        <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Outstanding items:' : 'Éléments en suspens:'} {formatCurrency(totalDifference)}
        </span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {accounts.map((account, index) => (
            <div 
              key={index}
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {account.accountName}
                  </p>
                  <p className="text-xs text-muted">{account.accountNumber}</p>
                </div>
                <span 
                  className={`text-xs px-2 py-1 rounded-full ${
                    account.status === 'reconciled' ? 'badge-success' :
                    account.status === 'discrepancy' ? 'badge-error' : 'badge-warning'
                  }`}
                >
                  {account.status === 'reconciled' ? (isEn ? 'Reconciled' : 'Rapproché') :
                   account.status === 'discrepancy' ? (isEn ? 'Discrepancy' : 'Écart') :
                   (isEn ? 'Pending' : 'En attente')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted">{isEn ? 'Book' : 'Comptable'}</p>
                  <p className="font-medium tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(account.bookBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">{isEn ? 'Bank' : 'Bancaire'}</p>
                  <p className="font-medium tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(account.bankBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">{isEn ? 'Difference' : 'Différence'}</p>
                  <p 
                    className="font-medium tabular-nums"
                    style={{ color: account.difference === 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }}
                  >
                    {formatCurrency(account.difference)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted mt-2">
                {isEn ? 'Last reconciled:' : 'Dernier rapprochement:'} {account.lastReconciled}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// BUDGET COMPARISON WIDGET
// =====================================================

interface BudgetWidgetProps {
  data: BudgetComparison[];
  isEn: boolean;
}

export function BudgetWidget({ data, isEn }: BudgetWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const totalBudget = data.reduce((sum, item) => sum + item.budget, 0);
  const totalVariance = totalActual - totalBudget;
  const totalVariancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Budget vs Actual' : 'Budget vs Réel'}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{isEn ? 'Total Variance' : 'Écart total'}</p>
          <p 
            className="font-bold tabular-nums"
            style={{ color: totalVariance <= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
          >
            {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)} ({totalVariancePercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-24 sm:w-32 truncate">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? item.categoryEn : item.category}
              </span>
            </div>
            <div className="flex-1">
              <div className="h-4 rounded-full overflow-hidden relative" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                {/* Budget line */}
                <div 
                  className="absolute h-full w-0.5 z-10"
                  style={{ 
                    left: '100%',
                    backgroundColor: 'rgb(var(--color-text-muted))'
                  }}
                />
                {/* Actual bar */}
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((item.actual / item.budget) * 100, 120)}%`,
                    backgroundColor: item.status === 'under' 
                      ? 'rgb(var(--color-success))' 
                      : item.status === 'on_track'
                        ? 'rgb(var(--color-primary-500))'
                        : 'rgb(var(--color-error))'
                  }}
                />
              </div>
            </div>
            <div className="w-20 text-right">
              <span 
                className="text-xs font-medium tabular-nums"
                style={{ 
                  color: item.status === 'over' 
                    ? 'rgb(var(--color-error))' 
                    : item.status === 'under' 
                      ? 'rgb(var(--color-success))'
                      : 'rgb(var(--color-text-muted))'
                }}
              >
                {item.variancePercent >= 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-success))' }} />
            {isEn ? 'Under budget' : 'Sous budget'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
            {isEn ? 'Over budget' : 'Dépassement'}
          </span>
        </div>
        <span className="text-muted">
          {isEn ? 'YTD comparison' : 'Comparaison cumul annuel'}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// DEADLINES WIDGET
// =====================================================

interface DeadlinesWidgetProps {
  deadlines: AccountingDeadline[];
  isEn: boolean;
}

export function DeadlinesWidget({ deadlines, isEn }: DeadlinesWidgetProps) {
  const getTypeIcon = (type: AccountingDeadline['type']) => {
    switch (type) {
      case 'tax': return <DollarSign className="w-4 h-4" />;
      case 'filing': return <FileText className="w-4 h-4" />;
      case 'payment': return <Landmark className="w-4 h-4" />;
      case 'audit': return <AlertTriangle className="w-4 h-4" />;
      case 'report': return <FileText className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: AccountingDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return { bg: 'rgb(var(--color-error) / 0.1)', text: 'rgb(var(--color-error))' };
      case 'upcoming':
        return { bg: 'rgb(var(--color-warning) / 0.1)', text: 'rgb(var(--color-warning))' };
      case 'completed':
        return { bg: 'rgb(var(--color-success) / 0.1)', text: 'rgb(var(--color-success))' };
      default:
        return { bg: 'rgb(var(--color-bg-muted))', text: 'rgb(var(--color-text-muted))' };
    }
  };

  const getDaysUntil = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sortedDeadlines = [...deadlines].sort((a, b) => {
    // Overdue first, then by date
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Upcoming Deadlines' : 'Échéances à venir'}
          </h3>
        </div>
        {deadlines.some(d => d.status === 'overdue') && (
          <span className="badge-error text-xs">
            {deadlines.filter(d => d.status === 'overdue').length} {isEn ? 'overdue' : 'en retard'}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {sortedDeadlines.slice(0, 5).map((deadline) => {
          const style = getStatusStyle(deadline.status);
          const daysUntil = getDaysUntil(deadline.dueDate);
          
          return (
            <div 
              key={deadline.id}
              className="p-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: style.bg }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                {getTypeIcon(deadline.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? deadline.titleEn : deadline.title}
                </p>
                <p className="text-xs" style={{ color: style.text }}>
                  {deadline.status === 'overdue' 
                    ? (isEn ? `Overdue by ${Math.abs(daysUntil)} days` : `En retard de ${Math.abs(daysUntil)} jours`)
                    : deadline.status === 'completed'
                      ? (isEn ? 'Completed' : 'Complété')
                      : daysUntil === 0 
                        ? (isEn ? 'Due today' : 'Échéance aujourd\'hui')
                        : daysUntil === 1
                          ? (isEn ? 'Due tomorrow' : 'Échéance demain')
                          : (isEn ? `Due in ${daysUntil} days` : `Échéance dans ${daysUntil} jours`)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {new Date(deadline.dueDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {deadlines.length > 5 && (
        <button className="mt-3 w-full text-sm text-center py-2 rounded-lg transition-colors hover:bg-muted" style={{ color: 'rgb(var(--color-primary-500))' }}>
          {isEn ? `View all ${deadlines.length} deadlines` : `Voir les ${deadlines.length} échéances`}
        </button>
      )}
    </div>
  );
}

// =====================================================
// TRIAL BALANCE SUMMARY WIDGET
// =====================================================

interface TrialBalanceSummaryProps {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  isEn: boolean;
}

export function TrialBalanceSummary({ totalDebits, totalCredits, isBalanced, isEn }: TrialBalanceSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const difference = Math.abs(totalDebits - totalCredits);

  return (
    <div 
      className="p-4 rounded-xl flex items-center justify-between"
      style={{ 
        backgroundColor: isBalanced ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-error) / 0.1)',
        border: `1px solid ${isBalanced ? 'rgb(var(--color-success) / 0.2)' : 'rgb(var(--color-error) / 0.2)'}`
      }}
    >
      <div className="flex items-center gap-3">
        {isBalanced ? (
          <CheckCircle className="w-6 h-6" style={{ color: 'rgb(var(--color-success))' }} />
        ) : (
          <AlertTriangle className="w-6 h-6" style={{ color: 'rgb(var(--color-error))' }} />
        )}
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Trial Balance' : 'Balance de vérification'}
          </p>
          <p className="text-sm" style={{ color: isBalanced ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
            {isBalanced 
              ? (isEn ? 'Balanced' : 'Équilibré')
              : (isEn ? `Out of balance by ${formatCurrency(difference)}` : `Déséquilibré de ${formatCurrency(difference)}`)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted">{isEn ? 'Debits' : 'Débits'}</p>
            <p className="font-bold tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
              {formatCurrency(totalDebits)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{isEn ? 'Credits' : 'Crédits'}</p>
            <p className="font-bold tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
              {formatCurrency(totalCredits)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  AgingWidget,
  BankReconciliationWidget,
  BudgetWidget,
  DeadlinesWidget,
  TrialBalanceSummary,
};
