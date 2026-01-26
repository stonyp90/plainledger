import { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

interface RatioCardProps {
  name: string;
  nameEn?: string;
  value: number;
  previousValue?: number;
  target: { min?: number; max?: number; ideal?: number };
  description: string;
  descriptionEn?: string;
  format?: 'decimal' | 'percentage' | 'times';
  isEn?: boolean;
  onClick?: () => void;
}

export default function RatioCard({
  name,
  nameEn,
  value,
  previousValue,
  target,
  description,
  descriptionEn,
  format = 'decimal',
  isEn = false,
  onClick,
}: RatioCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isScaleHovered, setIsScaleHovered] = useState(false);

  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'times':
        return `${val.toFixed(2)}x`;
      default:
        return val.toFixed(2);
    }
  };

  const getStatus = (): { status: 'good' | 'warning' | 'critical'; message: string; messageEn: string } => {
    if (target.min !== undefined && value < target.min) {
      return {
        status: 'critical',
        message: `Sous le minimum recommandé (${formatValue(target.min)})`,
        messageEn: `Below recommended minimum (${formatValue(target.min)})`,
      };
    }
    if (target.max !== undefined && value > target.max) {
      return {
        status: 'warning',
        message: `Au-dessus du maximum recommandé (${formatValue(target.max)})`,
        messageEn: `Above recommended maximum (${formatValue(target.max)})`,
      };
    }
    if (target.ideal !== undefined) {
      const deviation = Math.abs(value - target.ideal) / target.ideal;
      if (deviation > 0.2) {
        return {
          status: 'warning',
          message: `Éloigné de l'idéal (${formatValue(target.ideal)})`,
          messageEn: `Far from ideal (${formatValue(target.ideal)})`,
        };
      }
    }
    return { status: 'good', message: 'Dans la plage optimale', messageEn: 'Within optimal range' };
  };

  const { status, message, messageEn } = getStatus();
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : null;

  const statusColors = {
    good: {
      bg: 'rgb(var(--color-success) / 0.1)',
      text: 'rgb(var(--color-success))',
      border: 'rgb(var(--color-success) / 0.3)',
      glow: 'rgb(var(--color-success) / 0.2)',
    },
    warning: {
      bg: 'rgb(var(--color-warning) / 0.1)',
      text: 'rgb(var(--color-warning))',
      border: 'rgb(var(--color-warning) / 0.3)',
      glow: 'rgb(var(--color-warning) / 0.2)',
    },
    critical: {
      bg: 'rgb(var(--color-error) / 0.1)',
      text: 'rgb(var(--color-error))',
      border: 'rgb(var(--color-error) / 0.3)',
      glow: 'rgb(var(--color-error) / 0.2)',
    },
  };

  const colors = statusColors[status];

  // Calculate position on scale (0-100%)
  const minVal = target.min ?? 0;
  const maxVal = target.max ?? (value * 1.5);
  const range = maxVal - minVal;
  const position = Math.min(100, Math.max(0, ((value - minVal) / range) * 100));

  const StatusIcon = status === 'good' ? CheckCircle : AlertTriangle;

  return (
    <div 
      className={`
        p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer relative overflow-hidden
        ${isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-sm'}
      `}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: isHovered ? colors.text : colors.border,
        boxShadow: isHovered ? `0 8px 30px ${colors.glow}` : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Gradient background on hover */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ 
          opacity: isHovered ? 0.05 : 0,
          background: `linear-gradient(135deg, ${colors.text}, transparent)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 
            className={`font-semibold text-sm transition-colors duration-200`} 
            style={{ color: isHovered ? colors.text : 'rgb(var(--color-text))' }}
          >
            {isEn && nameEn ? nameEn : name}
          </h4>
          <p 
            className={`text-xs mt-0.5 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-70'}`} 
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn && descriptionEn ? descriptionEn : description}
          </p>
        </div>
        <div 
          className={`
            p-2 rounded-lg transition-all duration-300
            ${isHovered ? 'scale-110 rotate-3' : ''}
          `}
          style={{ backgroundColor: colors.bg }}
        >
          <StatusIcon className="w-5 h-5" style={{ color: colors.text }} />
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10 flex items-baseline gap-3 mb-4">
        <span 
          className={`
            text-3xl font-bold tabular-nums transition-all duration-300
            ${isHovered ? 'scale-105' : ''}
          `}
          style={{ color: colors.text }}
        >
          {formatValue(value)}
        </span>
        
        {/* Change indicator */}
        {change !== null && (
          <div 
            className={`
              flex items-center gap-1 text-sm font-medium
              ${change >= 0 ? 'text-green-500' : 'text-red-500'}
            `}
          >
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
        
        {target.ideal && (
          <span 
            className={`
              text-xs px-2 py-0.5 rounded-full transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-60'}
            `} 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'ideal' : 'idéal'}: {formatValue(target.ideal)}
          </span>
        )}
      </div>

      {/* Scale visualization */}
      <div 
        className={`
          relative h-3 rounded-full overflow-hidden mb-2 cursor-crosshair
          transition-all duration-200
          ${isScaleHovered ? 'h-4' : ''}
        `} 
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        onMouseEnter={() => setIsScaleHovered(true)}
        onMouseLeave={() => setIsScaleHovered(false)}
      >
        {/* Good zone indicator */}
        {target.min !== undefined && target.max !== undefined && (
          <div 
            className={`absolute h-full transition-all duration-200 ${isScaleHovered ? 'opacity-100' : 'opacity-70'}`}
            style={{ 
              left: `${((target.min - minVal) / range) * 100}%`,
              width: `${((target.max - target.min) / range) * 100}%`,
              backgroundColor: 'rgb(var(--color-success) / 0.4)',
            }}
          />
        )}
        
        {/* Current value marker with pulse effect */}
        <div 
          className={`
            absolute top-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300
            ${isHovered ? 'w-4 h-4' : 'w-3 h-3'}
          `}
          style={{ 
            left: `calc(${position}% - ${isHovered ? 8 : 6}px)`,
            backgroundColor: colors.text,
            borderColor: 'rgb(var(--color-surface))',
            boxShadow: isHovered ? `0 0 10px ${colors.text}` : 'none',
          }}
        >
          {isHovered && (
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: colors.text, opacity: 0.5 }}
            />
          )}
        </div>
        
        {/* Tooltip on scale hover */}
        {isScaleHovered && (
          <div 
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap"
          >
            {formatValue(value)}
          </div>
        )}
      </div>

      {/* Scale labels */}
      <div 
        className={`
          flex justify-between text-[10px] transition-opacity duration-200
          ${isHovered ? 'opacity-100' : 'opacity-60'}
        `} 
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        <span>{formatValue(minVal)}</span>
        {target.ideal && <span className="text-center">{isEn ? 'Ideal' : 'Idéal'}: {formatValue(target.ideal)}</span>}
        <span>{formatValue(maxVal)}</span>
      </div>

      {/* Status message */}
      <div 
        className={`
          relative z-10 mt-4 flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg
          transition-all duration-200
          ${isHovered ? 'scale-[1.02]' : ''}
        `}
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          <span>{isEn ? messageEn : message}</span>
        </div>
        {isHovered && onClick && (
          <ExternalLink className="w-3 h-3 opacity-70" />
        )}
      </div>
    </div>
  );
}

// Preset ratio cards for common financial ratios
export function CurrentRatioCard({ value }: { value: number }) {
  return (
    <RatioCard
      name="Ratio de liquidité générale"
      value={value}
      target={{ min: 1.0, max: 3.0, ideal: 2.0 }}
      description="Actifs courants / Passifs courants"
      format="times"
    />
  );
}

export function QuickRatioCard({ value }: { value: number }) {
  return (
    <RatioCard
      name="Ratio de liquidité immédiate"
      value={value}
      target={{ min: 0.8, ideal: 1.0 }}
      description="(Actifs courants - Stocks) / Passifs courants"
      format="times"
    />
  );
}

export function DebtToEquityCard({ value }: { value: number }) {
  return (
    <RatioCard
      name="Ratio dette/capitaux propres"
      value={value}
      target={{ max: 2.0, ideal: 1.0 }}
      description="Total dettes / Capitaux propres"
      format="times"
    />
  );
}

export function GrossProfitMarginCard({ value }: { value: number }) {
  return (
    <RatioCard
      name="Marge brute"
      value={value}
      target={{ min: 0.20, ideal: 0.40 }}
      description="(Revenus - Coût des ventes) / Revenus"
      format="percentage"
    />
  );
}

export function NetProfitMarginCard({ value }: { value: number }) {
  return (
    <RatioCard
      name="Marge nette"
      value={value}
      target={{ min: 0.05, ideal: 0.15 }}
      description="Bénéfice net / Revenus"
      format="percentage"
    />
  );
}
