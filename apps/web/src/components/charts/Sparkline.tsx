/**
 * Sparkline - Inline Trend Visualization
 * Compact trend indicators for tables and dashboards
 * Shows direction and volatility at a glance
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  showTrend?: boolean;
  showValue?: boolean;
  showChange?: boolean;
  formatValue?: (value: number) => string;
  highlightAnomalies?: boolean;
  anomalyThreshold?: number; // Standard deviations
}

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  showTrend = true,
  showValue = false,
  showChange = false,
  formatValue = (v) => v.toLocaleString(),
  highlightAnomalies = true,
  anomalyThreshold = 2,
}: SparklineProps) {
  // Early return - hide chart completely if no data
  if (!data || data.length === 0) {
    return null;
  }

  const {
    normalizedData,
    min,
    max,
    trend,
    change,
    changePct,
    mean,
    stdDev,
    anomalies,
  } = useMemo(() => {
    if (data.length === 0) {
      return { 
        normalizedData: [], 
        min: 0, 
        max: 0, 
        trend: 'stable' as const, 
        change: 0, 
        changePct: 0,
        mean: 0,
        stdDev: 0,
        anomalies: [] as number[],
      };
    }

    const minVal = data.length > 0 ? Math.min(...data) : 0;
    const maxVal = data.length > 0 ? Math.max(...data) : 0;
    const range = maxVal - minVal || 1;
    
    // Calculate mean and standard deviation for anomaly detection
    const meanVal = data.length > 0 ? data.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / data.length : 0;
    const variance = data.length > 0 ? data.reduce((a, b) => (a ?? 0) + Math.pow((b ?? 0) - meanVal, 2), 0) / data.length : 0;
    const std = Math.sqrt(variance);
    
    // Find anomalies
    const anomalyIndices = data.map((value, index) => {
      const zScore = Math.abs((value - meanVal) / (std || 1));
      return zScore > anomalyThreshold ? index : -1;
    }).filter(i => i !== -1);
    
    // Calculate trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 2) {
      const recentAvg = data.slice(-Math.ceil(data.length / 3)).reduce((a, b) => a + b, 0) / Math.ceil(data.length / 3);
      const olderAvg = data.slice(0, Math.ceil(data.length / 3)).reduce((a, b) => a + b, 0) / Math.ceil(data.length / 3);
      const trendChange = ((recentAvg - olderAvg) / Math.abs(olderAvg || 1)) * 100;
      if (trendChange > 5) trendDirection = 'up';
      else if (trendChange < -5) trendDirection = 'down';
    }
    
    // Calculate change
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const changeVal = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? (changeVal / Math.abs(firstValue)) * 100 : 0;
    
    return {
      normalizedData: data.map(v => ((v - minVal) / range)),
      min: minVal,
      max: maxVal,
      trend: trendDirection,
      change: changeVal,
      changePct: changePercent,
      mean: meanVal,
      stdDev: std,
      anomalies: anomalyIndices,
    };
  }, [data, anomalyThreshold]);

  if (data.length === 0) {
    return (
      <span 
        className="text-xs"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        —
      </span>
    );
  }

  const points = normalizedData.map((y, i) => {
    const x = (i / (data.length - 1)) * width;
    const yPos = height - (y * height * 0.8) - height * 0.1; // 10% padding
    return `${x},${yPos}`;
  }).join(' ');

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' 
    ? 'rgb(var(--color-success))' 
    : trend === 'down' 
    ? 'rgb(var(--color-error))' 
    : 'rgb(var(--color-text-muted))';

  return (
    <div className="inline-flex items-center gap-2">
      {/* Sparkline SVG */}
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible"
      >
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="rgb(var(--color-text-secondary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Anomaly dots */}
        {highlightAnomalies && anomalies.map(index => {
          const x = (index / (data.length - 1)) * width;
          const yPos = height - (normalizedData[index] * height * 0.8) - height * 0.1;
          return (
            <circle
              key={index}
              cx={x}
              cy={yPos}
              r="3"
              fill="rgb(var(--color-error))"
            />
          );
        })}
        
        {/* End point */}
        <circle
          cx={width}
          cy={height - (normalizedData[normalizedData.length - 1] * height * 0.8) - height * 0.1}
          r="2.5"
          fill={trendColor}
        />
      </svg>

      {/* Trend indicator */}
      {showTrend && (
        <TrendIcon 
          className="w-3 h-3"
          style={{ color: trendColor }}
        />
      )}

      {/* Value */}
      {showValue && (
        <span 
          className="text-xs font-mono tabular-nums"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {formatValue(data[data.length - 1])}
        </span>
      )}

      {/* Change */}
      {showChange && (
        <span 
          className="text-xs font-mono tabular-nums"
          style={{ color: trendColor }}
        >
          {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * Mini Bar Chart for categorical comparisons
 */
interface MiniBarProps {
  current: number;
  prior: number;
  max?: number;
  width?: number;
  height?: number;
}

export function MiniBar({
  current,
  prior,
  max: propMax,
  width = 60,
  height = 20,
}: MiniBarProps) {
  const max = propMax || Math.max(current, prior) * 1.1;
  const currentWidth = (Math.abs(current) / max) * width;
  const priorWidth = (Math.abs(prior) / max) * width;
  const isPositive = current >= prior;

  return (
    <div className="inline-flex items-center gap-1.5" style={{ width }}>
      <div 
        className="flex flex-col gap-0.5"
        style={{ width: width - 16 }}
      >
        <div 
          className="h-2 rounded"
          style={{ 
            width: `${currentWidth}px`,
            backgroundColor: 'rgb(var(--color-text))'
          }}
        />
        <div 
          className="h-2 rounded opacity-40"
          style={{ 
            width: `${priorWidth}px`,
            backgroundColor: 'rgb(var(--color-text))'
          }}
        />
      </div>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
      ) : (
        <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--color-error))' }} />
      )}
    </div>
  );
}

/**
 * Percentage Bar for showing progress or utilization
 */
interface PercentageBarProps {
  value: number; // 0-100
  thresholds?: { warning: number; critical: number };
  showValue?: boolean;
  width?: number;
  height?: number;
  label?: string;
}

export function PercentageBar({
  value,
  thresholds = { warning: 80, critical: 95 },
  showValue = true,
  width = 100,
  height = 8,
  label,
}: PercentageBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = value >= thresholds.critical 
    ? 'rgb(var(--color-error))'
    : value >= thresholds.warning 
    ? 'rgb(var(--color-warning))'
    : 'rgb(var(--color-text))';

  return (
    <div className="inline-flex items-center gap-2">
      {label && (
        <span 
          className="text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {label}
        </span>
      )}
      <div 
        className="rounded-full overflow-hidden"
        style={{ 
          width,
          height,
          backgroundColor: 'rgb(var(--color-bg-muted))'
        }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${clampedValue}%`,
            backgroundColor: barColor
          }}
        />
      </div>
      {showValue && (
        <span 
          className="text-xs font-mono tabular-nums"
          style={{ color: barColor }}
        >
          {value.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
