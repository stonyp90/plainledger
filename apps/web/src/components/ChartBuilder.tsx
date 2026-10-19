/**
 * Chart Builder Component
 * 
 * Full-featured chart builder with:
 * - Entity/Chart creation from scratch
 * - Field picker for adding/removing metrics
 * - Live preview with hover tooltips
 * - Configuration options
 */

import { useState, useMemo } from 'react';
import { isMockAuthEnabled } from '../lib/keycloak';
import { buildChartPreviewData } from '../lib/chartPreviewData';
import { FinancialChartPreview } from './charts/FinancialChartPreview';
import { ChartDataState } from './charts/ChartDataState';
import { useFinancialData } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import {
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  Trash2,
  Settings2,
  BarChart3,
  Sparkles,
  Save,
  Database,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { ChartTooltip } from './charts/ChartTooltip';
import {
  ChartConfig,
  ChartType,
  DataMetric,
  TimeRange,
  ComparisonMode,
  CHART_TYPE_INFO,
  METRIC_INFO,
  TIME_RANGE_INFO,
  chartFavoritesService,
} from '../lib/chartFavorites';
import { ChartTypeIcon } from './DataVisualization';

// =====================================================
// TYPES
// =====================================================

interface ChartBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ChartConfig) => void;
  initialConfig?: Partial<ChartConfig>;
  mode?: 'create' | 'edit';
}

interface FieldItem {
  id: DataMetric;
  enabled: boolean;
  order: number;
  color?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  format?: 'currency' | 'percentage' | 'number';
}

// =====================================================
// FIELD PICKER COMPONENT
// =====================================================

interface FieldPickerProps {
  selectedFields: FieldItem[];
  onFieldToggle: (fieldId: DataMetric) => void;
  onFieldReorder: (fromIndex: number, toIndex: number) => void;
  onFieldRemove: (fieldId: DataMetric) => void;
  onFieldUpdate: (fieldId: DataMetric, updates: Partial<FieldItem>) => void;
  isEn: boolean;
}

function FieldPicker({
  selectedFields,
  onFieldToggle,
  onFieldReorder,
  onFieldRemove,
  onFieldUpdate: _onFieldUpdate,
  isEn,
}: FieldPickerProps) {
  const [hoveredField, setHoveredField] = useState<DataMetric | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('financial');
  const [draggedField, setDraggedField] = useState<DataMetric | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const categories = [
    { id: 'financial', label: isEn ? 'Financial Metrics' : 'Métriques financières' },
    { id: 'ratio', label: isEn ? 'Financial Ratios' : 'Ratios financiers' },
    { id: 'operational', label: isEn ? 'Operational Metrics' : 'Métriques opérationnelles' },
  ];

  const getMetricsByCategory = (categoryId: string) => {
    return (Object.entries(METRIC_INFO) as [DataMetric, typeof METRIC_INFO[DataMetric]][])
      .filter(([_, info]) => info.category === categoryId)
      .map(([id, info]) => ({
        id,
        ...info,
        isSelected: selectedFields.some(f => f.id === id),
      }));
  };

  const enabledFields = selectedFields.filter(f => f.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Selected Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Selected Fields' : 'Champs sélectionnés'}
            <span className="ml-2 text-xs font-normal" style={{ color: 'rgb(var(--color-text-muted))' }}>
              ({enabledFields.length})
            </span>
          </h4>
          {enabledFields.length > 0 && (
            <button
              onClick={() => enabledFields.forEach(f => onFieldRemove(f.id))}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-error/10 transition-colors"
              style={{ color: 'rgb(var(--color-error))' }}
            >
              <Trash2 className="w-3 h-3" />
              {isEn ? 'Clear all' : 'Tout effacer'}
            </button>
          )}
        </div>

        {enabledFields.length === 0 ? (
          <div 
            className="py-8 text-center rounded-xl border-2 border-dashed"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Select fields from below to add to your chart' : 'Sélectionnez des champs ci-dessous'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {enabledFields.map((field, index) => {
              const info = METRIC_INFO[field.id];
              const isHovered = hoveredField === field.id;

              return (
                <div
                  key={field.id}
                  className="group flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer"
                  style={{
                    backgroundColor: isHovered ? 'rgb(var(--color-primary-500) / 0.08)' : 'rgb(var(--color-bg-muted))',
                  }}
                  draggable
                  onDragStart={() => setDraggedField(field.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedField && draggedField !== field.id) {
                      const draggedIndex = enabledFields.findIndex(f => f.id === draggedField);
                      if (draggedIndex !== index) {
                        onFieldReorder(draggedIndex, index);
                      }
                    }
                  }}
                  onDragEnd={() => setDraggedField(null)}
                  onMouseEnter={(e) => {
                    setHoveredField(field.id);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <GripVertical 
                    className="w-4 h-4 opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing" 
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: field.color || info.color }}
                  />
                  <span className="flex-1 text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? info.labelEn : info.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text-muted))' }}>
                    {info.unit === 'currency' ? '$' : info.unit === 'percentage' ? '%' : info.unit === 'days' ? (isEn ? 'days' : 'jours') : '#'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFieldRemove(field.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error/10 transition-all"
                    style={{ color: 'rgb(var(--color-error))' }}
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Tooltip */}
                  {isHovered && (
                    <ChartTooltip visible={true} position={tooltipPosition}>
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                          <span className="text-white font-medium">{isEn ? info.labelEn : info.label}</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{isEn ? 'Category' : 'Catégorie'}</span>
                            <span className="text-gray-300 capitalize">{info.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{isEn ? 'Format' : 'Format'}</span>
                            <span className="text-gray-300">{info.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{isEn ? 'Position' : 'Position'}</span>
                            <span className="text-gray-300">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
                          {isEn ? 'Drag to reorder • Click X to remove' : 'Glisser pour réordonner • X pour supprimer'}
                        </div>
                      </div>
                    </ChartTooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Fields */}
      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Available Fields' : 'Champs disponibles'}
        </h4>
        <div className="space-y-2">
          {categories.map((category) => {
            const metrics = getMetricsByCategory(category.id);
            const selectedCount = metrics.filter(m => m.isSelected).length;
            const isExpanded = expandedCategory === category.id;

            return (
              <div
                key={category.id}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgb(var(--color-border))' }}
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full flex items-center justify-between p-3 transition-colors hover:bg-muted/50"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {category.label}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-500))' }}>
                    {selectedCount}/{metrics.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-2 space-y-1">
                    {metrics.map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => onFieldToggle(metric.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group"
                        style={{
                          backgroundColor: metric.isSelected ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                        }}
                        onMouseEnter={() => setHoveredField(metric.id)}
                        onMouseLeave={() => setHoveredField(null)}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                            metric.isSelected ? '' : 'border'
                          }`}
                          style={{
                            backgroundColor: metric.isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
                            borderColor: 'rgb(var(--color-border))',
                          }}
                        >
                          {metric.isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="flex-1 text-sm" style={{ color: metric.isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text))' }}>
                          {isEn ? metric.labelEn : metric.label}
                        </span>
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {metric.isSelected ? (isEn ? 'Remove' : 'Retirer') : (isEn ? 'Add' : 'Ajouter')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CHART TYPE GRID
// =====================================================

interface ChartTypeGridProps {
  selected: ChartType;
  onChange: (type: ChartType) => void;
  isEn: boolean;
}

function ChartTypeGrid({ selected, onChange, isEn }: ChartTypeGridProps) {
  const chartTypes: ChartType[] = ['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'treemap', 'waterfall', 'gauge', 'radar', 'heatmap', 'sparkline', 'table'];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2">
      {chartTypes.map((type) => {
        const info = CHART_TYPE_INFO[type];
        const Icon = ChartTypeIcon[type];
        const isSelected = type === selected;

        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="relative flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors h-[60px] sm:h-[68px] md:h-[72px] touch-manipulation active:scale-95"
            style={{
              backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
              border: isSelected ? 'none' : '1px solid rgb(var(--color-border))',
            }}
          >
            <Icon 
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
              style={{ color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))' }}
            />
            <span 
              className="text-[9px] sm:text-[10px] font-medium leading-tight text-center line-clamp-2"
              style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
            >
              {isEn ? info.labelEn : info.label}
            </span>
            
            {isSelected && (
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// CONFIGURATION PANEL
// =====================================================

interface ConfigurationPanelProps {
  config: Partial<ChartConfig>;
  onConfigChange: (updates: Partial<ChartConfig>) => void;
  isEn: boolean;
}

function ConfigurationPanel({ config, onConfigChange, isEn }: ConfigurationPanelProps) {
  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  const comparisons: { id: ComparisonMode; label: string; labelEn: string }[] = [
    { id: 'none', label: 'Aucune', labelEn: 'None' },
    { id: 'previousPeriod', label: 'Période préc.', labelEn: 'Prev. Period' },
    { id: 'previousYear', label: 'Année préc.', labelEn: 'Prev. Year' },
    { id: 'budget', label: 'Budget', labelEn: 'Budget' },
    { id: 'forecast', label: 'Prévision', labelEn: 'Forecast' },
  ];
  const groupByOptions: { id: string; label: string; labelEn: string }[] = [
    { id: 'day', label: 'Jour', labelEn: 'Day' },
    { id: 'week', label: 'Semaine', labelEn: 'Week' },
    { id: 'month', label: 'Mois', labelEn: 'Month' },
    { id: 'quarter', label: 'Trim.', labelEn: 'Qtr' },
    { id: 'year', label: 'Année', labelEn: 'Year' },
  ];

  const toggleOptions = [
    { id: 'showLegend', label: 'Légende', labelEn: 'Legend' },
    { id: 'showGrid', label: 'Grille', labelEn: 'Grid' },
    { id: 'animate', label: 'Animation', labelEn: 'Animation' },
    { id: 'stacked', label: 'Empilé', labelEn: 'Stacked' },
    { id: 'cumulative', label: 'Cumulatif', labelEn: 'Cumulative' },
  ];

  return (
    <div className="space-y-4">
      {/* Time Range - Compact inline */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Time Range' : 'Période'}
        </label>
        <div className="flex flex-wrap gap-1">
          {timeRanges.map((range) => {
            const isSelected = config.timeRange === range;
            return (
              <button
                key={range}
                onClick={() => onConfigChange({ timeRange: range })}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
                  color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))',
                  border: isSelected ? 'none' : '1px solid rgb(var(--color-border))',
                }}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Mode */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Compare With' : 'Comparer avec'}
        </label>
        <div className="flex flex-wrap gap-1">
          {comparisons.map((comp) => {
            const isSelected = config.comparison === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => onConfigChange({ comparison: comp.id })}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
                  color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))',
                  border: isSelected ? 'none' : '1px solid rgb(var(--color-border))',
                }}
              >
                {isEn ? comp.labelEn : comp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group By */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Group By' : 'Grouper par'}
        </label>
        <div className="flex flex-wrap gap-1">
          {groupByOptions.map((option) => {
            const isSelected = config.groupBy === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onConfigChange({ groupBy: option.id as any })}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'transparent',
                  color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))',
                  border: isSelected ? 'none' : '1px solid rgb(var(--color-border))',
                }}
              >
                {isEn ? option.labelEn : option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle Options - Compact grid */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Display Options' : 'Options d\'affichage'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5">
          {toggleOptions.map((option) => {
            const isEnabled = config[option.id as keyof ChartConfig] as boolean;
            return (
              <div
                key={option.id}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                onClick={() => onConfigChange({ [option.id]: !isEnabled })}
              >
                <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? option.labelEn : option.label}
                </span>
                <div
                  className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: isEnabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform"
                    style={{
                      transform: isEnabled ? 'translateX(18px)' : 'translateX(2px)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// LIVE PREVIEW - Enhanced with proper chart rendering
// =====================================================

interface LivePreviewProps {
  config: Partial<ChartConfig>;
  fields: FieldItem[];
  isEn: boolean;
}

export function LivePreview({ config, fields, isEn }: LivePreviewProps) {
  const { data, isLoading, error } = useFinancialData();
  const { currentTenant } = useTenant();
  const enabledFields = useMemo(() => fields.filter(field => field.enabled).sort((a, b) => a.order - b.order), [fields]);
  const result = useMemo(() => buildChartPreviewData(data?.trends, enabledFields.map(field => field.id), config), [data?.trends, enabledFields, config]);
  const isSample = isMockAuthEnabled() && data?.dataSource === 'mock';
  if (isLoading && !data) return <p role="status" className="p-6">{isEn ? 'Loading chart observations…' : 'Chargement des observations…'}</p>;
  if (error) return <div role="alert" className="rounded border p-5 text-sm">{isEn ? 'Unable to load chart observations.' : 'Impossible de charger les observations.'} {error.message}</div>;
  return <div className="min-w-0 space-y-3">
    <h4 className="font-medium">{isSample ? (isEn ? 'Preview · Sample data' : 'Aperçu · Données exemples') : (isEn ? 'Preview · Recorded data' : 'Aperçu · Données enregistrées')}</h4>
    {result.issue === 'invalid' || result.issue === 'empty' ? <ChartDataState title={isEn ? 'Chart preview' : 'Aperçu du graphique'} issue={result.issue} isEn={isEn} />
      : result.issue ? <p role={result.issue === 'incomplete' ? 'alert' : 'status'} data-chart-state={result.issue} className="rounded border p-5 text-sm">{isEn ? result.message : 'Les observations sélectionnées ne permettent pas cet aperçu. Choisissez une seule métrique, une autre période ou le rapport financier correspondant.'}</p>
      : <FinancialChartPreview rows={result.rows} fields={enabledFields} config={config} isEn={isEn} currency={currentTenant?.settings.currency || 'CAD'} />}
    {result.rows.length > 0 && <p className="text-xs text-muted">{result.rows[0].period}–{result.rows[result.rows.length - 1].period} · {result.rows.length} {isEn ? 'available periods; range ends at the latest observation' : 'périodes disponibles; la période se termine à la dernière observation'}</p>}
  </div>;
}

// =====================================================
// MAIN CHART BUILDER COMPONENT
// =====================================================

export default function ChartBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  mode = 'create',
}: ChartBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const [activeStep, setActiveStep] = useState(0);
  const [config, setConfig] = useState<Partial<ChartConfig>>({
    chartType: 'line',
    timeRange: '1Y',
    comparison: 'none',
    groupBy: 'month',
    showLegend: true,
    showGrid: true,
    animate: true,
    stacked: false,
    cumulative: false,
    ...initialConfig,
  });
  const [fields, setFields] = useState<FieldItem[]>(
    initialConfig?.metrics?.map((m, i) => ({
      id: m,
      enabled: true,
      order: i,
    })) || []
  );
  const [chartName, setChartName] = useState(initialConfig?.name || '');
  const [chartNameEn, setChartNameEn] = useState(initialConfig?.nameEn || '');
  const [description, setDescription] = useState(initialConfig?.description || '');

  const steps = [
    { id: 'fields', label: isEn ? 'Select Fields' : 'Champs', icon: Database },
    { id: 'type', label: isEn ? 'Chart Type' : 'Type', icon: BarChart3 },
    { id: 'config', label: isEn ? 'Configure' : 'Configurer', icon: Settings2 },
    { id: 'preview', label: isEn ? 'Preview & Save' : 'Aperçu', icon: Eye },
  ];

  const handleFieldToggle = (fieldId: DataMetric) => {
    setFields((prev) => {
      const existing = prev.find(f => f.id === fieldId);
      if (existing) {
        return prev.filter(f => f.id !== fieldId);
      }
      return [...prev, { id: fieldId, enabled: true, order: prev.length }];
    });
  };

  const handleFieldReorder = (fromIndex: number, toIndex: number) => {
    setFields((prev) => {
      const enabled = prev.filter(f => f.enabled).sort((a, b) => a.order - b.order);
      const [moved] = enabled.splice(fromIndex, 1);
      enabled.splice(toIndex, 0, moved);
      return enabled.map((f, i) => ({ ...f, order: i }));
    });
  };

  const handleFieldRemove = (fieldId: DataMetric) => {
    setFields((prev) => prev.filter(f => f.id !== fieldId));
  };

  const handleFieldUpdate = (fieldId: DataMetric, updates: Partial<FieldItem>) => {
    setFields((prev) =>
      prev.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    );
  };

  const handleConfigChange = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    const enabledFields = fields.filter(f => f.enabled);
    const finalConfig: ChartConfig = {
      id: initialConfig?.id || chartFavoritesService.generateChartId(),
      name: chartName || (isEn ? 'Custom Chart' : 'Graphique personnalisé'),
      nameEn: chartNameEn || 'Custom Chart',
      description,
      descriptionEn: description,
      chartType: config.chartType || 'line',
      metrics: enabledFields.map(f => f.id),
      timeRange: config.timeRange || '1Y',
      comparison: config.comparison || 'none',
      groupBy: config.groupBy,
      showLegend: config.showLegend,
      showGrid: config.showGrid,
      animate: config.animate,
      stacked: config.stacked,
      cumulative: config.cumulative,
    };
    onSave(finalConfig);
    onClose();
  };

  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0: return fields.filter(f => f.enabled).length > 0;
      case 1: return !!config.chartType;
      case 2: return true;
      case 3: return chartName.length > 0 || chartNameEn.length > 0;
      default: return false;
    }
  }, [activeStep, fields, config, chartName, chartNameEn]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header - Compact on mobile */}
        <div
          className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {mode === 'create'
                  ? (isEn ? 'Build New Chart' : 'Créer un graphique')
                  : (isEn ? 'Edit Chart' : 'Modifier le graphique')}
              </h2>
              <p className="text-xs sm:text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Select fields, choose chart type, and customize'
                  : 'Sélectionnez les champs, choisissez le type et personnalisez'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Progress Steps - Compact on mobile */}
        <div
          className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))', borderColor: 'rgb(var(--color-border))' }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;

            return (
              <button
                key={step.id}
                onClick={() => index <= activeStep && setActiveStep(index)}
                className="flex items-center gap-1 sm:gap-2 transition-all"
                disabled={index > activeStep}
              >
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'rgb(var(--color-primary-500))'
                      : isCompleted
                      ? 'rgb(var(--color-success))'
                      : 'rgb(var(--color-bg))',
                    color: isActive || isCompleted ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Icon className="w-3 h-3 sm:w-4 sm:h-4" />}
                </div>
                <span
                  className="text-xs sm:text-sm font-medium hidden sm:block"
                  style={{
                    color: isActive ? 'rgb(var(--color-primary-500))' : isCompleted ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mx-1 sm:mx-2 hidden sm:block" style={{ color: 'rgb(var(--color-border))' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Content - Reduced padding on mobile */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeStep === 0 && (
            <FieldPicker
              selectedFields={fields}
              onFieldToggle={handleFieldToggle}
              onFieldReorder={handleFieldReorder}
              onFieldRemove={handleFieldRemove}
              onFieldUpdate={handleFieldUpdate}
              isEn={isEn}
            />
          )}

          {activeStep === 1 && (
            <div className="mt-2">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Choose Chart Type' : 'Choisir le type de graphique'}
              </h3>
              <ChartTypeGrid
                selected={config.chartType || 'line'}
                onChange={(type) => handleConfigChange({ chartType: type })}
                isEn={isEn}
              />
            </div>
          )}

          {activeStep === 2 && (
            <ConfigurationPanel
              config={config}
              onConfigChange={handleConfigChange}
              isEn={isEn}
            />
          )}

          {activeStep === 3 && (
            <div className="space-y-4 sm:space-y-6">
              {/* Full-width Live Preview - Responsive height */}
              <div
                className="rounded-lg sm:rounded-xl p-3 sm:p-5"
                style={{ 
                  border: '1px solid rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-surface))',
                  minHeight: '200px',
                }}
              >
                <LivePreview config={config} fields={fields} isEn={isEn} />
              </div>

              {/* Name, Description & Summary - Responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Chart Name' : 'Nom du graphique'} *
                  </label>
                  <input
                    type="text"
                    value={isEn ? chartNameEn : chartName}
                    onChange={(e) => isEn ? setChartNameEn(e.target.value) : setChartName(e.target.value)}
                    placeholder={isEn ? 'e.g. Revenue Trend Analysis' : 'ex. Analyse des revenus'}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Description' : 'Description'}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isEn ? 'Brief description (optional)' : 'Brève description (optionnel)'}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>

                {/* Quick Summary - Responsive layout */}
                <div
                  className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl sm:col-span-2 lg:col-span-1"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Type:' : 'Type:'}</span>
                      <span className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {config.chartType ? (isEn ? CHART_TYPE_INFO[config.chartType].labelEn : CHART_TYPE_INFO[config.chartType].label) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Fields:' : 'Champs:'}</span>
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{fields.filter(f => f.enabled).length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Range:' : 'Période:'}</span>
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{config.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Compare:' : 'Comparer:'}</span>
                      <span className="font-medium" style={{ color: config.comparison !== 'none' ? 'rgb(var(--color-success))' : 'rgb(var(--color-text))' }}>
                        {config.comparison === 'none' ? (isEn ? 'No' : 'Non') : (isEn ? 'Yes' : 'Oui')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Fields Preview */}
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Included Metrics' : 'Métriques incluses'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {fields.filter(f => f.enabled).map((field) => {
                    const info = METRIC_INFO[field.id];
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ 
                          backgroundColor: `${field.color || info.color}15`,
                          border: `1px solid ${field.color || info.color}30`,
                        }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: field.color || info.color }}
                        />
                        <span className="text-sm font-medium" style={{ color: field.color || info.color }}>
                          {isEn ? info.labelEn : info.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Display Options Summary */}
              <div className="flex flex-wrap gap-2">
                {config.showLegend && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-500))' }}>
                    {isEn ? '✓ Legend' : '✓ Légende'}
                  </span>
                )}
                {config.showGrid && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-500))' }}>
                    {isEn ? '✓ Grid' : '✓ Grille'}
                  </span>
                )}
                {config.animate && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-500))' }}>
                    {isEn ? '✓ Animated' : '✓ Animé'}
                  </span>
                )}
                {config.stacked && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' }}>
                    {isEn ? '✓ Stacked' : '✓ Empilé'}
                  </span>
                )}
                {config.cumulative && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' }}>
                    {isEn ? '✓ Cumulative' : '✓ Cumulatif'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact on mobile */}
        <div
          className="flex items-center justify-between p-2.5 sm:p-4 border-t flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={() => activeStep > 0 && setActiveStep(activeStep - 1)}
            disabled={activeStep === 0}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {isEn ? 'Back' : 'Retour'}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onClose}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text))',
              }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={!canProceed}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {isEn ? 'Next' : 'Suivant'}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canProceed}
                className="px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{mode === 'create' ? (isEn ? 'Create Chart' : 'Créer') : (isEn ? 'Save Changes' : 'Enregistrer')}</span>
                <span className="sm:hidden">{mode === 'create' ? (isEn ? 'Create' : 'Créer') : (isEn ? 'Save' : 'Sauv.')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { FieldPicker, ChartTypeGrid, ConfigurationPanel };
