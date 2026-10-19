import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  DEFAULT_THRESHOLDS, 
  formatCurrency, 
  formatPercentage,
  ThresholdConfig 
} from '../../lib/anomalyDetection';
import { ChartTooltip } from './ChartTooltip';
import { ChartDataState } from './ChartDataState';
import { getChartDataIssue, isChartLabel, isFiniteNumber } from '../../lib/chartDataValidation';

interface DataPoint {
  label: string;
  current: number;
  prior: number;
  code?: string;
}

interface VarianceChartProps {
  data: DataPoint[];
  title: string;
  thresholds?: ThresholdConfig;
  showThresholdLines?: boolean;
  maxValue?: number;
}

export default function VarianceChart({
  data: inputData,
  title,
  thresholds = DEFAULT_THRESHOLDS,
  showThresholdLines = true,
  maxValue: propMaxValue,
}: VarianceChartProps) {
  const issue = getChartDataIssue(inputData, item => isChartLabel(item.label) && isFiniteNumber(item.current) && isFiniteNumber(item.prior));
  const data = issue ? [] : inputData;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const { maxValue, hasAnomalies, processedData } = useMemo(() => {
    // Return empty data if no input data
    if (!data || data.length === 0) {
      return {
        maxValue: 0,
        hasAnomalies: false,
        processedData: [],
      };
    }
    let max = isFiniteNumber(propMaxValue) && propMaxValue > 0 ? propMaxValue : 0;
    let anomalyCount = 0;
    
    const processed = data.map(item => {
      const current = item.current ?? 0;
      const prior = item.prior ?? 0;
      const variance = prior !== 0 
        ? ((current - prior) / Math.abs(prior)) * 100 
        : 0;
      const absVariance = Math.abs(variance);
      
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (absVariance >= thresholds.varianceCritical) {
        status = 'critical';
        anomalyCount++;
      } else if (absVariance >= thresholds.varianceWarning) {
        status = 'warning';
        anomalyCount++;
      }
      
      max = Math.max(max, Math.abs(current), Math.abs(prior));
      
      return {
        ...item,
        current,
        prior,
        variance,
        absVariance,
        status,
      };
    });
    
    return {
      maxValue: max > 0 ? max : 1,
      hasAnomalies: anomalyCount > 0,
      processedData: processed,
    };
  }, [data, thresholds, propMaxValue]);

  // Early return - hide chart completely if no data (after all hooks)
  if (issue) {
    return <ChartDataState title={title} issue={issue} />;
  }

  const getBarColor = (status: 'normal' | 'warning' | 'critical', isPrior: boolean) => {
    if (isPrior) return 'rgb(var(--color-primary-300))';
    
    switch (status) {
      case 'critical':
        return 'rgb(var(--color-error))';
      case 'warning':
        return 'rgb(var(--color-warning))';
      default:
        return 'rgb(var(--color-primary-600))';
    }
  };

  const getVarianceColor = (variance: number, status: 'normal' | 'warning' | 'critical') => {
    if (status === 'critical') return 'rgb(var(--color-error))';
    if (status === 'warning') return 'rgb(var(--color-warning))';
    if (variance >= 0) return 'rgb(var(--color-success))';
    return 'rgb(var(--color-error))';
  };

  return (
    <div 
      className="card transition-all duration-200 hover:shadow-md"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {title}
          </h3>
          {hasAnomalies ? (
            <span 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))'
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              Anomalies détectées
            </span>
          ) : (
            <span 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.1)',
                color: 'rgb(var(--color-success))'
              }}
            >
              <CheckCircle className="w-3 h-3" />
              Normal
            </span>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            />
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>Actuel</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: 'rgb(var(--color-primary-300))' }}
            />
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>Précédent</span>
          </span>
        </div>
      </div>

      {/* Threshold indicators */}
      {showThresholdLines && (
        <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span className="flex items-center gap-1">
            <span className="w-8 h-0.5" style={{ backgroundColor: 'rgb(var(--color-warning))' }} />
            Attention (±{thresholds.varianceWarning}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-8 h-0.5" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
            Critique (±{thresholds.varianceCritical}%)
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="space-y-3">
        {processedData.map((item) => {
          const itemKey = item.code || item.label;
          const isHovered = hoveredItem === itemKey;
          
          return (
            <div 
              key={itemKey} 
              className="group relative cursor-pointer"
              onMouseEnter={(e) => {
                setHoveredItem(itemKey);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Label row */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  {item.code && (
                    <span 
                      className="text-xs font-mono"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {item.code}
                    </span>
                  )}
                  <span 
                    className="text-sm font-medium transition-colors"
                    style={{ color: isHovered ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text))' }}
                  >
                    {item.label}
                  </span>
                  {item.status !== 'normal' && (
                    <AlertTriangle 
                      className="w-4 h-4"
                      style={{ color: item.status === 'critical' ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))' }}
                    />
                  )}
                </div>
                
                {/* Values */}
                <div className="flex items-center gap-3">
                  <span 
                    className="text-sm font-mono tabular-nums font-medium"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {formatCurrency(item.current)}
                  </span>
                  <span 
                    className="text-xs font-mono tabular-nums"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    ({formatCurrency(item.prior)})
                  </span>
                  <span 
                    className="flex items-center gap-0.5 text-xs font-medium min-w-[60px] justify-end"
                    style={{ color: getVarianceColor(item.variance, item.status) }}
                  >
                    {item.variance >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {formatPercentage(item.variance)}
                  </span>
                </div>
              </div>
              
              {/* Bar chart */}
              <div className="relative h-6 flex gap-0.5">
                {/* Prior bar */}
                <div 
                  className="h-full rounded-l transition-all"
                  style={{ 
                    backgroundColor: getBarColor(item.status, true),
                    width: `${Math.max(2, (Math.abs(item.prior) / maxValue) * 100)}%`,
                    opacity: isHovered ? 0.8 : 0.6,
                    transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                  }}
                />
                
                {/* Current bar */}
                <div 
                  className="h-full rounded-r transition-all relative overflow-hidden"
                  style={{ 
                    backgroundColor: getBarColor(item.status, false),
                    width: `${Math.max(2, (Math.abs(item.current) / maxValue) * 100)}%`,
                    transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                    boxShadow: isHovered ? `0 0 12px ${getBarColor(item.status, false)}40` : undefined,
                  }}
                >
                  {/* Pulse animation for anomalies */}
                  {item.status !== 'normal' && (
                    <div 
                      className="absolute inset-0 animate-pulse"
                      style={{ 
                        backgroundColor: item.status === 'critical' 
                          ? 'rgb(var(--color-error) / 0.3)' 
                          : 'rgb(var(--color-warning) / 0.3)',
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Anomaly details - always visible */}
              {item.status !== 'normal' && (
                <div 
                  className="mt-1 text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: item.status === 'critical' 
                      ? 'rgb(var(--color-error) / 0.1)' 
                      : 'rgb(var(--color-warning) / 0.1)',
                    color: item.status === 'critical' 
                      ? 'rgb(var(--color-error))' 
                      : 'rgb(var(--color-warning))',
                  }}
                >
                  ⚠️ Variance de {item.absVariance.toFixed(1)}% dépasse le seuil de {
                    item.status === 'critical' ? thresholds.varianceCritical : thresholds.varianceWarning
                  }%
                </div>
              )}
              
              {/* Hover tooltip */}
              {isHovered && (
                <ChartTooltip visible={true} position={tooltipPosition}>
                  <div className="min-w-[200px]">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                        {item.code || item.label}
                      </span>
                      {item.status !== 'normal' && (
                        <AlertTriangle className={`w-4 h-4 ${item.status === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                      )}
                    </div>
                    
                    {/* Account name */}
                    <p className="text-white font-medium mb-3">{item.label}</p>
                    
                    {/* Values comparison */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Actuel</span>
                        <span className="text-white font-bold">{formatCurrency(item.current)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Précédent</span>
                        <span className="text-gray-300">{formatCurrency(item.prior)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">Variation</span>
                        <span className={`font-medium flex items-center gap-1 ${
                          item.status === 'critical' ? 'text-red-400' 
                          : item.status === 'warning' ? 'text-amber-400'
                          : item.variance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatPercentage(item.variance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Montant</span>
                        <span className={`font-mono ${item.current >= item.prior ? 'text-green-400' : 'text-red-400'}`}>
                          {item.current >= item.prior ? '+' : ''}{formatCurrency(item.current - item.prior)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    {item.status !== 'normal' && (
                      <div 
                        className={`mt-3 pt-2 border-t border-gray-700 text-xs ${
                          item.status === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        {item.status === 'critical' ? '🔴 Critique' : '🟡 Attention'}: variance &gt; {
                          item.status === 'critical' ? thresholds.varianceCritical : thresholds.varianceWarning
                        }%
                      </div>
                    )}
                  </div>
                </ChartTooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
