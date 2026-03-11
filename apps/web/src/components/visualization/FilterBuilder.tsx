/**
 * FilterBuilder - Filter configuration component
 *
 * Features:
 * - Type-specific filter UI (string, number, date, boolean)
 * - AND/OR logic groups
 * - Operator selection
 * - Bilingual labels (EN/FR)
 * - Brand-compliant styling
 */

import { useState } from 'react';
import { Filter, Plus, X, ChevronDown, Trash2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  FilterConfig,
  FilterOperator,
  DataSourceReference,
  FieldType,
  getOperatorsForFieldType,
  generateId,
} from '../../lib/visualizationTypes';
import { getDataSource } from '../../lib/goldSchema';

// =====================================================
// OPERATOR LABELS
// =====================================================

const OPERATOR_LABELS: Record<FilterOperator, { en: string; fr: string }> = {
  equals: { en: 'equals', fr: 'égal à' },
  not_equals: { en: 'not equals', fr: 'différent de' },
  contains: { en: 'contains', fr: 'contient' },
  not_contains: { en: 'does not contain', fr: 'ne contient pas' },
  starts_with: { en: 'starts with', fr: 'commence par' },
  ends_with: { en: 'ends with', fr: 'finit par' },
  greater_than: { en: 'greater than', fr: 'supérieur à' },
  less_than: { en: 'less than', fr: 'inférieur à' },
  greater_or_equal: { en: 'greater or equal', fr: 'supérieur ou égal à' },
  less_or_equal: { en: 'less or equal', fr: 'inférieur ou égal à' },
  between: { en: 'between', fr: 'entre' },
  in: { en: 'in list', fr: 'dans la liste' },
  not_in: { en: 'not in list', fr: 'pas dans la liste' },
  is_null: { en: 'is empty', fr: 'est vide' },
  is_not_null: { en: 'is not empty', fr: "n'est pas vide" },
};

// =====================================================
// FILTER ROW COMPONENT
// =====================================================

interface FilterRowProps {
  filter: FilterConfig;
  sources: DataSourceReference[];
  onUpdate: (updates: Partial<FilterConfig>) => void;
  onRemove: () => void;
  isEn: boolean;
}

function FilterRow({ filter, sources, onUpdate, onRemove, isEn }: FilterRowProps) {
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Get current source and field
  const source = getDataSource(filter.sourceId);
  const field = source?.fields.find((f) => f.id === filter.fieldId);
  const fieldType: FieldType = field?.type || 'STRING';
  const operators = getOperatorsForFieldType(fieldType);

  // Render value input based on operator and field type
  const renderValueInput = () => {
    // No value needed for null checks
    if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
      return null;
    }

    // Between needs two values
    if (filter.operator === 'between') {
      return (
        <div className="flex items-center gap-2">
          <input
            type={fieldType === 'NUMBER' || fieldType === 'CURRENCY' ? 'number' : 'text'}
            value={Array.isArray(filter.value) ? filter.value[0] : ''}
            onChange={(e) => {
              const newValue = [e.target.value, Array.isArray(filter.value) ? filter.value[1] : ''];
              onUpdate({ value: newValue as [number, number] });
            }}
            placeholder={isEn ? 'From' : 'De'}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>-</span>
          <input
            type={fieldType === 'NUMBER' || fieldType === 'CURRENCY' ? 'number' : 'text'}
            value={Array.isArray(filter.value) ? filter.value[1] : ''}
            onChange={(e) => {
              const newValue = [Array.isArray(filter.value) ? filter.value[0] : '', e.target.value];
              onUpdate({ value: newValue as [number, number] });
            }}
            placeholder={isEn ? 'To' : 'À'}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
      );
    }

    // Boolean type
    if (fieldType === 'BOOLEAN') {
      return (
        <select
          value={String(filter.value)}
          onChange={(e) => onUpdate({ value: e.target.value === 'true' })}
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="true">{isEn ? 'Yes' : 'Oui'}</option>
          <option value="false">{isEn ? 'No' : 'Non'}</option>
        </select>
      );
    }

    // Date type
    if (fieldType === 'DATE' || fieldType === 'DATETIME') {
      return (
        <input
          type="date"
          value={String(filter.value || '')}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
      );
    }

    // Number type
    if (fieldType === 'NUMBER' || fieldType === 'CURRENCY') {
      return (
        <input
          type="number"
          value={String(filter.value || '')}
          onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
          placeholder={isEn ? 'Enter value...' : 'Entrez une valeur...'}
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
      );
    }

    // Default: text input
    return (
      <input
        type="text"
        value={String(filter.value || '')}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder={isEn ? 'Enter value...' : 'Entrez une valeur...'}
        className="flex-1 px-3 py-2 rounded-lg border text-sm"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
      />
    );
  };

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-xl"
      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
    >
      {/* Field Selector */}
      <div className="relative min-w-[180px]">
        <button
          onClick={() => setShowFieldDropdown(!showFieldDropdown)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <span className="truncate">
            {field
              ? isEn
                ? field.nameEn
                : field.name
              : isEn
                ? 'Select field...'
                : 'Sélectionner...'}
          </span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </button>

        {showFieldDropdown && (
          <div
            className="absolute z-20 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto py-1 rounded-xl shadow-lg"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            {sources.map((s) => {
              const dataSource = getDataSource(s.id);
              if (!dataSource) return null;

              return (
                <div key={s.id}>
                  <div
                    className="px-3 py-1.5 text-xs font-medium"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {dataSource.icon} {isEn ? dataSource.nameEn : dataSource.name}
                  </div>
                  {dataSource.fields
                    .filter((f) => f.filterable)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          onUpdate({ sourceId: s.id, fieldId: f.id, value: '' });
                          setShowFieldDropdown(false);
                        }}
                        className={`
                        w-full px-3 py-2 text-left text-sm hover:bg-gray-700/50
                        ${filter.fieldId === f.id && filter.sourceId === s.id ? 'bg-primary-500/10' : ''}
                      `}
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {isEn ? f.nameEn : f.name}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operator Selector */}
      <select
        value={filter.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="px-3 py-2 rounded-lg border text-sm"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op][isEn ? 'en' : 'fr']}
          </option>
        ))}
      </select>

      {/* Value Input */}
      <div className="flex-1">{renderValueInput()}</div>

      {/* Enable Toggle */}
      <button
        onClick={() => onUpdate({ enabled: !filter.enabled })}
        className={`
          w-6 h-6 rounded flex items-center justify-center
          ${filter.enabled ? 'bg-primary-500' : 'bg-gray-700'}
        `}
      >
        {filter.enabled && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Remove Button */}
      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </div>
  );
}

// =====================================================
// MAIN FILTER BUILDER
// =====================================================

interface FilterBuilderProps {
  sources: DataSourceReference[];
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  filterLogic?: 'AND' | 'OR';
  onLogicChange?: (logic: 'AND' | 'OR') => void;
}

export function FilterBuilder({
  sources,
  filters,
  onFiltersChange,
  filterLogic = 'AND',
  onLogicChange,
}: FilterBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Add new filter
  const addFilter = () => {
    const firstSource = sources[0];
    const dataSource = firstSource ? getDataSource(firstSource.id) : null;
    const firstField = dataSource?.fields.find((f) => f.filterable);

    const newFilter: FilterConfig = {
      id: generateId('filter'),
      sourceId: firstSource?.id || '',
      fieldId: firstField?.id || '',
      operator: 'equals',
      value: '',
      enabled: true,
    };
    onFiltersChange([...filters, newFilter]);
  };

  // Update filter
  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Remove filter
  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange([]);
  };

  const hasFilters = filters.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)' }}
          >
            <Filter className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Filters' : 'Filtres'}
            </h4>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {hasFilters
                ? `${filters.filter((f) => f.enabled).length} ${isEn ? 'active' : 'actifs'}`
                : isEn
                  ? 'No filters applied'
                  : 'Aucun filtre appliqué'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Clear all' : 'Effacer tout'}
            </button>
          )}
          <button
            onClick={addFilter}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              color: 'rgb(var(--color-primary-500))',
            }}
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'Add Filter' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Logic Toggle */}
      {filters.length > 1 && onLogicChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Match' : 'Correspondre à'}
          </span>
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--color-bg))' }}
          >
            <button
              onClick={() => onLogicChange('AND')}
              className={`px-3 py-1.5 text-sm font-medium transition-all ${
                filterLogic === 'AND'
                  ? 'bg-primary-500/10 text-primary-500 border-primary-500/40'
                  : ''
              }`}
              style={filterLogic !== 'AND' ? { color: 'rgb(var(--color-text-muted))' } : undefined}
            >
              {isEn ? 'All (AND)' : 'Tous (ET)'}
            </button>
            <button
              onClick={() => onLogicChange('OR')}
              className={`px-3 py-1.5 text-sm font-medium transition-all ${
                filterLogic === 'OR'
                  ? 'bg-primary-500/10 text-primary-500 border-primary-500/40'
                  : ''
              }`}
              style={filterLogic !== 'OR' ? { color: 'rgb(var(--color-text-muted))' } : undefined}
            >
              {isEn ? 'Any (OR)' : 'Un (OU)'}
            </button>
          </div>
        </div>
      )}

      {/* Filter List */}
      {hasFilters ? (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={filter.id}>
              {index > 0 && (
                <div
                  className="flex items-center gap-2 py-1"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-xs font-medium">
                    {filterLogic === 'AND' ? (isEn ? 'AND' : 'ET') : isEn ? 'OR' : 'OU'}
                  </span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>
              )}
              <FilterRow
                filter={filter}
                sources={sources}
                onUpdate={(updates) => updateFilter(filter.id, updates)}
                onRemove={() => removeFilter(filter.id)}
                isEn={isEn}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-center py-8 rounded-xl border-2 border-dashed"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Filter
            className="w-10 h-10 mx-auto mb-2 opacity-30"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn
              ? 'Add filters to narrow down your data'
              : 'Ajoutez des filtres pour affiner vos données'}
          </p>
        </div>
      )}
    </div>
  );
}

export default FilterBuilder;
