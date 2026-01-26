import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  DEFAULT_THRESHOLDS, 
  formatCurrency, 
  formatPercentage,
  ThresholdConfig 
} from '../../lib/anomalyDetection';

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
  data,
  title,
  thresholds = DEFAULT_THRESHOLDS,
  showThresholdLines = true,
  maxValue: propMaxValue,
}: VarianceChartProps) {
  const { maxValue, hasAnomalies, processedData } = useMemo(() => {
    let max = propMaxValue || 0;
    let anomalyCount = 0;
    
    const processed = data.map(item => {
      const variance = item.prior !== 0 
        ? ((item.current - item.prior) / Math.abs(item.prior)) * 100 
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
      
      max = Math.max(max, Math.abs(item.current), Math.abs(item.prior));
      
      return {
        ...item,
        variance,
        absVariance,
        status,
      };
    });
    
    return {
      maxValue: max * 1.1,
      hasAnomalies: anomalyCount > 0,
      processedData: processed,
    };
  }, [data, thresholds, propMaxValue]);

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
    <div className="card">
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
        {processedData.map((item) => (
          <div 
            key={item.code || item.label} 
            className="group relative"
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
                  className="text-sm font-medium"
                  style={{ color: 'rgb(var(--color-text))' }}
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
                className="h-full rounded-l transition-all opacity-60"
                style={{ 
                  backgroundColor: getBarColor(item.status, true),
                  width: `${Math.max(2, (Math.abs(item.prior) / maxValue) * 100)}%`,
                }}
                title={`Précédent: ${formatCurrency(item.prior)}`}
              />
              
              {/* Current bar */}
              <div 
                className="h-full rounded-r transition-all relative overflow-hidden"
                style={{ 
                  backgroundColor: getBarColor(item.status, false),
                  width: `${Math.max(2, (Math.abs(item.current) / maxValue) * 100)}%`,
                }}
                title={`Actuel: ${formatCurrency(item.current)}`}
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
            
            {/* Hover details */}
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
          </div>
        ))}
      </div>
    </div>
  );
}
