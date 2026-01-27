/**
 * Quick Metrics Component
 * 
 * Executive dashboard-style metrics bar with key financial indicators
 */

import { DollarSign, TrendingDown, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
        style: 'decimal',
        maximumFractionDigits: 1,
      }).format(value / 1000000) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(value / 1000) + 'K';
    }
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusInfo = () => {
    if (runwayMonths === Infinity) {
      return {
        color: '#10B981',
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        bg: 'rgba(16, 185, 129, 0.08)',
        label: isEn ? 'Sustainable' : 'Durable',
        icon: CheckCircle2,
      };
    }
    if (runwayMonths < 3) {
      return {
        color: '#EF4444',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        bg: 'rgba(239, 68, 68, 0.08)',
        label: isEn ? 'Critical' : 'Critique',
        icon: AlertTriangle,
      };
    }
    if (runwayMonths < 6) {
      return {
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        bg: 'rgba(245, 158, 11, 0.08)',
        label: isEn ? 'Warning' : 'Attention',
        icon: AlertTriangle,
      };
    }
    if (runwayMonths < 12) {
      return {
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        bg: 'rgba(245, 158, 11, 0.08)',
        label: isEn ? 'Monitor' : 'Surveiller',
        icon: Clock,
      };
    }
    return {
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      bg: 'rgba(16, 185, 129, 0.08)',
      label: isEn ? 'Healthy' : 'Sain',
      icon: CheckCircle2,
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <div 
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface) / 0.95)',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4 overflow-x-auto">
          {/* Cash Position */}
          <div className="flex items-center gap-3 min-w-fit">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.25)',
              }}
            >
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Treasury' : 'Trésorerie'}
              </p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {formatCurrency(cash)} <span className="text-sm font-medium">$</span>
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-12 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          
          {/* Monthly Burn */}
          <div className="flex items-center gap-3 min-w-fit">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              }}
            >
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Burn Rate
              </p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: '#EF4444' }}>
                {formatCurrency(burnRate)} <span className="text-sm font-medium">$/mo</span>
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-12 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          
          {/* Runway */}
          <div className="flex items-center gap-3 min-w-fit">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: status.gradient,
                boxShadow: `0 4px 12px ${status.color}40`,
              }}
            >
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Runway' : 'Autonomie'}
              </p>
              <div className="flex items-baseline gap-1">
                {runwayMonths === Infinity ? (
                  <span className="text-xl sm:text-2xl font-bold" style={{ color: status.color }}>∞</span>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: status.color }}>
                    {runwayMonths.toFixed(0)}
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: status.color }}>
                  {isEn ? 'months' : 'mois'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-12 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          
          {/* Status Badge */}
          <div className="flex items-center gap-3 min-w-fit">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: status.gradient,
                boxShadow: `0 4px 12px ${status.color}40`,
              }}
            >
              <StatusIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Status' : 'Statut'}
              </p>
              <p className="text-lg sm:text-xl font-bold" style={{ color: status.color }}>
                {status.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
