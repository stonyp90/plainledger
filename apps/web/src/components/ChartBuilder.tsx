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
import {
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  Trash2,
  Settings2,
  BarChart3,
  Info,
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
  onFieldUpdate,
  isEn,
}: FieldPickerProps) {
  const [hoveredField, setHoveredField] = useState<DataMetric | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [expandedCategory, setExpandedCategory] = useState<string | null>('financial');
  const [draggedField, setDraggedField] = useState<DataMetric | null>(null);

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
                  onMouseMove={(e) => setTooltipPosition({ x: e.clientX, y: e.clientY })}
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
                        onMouseEnter={(e) => {
                          setHoveredField(metric.id);
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
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

                        {/* Tooltip for available fields */}
                        {hoveredField === metric.id && !metric.isSelected && (
                          <ChartTooltip visible={true} position={tooltipPosition}>
                            <div className="min-w-[180px]">
                              <p className="text-white font-medium mb-1">{isEn ? metric.labelEn : metric.label}</p>
                              <p className="text-gray-400 text-xs">
                                {isEn ? 'Click to add this field to your chart' : 'Cliquez pour ajouter ce champ'}
                              </p>
                            </div>
                          </ChartTooltip>
                        )}
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
  const [hoveredType, setHoveredType] = useState<ChartType | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const chartTypes: ChartType[] = ['line', 'bar', 'area', 'pie', 'donut', 'waterfall', 'gauge', 'radar', 'heatmap', 'table'];

  return (
    <div className="grid grid-cols-5 gap-2">
      {chartTypes.map((type) => {
        const info = CHART_TYPE_INFO[type];
        const Icon = ChartTypeIcon[type];
        const isSelected = type === selected;
        const isHovered = hoveredType === type;

        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
            style={{
              backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : isHovered ? 'rgb(var(--color-bg-muted))' : 'transparent',
              border: isSelected ? 'none' : '1px solid rgb(var(--color-border))',
              transform: isHovered && !isSelected ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              setHoveredType(type);
              setTooltipPosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredType(null)}
          >
            <Icon 
              className="w-5 h-5" 
              style={{ color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))' }}
            />
            <span 
              className="text-xs font-medium"
              style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
            >
              {isEn ? info.labelEn : info.label}
            </span>
            
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
            )}

            {isHovered && (
              <ChartTooltip visible={true} position={tooltipPosition}>
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-white font-medium">{isEn ? info.labelEn : info.label}</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">
                    {isEn ? info.descriptionEn : info.description}
                  </p>
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500">{isEn ? 'Best for:' : 'Idéal pour:'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {info.bestFor.slice(0, 3).map((metric) => (
                        <span key={metric} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                          {METRIC_INFO[metric as DataMetric]?.[isEn ? 'labelEn' : 'label'] || metric}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </ChartTooltip>
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
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  const comparisons: { id: ComparisonMode; label: string; labelEn: string }[] = [
    { id: 'none', label: 'Aucune', labelEn: 'None' },
    { id: 'previousPeriod', label: 'Période précédente', labelEn: 'Previous Period' },
    { id: 'previousYear', label: 'Année précédente', labelEn: 'Previous Year' },
    { id: 'budget', label: 'Budget', labelEn: 'Budget' },
    { id: 'forecast', label: 'Prévision', labelEn: 'Forecast' },
  ];
  const groupByOptions: { id: string; label: string; labelEn: string }[] = [
    { id: 'day', label: 'Jour', labelEn: 'Day' },
    { id: 'week', label: 'Semaine', labelEn: 'Week' },
    { id: 'month', label: 'Mois', labelEn: 'Month' },
    { id: 'quarter', label: 'Trimestre', labelEn: 'Quarter' },
    { id: 'year', label: 'Année', labelEn: 'Year' },
  ];

  const toggleOptions = [
    { id: 'showLegend', label: 'Légende', labelEn: 'Legend', description: 'Show chart legend', descriptionFr: 'Afficher la légende' },
    { id: 'showGrid', label: 'Grille', labelEn: 'Grid', description: 'Show background grid', descriptionFr: 'Afficher la grille' },
    { id: 'animate', label: 'Animation', labelEn: 'Animation', description: 'Animate chart transitions', descriptionFr: 'Animer les transitions' },
    { id: 'stacked', label: 'Empilé', labelEn: 'Stacked', description: 'Stack multiple metrics', descriptionFr: 'Empiler les métriques' },
    { id: 'cumulative', label: 'Cumulatif', labelEn: 'Cumulative', description: 'Show cumulative values', descriptionFr: 'Afficher les valeurs cumulatives' },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Time Range' : 'Période'}
        </label>
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => {
            const info = TIME_RANGE_INFO[range];
            const isSelected = config.timeRange === range;
            return (
              <button
                key={range}
                onClick={() => onConfigChange({ timeRange: range })}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                  color: isSelected ? 'white' : 'rgb(var(--color-text))',
                }}
                onMouseEnter={(e) => {
                  setHoveredOption(`time-${range}`);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredOption(null)}
              >
                {range}
                {hoveredOption === `time-${range}` && (
                  <ChartTooltip visible={true} position={tooltipPosition}>
                    <div>
                      <p className="text-white font-medium">{isEn ? info.labelEn : info.label}</p>
                      {info.days > 0 && (
                        <p className="text-gray-400 text-xs">{info.days} {isEn ? 'days' : 'jours'}</p>
                      )}
                    </div>
                  </ChartTooltip>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Mode */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Compare With' : 'Comparer avec'}
        </label>
        <div className="flex flex-wrap gap-2">
          {comparisons.map((comp) => {
            const isSelected = config.comparison === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => onConfigChange({ comparison: comp.id })}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                  color: isSelected ? 'white' : 'rgb(var(--color-text))',
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
        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Group By' : 'Grouper par'}
        </label>
        <div className="flex flex-wrap gap-2">
          {groupByOptions.map((option) => {
            const isSelected = config.groupBy === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onConfigChange({ groupBy: option.id as any })}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                  color: isSelected ? 'white' : 'rgb(var(--color-text))',
                }}
              >
                {isEn ? option.labelEn : option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle Options */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Display Options' : 'Options d\'affichage'}
        </label>
        <div className="space-y-2">
          {toggleOptions.map((option) => {
            const isEnabled = config[option.id as keyof ChartConfig] as boolean;
            return (
              <div
                key={option.id}
                className="flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                onClick={() => onConfigChange({ [option.id]: !isEnabled })}
                onMouseEnter={(e) => {
                  setHoveredOption(option.id);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? option.labelEn : option.label}
                  </span>
                  <Info className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <div
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{
                    backgroundColor: isEnabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: isEnabled ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </div>
                
                {hoveredOption === option.id && (
                  <ChartTooltip visible={true} position={tooltipPosition}>
                    <div>
                      <p className="text-white font-medium">{isEn ? option.labelEn : option.label}</p>
                      <p className="text-gray-400 text-xs">{isEn ? option.description : option.descriptionFr}</p>
                    </div>
                  </ChartTooltip>
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
// LIVE PREVIEW - Enhanced with proper chart rendering
// =====================================================

interface LivePreviewProps {
  config: Partial<ChartConfig>;
  fields: FieldItem[];
  isEn: boolean;
}

function LivePreview({ config, fields, isEn }: LivePreviewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const enabledFields = fields.filter(f => f.enabled);
  
  // Generate consistent mock data based on fields
  const mockData = useMemo(() => {
    const periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return periods.map((period, i) => {
      const dataPoint: any = { period };
      enabledFields.forEach((field, j) => {
        const base = 50000 + j * 20000;
        const variance = Math.sin(i * 0.8 + j) * 15000;
        dataPoint[field.id] = Math.round(base + variance + i * 3000);
      });
      return dataPoint;
    });
  }, [enabledFields]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (enabledFields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <Eye className="w-8 h-8 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'No Fields Selected' : 'Aucun champ sélectionné'}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Select fields in Step 1 to see a preview' : 'Sélectionnez des champs à l\'étape 1'}
          </p>
        </div>
      </div>
    );
  }

  const chartType = config.chartType || 'line';
  const maxValue = Math.max(...mockData.flatMap(d => enabledFields.map(f => d[f.id])));
  const minValue = Math.min(...mockData.flatMap(d => enabledFields.map(f => d[f.id])));
  const range = maxValue - minValue || 1;

  // Render different chart types
  const renderLineAreaChart = () => {
    const isArea = chartType === 'area';
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * pct}
              x2={width - padding.right}
              y2={padding.top + chartHeight * pct}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * pct + 4}
              textAnchor="end"
              className="text-[9px]"
              fill="rgb(var(--color-text-muted))"
            >
              {formatValue(maxValue - (maxValue - minValue) * pct)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {mockData.map((d, i) => (
          <text
            key={i}
            x={padding.left + (i / (mockData.length - 1)) * chartWidth}
            y={height - 8}
            textAnchor="middle"
            className="text-[9px]"
            fill="rgb(var(--color-text-muted))"
          >
            {d.period}
          </text>
        ))}

        {/* Hover line */}
        {hoveredIndex !== null && (
          <line
            x1={padding.left + (hoveredIndex / (mockData.length - 1)) * chartWidth}
            y1={padding.top}
            x2={padding.left + (hoveredIndex / (mockData.length - 1)) * chartWidth}
            y2={padding.top + chartHeight}
            stroke="rgb(var(--color-primary-500))"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.7"
          />
        )}

        {/* Lines/Areas for each field */}
        {enabledFields.map((field, fieldIndex) => {
          const info = METRIC_INFO[field.id];
          const color = field.color || info.color;
          
          const points = mockData.map((d, i) => ({
            x: padding.left + (i / (mockData.length - 1)) * chartWidth,
            y: padding.top + chartHeight - ((d[field.id] - minValue) / range) * chartHeight,
            value: d[field.id],
          }));

          const linePath = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
          const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

          return (
            <g key={field.id}>
              {isArea && (
                <path
                  d={areaPath}
                  fill={color}
                  fillOpacity="0.15"
                />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={hoveredIndex === i ? 6 : 4}
                    fill={hoveredIndex === i ? color : 'rgb(var(--color-surface))'}
                    stroke={color}
                    strokeWidth="2"
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={(e) => {
                      setHoveredIndex(i);
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {hoveredIndex === i && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="10"
                      fill={color}
                      opacity="0.2"
                      className="animate-pulse"
                    />
                  )}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderBarChart = () => {
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barGroupWidth = chartWidth / mockData.length;
    const barWidth = (barGroupWidth * 0.7) / enabledFields.length;
    const barGap = barGroupWidth * 0.15;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * pct}
              x2={width - padding.right}
              y2={padding.top + chartHeight * pct}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          </g>
        ))}

        {/* X-axis labels */}
        {mockData.map((d, i) => (
          <text
            key={i}
            x={padding.left + barGap + i * barGroupWidth + (barGroupWidth - barGap * 2) / 2}
            y={height - 8}
            textAnchor="middle"
            className="text-[9px]"
            fill="rgb(var(--color-text-muted))"
          >
            {d.period}
          </text>
        ))}

        {/* Bars */}
        {mockData.map((d, i) => (
          <g key={i}>
            {enabledFields.map((field, j) => {
              const info = METRIC_INFO[field.id];
              const color = field.color || info.color;
              const barHeight = ((d[field.id] - minValue) / range) * chartHeight;
              const x = padding.left + barGap + i * barGroupWidth + j * barWidth;
              const y = padding.top + chartHeight - barHeight;
              const isHovered = hoveredIndex === i;

              return (
                <rect
                  key={field.id}
                  x={x}
                  y={y}
                  width={barWidth - 2}
                  height={barHeight}
                  fill={color}
                  rx="3"
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-all duration-150 cursor-pointer"
                  style={{
                    filter: isHovered ? `drop-shadow(0 4px 8px ${color}50)` : undefined,
                    transform: isHovered ? 'scaleY(1.02)' : undefined,
                    transformOrigin: 'bottom',
                  }}
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </g>
        ))}
      </svg>
    );
  };

  const renderPieDonutChart = () => {
    const total = enabledFields.reduce((sum, field) => sum + mockData[mockData.length - 1][field.id], 0);
    const isDonut = chartType === 'donut';
    
    let currentAngle = -90;
    const segments = enabledFields.map((field, i) => {
      const info = METRIC_INFO[field.id];
      const value = mockData[mockData.length - 1][field.id];
      const angle = (value / total) * 360;
      const segment = {
        field,
        info,
        value,
        percentage: (value / total) * 100,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: field.color || info.color,
      };
      currentAngle += angle;
      return segment;
    });

    return (
      <div className="h-full flex items-center justify-center gap-6">
        <div className="relative">
          <svg viewBox="0 0 200 200" className="w-40 h-40">
            {segments.map((seg, i) => {
              const startRad = (seg.startAngle * Math.PI) / 180;
              const endRad = (seg.endAngle * Math.PI) / 180;
              const x1 = 100 + 80 * Math.cos(startRad);
              const y1 = 100 + 80 * Math.sin(startRad);
              const x2 = 100 + 80 * Math.cos(endRad);
              const y2 = 100 + 80 * Math.sin(endRad);
              const largeArc = seg.endAngle - seg.startAngle > 180 ? 1 : 0;
              
              const midAngle = ((seg.startAngle + seg.endAngle) / 2) * Math.PI / 180;
              const hoverOffset = hoveredIndex === i ? 5 : 0;
              const offsetX = hoverOffset * Math.cos(midAngle);
              const offsetY = hoverOffset * Math.sin(midAngle);

              return (
                <path
                  key={i}
                  d={`M ${100 + offsetX} ${100 + offsetY} L ${x1 + offsetX} ${y1 + offsetY} A 80 80 0 ${largeArc} 1 ${x2 + offsetX} ${y2 + offsetY} Z`}
                  fill={seg.color}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: hoveredIndex === i ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : undefined,
                    opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
            {isDonut && (
              <circle cx="100" cy="100" r="50" fill="rgb(var(--color-surface))" />
            )}
          </svg>
          
          {isDonut && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  {hoveredIndex !== null ? formatValue(segments[hoveredIndex].value) : formatValue(total)}
                </p>
                <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {hoveredIndex !== null ? (isEn ? segments[hoveredIndex].info.labelEn : segments[hoveredIndex].info.label) : 'Total'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="space-y-1.5">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded transition-all cursor-pointer"
              style={{
                backgroundColor: hoveredIndex === i ? `${seg.color}15` : 'transparent',
              }}
              onMouseEnter={(e) => {
                setHoveredIndex(i);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full transition-transform"
                style={{
                  backgroundColor: seg.color,
                  transform: hoveredIndex === i ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              <span
                className="text-xs transition-all"
                style={{
                  color: 'rgb(var(--color-text))',
                  fontWeight: hoveredIndex === i ? 600 : 400,
                }}
              >
                {isEn ? seg.info.labelEn : seg.info.label}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: hoveredIndex === i ? seg.color : 'rgb(var(--color-text-muted))' }}
              >
                {seg.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGaugeChart = () => {
    const value = enabledFields.length > 0 ? mockData[mockData.length - 1][enabledFields[0].id] : 0;
    const percentage = Math.min(100, (value / maxValue) * 100);
    const field = enabledFields[0];
    const info = field ? METRIC_INFO[field.id] : null;
    const color = field?.color || info?.color || 'rgb(var(--color-primary-500))';

    const getGaugeColor = () => {
      if (percentage < 33) return 'rgb(var(--color-error))';
      if (percentage < 66) return 'rgb(var(--color-warning))';
      return 'rgb(var(--color-success))';
    };

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 200 120" className="w-48 h-28">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgb(var(--color-border))"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={getGaugeColor()}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.51} 251`}
              className="transition-all duration-500"
            />
            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const angle = (tick * 1.8 - 180) * Math.PI / 180;
              const x1 = 100 + 65 * Math.cos(angle);
              const y1 = 100 + 65 * Math.sin(angle);
              const x2 = 100 + 75 * Math.cos(angle);
              const y2 = 100 + 75 * Math.sin(angle);
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgb(var(--color-text-muted))"
                  strokeWidth="2"
                  opacity="0.5"
                />
              );
            })}
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 55 * Math.cos((percentage * 1.8 - 180) * Math.PI / 180)}
              y2={100 + 55 * Math.sin((percentage * 1.8 - 180) * Math.PI / 180)}
              stroke="rgb(var(--color-text))"
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            <circle cx="100" cy="100" r="8" fill="rgb(var(--color-text))" />
          </svg>
        </div>
        <div className="text-center mt-2">
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatValue(value)}
          </p>
          {info && (
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? info.labelEn : info.label}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderTablePreview = () => {
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
              <th className="text-left py-2 px-2 font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Period' : 'Période'}
              </th>
              {enabledFields.map((field) => {
                const info = METRIC_INFO[field.id];
                return (
                  <th key={field.id} className="text-right py-2 px-2 font-medium" style={{ color: field.color || info.color }}>
                    {isEn ? info.labelEn : info.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mockData.map((d, i) => (
              <tr
                key={i}
                className="transition-colors cursor-pointer"
                style={{
                  backgroundColor: hoveredIndex === i ? 'rgb(var(--color-primary-500) / 0.05)' : 'transparent',
                  borderBottom: '1px solid rgb(var(--color-border) / 0.5)',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <td className="py-1.5 px-2" style={{ color: 'rgb(var(--color-text))' }}>{d.period}</td>
                {enabledFields.map((field) => {
                  const info = METRIC_INFO[field.id];
                  return (
                    <td
                      key={field.id}
                      className="text-right py-1.5 px-2 font-mono"
                      style={{ color: hoveredIndex === i ? (field.color || info.color) : 'rgb(var(--color-text))' }}
                    >
                      {formatValue(d[field.id])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRadarChart = () => {
    const numFields = enabledFields.length;
    if (numFields < 3) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Radar charts need at least 3 metrics' : 'Les radars nécessitent au moins 3 métriques'}
          </p>
        </div>
      );
    }

    const angleStep = (2 * Math.PI) / numFields;
    const data = enabledFields.map((field, i) => {
      const info = METRIC_INFO[field.id];
      const value = mockData[mockData.length - 1][field.id];
      const normalizedValue = (value - minValue) / range;
      return {
        field,
        info,
        value,
        normalizedValue,
        angle: i * angleStep - Math.PI / 2,
        color: field.color || info.color,
      };
    });

    const points = data.map(d => ({
      x: 100 + d.normalizedValue * 70 * Math.cos(d.angle),
      y: 100 + d.normalizedValue * 70 * Math.sin(d.angle),
    }));

    return (
      <div className="h-full flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-44 h-44">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((r, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={r * 70}
              fill="none"
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          ))}
          
          {/* Axis lines */}
          {data.map((d, i) => (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 75 * Math.cos(d.angle)}
              y2={100 + 75 * Math.sin(d.angle)}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}
          
          {/* Data polygon */}
          <polygon
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgb(var(--color-primary-500))"
            fillOpacity="0.25"
            stroke="rgb(var(--color-primary-500))"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 4}
              fill={hoveredIndex === i ? data[i].color : 'white'}
              stroke={data[i].color}
              strokeWidth="2"
              className="transition-all cursor-pointer"
              onMouseEnter={(e) => {
                setHoveredIndex(i);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          
          {/* Labels */}
          {data.map((d, i) => {
            const labelRadius = 85;
            return (
              <text
                key={i}
                x={100 + labelRadius * Math.cos(d.angle)}
                y={100 + labelRadius * Math.sin(d.angle)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[8px]"
                fill={hoveredIndex === i ? d.color : 'rgb(var(--color-text-muted))'}
                style={{ fontWeight: hoveredIndex === i ? 600 : 400 }}
              >
                {(isEn ? d.info.labelEn : d.info.label).slice(0, 8)}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderHeatmapChart = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
    
    // Generate heatmap data
    const heatmapData = days.flatMap((_, dayIndex) =>
      weeks.map((_, weekIndex) => ({
        day: dayIndex,
        week: weekIndex,
        value: Math.random(),
      }))
    );

    const field = enabledFields[0];
    const info = field ? METRIC_INFO[field.id] : null;
    const baseColor = field?.color || info?.color || 'rgb(var(--color-success))';

    const getColor = (value: number) => {
      const intensity = value;
      if (intensity < 0.2) return `${baseColor}15`;
      if (intensity < 0.4) return `${baseColor}35`;
      if (intensity < 0.6) return `${baseColor}55`;
      if (intensity < 0.8) return `${baseColor}75`;
      return baseColor;
    };

    return (
      <div className="h-full flex flex-col p-2">
        {/* Week headers */}
        <div className="flex gap-0.5 mb-1 pl-5">
          {weeks.map((w) => (
            <div key={w} className="flex-1 text-center text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
              W{w}
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="flex-1 flex flex-col gap-0.5">
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="flex gap-0.5 flex-1 items-center">
              <div className="w-4 text-[8px] text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {day}
              </div>
              {weeks.map((_, weekIndex) => {
                const cellData = heatmapData.find(d => d.day === dayIndex && d.week === weekIndex);
                const cellIndex = dayIndex * weeks.length + weekIndex;
                const isHovered = hoveredIndex === cellIndex;
                
                return (
                  <div
                    key={weekIndex}
                    className="flex-1 h-full rounded-sm transition-all cursor-pointer"
                    style={{ 
                      backgroundColor: getColor(cellData?.value || 0),
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.2)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      setHoveredIndex(cellIndex);
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Less' : 'Moins'}
          </span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(intensity) }}
            />
          ))}
          <span className="text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'More' : 'Plus'}
          </span>
        </div>
      </div>
    );
  };

  const renderSparklineChart = () => {
    return (
      <div className="h-full flex flex-col justify-center gap-3 p-4">
        {enabledFields.slice(0, 4).map((field) => {
          const info = METRIC_INFO[field.id];
          const color = field.color || info.color;
          const values = mockData.map(d => d[field.id]);
          const sparkMax = Math.max(...values);
          const sparkMin = Math.min(...values);
          const sparkRange = sparkMax - sparkMin || 1;
          const lastValue = values[values.length - 1];
          const firstValue = values[0];
          const change = ((lastValue - firstValue) / firstValue) * 100;

          const points = values.map((v, i) => ({
            x: (i / (values.length - 1)) * 100,
            y: 20 - ((v - sparkMin) / sparkRange) * 18,
          }));

          return (
            <div key={field.id} className="flex items-center gap-3">
              <div className="w-20 text-xs truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? info.labelEn : info.label}
              </div>
              <div className="flex-1">
                <svg viewBox="0 0 100 20" className="w-full h-5">
                  <path
                    d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r="2"
                    fill={color}
                  />
                </svg>
              </div>
              <div className="w-16 text-right">
                <span className="text-xs font-medium" style={{ color }}>{formatValue(lastValue)}</span>
              </div>
              <div className="w-12 text-right">
                <span 
                  className="text-[10px] font-medium"
                  style={{ color: change >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
                >
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWaterfallChart = () => {
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Create waterfall data
    let cumulative = 0;
    const waterfallData = enabledFields.map((field, i) => {
      const info = METRIC_INFO[field.id];
      const value = mockData[mockData.length - 1][field.id];
      const isPositive = i === 0 || Math.random() > 0.4; // First is always positive
      const displayValue = i === 0 ? value : (isPositive ? value * 0.3 : -value * 0.2);
      const start = cumulative;
      cumulative += displayValue;
      return {
        field,
        info,
        value: displayValue,
        start,
        end: cumulative,
        isPositive: displayValue >= 0,
        color: field.color || info.color,
      };
    });

    const allValues = waterfallData.flatMap(d => [d.start, d.end]);
    const wfMax = Math.max(...allValues);
    const wfMin = Math.min(...allValues);
    const wfRange = wfMax - wfMin || 1;

    const barWidth = (chartWidth / waterfallData.length) * 0.6;
    const gap = (chartWidth / waterfallData.length) * 0.4;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Zero line */}
        {wfMin < 0 && (
          <line
            x1={padding.left}
            y1={padding.top + ((wfMax - 0) / wfRange) * chartHeight}
            x2={width - padding.right}
            y2={padding.top + ((wfMax - 0) / wfRange) * chartHeight}
            stroke="rgb(var(--color-border))"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* Bars */}
        {waterfallData.map((d, i) => {
          const x = padding.left + i * (barWidth + gap) + gap / 2;
          const y1 = padding.top + ((wfMax - d.start) / wfRange) * chartHeight;
          const y2 = padding.top + ((wfMax - d.end) / wfRange) * chartHeight;
          const barHeight = Math.abs(y2 - y1);
          const y = Math.min(y1, y2);
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              {/* Connector line */}
              {i > 0 && (
                <line
                  x1={padding.left + (i - 1) * (barWidth + gap) + gap / 2 + barWidth}
                  y1={padding.top + ((wfMax - waterfallData[i - 1].end) / wfRange) * chartHeight}
                  x2={x}
                  y2={padding.top + ((wfMax - waterfallData[i - 1].end) / wfRange) * chartHeight}
                  stroke="rgb(var(--color-border))"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              )}
              
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill={d.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))'}
                rx="3"
                opacity={isHovered ? 1 : 0.85}
                className="transition-all cursor-pointer"
                style={{
                  filter: isHovered ? `drop-shadow(0 4px 8px rgba(0,0,0,0.2))` : undefined,
                }}
                onMouseEnter={(e) => {
                  setHoveredIndex(i);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="text-[8px]"
                fill={isHovered ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))'}
              >
                {(isEn ? d.info.labelEn : d.info.label).slice(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
      case 'area':
        return renderLineAreaChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
      case 'donut':
        return renderPieDonutChart();
      case 'gauge':
        return renderGaugeChart();
      case 'table':
        return renderTablePreview();
      case 'radar':
        return renderRadarChart();
      case 'waterfall':
        return renderWaterfallChart();
      case 'heatmap':
        return renderHeatmapChart();
      case 'sparkline':
        return renderSparklineChart();
      default:
        return renderLineAreaChart();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-success))' }}
          />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Live Preview' : 'Aperçu en direct'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-500))' }}>
            {CHART_TYPE_INFO[chartType].icon} {isEn ? CHART_TYPE_INFO[chartType].labelEn : CHART_TYPE_INFO[chartType].label}
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div 
        className="flex-1 rounded-xl overflow-hidden relative"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          minHeight: '180px',
        }}
      >
        {renderChart()}
        
        {/* Hover Tooltip */}
        {hoveredIndex !== null && chartType !== 'pie' && chartType !== 'donut' && chartType !== 'gauge' && chartType !== 'table' && (
          <ChartTooltip visible={true} position={tooltipPosition}>
            <div className="min-w-[160px]">
              <p className="text-gray-400 text-xs mb-2">{mockData[hoveredIndex].period}</p>
              <div className="space-y-1">
                {enabledFields.map((field) => {
                  const info = METRIC_INFO[field.id];
                  return (
                    <div key={field.id} className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: field.color || info.color }} />
                        <span className="text-gray-300 text-xs">{isEn ? info.labelEn : info.label}</span>
                      </div>
                      <span className="text-white font-medium text-xs">{formatValue(mockData[hoveredIndex][field.id])}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartTooltip>
        )}
      </div>

      {/* Legend */}
      {chartType !== 'pie' && chartType !== 'donut' && chartType !== 'gauge' && chartType !== 'table' && enabledFields.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
          {enabledFields.map((field) => {
            const info = METRIC_INFO[field.id];
            return (
              <div key={field.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: field.color || info.color }} />
                <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? info.labelEn : info.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Bar */}
      <div 
        className="mt-3 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-4">
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            <strong style={{ color: 'rgb(var(--color-text))' }}>{enabledFields.length}</strong> {isEn ? 'fields' : 'champs'}
          </span>
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            <strong style={{ color: 'rgb(var(--color-text))' }}>{mockData.length}</strong> {isEn ? 'periods' : 'périodes'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text-muted))' }}
          >
            {config.timeRange || '6M'}
          </span>
          {config.comparison !== 'none' && (
            <span 
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' }}
            >
              {isEn ? 'Comparison' : 'Comparaison'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
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
    timeRange: '6M',
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
      timeRange: config.timeRange || '6M',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {mode === 'create'
                  ? (isEn ? 'Build New Chart' : 'Créer un graphique')
                  : (isEn ? 'Edit Chart' : 'Modifier le graphique')}
              </h2>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Select fields, choose chart type, and customize'
                  : 'Sélectionnez les champs, choisissez le type et personnalisez'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
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
                className="flex items-center gap-2 transition-all"
                disabled={index > activeStep}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'rgb(var(--color-primary-500))'
                      : isCompleted
                      ? 'rgb(var(--color-success))'
                      : 'rgb(var(--color-bg))',
                    color: isActive || isCompleted ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{
                    color: isActive ? 'rgb(var(--color-primary-500))' : isCompleted ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-2 hidden sm:block" style={{ color: 'rgb(var(--color-border))' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div>
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
            <div className="space-y-6">
              {/* Full-width Live Preview */}
              <div
                className="rounded-xl p-5"
                style={{ 
                  border: '1px solid rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-surface))',
                  minHeight: '320px',
                }}
              >
                <LivePreview config={config} fields={fields} isEn={isEn} />
              </div>

              {/* Name, Description & Summary Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Chart Name' : 'Nom du graphique'} *
                  </label>
                  <input
                    type="text"
                    value={isEn ? chartNameEn : chartName}
                    onChange={(e) => isEn ? setChartNameEn(e.target.value) : setChartName(e.target.value)}
                    placeholder={isEn ? 'e.g. Revenue Trend Analysis' : 'ex. Analyse des revenus'}
                    className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Description' : 'Description'}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isEn ? 'Brief description (optional)' : 'Brève description (optionnel)'}
                    className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>

                {/* Quick Summary */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Type:' : 'Type:'}</span>
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {config.chartType ? CHART_TYPE_INFO[config.chartType].icon : ''} {config.chartType ? (isEn ? CHART_TYPE_INFO[config.chartType].labelEn : CHART_TYPE_INFO[config.chartType].label) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Fields:' : 'Champs:'}</span>
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{fields.filter(f => f.enabled).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Range:' : 'Période:'}</span>
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{config.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2">
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

        {/* Footer */}
        <div
          className="flex items-center justify-between p-4 border-t flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={() => activeStep > 0 && setActiveStep(activeStep - 1)}
            disabled={activeStep === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {isEn ? 'Back' : 'Retour'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
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
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
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
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Save className="w-4 h-4" />
                {mode === 'create' ? (isEn ? 'Create Chart' : 'Créer') : (isEn ? 'Save Changes' : 'Enregistrer')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { FieldPicker, ChartTypeGrid, ConfigurationPanel };
