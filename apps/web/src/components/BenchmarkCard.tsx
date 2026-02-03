/**
 * Benchmark Card Component
 *
 * Displays a single benchmark metric with industry quartiles
 * and optional user value comparison.
 */

import React, { ReactNode } from 'react';
import {
  Minus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { LabelTooltip } from './Tooltip';
import { useI18n } from '../lib/i18n';

interface QuartileData {
  q1: number;
  median: number;
  q3: number;
}

interface BenchmarkCardProps {
  title: string;
  icon: ReactNode;
  userValue: number | null | undefined;
  benchmark: QuartileData;
  format: 'percentage' | 'ratio' | 'currency';
  higherIsBetter: boolean;
  description?: string;
}

export default function BenchmarkCard({
  title,
  icon,
  userValue,
  benchmark,
  format,
  higherIsBetter,
  description,
}: BenchmarkCardProps) {
  const { language } = useI18n();

  // Format value based on type
  const formatValue = (value: number | null | undefined): string => {
    const numValue = value ?? 0;
    if (isNaN(numValue) || !isFinite(numValue)) return '—';
    switch (format) {
      case 'percentage':
        return `${(numValue * 100).toFixed(1)}%`;
      case 'ratio':
        return numValue.toFixed(2);
      case 'currency':
        return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
          style: 'currency',
          currency: 'CAD',
          maximumFractionDigits: 0,
        }).format(numValue);
      default:
        return numValue.toFixed(2);
    }
  };

  // Calculate percentile and status using theme colors
  const calculateStatus = (): {
    percentile: number;
    status: 'above' | 'average' | 'below';
    colorStyle: React.CSSProperties;
    bgStyle: React.CSSProperties;
  } => {
    if (userValue === null || userValue === undefined) {
      return { 
        percentile: 50, 
        status: 'average', 
        colorStyle: { color: 'rgb(var(--color-text-muted))' },
        bgStyle: { backgroundColor: 'rgb(var(--color-bg-muted))' }
      };
    }

    let percentile: number;
    const { q1, median, q3 } = benchmark;

    if (userValue <= q1) {
      percentile = (userValue / q1) * 25;
    } else if (userValue <= median) {
      percentile = 25 + ((userValue - q1) / (median - q1)) * 25;
    } else if (userValue <= q3) {
      percentile = 50 + ((userValue - median) / (q3 - median)) * 25;
    } else {
      const estimatedMax = q3 + (q3 - median);
      percentile = 75 + Math.min(((userValue - q3) / (estimatedMax - q3)) * 25, 25);
    }

    percentile = Math.max(0, Math.min(100, percentile));

    // For metrics where lower is better, invert the interpretation
    const effectivePercentile = higherIsBetter ? percentile : 100 - percentile;

    if (effectivePercentile >= 60) {
      return { 
        percentile, 
        status: 'above', 
        colorStyle: { color: 'rgb(var(--color-success))' },
        bgStyle: { backgroundColor: 'rgb(var(--color-success) / 0.1)' }
      };
    } else if (effectivePercentile >= 40) {
      return { 
        percentile, 
        status: 'average', 
        colorStyle: { color: 'rgb(var(--color-warning))' },
        bgStyle: { backgroundColor: 'rgb(var(--color-warning) / 0.1)' }
      };
    } else {
      return { 
        percentile, 
        status: 'below', 
        colorStyle: { color: 'rgb(var(--color-error))' },
        bgStyle: { backgroundColor: 'rgb(var(--color-error) / 0.1)' }
      };
    }
  };

  const { percentile, status, colorStyle, bgStyle } = calculateStatus();
  const hasUserValue = userValue !== null && userValue !== undefined;

  // Status icon
  const StatusIcon = status === 'above' ? CheckCircle : status === 'below' ? AlertCircle : Minus;

  return (
    <div 
      className="rounded-lg sm:rounded-xl border p-2.5 sm:p-3 hover:shadow-md transition-all"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div 
            className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-600))' }}>{icon}</div>
          </div>
          <div className="min-w-0 flex-1">
            <LabelTooltip label={title}>
              <h3 
                className="font-medium text-xs sm:text-sm leading-tight line-clamp-2" 
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {title}
              </h3>
            </LabelTooltip>
          </div>
        </div>
        {hasUserValue && (
          <div 
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium max-w-[85px] truncate flex-shrink-0 flex items-center gap-0.5"
            style={{ ...bgStyle, ...colorStyle }}
          >
            <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">
              {language === 'fr' 
                ? (status === 'above' ? 'Supérieur' : status === 'below' ? 'Inférieur' : 'Moyen')
                : (status === 'above' ? 'Above' : status === 'below' ? 'Below' : 'Average')}
            </span>
            <span className="xs:hidden">
              {status === 'above' ? '↑' : status === 'below' ? '↓' : '='}
            </span>
          </div>
        )}
      </div>

      {/* User Value */}
      {hasUserValue ? (
        <div className="mb-3">
          <div className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatValue(userValue)}
          </div>
          <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'fr' ? 'Votre valeur' : 'Your value'}
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text-muted))' }}>—</div>
          <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'fr' ? 'Connectez vos données' : 'Connect your data'}
          </div>
        </div>
      )}

      {/* Quartile Visualization */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] sm:text-xs">
          <span className="hidden sm:inline" style={{ color: 'rgb(var(--color-text-muted))' }}>Q1: {formatValue(benchmark.q1)}</span>
          <span className="font-medium text-center flex-1 sm:flex-none" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {language === 'fr' ? 'Médiane' : 'Median'}: {formatValue(benchmark.median)}
          </span>
          <span className="hidden sm:inline" style={{ color: 'rgb(var(--color-text-muted))' }}>Q3: {formatValue(benchmark.q3)}</span>
        </div>

        {/* Progress bar showing quartiles */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          {/* Q1-Q3 range */}
          <div 
            className="absolute h-full"
            style={{ 
              left: '25%', 
              width: '50%',
              backgroundColor: 'rgb(var(--color-primary-200))'
            }}
          />
          {/* Median line */}
          <div 
            className="absolute h-full w-0.5"
            style={{ 
              left: '50%',
              backgroundColor: 'rgb(var(--color-primary-600))'
            }}
          />
          {/* User position indicator */}
          {hasUserValue && (
            <div 
              className="absolute top-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 shadow-sm"
              style={{ 
                left: `${Math.max(2, Math.min(98, percentile))}%`,
                transform: 'translate(-50%, -50%)',
                borderColor: 'rgb(var(--color-surface))',
                backgroundColor: status === 'above' 
                  ? 'rgb(var(--color-success))' 
                  : status === 'below' 
                    ? 'rgb(var(--color-error))' 
                    : 'rgb(var(--color-warning))'
              }}
            />
          )}
        </div>

        {/* Percentile label */}
        {hasUserValue && (
          <div className="text-[10px] sm:text-xs text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'fr' 
              ? `${Math.round(higherIsBetter ? percentile : 100 - percentile)}e percentile`
              : `${Math.round(higherIsBetter ? percentile : 100 - percentile)}th percentile`}
          </div>
        )}
      </div>
    </div>
  );
}
