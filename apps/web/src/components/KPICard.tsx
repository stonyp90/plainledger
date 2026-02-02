/**
 * KPICard - Reusable KPI Card Component
 * 
 * A responsive, theme-aware card for displaying Key Performance Indicators.
 * Supports both compact (dashboard) and normal (landing page) modes.
 * 
 * Features:
 * - LabelTooltip for truncated labels (shows full text on hover)
 * - Optional sparkline chart with benchmark comparison
 * - Responsive sizing with compact mode option
 * - Dark/light theme support via CSS variables
 * - Hover effects and animations
 * - IBCS-compliant variance display
 * - ROI dollar impact calculation
 * - Action recommendations
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, CheckCircle, AlertCircle, DollarSign, Lightbulb, type LucideIcon } from 'lucide-react';
import { LabelTooltip } from './Tooltip';
import { VariancePinCompact } from './charts/ibcs/VariancePin';
import { IBCSColors } from '../lib/ibcs';

// Mini sparkline component for KPI cards with optional animation
interface SparklineProps {
  data: number[];
  benchmarkData?: number[];
  color?: string;
  benchmarkColor?: string;
  height?: number;
  isVisible?: boolean;
  animate?: boolean;
}

function MiniSparkline({ 
  data, 
  benchmarkData,
  color = '#059669',
  benchmarkColor = 'rgba(148, 163, 184, 0.6)',
  height = 32,
  isVisible = true,
  animate = false,
}: SparklineProps) {
  const [progress, setProgress] = useState(animate ? 0 : 1);
  
  useEffect(() => {
    if (!isVisible || !animate) {
      setProgress(animate ? 0 : 1);
      return;
    }
    
    let start: number;
    let animationId: number;
    const animateLine = (time: number) => {
      if (!start) start = time;
      const p = Math.min((time - start) / 1200, 1);
      setProgress(p);
      if (p < 1) {
        animationId = requestAnimationFrame(animateLine);
      }
    };
    animationId = requestAnimationFrame(animateLine);
    return () => cancelAnimationFrame(animationId);
  }, [isVisible, animate]);

  if (!data || data.length < 2) return null;
  
  // Calculate min/max across both datasets for consistent scale
  const allData = benchmarkData ? [...data, ...benchmarkData] : data;
  const max = allData.length > 0 ? Math.max(...allData) : 0;
  const min = allData.length > 0 ? Math.min(...allData) : 0;
  const range = max - min || 1;
  
  const getPoints = (values: number[]) => values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  
  const points = getPoints(data);
  const benchmarkPoints = benchmarkData ? getPoints(benchmarkData) : [];
  
  // Apply animation progress
  const visiblePoints = animate ? points.slice(0, Math.ceil(data.length * progress)) : points;
  const visibleBenchmarkPoints = animate ? benchmarkPoints.slice(0, Math.ceil(benchmarkPoints.length * progress)) : benchmarkPoints;
  
  const showEndPoints = !animate || progress > 0.8;
  
  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* Industry benchmark line (dashed, behind) */}
      {benchmarkData && visibleBenchmarkPoints.length > 1 && (
        <polyline
          points={visibleBenchmarkPoints.join(' ')}
          fill="none"
          stroke={benchmarkColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
      )}
      {/* User data fill */}
      {visiblePoints.length > 1 && (
        <polygon
          points={`0,${height} ${visiblePoints.join(' ')} ${visiblePoints.length > 0 ? visiblePoints[visiblePoints.length - 1].split(',')[0] : 0},${height}`}
          fill={`${color}15`}
        />
      )}
      {/* User data line */}
      <polyline
        points={visiblePoints.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* User data end point */}
      {visiblePoints.length > 0 && showEndPoints && (
        <circle
          cx={visiblePoints[visiblePoints.length - 1]?.split(',')[0]}
          cy={visiblePoints[visiblePoints.length - 1]?.split(',')[1]}
          r="3"
          fill={color}
        />
      )}
      {/* Benchmark end point */}
      {benchmarkData && visibleBenchmarkPoints.length > 0 && showEndPoints && (
        <circle
          cx={visibleBenchmarkPoints[visibleBenchmarkPoints.length - 1]?.split(',')[0]}
          cy={visibleBenchmarkPoints[visibleBenchmarkPoints.length - 1]?.split(',')[1]}
          r="2"
          fill={benchmarkColor}
          opacity={0.7}
        />
      )}
    </svg>
  );
}

export interface KPICardProps {
  /** Unique identifier for the card */
  id: string;
  /** Label/name of the KPI - will show full text on hover if truncated */
  label: string;
  /** Formatted value to display (e.g., "8.2x", "42%", "$125K") */
  value: string;
  /** Target range or value (e.g., "Target: 4-12x/year") */
  target?: string;
  /** Change value (e.g., "+0.5x", "-2%") */
  change?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'stable';
  /** Icon component to display */
  icon?: LucideIcon;
  /** Icon color (CSS value or CSS variable) */
  iconColor?: string;
  /** Icon background color */
  iconBgColor?: string;
  /** Whether a downward trend is good (e.g., for costs) */
  isGoodWhenDown?: boolean;
  /** Sparkline chart data */
  chartData?: number[];
  /** Benchmark/industry average data for comparison */
  benchmarkData?: number[];
  /** Compact mode for dashboard (smaller sizing) */
  compact?: boolean;
  /** Impact text shown on hover (landing page mode) */
  impact?: string;
  /** Whether the KPI is meeting its target */
  isOnTarget?: boolean;
  /** English language mode */
  isEn?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Hovered state (controlled from parent for landing page) */
  isHovered?: boolean;
  /** Hover change handler */
  onHoverChange?: (hovered: boolean) => void;
  /** Whether the component is visible (for scroll-triggered animations) */
  isVisible?: boolean;
  /** Whether to animate the sparkline chart */
  
  // IBCS and FP&A enhancements
  /** Enable IBCS-compliant display with variance pins */
  ibcsMode?: boolean;
  /** Plan/budget value for variance calculation */
  planValue?: number;
  /** Actual numeric value (for calculations) */
  actualValue?: number;
  /** Variance percentage */
  variancePct?: number;
  /** Whether variance is favorable */
  isFavorable?: boolean;
  /** ROI dollar impact (e.g., "$12,500 saved") */
  roiImpact?: string;
  /** Numeric ROI value for formatting */
  roiValue?: number;
  /** Action recommendation text */
  actionRecommendation?: string;
  /** Action recommendation in English */
  actionRecommendationEn?: string;
  /** Benchmark comparison label (e.g., "vs Industry: 4.2x") */
  benchmarkLabel?: string;
  animateChart?: boolean;
}

export default function KPICard({
  id,
  label,
  value,
  target,
  change,
  trend,
  icon: Icon,
  iconColor = 'rgb(var(--color-primary-500))',
  iconBgColor = 'rgb(var(--color-primary-500) / 0.1)',
  isGoodWhenDown = false,
  chartData,
  benchmarkData,
  compact = false,
  impact,
  isOnTarget,
  isEn = false,
  onClick,
  isHovered: controlledHovered,
  onHoverChange,
  isVisible = true,
  animateChart = false,
  // IBCS and FP&A props
  ibcsMode = false,
  planValue,
  actualValue,
  variancePct,
  isFavorable,
  roiImpact,
  roiValue,
  actionRecommendation,
  actionRecommendationEn,
  benchmarkLabel,
}: KPICardProps) {
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = controlledHovered ?? internalHovered;

  const handleMouseEnter = () => {
    setInternalHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setInternalHovered(false);
    onHoverChange?.(false);
  };

  // Determine trend color based on direction and context
  const getTrendColor = () => {
    if (trend === 'stable') return 'rgb(var(--color-warning))';
    if (trend === 'up') {
      return isGoodWhenDown ? 'rgb(var(--color-error))' : 'rgb(var(--color-success))';
    }
    if (trend === 'down') {
      return isGoodWhenDown ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))';
    }
    return 'rgb(var(--color-text-muted))';
  };

  const getTrendBgColor = () => {
    if (trend === 'stable') return 'rgb(var(--color-warning) / 0.15)';
    if (trend === 'up') {
      return isGoodWhenDown ? 'rgb(var(--color-error) / 0.15)' : 'rgb(var(--color-success) / 0.15)';
    }
    if (trend === 'down') {
      return isGoodWhenDown ? 'rgb(var(--color-success) / 0.15)' : 'rgb(var(--color-error) / 0.15)';
    }
    return 'rgb(var(--color-bg-muted))';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Target;
  const trendColor = getTrendColor();
  const trendBgColor = getTrendBgColor();

  // Compact mode: smaller sizing for dashboard
  if (compact) {
    return (
      <div 
        className="p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-h-[100px] sm:min-h-[110px] lg:min-h-[120px] flex flex-col cursor-pointer"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: `1px solid ${isHovered ? 'rgb(var(--color-primary-500) / 0.5)' : 'rgb(var(--color-border) / 0.5)'}`,
          boxShadow: isHovered ? '0 4px 12px rgb(var(--color-primary-500) / 0.15)' : undefined,
        }}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Icon and Label */}
        <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-shrink-0">
          {Icon && (
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: iconBgColor }}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color={iconColor} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <LabelTooltip label={label}>
              <span 
                className="text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-2" 
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {label}
              </span>
            </LabelTooltip>
          </div>
        </div>

        {/* Value */}
        <p 
          className="text-base sm:text-lg lg:text-xl font-bold mb-1.5 sm:mb-2 leading-tight flex-shrink-0" 
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {value}
        </p>

        {/* Target and Change */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-auto">
          {target && (
            <LabelTooltip label={target}>
              <span 
                className="text-[9px] sm:text-[10px] leading-tight line-clamp-1" 
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {target}
              </span>
            </LabelTooltip>
          )}
          
          {/* IBCS Variance display */}
          {ibcsMode && variancePct !== undefined && isFavorable !== undefined ? (
            <VariancePinCompact
              variancePct={variancePct}
              favorable={isFavorable}
              height={14}
            />
          ) : change && trend ? (
            <span 
              className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium whitespace-nowrap"
              style={{ color: trendColor }}
            >
              <TrendIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span>{change}</span>
            </span>
          ) : null}
        </div>
        
        {/* IBCS: ROI Impact row */}
        {roiImpact && (
          <div 
            className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px]"
            style={{ color: IBCSColors.variance.favorable }}
          >
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold">{roiImpact}</span>
          </div>
        )}
        
        {/* IBCS: Action recommendation */}
        {actionRecommendation && (
          <div 
            className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px]"
            style={{ color: 'rgb(var(--color-warning))' }}
          >
            <Lightbulb className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{isEn && actionRecommendationEn ? actionRecommendationEn : actionRecommendation}</span>
          </div>
        )}
        
        {/* Benchmark comparison */}
        {benchmarkLabel && (
          <div 
            className="text-[9px] sm:text-[10px] mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {benchmarkLabel}
          </div>
        )}
      </div>
    );
  }

  // Normal mode: larger cards with sparkline (landing page)
  return (
    <div 
      className="p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer group min-h-[160px] sm:min-h-[180px] flex flex-col"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: `1px solid ${isHovered ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))'}`,
        transform: isHovered ? 'translateY(-3px)' : 'none',
        boxShadow: isHovered 
          ? '0 12px 24px rgb(var(--color-primary-500) / 0.2)' 
          : '0 4px 12px rgb(var(--color-text) / 0.05)'
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with label and trend badge */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2">
        <LabelTooltip label={label}>
          <span 
            className="text-[10px] sm:text-[11px] font-semibold leading-tight break-words" 
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {label}
          </span>
        </LabelTooltip>
        {change && trend && (
          <div 
            className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: trendBgColor, color: trendColor }}
          >
            <TrendIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="whitespace-nowrap">{change}</span>
          </div>
        )}
      </div>
      
      {/* Value */}
      <div 
        className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 flex-shrink-0" 
        style={{ color: 'rgb(var(--color-primary-500))' }}
      >
        {value}
      </div>
      
      {/* Sparkline Chart */}
      {chartData && chartData.length > 1 && (
        <>
          <div className="h-10 sm:h-12 mb-2 flex-shrink-0">
            <MiniSparkline 
              data={chartData} 
              benchmarkData={benchmarkData}
              color="#059669"
              benchmarkColor="rgba(148, 163, 184, 0.6)"
              height={48}
              isVisible={isVisible}
              animate={animateChart}
            />
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#059669' }} />
              <span className="text-[8px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'You' : 'Vous'}
              </span>
            </div>
            {benchmarkData && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 rounded opacity-60" style={{ backgroundColor: 'rgb(148, 163, 184)' }} />
                <span className="text-[8px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Industry' : 'Industrie'}
                </span>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Target & Status */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        {target && (
          <span 
            className="text-[9px] sm:text-[10px] font-medium break-words flex-1 min-w-0 leading-tight" 
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {target}
          </span>
        )}
        {isOnTarget !== undefined && (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:mt-0">
            {isOnTarget ? (
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            )}
          </div>
        )}
      </div>
      
      {/* Impact on hover */}
      {impact && (
        <div 
          className="mt-auto pt-3 border-t transition-all duration-300"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            opacity: isHovered ? 1 : 0.8,
            maxHeight: isHovered ? '50px' : '28px',
          }}
        >
          <p 
            className="text-[10px] font-semibold break-words leading-tight" 
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            {impact}
          </p>
        </div>
      )}
    </div>
  );
}

export { MiniSparkline };
