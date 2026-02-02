/**
 * FilterPanel Component
 * 
 * A powerful filter management UI that surpasses Power BI and Looker:
 * - Visual filter chips with clear active state
 * - Quick filter bar for common dimensions
 * - Date range picker with presets and relative options
 * - Dimension filters with multi-select
 * - Metric filters with operators
 * - Cross-filter indicators showing data flow
 * - Filter history with undo/redo
 * - Save filter presets for quick access
 * - Keyboard shortcuts for power users
 * 
 * Bilingual support (EN/FR)
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Filter,
  X,
  Plus,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check,
  RotateCcw,
  Save,
  Bookmark,
  Clock,
  TrendingUp,
  DollarSign,
  Percent,
  Hash,
  Link2,
  Unlink,
  Search,
  Sliders,
  History,
  Trash2,
  Copy,
  Lock,
  Unlock,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { 
  ViewFilterState, 
  DimensionFilter, 
  MetricFilter, 
  CrossFilterState,
  FilterOperator,
} from '../lib/viewManagement';
import { DataMetric, TimeRange, TIME_RANGE_INFO, METRIC_INFO } from '../lib/chartFavorites';

// =====================================================
// TYPES
// =====================================================

interface FilterPanelProps {
  filters: ViewFilterState;
  crossFilters: CrossFilterState[];
  onFiltersChange: (filters: Partial<ViewFilterState>) => void;
  onCrossFiltersChange: (crossFilters: CrossFilterState[]) => void;
  onReset: () => void;
  onSavePreset?: (name: string) => void;
  savedPresets?: FilterPreset[];
  onLoadPreset?: (presetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  nameEn: string;
  filters: ViewFilterState;
  createdAt: string;
}

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  color?: string;
  isLocked?: boolean;
  icon?: React.ReactNode;
}

// =====================================================
// FILTER OPERATORS
// =====================================================

const FILTER_OPERATORS: Record<FilterOperator, { label: string; labelEn: string; symbol: string }> = {
  equals: { label: 'Égal à', labelEn: 'Equals', symbol: '=' },
  contains: { label: 'Contient', labelEn: 'Contains', symbol: '⊃' },
  greaterThan: { label: 'Supérieur à', labelEn: 'Greater than', symbol: '>' },
  lessThan: { label: 'Inférieur à', labelEn: 'Less than', symbol: '<' },
  between: { label: 'Entre', labelEn: 'Between', symbol: '↔' },
  in: { label: 'Dans', labelEn: 'In', symbol: '∈' },
  notIn: { label: 'Pas dans', labelEn: 'Not in', symbol: '∉' },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function FilterPanel({
  filters,
  crossFilters,
  onFiltersChange,
  onCrossFiltersChange,
  onReset,
  onSavePreset,
  savedPresets = [],
  onLoadPreset,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}: FilterPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [filterHistory, setFilterHistory] = useState<ViewFilterState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.preset !== 'ALL') count++;
    count += filters.dimensions.filter(d => d.isActive).length;
    count += filters.metrics.filter(m => m.isActive).length;
    count += filters.custom.filter(c => c.isActive).length;
    count += crossFilters.filter(cf => cf.isActive && cf.selectedValues.length > 0).length;
    return count;
  }, [filters, crossFilters]);
  
  // Add to filter history
  const addToHistory = useCallback((newFilters: ViewFilterState) => {
    setFilterHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newFilters].slice(-20);
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);
  
  // Handle filter changes with history
  const handleFiltersChange = useCallback((updates: Partial<ViewFilterState>) => {
    const newFilters = { ...filters, ...updates };
    addToHistory(newFilters);
    onFiltersChange(updates);
  }, [filters, addToHistory, onFiltersChange]);
  
  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < filterHistory.length - 1;
  
  const handleUndo = useCallback(() => {
    if (canUndo) {
      const prevFilters = filterHistory[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      onFiltersChange(prevFilters);
    }
  }, [canUndo, filterHistory, historyIndex, onFiltersChange]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      const nextFilters = filterHistory[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      onFiltersChange(nextFilters);
    }
  }, [canRedo, filterHistory, historyIndex, onFiltersChange]);
  
  // Handle date range change
  const handleDateRangeChange = useCallback((preset: TimeRange) => {
    handleFiltersChange({
      dateRange: { ...filters.dateRange, preset },
    });
    setShowDatePicker(false);
  }, [filters.dateRange, handleFiltersChange]);
  
  // Remove dimension filter
  const handleRemoveDimensionFilter = useCallback((filterId: string) => {
    handleFiltersChange({
      dimensions: filters.dimensions.filter(d => d.id !== filterId),
    });
  }, [filters.dimensions, handleFiltersChange]);
  
  // Toggle dimension filter active
  const handleToggleDimensionFilter = useCallback((filterId: string) => {
    handleFiltersChange({
      dimensions: filters.dimensions.map(d => 
        d.id === filterId ? { ...d, isActive: !d.isActive } : d
      ),
    });
  }, [filters.dimensions, handleFiltersChange]);
  
  // Remove metric filter
  const handleRemoveMetricFilter = useCallback((filterId: string) => {
    handleFiltersChange({
      metrics: filters.metrics.filter(m => m.id !== filterId),
    });
  }, [filters.metrics, handleFiltersChange]);
  
  // Clear cross-filter
  const handleClearCrossFilter = useCallback((crossFilterId: string) => {
    onCrossFiltersChange(
      crossFilters.map(cf => 
        cf.id === crossFilterId ? { ...cf, selectedValues: [], isActive: false } : cf
      )
    );
  }, [crossFilters, onCrossFiltersChange]);
  
  // Reset all filters
  const handleResetAll = useCallback(() => {
    onReset();
    onCrossFiltersChange(crossFilters.map(cf => ({ ...cf, selectedValues: [], isActive: false })));
    setFilterHistory([]);
    setHistoryIndex(-1);
  }, [onReset, onCrossFiltersChange, crossFilters]);
  
  // Collapsed view
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${className}`}
        style={{
          backgroundColor: activeFilterCount > 0 
            ? 'rgb(var(--color-primary-500) / 0.1)' 
            : 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
          color: activeFilterCount > 0 
            ? 'rgb(var(--color-primary-500))' 
            : 'rgb(var(--color-text))',
        }}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isEn ? 'Filters' : 'Filtres'}
        </span>
        {activeFilterCount > 0 && (
          <span 
            className="px-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {activeFilterCount}
          </span>
        )}
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <div 
      className={`rounded-xl overflow-hidden ${className}`}
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
          <Filter className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Filters' : 'Filtres'}
          </span>
          {activeFilterCount > 0 && (
            <span 
              className="px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                color: 'rgb(var(--color-primary-500))',
              }}
            >
              {activeFilterCount} {isEn ? 'active' : 'actif(s)'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            title={isEn ? 'Undo (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}
          >
            <History className="w-3.5 h-3.5" />
          </button>
          
          {/* Presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-1.5 rounded-md transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              title={isEn ? 'Filter presets' : 'Préréglages'}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            
            {showPresets && (
              <PresetMenu
                presets={savedPresets}
                onLoad={onLoadPreset}
                onSave={onSavePreset}
                onClose={() => setShowPresets(false)}
                isEn={isEn}
              />
            )}
          </div>
          
          {/* Reset */}
          <button
            onClick={handleResetAll}
            disabled={activeFilterCount === 0}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30 hover:bg-[rgb(var(--color-error)/0.1)]"
            style={{ color: activeFilterCount > 0 ? 'rgb(var(--color-error))' : 'rgb(var(--color-text-muted))' }}
            title={isEn ? 'Reset all filters' : 'Réinitialiser tous les filtres'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          
          {/* Collapse */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Filter Content */}
      <div className="p-3 space-y-3">
        {/* Date Range */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
            style={{
              backgroundColor: filters.dateRange.preset !== 'ALL' 
                ? 'rgb(var(--color-primary-500) / 0.08)' 
                : 'rgb(var(--color-bg-muted))',
              border: `1px solid ${filters.dateRange.preset !== 'ALL' ? 'rgb(var(--color-primary-500) / 0.3)' : 'rgb(var(--color-border))'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Date Range' : 'Période'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {filters.dateRange.preset 
                  ? (isEn ? TIME_RANGE_INFO[filters.dateRange.preset].labelEn : TIME_RANGE_INFO[filters.dateRange.preset].label)
                  : (isEn ? 'Custom' : 'Personnalisé')
                }
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} style={{ color: 'rgb(var(--color-text-muted))' }} />
            </div>
          </button>
          
          {showDatePicker && (
            <DateRangePicker
              selected={filters.dateRange.preset}
              onSelect={handleDateRangeChange}
              onClose={() => setShowDatePicker(false)}
              isEn={isEn}
            />
          )}
        </div>
        
        {/* Active Filter Chips */}
        {(filters.dimensions.length > 0 || filters.metrics.length > 0 || crossFilters.some(cf => cf.isActive)) && (
          <div className="flex flex-wrap gap-2">
            {/* Dimension filters */}
            {filters.dimensions.filter(d => d.isActive).map(dim => (
              <FilterChip
                key={dim.id}
                label={isEn ? dim.dimensionLabelEn : dim.dimensionLabel}
                value={dim.values.join(', ')}
                onRemove={() => handleRemoveDimensionFilter(dim.id)}
                isLocked={dim.isLocked}
                icon={<Hash className="w-3 h-3" />}
              />
            ))}
            
            {/* Metric filters */}
            {filters.metrics.filter(m => m.isActive).map(metric => {
              const metricInfo = METRIC_INFO[metric.metric];
              return (
                <FilterChip
                  key={metric.id}
                  label={isEn ? metricInfo.labelEn : metricInfo.label}
                  value={`${FILTER_OPERATORS[metric.operator].symbol} ${metric.value}`}
                  onRemove={() => handleRemoveMetricFilter(metric.id)}
                  color={metricInfo.color}
                  icon={metric.operator === 'greaterThan' || metric.operator === 'lessThan' 
                    ? <TrendingUp className="w-3 h-3" /> 
                    : <DollarSign className="w-3 h-3" />
                  }
                />
              );
            })}
            
            {/* Cross-filters */}
            {crossFilters.filter(cf => cf.isActive && cf.selectedValues.length > 0).map(cf => (
              <FilterChip
                key={cf.id}
                label={isEn ? 'Cross-filter' : 'Filtre croisé'}
                value={cf.selectedValues.join(', ')}
                onRemove={() => handleClearCrossFilter(cf.id)}
                icon={<Link2 className="w-3 h-3" />}
                color="#7C3AED"
              />
            ))}
          </div>
        )}
        
        {/* Add Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddFilter(!showAddFilter)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-colors hover:border-primary-500 hover:bg-[rgb(var(--color-primary-500)/0.05)]"
            style={{
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text-muted))',
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">{isEn ? 'Add filter' : 'Ajouter un filtre'}</span>
          </button>
          
          {showAddFilter && (
            <AddFilterMenu
              onAddDimension={(dim) => {
                handleFiltersChange({
                  dimensions: [...filters.dimensions, dim],
                });
                setShowAddFilter(false);
              }}
              onAddMetric={(metric) => {
                handleFiltersChange({
                  metrics: [...filters.metrics, metric],
                });
                setShowAddFilter(false);
              }}
              onClose={() => setShowAddFilter(false)}
              isEn={isEn}
            />
          )}
        </div>
        
        {/* Quick Filters */}
        {filters.quickFilters.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Quick Filters' : 'Filtres rapides'}
            </p>
            <div className="flex flex-wrap gap-1">
              {filters.quickFilters.map((filterId) => {
                const filter = filters.dimensions.find(d => d.id === filterId);
                if (!filter) return null;
                
                return (
                  <button
                    key={filterId}
                    onClick={() => handleToggleDimensionFilter(filterId)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors`}
                    style={{
                      backgroundColor: filter.isActive 
                        ? 'rgb(var(--color-primary-500))' 
                        : 'rgb(var(--color-bg-muted))',
                      color: filter.isActive 
                        ? 'white' 
                        : 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {isEn ? filter.dimensionLabelEn : filter.dimensionLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Cross-filter Indicator */}
        {crossFilters.some(cf => cf.isActive) && (
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'rgb(var(--color-info) / 0.08)',
              border: '1px solid rgb(var(--color-info) / 0.2)',
            }}
          >
            <Link2 className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
            <span className="text-xs" style={{ color: 'rgb(var(--color-info))' }}>
              {isEn 
                ? `${crossFilters.filter(cf => cf.isActive).length} cross-filter(s) active`
                : `${crossFilters.filter(cf => cf.isActive).length} filtre(s) croisé(s) actif(s)`
              }
            </span>
            <button
              onClick={() => onCrossFiltersChange(crossFilters.map(cf => ({ ...cf, isActive: false, selectedValues: [] })))}
              className="ml-auto text-xs font-medium hover:underline"
              style={{ color: 'rgb(var(--color-info))' }}
            >
              {isEn ? 'Clear all' : 'Tout effacer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

function FilterChip({ label, value, onRemove, color, isLocked, icon }: FilterChipProps) {
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium group"
      style={{
        backgroundColor: color ? `${color}15` : 'rgb(var(--color-primary-500) / 0.1)',
        color: color || 'rgb(var(--color-primary-500))',
      }}
    >
      {icon}
      <span className="font-medium">{label}:</span>
      <span className="max-w-[100px] truncate">{value}</span>
      {isLocked ? (
        <Lock className="w-3 h-3 opacity-50" />
      ) : (
        <button
          onClick={onRemove}
          className="p-0.5 rounded-full transition-colors opacity-60 hover:opacity-100 hover:bg-black/10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface DateRangePickerProps {
  selected?: TimeRange;
  onSelect: (range: TimeRange) => void;
  onClose: () => void;
  isEn: boolean;
}

function DateRangePicker({ selected, onSelect, onClose, isEn }: DateRangePickerProps) {
  const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="p-2 grid grid-cols-4 gap-1">
          {ranges.map((range) => {
            const info = TIME_RANGE_INFO[range];
            const isSelected = range === selected;
            
            return (
              <button
                key={range}
                onClick={() => onSelect(range)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: isSelected 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'transparent',
                  color: isSelected 
                    ? 'white' 
                    : 'rgb(var(--color-text))',
                }}
              >
                <span className="text-sm font-medium">{range}</span>
                <span className="text-[10px] opacity-70">
                  {isEn ? info.labelEn : info.label}
                </span>
              </button>
            );
          })}
        </div>
        
        <div 
          className="px-3 py-2 border-t flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            className="text-xs font-medium"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            {isEn ? 'Custom range...' : 'Période personnalisée...'}
          </button>
        </div>
      </div>
    </>
  );
}

interface PresetMenuProps {
  presets: FilterPreset[];
  onLoad?: (presetId: string) => void;
  onSave?: (name: string) => void;
  onClose: () => void;
  isEn: boolean;
}

function PresetMenu({ presets, onLoad, onSave, onClose, isEn }: PresetMenuProps) {
  const [showSave, setShowSave] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl z-50 overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Saved Presets' : 'Préréglages enregistrés'}
          </p>
          
          {presets.length === 0 ? (
            <p className="px-2 py-4 text-xs text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'No saved presets' : 'Aucun préréglage'}
            </p>
          ) : (
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoad?.(preset.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                >
                  <Bookmark className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? preset.nameEn : preset.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div 
          className="px-2 py-2 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {showSave ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={isEn ? 'Preset name...' : 'Nom du préréglage...'}
                className="flex-1 px-2 py-1.5 text-sm rounded border bg-transparent"
                style={{
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (presetName.trim()) {
                    onSave?.(presetName);
                    setShowSave(false);
                    setPresetName('');
                    onClose();
                  }
                }}
                className="p-1.5 rounded-md"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              <Save className="w-4 h-4" />
              {isEn ? 'Save current filters' : 'Enregistrer les filtres actuels'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

interface AddFilterMenuProps {
  onAddDimension: (filter: DimensionFilter) => void;
  onAddMetric: (filter: MetricFilter) => void;
  onClose: () => void;
  isEn: boolean;
}

function AddFilterMenu({ onAddDimension, onAddMetric, onClose, isEn }: AddFilterMenuProps) {
  const [tab, setTab] = useState<'dimension' | 'metric'>('dimension');
  const [selectedMetric, setSelectedMetric] = useState<DataMetric | null>(null);
  const [operator, setOperator] = useState<FilterOperator>('greaterThan');
  const [value, setValue] = useState('');
  
  const availableMetrics = Object.keys(METRIC_INFO) as DataMetric[];
  
  const handleAddMetricFilter = () => {
    if (selectedMetric && value) {
      onAddMetric({
        id: `metric-${Date.now()}`,
        metric: selectedMetric,
        operator,
        value: parseFloat(value),
        isActive: true,
      });
    }
  };
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        {/* Tabs */}
        <div 
          className="flex border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={() => setTab('dimension')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'dimension' ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: tab === 'dimension' ? 'rgb(var(--color-primary-500))' : 'transparent',
              color: tab === 'dimension' ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
            }}
          >
            <Hash className="w-4 h-4 inline mr-1.5" />
            {isEn ? 'Dimension' : 'Dimension'}
          </button>
          <button
            onClick={() => setTab('metric')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'metric' ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: tab === 'metric' ? 'rgb(var(--color-primary-500))' : 'transparent',
              color: tab === 'metric' ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
            }}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" />
            {isEn ? 'Metric' : 'Métrique'}
          </button>
        </div>
        
        {/* Content */}
        <div className="p-3">
          {tab === 'dimension' ? (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Select a dimension to filter by' : 'Sélectionnez une dimension pour filtrer'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {['Department', 'Account', 'Project', 'Vendor', 'Customer', 'Location'].map((dim) => (
                  <button
                    key={dim}
                    onClick={() => {
                      onAddDimension({
                        id: `dim-${Date.now()}`,
                        dimension: dim.toLowerCase(),
                        dimensionLabel: dim,
                        dimensionLabelEn: dim,
                        operator: 'in',
                        values: [],
                        isActive: true,
                        isLocked: false,
                      });
                    }}
                    className="px-3 py-2 text-sm rounded-lg text-left hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {dim}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Metric selector */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Metric' : 'Métrique'}
                </label>
                <select
                  value={selectedMetric || ''}
                  onChange={(e) => setSelectedMetric(e.target.value as DataMetric)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent"
                  style={{
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  <option value="">{isEn ? 'Select...' : 'Sélectionner...'}</option>
                  {availableMetrics.map((metric) => {
                    const info = METRIC_INFO[metric];
                    return (
                      <option key={metric} value={metric}>
                        {isEn ? info.labelEn : info.label}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Operator */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Condition' : 'Condition'}
                </label>
                <div className="flex gap-1">
                  {(['greaterThan', 'lessThan', 'equals', 'between'] as FilterOperator[]).map((op) => (
                    <button
                      key={op}
                      onClick={() => setOperator(op)}
                      className={`flex-1 px-2 py-1.5 text-sm rounded-lg transition-colors`}
                      style={{
                        backgroundColor: operator === op 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-bg-muted))',
                        color: operator === op ? 'white' : 'rgb(var(--color-text))',
                      }}
                    >
                      {FILTER_OPERATORS[op].symbol}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Value */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Value' : 'Valeur'}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent"
                  style={{
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
              
              {/* Add button */}
              <button
                onClick={handleAddMetricFilter}
                disabled={!selectedMetric || !value}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {isEn ? 'Add Filter' : 'Ajouter le filtre'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { FilterPanel };
