import { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, ExternalLink, Building2 } from 'lucide-react';

// Industry benchmark data - comprehensive industry support
export type IndustryType = 
  | 'real_estate' 
  | 'retail' 
  | 'restaurant'
  | 'hospitality'
  | 'construction' 
  | 'professional_services'
  | 'services' // alias for professional_services
  | 'manufacturing'
  | 'agriculture'
  | 'healthcare'
  | 'transport'
  | 'education'
  | 'wholesale'
  | 'automotive'
  | 'beauty_wellness'
  | 'general';

export const INDUSTRY_LABELS: Record<IndustryType, { fr: string; en: string }> = {
  real_estate: { fr: 'Immobilier', en: 'Real Estate' },
  retail: { fr: 'Commerce de détail', en: 'Retail' },
  restaurant: { fr: 'Restauration', en: 'Restaurant' },
  hospitality: { fr: 'Hôtellerie', en: 'Hospitality' },
  construction: { fr: 'Construction', en: 'Construction' },
  professional_services: { fr: 'Services professionnels', en: 'Professional Services' },
  services: { fr: 'Services professionnels', en: 'Professional Services' },
  manufacturing: { fr: 'Manufacturier', en: 'Manufacturing' },
  agriculture: { fr: 'Agroalimentaire', en: 'Agriculture' },
  healthcare: { fr: 'Santé', en: 'Healthcare' },
  transport: { fr: 'Transport', en: 'Transport' },
  education: { fr: 'Éducation', en: 'Education' },
  wholesale: { fr: 'Commerce de gros', en: 'Wholesale' },
  automotive: { fr: 'Automobile', en: 'Automotive' },
  beauty_wellness: { fr: 'Beauté et bien-être', en: 'Beauty & Wellness' },
  general: { fr: 'Général', en: 'General' },
};

// Industry-specific benchmarks for common ratios
// Benchmarks based on Quebec/Canadian market data and industry standards
type BenchmarkValues = { min: number; max: number; ideal: number; median: number };
const defaultBenchmarks: Record<string, BenchmarkValues> = {
  currentRatio: { min: 1.0, max: 3.0, ideal: 2.0, median: 1.8 },
  quickRatio: { min: 0.8, max: 2.0, ideal: 1.0, median: 1.0 },
  debtToEquity: { min: 0.0, max: 2.0, ideal: 1.0, median: 1.0 },
  grossProfitMargin: { min: 0.20, max: 0.60, ideal: 0.40, median: 0.35 },
  netProfitMargin: { min: 0.05, max: 0.15, ideal: 0.10, median: 0.08 },
};

export const INDUSTRY_BENCHMARKS: Record<string, Record<IndustryType, BenchmarkValues>> = {
  currentRatio: {
    real_estate: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.35 },
    retail: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.4 },
    restaurant: { min: 0.8, max: 2.0, ideal: 1.2, median: 1.1 },
    hospitality: { min: 0.9, max: 2.2, ideal: 1.3, median: 1.2 },
    construction: { min: 1.2, max: 2.5, ideal: 1.5, median: 1.4 },
    professional_services: { min: 1.2, max: 3.0, ideal: 2.0, median: 1.9 },
    services: { min: 1.2, max: 3.0, ideal: 2.0, median: 1.9 },
    manufacturing: { min: 1.2, max: 2.5, ideal: 1.8, median: 1.6 },
    agriculture: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.3 },
    healthcare: { min: 1.2, max: 2.8, ideal: 1.8, median: 1.6 },
    transport: { min: 1.0, max: 2.2, ideal: 1.4, median: 1.3 },
    education: { min: 1.3, max: 3.0, ideal: 2.0, median: 1.8 },
    wholesale: { min: 1.1, max: 2.5, ideal: 1.6, median: 1.4 },
    automotive: { min: 1.1, max: 2.3, ideal: 1.5, median: 1.3 },
    beauty_wellness: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.3 },
    general: { min: 1.0, max: 3.0, ideal: 2.0, median: 1.8 },
  },
  quickRatio: {
    real_estate: { min: 0.5, max: 1.8, ideal: 1.0, median: 0.85 },
    retail: { min: 0.3, max: 1.5, ideal: 0.8, median: 0.6 },
    restaurant: { min: 0.4, max: 1.2, ideal: 0.7, median: 0.5 },
    hospitality: { min: 0.5, max: 1.5, ideal: 0.9, median: 0.7 },
    construction: { min: 0.8, max: 2.0, ideal: 1.2, median: 1.0 },
    professional_services: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.4 },
    services: { min: 1.0, max: 2.5, ideal: 1.5, median: 1.4 },
    manufacturing: { min: 0.6, max: 1.8, ideal: 1.0, median: 0.9 },
    agriculture: { min: 0.4, max: 1.5, ideal: 0.8, median: 0.6 },
    healthcare: { min: 0.8, max: 2.0, ideal: 1.2, median: 1.0 },
    transport: { min: 0.6, max: 1.5, ideal: 0.9, median: 0.8 },
    education: { min: 0.9, max: 2.2, ideal: 1.4, median: 1.2 },
    wholesale: { min: 0.5, max: 1.5, ideal: 0.9, median: 0.7 },
    automotive: { min: 0.4, max: 1.4, ideal: 0.8, median: 0.6 },
    beauty_wellness: { min: 0.6, max: 1.8, ideal: 1.0, median: 0.8 },
    general: { min: 0.8, max: 2.0, ideal: 1.0, median: 1.0 },
  },
  debtToEquity: {
    real_estate: { min: 0.8, max: 3.5, ideal: 1.8, median: 2.1 },
    retail: { min: 0.5, max: 2.5, ideal: 1.2, median: 1.5 },
    restaurant: { min: 0.8, max: 3.0, ideal: 1.5, median: 1.8 },
    hospitality: { min: 1.0, max: 3.5, ideal: 2.0, median: 2.2 },
    construction: { min: 0.5, max: 2.5, ideal: 1.0, median: 1.2 },
    professional_services: { min: 0.2, max: 1.5, ideal: 0.5, median: 0.6 },
    services: { min: 0.2, max: 1.5, ideal: 0.5, median: 0.6 },
    manufacturing: { min: 0.5, max: 2.5, ideal: 1.2, median: 1.4 },
    agriculture: { min: 0.8, max: 3.0, ideal: 1.5, median: 1.8 },
    healthcare: { min: 0.3, max: 2.0, ideal: 0.8, median: 1.0 },
    transport: { min: 0.8, max: 3.0, ideal: 1.5, median: 1.8 },
    education: { min: 0.2, max: 1.5, ideal: 0.5, median: 0.6 },
    wholesale: { min: 0.5, max: 2.5, ideal: 1.2, median: 1.4 },
    automotive: { min: 0.8, max: 3.0, ideal: 1.5, median: 1.8 },
    beauty_wellness: { min: 0.5, max: 2.5, ideal: 1.0, median: 1.2 },
    general: { min: 0.0, max: 2.0, ideal: 1.0, median: 1.0 },
  },
  grossProfitMargin: {
    real_estate: { min: 0.35, max: 0.70, ideal: 0.55, median: 0.48 },
    retail: { min: 0.20, max: 0.50, ideal: 0.35, median: 0.30 },
    restaurant: { min: 0.55, max: 0.72, ideal: 0.65, median: 0.62 },
    hospitality: { min: 0.50, max: 0.75, ideal: 0.62, median: 0.58 },
    construction: { min: 0.15, max: 0.35, ideal: 0.25, median: 0.22 },
    professional_services: { min: 0.40, max: 0.75, ideal: 0.55, median: 0.50 },
    services: { min: 0.40, max: 0.75, ideal: 0.55, median: 0.50 },
    manufacturing: { min: 0.25, max: 0.50, ideal: 0.35, median: 0.32 },
    agriculture: { min: 0.25, max: 0.55, ideal: 0.38, median: 0.35 },
    healthcare: { min: 0.40, max: 0.70, ideal: 0.55, median: 0.50 },
    transport: { min: 0.25, max: 0.45, ideal: 0.32, median: 0.30 },
    education: { min: 0.45, max: 0.75, ideal: 0.60, median: 0.55 },
    wholesale: { min: 0.15, max: 0.30, ideal: 0.22, median: 0.20 },
    automotive: { min: 0.15, max: 0.35, ideal: 0.22, median: 0.18 },
    beauty_wellness: { min: 0.50, max: 0.75, ideal: 0.62, median: 0.58 },
    general: { min: 0.20, max: 0.60, ideal: 0.40, median: 0.35 },
  },
  netProfitMargin: {
    real_estate: { min: 0.08, max: 0.25, ideal: 0.15, median: 0.12 },
    retail: { min: 0.02, max: 0.08, ideal: 0.05, median: 0.04 },
    restaurant: { min: 0.03, max: 0.10, ideal: 0.06, median: 0.05 },
    hospitality: { min: 0.05, max: 0.15, ideal: 0.10, median: 0.08 },
    construction: { min: 0.02, max: 0.08, ideal: 0.05, median: 0.04 },
    professional_services: { min: 0.08, max: 0.22, ideal: 0.15, median: 0.12 },
    services: { min: 0.08, max: 0.22, ideal: 0.15, median: 0.12 },
    manufacturing: { min: 0.04, max: 0.12, ideal: 0.08, median: 0.06 },
    agriculture: { min: 0.05, max: 0.18, ideal: 0.10, median: 0.08 },
    healthcare: { min: 0.08, max: 0.20, ideal: 0.14, median: 0.12 },
    transport: { min: 0.03, max: 0.10, ideal: 0.06, median: 0.05 },
    education: { min: 0.05, max: 0.18, ideal: 0.10, median: 0.08 },
    wholesale: { min: 0.02, max: 0.06, ideal: 0.04, median: 0.03 },
    automotive: { min: 0.02, max: 0.06, ideal: 0.04, median: 0.03 },
    beauty_wellness: { min: 0.08, max: 0.20, ideal: 0.14, median: 0.12 },
    general: { min: 0.05, max: 0.15, ideal: 0.10, median: 0.08 },
  },
};

interface IndustryBenchmark {
  industry: IndustryType;
  min: number;
  max: number;
  ideal: number;
  median: number;
}

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
  /** Industry benchmark data */
  industryBenchmark?: IndustryBenchmark;
  /** Show industry comparison */
  showIndustryComparison?: boolean;
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
  industryBenchmark,
  showIndustryComparison = false,
}: RatioCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isScaleHovered, setIsScaleHovered] = useState(false);

  // Use industry benchmark if provided, otherwise use default target
  const effectiveTarget = industryBenchmark 
    ? { min: industryBenchmark.min, max: industryBenchmark.max, ideal: industryBenchmark.ideal }
    : target;

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
    const t = effectiveTarget;
    if (t.min !== undefined && value < t.min) {
      return {
        status: 'critical',
        message: `Sous le minimum recommandé (${formatValue(t.min)})`,
        messageEn: `Below recommended minimum (${formatValue(t.min)})`,
      };
    }
    if (t.max !== undefined && value > t.max) {
      return {
        status: 'warning',
        message: `Au-dessus du maximum recommandé (${formatValue(t.max)})`,
        messageEn: `Above recommended maximum (${formatValue(t.max)})`,
      };
    }
    if (t.ideal !== undefined) {
      const deviation = Math.abs(value - t.ideal) / t.ideal;
      if (deviation > 0.2) {
        return {
          status: 'warning',
          message: `Éloigné de l'idéal (${formatValue(t.ideal)})`,
          messageEn: `Far from ideal (${formatValue(t.ideal)})`,
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
  const minVal = effectiveTarget.min ?? 0;
  const maxVal = effectiveTarget.max ?? (value * 1.5);
  const range = maxVal - minVal;
  const position = Math.min(100, Math.max(0, ((value - minVal) / range) * 100));
  
  // Calculate industry median position if available
  const medianPosition = industryBenchmark 
    ? Math.min(100, Math.max(0, ((industryBenchmark.median - minVal) / range) * 100))
    : null;

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
          <div className="flex items-center gap-2 mb-0.5">
            <h4 
              className={`font-semibold text-sm transition-colors duration-200`} 
              style={{ color: isHovered ? colors.text : 'rgb(var(--color-text))' }}
            >
              {isEn && nameEn ? nameEn : name}
            </h4>
            {industryBenchmark && (
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  color: 'rgb(var(--color-primary-600))',
                }}
              >
                <Building2 className="w-2.5 h-2.5" />
                {isEn ? INDUSTRY_LABELS[industryBenchmark.industry].en : INDUSTRY_LABELS[industryBenchmark.industry].fr}
              </span>
            )}
          </div>
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
              ${change >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
            `}
          >
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
        
        {effectiveTarget.ideal && (
          <span 
            className={`
              text-xs px-2 py-0.5 rounded-full transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-60'}
            `} 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'ideal' : 'idéal'}: {formatValue(effectiveTarget.ideal)}
          </span>
        )}
      </div>

      {/* Scale visualization */}
      <div 
        className={`
          relative h-2.5 sm:h-3 rounded-full overflow-hidden mb-2 cursor-crosshair
          transition-all duration-200
          ${isScaleHovered ? 'h-3.5 sm:h-4' : ''}
        `} 
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        onMouseEnter={() => setIsScaleHovered(true)}
        onMouseLeave={() => setIsScaleHovered(false)}
      >
        {/* Good zone indicator */}
        {effectiveTarget.min !== undefined && effectiveTarget.max !== undefined && (
          <div 
            className={`absolute h-full transition-all duration-200 ${isScaleHovered ? 'opacity-100' : 'opacity-70'}`}
            style={{ 
              left: `${((effectiveTarget.min - minVal) / range) * 100}%`,
              width: `${((effectiveTarget.max - effectiveTarget.min) / range) * 100}%`,
              backgroundColor: 'rgb(var(--color-success) / 0.4)',
            }}
          />
        )}
        
        {/* Industry median marker */}
        {industryBenchmark && medianPosition !== null && (
          <div 
            className={`
              absolute top-0 bottom-0 w-0.5 transition-opacity duration-200
              ${isScaleHovered ? 'opacity-100' : 'opacity-60'}
            `}
            style={{ 
              left: `${medianPosition}%`,
              backgroundColor: 'rgb(var(--color-primary-500))',
            }}
            title={isEn ? `Industry Median: ${formatValue(industryBenchmark.median)}` : `Médiane industrie: ${formatValue(industryBenchmark.median)}`}
          />
        )}
        
        {/* Current value marker with pulse effect */}
        <div 
          className={`
            absolute top-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300
            ${isHovered ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}
          `}
          style={{ 
            left: `calc(${position}% - ${isHovered ? 7 : 5}px)`,
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
            className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] sm:text-xs whitespace-nowrap z-20 shadow-lg"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            {formatValue(value)}
          </div>
        )}
      </div>

      {/* Scale labels */}
      <div 
        className={`
          flex justify-between text-[9px] sm:text-[10px] transition-opacity duration-200
          ${isHovered ? 'opacity-100' : 'opacity-60'}
        `} 
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        <span>{formatValue(minVal)}</span>
        {effectiveTarget.ideal && <span className="text-center hidden sm:inline">{isEn ? 'Ideal' : 'Idéal'}: {formatValue(effectiveTarget.ideal)}</span>}
        <span>{formatValue(maxVal)}</span>
      </div>
      
      {/* Industry comparison legend */}
      {industryBenchmark && (
        <div 
          className={`
            flex items-center gap-3 mt-2 text-[9px] sm:text-[10px] transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-60'}
          `}
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.text }} />
            <span>{isEn ? 'Your value' : 'Votre valeur'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-0.5 h-3" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
            <span>{isEn ? 'Industry median' : 'Médiane industrie'}: {formatValue(industryBenchmark.median)}</span>
          </div>
        </div>
      )}

      {/* Status message */}
      <div 
        className={`
          relative z-10 mt-3 sm:mt-4 flex items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
          transition-all duration-200
          ${isHovered ? 'scale-[1.02]' : ''}
        `}
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <Info className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{isEn ? messageEn : message}</span>
        </div>
        {isHovered && onClick && (
          <ExternalLink className="w-3 h-3 opacity-70 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// Preset ratio cards for common financial ratios
interface PresetRatioCardProps {
  value: number;
  industry?: IndustryType;
  isEn?: boolean;
}

export function CurrentRatioCard({ value, industry, isEn }: PresetRatioCardProps) {
  const benchmark = industry ? INDUSTRY_BENCHMARKS.currentRatio[industry] : null;
  
  return (
    <RatioCard
      name="Ratio de liquidité générale"
      nameEn="Current Ratio"
      value={value}
      target={{ min: 1.0, max: 3.0, ideal: 2.0 }}
      description="Actifs courants / Passifs courants"
      descriptionEn="Current Assets / Current Liabilities"
      format="times"
      isEn={isEn}
      industryBenchmark={benchmark ? { industry, ...benchmark } : undefined}
    />
  );
}

export function QuickRatioCard({ value, industry, isEn }: PresetRatioCardProps) {
  const benchmark = industry ? INDUSTRY_BENCHMARKS.quickRatio[industry] : null;
  
  return (
    <RatioCard
      name="Ratio de liquidité immédiate"
      nameEn="Quick Ratio"
      value={value}
      target={{ min: 0.8, ideal: 1.0 }}
      description="(Actifs courants - Stocks) / Passifs courants"
      descriptionEn="(Current Assets - Inventory) / Current Liabilities"
      format="times"
      isEn={isEn}
      industryBenchmark={benchmark ? { industry, ...benchmark } : undefined}
    />
  );
}

export function DebtToEquityCard({ value, industry, isEn }: PresetRatioCardProps) {
  const benchmark = industry ? INDUSTRY_BENCHMARKS.debtToEquity[industry] : null;
  
  return (
    <RatioCard
      name="Ratio dette/capitaux propres"
      nameEn="Debt to Equity Ratio"
      value={value}
      target={{ max: 2.0, ideal: 1.0 }}
      description="Total dettes / Capitaux propres"
      descriptionEn="Total Debt / Shareholders' Equity"
      format="times"
      isEn={isEn}
      industryBenchmark={benchmark ? { industry, ...benchmark } : undefined}
    />
  );
}

export function GrossProfitMarginCard({ value, industry, isEn }: PresetRatioCardProps) {
  const benchmark = industry ? INDUSTRY_BENCHMARKS.grossProfitMargin[industry] : null;
  
  return (
    <RatioCard
      name="Marge brute"
      nameEn="Gross Profit Margin"
      value={value}
      target={{ min: 0.20, ideal: 0.40 }}
      description="(Revenus - Coût des ventes) / Revenus"
      descriptionEn="(Revenue - COGS) / Revenue"
      format="percentage"
      isEn={isEn}
      industryBenchmark={benchmark ? { industry, ...benchmark } : undefined}
    />
  );
}

export function NetProfitMarginCard({ value, industry, isEn }: PresetRatioCardProps) {
  const benchmark = industry ? INDUSTRY_BENCHMARKS.netProfitMargin[industry] : null;
  
  return (
    <RatioCard
      name="Marge nette"
      nameEn="Net Profit Margin"
      value={value}
      target={{ min: 0.05, ideal: 0.15 }}
      description="Bénéfice net / Revenus"
      descriptionEn="Net Income / Revenue"
      format="percentage"
      isEn={isEn}
      industryBenchmark={benchmark ? { industry, ...benchmark } : undefined}
    />
  );
}
