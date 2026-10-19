/**
 * ChartPreview - Live preview component for visualization builder
 * 
 * Features:
 * - Live preview with debouncing
 * - Loading skeleton
 * - Empty states
 * - Error states
 * - Mock data generation
 * - Bilingual labels (EN/FR)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Loader2,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { 
  VisualizationConfig, 
  FieldConfig,
  DataSourceReference,
} from '../../lib/visualizationTypes';
import { ChartType, METRIC_INFO } from '../../lib/chartFavorites';
import { getDataSource } from '../../lib/goldSchema';
import { ChartErrorBoundary } from './ChartErrorBoundary';

// =====================================================
// MOCK DATA GENERATION
// =====================================================

function generateMockData(
  sources: DataSourceReference[], 
  fields: FieldConfig[],
  chartType: ChartType
): { labels: string[]; datasets: { field: FieldConfig; values: number[] }[] } {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  const datasets = fields.filter(f => f.enabled).map(field => {
    const source = getDataSource(field.sourceId);
    const fieldDef = source?.fields.find(f => f.id === field.fieldId);
    const isCurrency = fieldDef?.type === 'CURRENCY' || fieldDef?.type === 'NUMBER';
    
    // Generate realistic-looking data
    const baseValue = isCurrency ? 50000 : 100;
    const variance = isCurrency ? 20000 : 30;
    
    const values = labels.map((_, i) => {
      const trend = i * (Math.random() > 0.5 ? 1 : -1) * (variance / 10);
      return Math.round(baseValue + (Math.random() - 0.5) * variance * 2 + trend);
    });

    return { field, values };
  });

  return { labels, datasets };
}

// =====================================================
// SIMPLE CHART RENDERERS
// =====================================================

interface ChartProps {
  data: { labels: string[]; datasets: { field: FieldConfig; values: number[] }[] };
  isEn: boolean;
}

function SimpleLineChart({ data, isEn }: ChartProps) {
  const { labels, datasets } = data;
  if (datasets.length === 0) return null;

  const allValues = datasets.flatMap(d => d.values);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartHeight * pct}
          x2={width - padding.right}
          y2={padding.top + chartHeight * pct}
          stroke="rgb(var(--color-border))"
          strokeWidth="0.5"
          strokeDasharray="4,4"
        />
      ))}

      {/* X-axis labels */}
      {labels.map((label, i) => (
        <text
          key={i}
          x={padding.left + (i / (labels.length - 1)) * chartWidth}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px]"
          fill="rgb(var(--color-text-muted))"
        >
          {label}
        </text>
      ))}

      {/* Lines */}
      {datasets.map((dataset, di) => {
        const color = dataset.field.color || '#10B981'; // emerald-500 (matches --color-primary-500)
        const points = dataset.values.map((v, i) => ({
          x: padding.left + (i / (labels.length - 1)) * chartWidth,
          y: padding.top + chartHeight - ((v - minValue) / range) * chartHeight,
        }));
        const path = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

        return (
          <g key={di}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="white"
                stroke={color}
                strokeWidth="2"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function SimpleBarChart({ data, isEn }: ChartProps) {
  const { labels, datasets } = data;
  if (datasets.length === 0) return null;

  const allValues = datasets.flatMap(d => d.values);
  const maxValue = Math.max(...allValues);

  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barGroupWidth = chartWidth / labels.length;
  const barWidth = (barGroupWidth * 0.7) / datasets.length;
  const barGap = barGroupWidth * 0.15;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartHeight * pct}
          x2={width - padding.right}
          y2={padding.top + chartHeight * pct}
          stroke="rgb(var(--color-border))"
          strokeWidth="0.5"
          strokeDasharray="4,4"
        />
      ))}

      {/* X-axis labels */}
      {labels.map((label, i) => (
        <text
          key={i}
          x={padding.left + barGap + i * barGroupWidth + (barGroupWidth - barGap * 2) / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px]"
          fill="rgb(var(--color-text-muted))"
        >
          {label}
        </text>
      ))}

      {/* Bars */}
      {datasets.map((dataset, di) => {
        const color = dataset.field.color || '#10B981'; // emerald-500 (matches --color-primary-500)
        return dataset.values.map((v, i) => {
          const barHeight = (v / maxValue) * chartHeight;
          return (
            <rect
              key={`${di}-${i}`}
              x={padding.left + barGap + i * barGroupWidth + di * barWidth}
              y={padding.top + chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx="2"
            />
          );
        });
      })}
    </svg>
  );
}

function SimplePieChart({ data, isEn }: ChartProps) {
  const { datasets } = data;
  if (datasets.length === 0) return null;

  // Use first dataset
  const values = datasets[0].values;
  const total = values.reduce((a, b) => a + b, 0);
  const colors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899']; // emerald-500, amber-500

  let currentAngle = -90;
  const segments = values.map((v, i) => {
    const angle = (v / total) * 360;
    const segment = {
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: colors[i % colors.length],
    };
    currentAngle += angle;
    return segment;
  });

  const cx = 100;
  const cy = 100;
  const r = 80;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => {
        const startRad = (seg.startAngle * Math.PI) / 180;
        const endRad = (seg.endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = seg.endAngle - seg.startAngle > 180 ? 1 : 0;

        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={seg.color}
            stroke="rgb(var(--color-bg))"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function ChartSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="space-y-3 w-full px-4">
        <div 
          className="h-4 w-1/3 rounded animate-pulse"
          style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        />
        <div className="flex items-end gap-2 h-32">
          {[40, 60, 45, 80, 55, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t animate-pulse"
              style={{ 
                height: `${h}%`,
                backgroundColor: 'rgb(var(--color-surface))',
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-3 w-8 rounded animate-pulse"
              style={{ backgroundColor: 'rgb(var(--color-surface))' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN CHART PREVIEW
// =====================================================

interface ChartPreviewProps {
  config: Partial<VisualizationConfig>;
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function ChartPreview({ 
  config, 
  isLoading = false, 
  error,
  onRefresh,
}: ChartPreviewProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [localLoading, setLocalLoading] = useState(true);

  // Simulate loading delay for smooth transitions
  useEffect(() => {
    setLocalLoading(true);
    const timer = setTimeout(() => setLocalLoading(false), 500);
    return () => clearTimeout(timer);
  }, [config.sources, config.fields, config.chartType]);

  // Generate mock data
  const mockData = useMemo(() => {
    if (!config.sources || !config.fields) {
      return { labels: [], datasets: [] };
    }
    return generateMockData(
      config.sources,
      config.fields,
      config.chartType || 'line'
    );
  }, [config.sources, config.fields, config.chartType]);

  const hasData = (config.sources?.length ?? 0) > 0 && (config.fields?.some(field => field.enabled) ?? false);
  const showLoading = isLoading || localLoading;

  // Render appropriate chart based on type
  const renderChart = () => {
    if (!hasData) return null;

    switch (config.chartType) {
      case 'bar':
        return <SimpleBarChart data={mockData} isEn={isEn} />;
      case 'pie':
      case 'donut':
        return <SimplePieChart data={mockData} isEn={isEn} />;
      case 'line':
      case 'area':
      default:
        return <SimpleLineChart data={mockData} isEn={isEn} />;
    }
  };

  return (
    <div 
      className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span 
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Preview · Sample data' : 'Aperçu · Données d’exemple'}
          </span>
          {showLoading && (
            <Loader2 
              className="w-4 h-4 animate-spin"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          )}
        </div>
        {onRefresh && hasData && (
          <button
            onClick={onRefresh}
            disabled={showLoading}
            aria-label={isEn ? 'Refresh preview' : 'Actualiser l’aperçu'}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw 
              className={`w-4 h-4 ${showLoading ? 'animate-spin' : ''}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-h-[200px]">
        <ChartErrorBoundary isEn={isEn}>
          {error ? (
            // Error State
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
              >
                <AlertCircle className="w-6 h-6" style={{ color: 'rgb(var(--color-error))' }} />
              </div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Preview Error' : 'Erreur d\'aperçu'}
              </p>
              <p 
                className="text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {error}
              </p>
            </div>
          ) : !hasData ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                <Database 
                  className="w-6 h-6 opacity-30"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                />
              </div>
              <p 
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Select data sources and fields to see preview'
                  : 'Sélectionnez des sources et des champs pour voir l\'aperçu'}
              </p>
            </div>
          ) : showLoading ? (
            // Loading State
            <ChartSkeleton />
          ) : (
            // Chart
            <div className="h-full">
              {renderChart()}
            </div>
          )}
        </ChartErrorBoundary>
      </div>

      {/* Legend */}
      {hasData && !showLoading && !error && (
        <div 
          className="px-4 py-3 border-t flex flex-wrap gap-3"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {config.fields?.filter(f => f.enabled).map(field => {
            const source = getDataSource(field.sourceId);
            const fieldDef = source?.fields.find(f => f.id === field.fieldId);
            const color = field.color || '#10B981'; // emerald-500 (matches --color-primary-500)
            const name = field.alias || field.aliasEn || 
              (fieldDef ? (isEn ? fieldDef.nameEn : fieldDef.name) : field.fieldId);

            return (
              <div key={field.id} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span 
                  className="text-xs"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChartPreview;
