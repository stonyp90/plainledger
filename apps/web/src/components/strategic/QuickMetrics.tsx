/**
 * Quick Metrics Component
 * 
 * Executive dashboard-style metrics bar with key financial indicators
 * Modern card-based design with status indicators and smooth interactions
 */

import { TrendingUp, TrendingDown, Timer, CalendarClock, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
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

  const formatCurrency = (value: number | null | undefined) => {
    const numValue = value ?? 0;
    if (isNaN(numValue) || !isFinite(numValue)) return '—';
    if (Math.abs(numValue) >= 1000000) {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(numValue / 1000000) + 'M';
    }
    if (Math.abs(numValue) >= 1000) {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue / 1000) + 'K';
    }
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(isEn ? 'en-CA' : 'fr-CA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return '—';
    }
  };

  const getRunwayStatus = () => {
    if (runwayMonths === Infinity) {
      return {
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        label: isEn ? 'Sustainable' : 'Durable',
        icon: CheckCircle2,
        pulse: false,
      };
    }
    if (runwayMonths < 3) {
      return {
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        label: isEn ? 'Critical' : 'Critique',
        icon: AlertCircle,
        pulse: true,
      };
    }
    if (runwayMonths < 6) {
      return {
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        label: isEn ? 'Warning' : 'Attention',
        icon: AlertCircle,
        pulse: true,
      };
    }
    if (runwayMonths < 12) {
      return {
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.15)',
        label: isEn ? 'Monitor' : 'Surveiller',
        icon: Timer,
        pulse: false,
      };
    }
    return {
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      label: isEn ? 'Healthy' : 'Sain',
      icon: CheckCircle2,
      pulse: false,
    };
  };

  const runwayStatus = getRunwayStatus();
  const StatusIcon = runwayStatus.icon;

  // Metric card component for consistency
  const MetricCard = ({ 
    icon: Icon, 
    iconColor, 
    iconBg, 
    label, 
    value, 
    valueColor,
    suffix,
    badge,
    badgeColor,
    badgeBg,
  }: {
    icon: typeof TrendingUp;
    iconColor: string;
    iconBg: string;
    label: string;
    value: string;
    valueColor: string;
    suffix?: string;
    badge?: string;
    badgeColor?: string;
    badgeBg?: string;
  }) => (
    <div 
      className="group relative flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.02)',
      }}
    >
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, ${iconBg}, transparent 70%)`,
        }}
      />
      
      {/* Icon container */}
      <div 
        className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ 
          backgroundColor: iconBg,
          border: `1px solid ${iconColor}20`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      
      {/* Content */}
      <div className="relative flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <p 
            className="text-[11px] font-medium uppercase tracking-wide whitespace-nowrap"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {label}
          </p>
          {badge && (
            <span 
              className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full flex-shrink-0"
              style={{ 
                color: badgeColor,
                backgroundColor: badgeBg,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 flex-wrap">
          <span 
            className="text-2xl font-bold tabular-nums tracking-tight whitespace-nowrap"
            style={{ color: valueColor }}
          >
            {value}
          </span>
          {suffix && (
            <span 
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: `${valueColor}99` }}
            >
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5">
      {/* Container card */}
      <div 
        className="rounded-2xl p-4 sm:p-5"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Cash Position */}
          <MetricCard
            icon={TrendingUp}
            iconColor="rgb(var(--color-primary-500))"
            iconBg="rgb(var(--color-primary-500) / 0.1)"
            label={isEn ? 'Cash Balance' : 'Solde de trésorerie'}
            value={formatCurrency(cash)}
            valueColor="rgb(var(--color-primary-600))"
          />
          
          {/* Monthly Burn */}
          <MetricCard
            icon={TrendingDown}
            iconColor="rgb(var(--color-error))"
            iconBg="rgb(var(--color-error) / 0.1)"
            label={isEn ? 'Monthly Burn' : 'Brûlage mensuel'}
            value={formatCurrency(burnRate)}
            valueColor="rgb(var(--color-error))"
            suffix={isEn ? '/mo' : '/mois'}
          />
          
          {/* Runway */}
          <div 
            className="group relative flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: `1px solid ${runwayStatus.borderColor}`,
              boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.02)',
            }}
          >
            {/* Pulse animation for critical/warning states */}
            {runwayStatus.pulse && (
              <div 
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{ 
                  backgroundColor: runwayStatus.bgColor,
                }}
              />
            )}
            
            {/* Hover glow effect */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ 
                background: `radial-gradient(circle at 30% 30%, ${runwayStatus.bgColor}, transparent 70%)`,
              }}
            />
            
            {/* Icon container */}
            <div 
              className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ 
                backgroundColor: runwayStatus.bgColor,
                border: `1px solid ${runwayStatus.color}30`,
              }}
            >
              <Timer className="w-5 h-5" style={{ color: runwayStatus.color }} />
            </div>
            
            {/* Content */}
            <div className="relative min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 mb-1.5">
                <p 
                  className="text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {isEn ? 'Runway' : 'Trésorerie'}
                </p>
                <span 
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full"
                  style={{ 
                    color: runwayStatus.color,
                    backgroundColor: runwayStatus.bgColor,
                  }}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {runwayStatus.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                {runwayMonths === Infinity ? (
                  <span 
                    className="text-2xl font-bold tracking-tight flex items-center gap-1"
                    style={{ color: runwayStatus.color }}
                  >
                    <Sparkles className="w-5 h-5" />
                    ∞
                  </span>
                ) : (
                  <>
                    <span 
                      className="text-2xl font-bold tabular-nums tracking-tight"
                      style={{ color: runwayStatus.color }}
                    >
                      {runwayMonths.toFixed(0)}
                    </span>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: `${runwayStatus.color}99` }}
                    >
                      {isEn ? 'months' : 'mois'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Zero Date */}
          <MetricCard
            icon={CalendarClock}
            iconColor={runwayMonths < 6 ? 'rgb(var(--color-error))' : runwayMonths < 12 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-secondary))'}
            iconBg={runwayMonths < 6 ? 'rgb(var(--color-error) / 0.1)' : runwayMonths < 12 ? 'rgb(var(--color-warning) / 0.1)' : 'rgb(var(--color-text-secondary) / 0.1)'}
            label={isEn ? 'Zero Date' : 'Date zéro'}
            value={runwayMonths === Infinity ? (isEn ? 'Never' : 'Jamais') : formatDate(zeroDate)}
            valueColor={runwayMonths < 6 ? 'rgb(var(--color-error))' : runwayMonths < 12 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text))'}
          />
        </div>
      </div>
    </div>
  );
}
