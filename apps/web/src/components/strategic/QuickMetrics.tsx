/**
 * Quick Metrics Component
 * 
 * Compact header bar with key financial metrics
 */

import { DollarSign, TrendingDown, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

interface QuickMetricsProps {
  cash: number;
  burnRate: number;
  runwayMonths: number;
  zeroDate?: string;
}

export default function QuickMetrics({
  cash,
  burnRate,
  runwayMonths,
  zeroDate,
}: QuickMetricsProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 1,
        notation: 'compact',
      }).format(value);
    }
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusInfo = () => {
    if (runwayMonths === Infinity) {
      return {
        color: '#10B981',
        bg: '#F0FDF4',
        label: isEn ? 'Sustainable' : 'Durable',
        icon: CheckCircle2,
      };
    }
    if (runwayMonths < 3) {
      return {
        color: '#EF4444',
        bg: '#FEF2F2',
        label: isEn ? 'Critical' : 'Critique',
        icon: AlertTriangle,
      };
    }
    if (runwayMonths < 6) {
      return {
        color: '#F59E0B',
        bg: '#FFFBEB',
        label: isEn ? 'Warning' : 'Attention',
        icon: AlertTriangle,
      };
    }
    if (runwayMonths < 12) {
      return {
        color: '#F59E0B',
        bg: '#FFFBEB',
        label: isEn ? 'Monitor' : 'Surveiller',
        icon: Clock,
      };
    }
    return {
      color: '#10B981',
      bg: '#F0FDF4',
      label: isEn ? 'Healthy' : 'Sain',
      icon: CheckCircle2,
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Cash Position */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Cash' : 'Trésorerie'}
          </span>
        </div>
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
          {formatCurrency(cash)}
        </p>
      </div>
      
      {/* Monthly Burn */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
          >
            <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Burn Rate' : 'Burn Rate'}
          </span>
        </div>
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-error))' }}>
          {formatCurrency(burnRate)}
          <span className="text-sm font-normal">/mo</span>
        </p>
      </div>
      
      {/* Runway */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${status.color}15` }}
          >
            <Clock className="w-4 h-4" style={{ color: status.color }} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Runway' : 'Autonomie'}
          </span>
          {runwayMonths < 6 && (
            <AlertTriangle className="w-3.5 h-3.5 ml-auto" style={{ color: status.color }} />
          )}
        </div>
        <p className="text-2xl font-bold" style={{ color: status.color }}>
          {runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1)}
          <span className="text-sm font-normal ml-1">{isEn ? 'months' : 'mois'}</span>
        </p>
      </div>
      
      {/* Status */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${status.color}15` }}
          >
            <StatusIcon className="w-4 h-4" style={{ color: status.color }} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Status' : 'Statut'}
          </span>
        </div>
        <p className="text-lg font-semibold" style={{ color: status.color }}>
          {status.label}
        </p>
        {zeroDate && runwayMonths !== Infinity && (
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {new Date(zeroDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        )}
      </div>
    </div>
  );
}
