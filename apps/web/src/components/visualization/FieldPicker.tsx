/**
 * FieldPicker - Drag-and-drop field selection component
 * 
 * Features:
 * - Drag fields from available to selected
 * - Field type icons
 * - Aggregation selection for measures
 * - Custom aliases
 * - Bilingual labels (EN/FR)
 * - @dnd-kit for accessibility
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  DollarSign,
  Plus,
  X,
  ChevronDown,
  Settings2,
  Palette,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  DataField,
  FieldConfig,
  FieldType,
  AggregationType,
  DataSourceReference,
  getAggregationsForFieldType,
  generateId,
} from '../../lib/visualizationTypes';
import { getDataSource } from '../../lib/goldSchema';

// =====================================================
// FIELD TYPE ICONS
// =====================================================

const FIELD_TYPE_ICONS: Record<FieldType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  STRING: Type,
  NUMBER: Hash,
  CURRENCY: DollarSign,
  DATE: Calendar,
  DATETIME: Calendar,
  BOOLEAN: ToggleLeft,
};

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  STRING: '#60A5FA',   // Blue
  NUMBER: '#34D399',   // Green
  CURRENCY: 'rgb(var(--color-accent-400))', // amber-400 (matches CSS vars)
  DATE: '#A78BFA',     // Purple
  DATETIME: '#A78BFA', // Purple
  BOOLEAN: '#F472B6',  // Pink
};

// =====================================================
// AGGREGATION LABELS
// =====================================================

const AGGREGATION_LABELS: Record<AggregationType, { en: string; fr: string }> = {
  SUM: { en: 'Sum', fr: 'Somme' },
  AVG: { en: 'Average', fr: 'Moyenne' },
  COUNT: { en: 'Count', fr: 'Compte' },
  COUNT_DISTINCT: { en: 'Count Distinct', fr: 'Compte distinct' },
  MIN: { en: 'Minimum', fr: 'Minimum' },
  MAX: { en: 'Maximum', fr: 'Maximum' },
  MEDIAN: { en: 'Median', fr: 'Médiane' },
};

// =====================================================
// DRAGGABLE FIELD ITEM
// =====================================================

interface DraggableFieldProps {
  field: DataField;
  sourceId: string;
  isEn: boolean;
  onAdd: () => void;
  disabled?: boolean;
}

function DraggableField({ field, sourceId, isEn, onAdd, disabled }: DraggableFieldProps) {
  const Icon = FIELD_TYPE_ICONS[field.type];
  const color = FIELD_TYPE_COLORS[field.type];

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5'
        }
      `}
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
      onClick={() => !disabled && onAdd()}
    >
      <div 
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span 
        className="flex-1 text-sm truncate"
        style={{ color: 'rgb(var(--color-text))' }}
      >
        {isEn ? field.nameEn : field.name}
      </span>
      <Plus 
        className="w-4 h-4 flex-shrink-0"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      />
    </div>
  );
}

// =====================================================
// SORTABLE SELECTED FIELD
// =====================================================

interface SortableFieldProps {
  config: FieldConfig;
  field: DataField;
  sourceId: string;
  isEn: boolean;
  onUpdate: (updates: Partial<FieldConfig>) => void;
  onRemove: () => void;
}

function SortableField({ 
  config, 
  field, 
  sourceId, 
  isEn, 
  onUpdate, 
  onRemove 
}: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const [showSettings, setShowSettings] = useState(false);

  const Icon = FIELD_TYPE_ICONS[field.type];
  const color = config.color || FIELD_TYPE_COLORS[field.type];
  const aggregations = getAggregationsForFieldType(field.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-xl border-2 overflow-hidden transition-all
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
      {...attributes}
    >
      {/* Main Row */}
      <div 
        className="flex items-center gap-2 px-3 py-2.5"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: config.enabled 
            ? 'rgb(var(--color-primary-500))' 
            : 'rgb(var(--color-border))',
        }}
      >
        {/* Drag Handle */}
        <button
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-700"
        >
          <GripVertical 
            className="w-4 h-4"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
        </button>

        {/* Field Icon */}
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Field Name & Aggregation */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium truncate"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {config.alias || config.aliasEn || (isEn ? field.nameEn : field.name)}
          </p>
          {config.aggregation && (
            <p 
              className="text-xs"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {AGGREGATION_LABELS[config.aggregation][isEn ? 'en' : 'fr']}
            </p>
          )}
        </div>

        {/* Aggregation Dropdown (for numeric fields) */}
        {aggregations.length > 1 && (
          <div className="relative">
            <select
              value={config.aggregation || ''}
              onChange={(e) => onUpdate({ aggregation: e.target.value as AggregationType || undefined })}
              className="appearance-none pl-2 pr-6 py-1 text-xs rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            >
              <option value="">{isEn ? 'None' : 'Aucune'}</option>
              {aggregations.map(agg => (
                <option key={agg} value={agg}>
                  {AGGREGATION_LABELS[agg][isEn ? 'en' : 'fr']}
                </option>
              ))}
            </select>
            <ChevronDown 
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </div>
        )}

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`
            p-1.5 rounded-lg transition-colors
            ${showSettings ? 'bg-primary-500/20' : 'hover:bg-gray-700'}
          `}
        >
          <Settings2 
            className="w-4 h-4"
            style={{ 
              color: showSettings 
                ? 'rgb(var(--color-primary-500))' 
                : 'rgb(var(--color-text-muted))' 
            }}
          />
        </button>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div 
          className="px-4 py-3 space-y-3 border-t"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          {/* Custom Alias */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Custom Name (FR)' : 'Nom personnalisé (FR)'}
              </label>
              <input
                type="text"
                value={config.alias || ''}
                onChange={(e) => onUpdate({ alias: e.target.value || undefined })}
                placeholder={field.name}
                className="w-full px-2 py-1.5 text-sm rounded-lg border"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Custom Name (EN)' : 'Nom personnalisé (EN)'}
              </label>
              <input
                type="text"
                value={config.aliasEn || ''}
                onChange={(e) => onUpdate({ aliasEn: e.target.value || undefined })}
                placeholder={field.nameEn}
                className="w-full px-2 py-1.5 text-sm rounded-lg border"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>

          {/* Format & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Display Format' : 'Format d\'affichage'}
              </label>
              <select
                value={config.format || ''}
                onChange={(e) => onUpdate({ format: e.target.value as any || undefined })}
                className="w-full px-2 py-1.5 text-sm rounded-lg border"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <option value="">{isEn ? 'Auto' : 'Auto'}</option>
                <option value="currency">{isEn ? 'Currency ($)' : 'Devise ($)'}</option>
                <option value="percentage">{isEn ? 'Percentage (%)' : 'Pourcentage (%)'}</option>
                <option value="number">{isEn ? 'Number' : 'Nombre'}</option>
                <option value="date">{isEn ? 'Date' : 'Date'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Color' : 'Couleur'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.color || FIELD_TYPE_COLORS[field.type]}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <button
                  onClick={() => onUpdate({ color: undefined })}
                  className="text-xs px-2 py-1 rounded border"
                  style={{
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                >
                  {isEn ? 'Reset' : 'Réinitialiser'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN FIELD PICKER COMPONENT
// =====================================================

interface FieldPickerProps {
  sources: DataSourceReference[];
  selectedFields: FieldConfig[];
  onFieldsChange: (fields: FieldConfig[]) => void;
  maxFields?: number;
}

export function FieldPicker({
  sources,
  selectedFields,
  onFieldsChange,
  maxFields = 10,
}: FieldPickerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all available fields from selected sources
  const availableFields = useMemo(() => {
    const fields: { source: string; field: DataField }[] = [];
    sources.forEach(source => {
      const dataSource = getDataSource(source.id);
      if (dataSource) {
        dataSource.fields.forEach(field => {
          // Skip primary keys
          if (!field.isPrimaryKey) {
            fields.push({ source: source.id, field });
          }
        });
      }
    });
    return fields;
  }, [sources]);

  // Filter available fields based on search
  const filteredFields = useMemo(() => {
    if (!searchQuery) return availableFields;
    const query = searchQuery.toLowerCase();
    return availableFields.filter(({ field }) =>
      field.name.toLowerCase().includes(query) ||
      field.nameEn.toLowerCase().includes(query) ||
      field.technicalName.toLowerCase().includes(query)
    );
  }, [availableFields, searchQuery]);

  // Check if a field is already selected
  const isFieldSelected = (sourceId: string, fieldId: string) =>
    selectedFields.some(f => f.sourceId === sourceId && f.fieldId === fieldId);

  // Add a field to selection
  const addField = (sourceId: string, field: DataField) => {
    if (selectedFields.length >= maxFields) return;
    if (isFieldSelected(sourceId, field.id)) return;

    const newConfig: FieldConfig = {
      id: generateId('field'),
      sourceId,
      fieldId: field.id,
      enabled: true,
      aggregation: field.type === 'CURRENCY' || field.type === 'NUMBER' ? 'SUM' : undefined,
    };

    onFieldsChange([...selectedFields, newConfig]);
  };

  // Update a field config
  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    onFieldsChange(
      selectedFields.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  };

  // Remove a field
  const removeField = (id: string) => {
    onFieldsChange(selectedFields.filter(f => f.id !== id));
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = selectedFields.findIndex(f => f.id === active.id);
      const newIndex = selectedFields.findIndex(f => f.id === over.id);
      onFieldsChange(arrayMove(selectedFields, oldIndex, newIndex));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Get field data by config
  const getFieldData = (config: FieldConfig) => {
    const source = getDataSource(config.sourceId);
    return source?.fields.find(f => f.id === config.fieldId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Available Fields Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Available Fields' : 'Champs disponibles'}
          </h4>
          <span 
            className="text-xs px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text-muted))',
            }}
          >
            {filteredFields.length} {isEn ? 'fields' : 'champs'}
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search fields...' : 'Rechercher...'}
          className="w-full px-3 py-2 text-sm rounded-lg border"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />

        {/* Field List */}
        <div 
          className="space-y-1.5 max-h-96 overflow-y-auto pr-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {sources.map(source => {
            const dataSource = getDataSource(source.id);
            if (!dataSource) return null;

            const sourceFields = filteredFields.filter(f => f.source === source.id);
            if (sourceFields.length === 0) return null;

            return (
              <div key={source.id} className="mb-4">
                <div 
                  className="text-xs font-medium mb-2 flex items-center gap-2"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  <span>{dataSource.icon}</span>
                  <span>{isEn ? dataSource.nameEn : dataSource.name}</span>
                </div>
                <div className="space-y-1">
                  {sourceFields.map(({ field }) => (
                    <DraggableField
                      key={`${source.id}-${field.id}`}
                      field={field}
                      sourceId={source.id}
                      isEn={isEn}
                      onAdd={() => addField(source.id, field)}
                      disabled={
                        isFieldSelected(source.id, field.id) ||
                        selectedFields.length >= maxFields
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredFields.length === 0 && (
            <div 
              className="text-center py-8"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {sources.length === 0 
                ? (isEn ? 'Select data sources first' : 'Sélectionnez d\'abord des sources')
                : (isEn ? 'No matching fields' : 'Aucun champ correspondant')}
            </div>
          )}
        </div>
      </div>

      {/* Selected Fields Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Selected Fields' : 'Champs sélectionnés'}
          </h4>
          <span 
            className="text-xs px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: selectedFields.length >= maxFields 
                ? 'rgb(var(--color-warning) / 0.1)'
                : 'rgb(var(--color-primary-500) / 0.1)',
              color: selectedFields.length >= maxFields 
                ? 'rgb(var(--color-warning))'
                : 'rgb(var(--color-primary-500))',
            }}
          >
            {selectedFields.length}/{maxFields}
          </span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedFields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {selectedFields.map(config => {
                const field = getFieldData(config);
                if (!field) return null;

                return (
                  <SortableField
                    key={config.id}
                    config={config}
                    field={field}
                    sourceId={config.sourceId}
                    isEn={isEn}
                    onUpdate={(updates) => updateField(config.id, updates)}
                    onRemove={() => removeField(config.id)}
                  />
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && (() => {
              const config = selectedFields.find(f => f.id === activeId);
              const field = config ? getFieldData(config) : null;
              if (!config || !field) return null;

              return (
                <div 
                  className="p-3 rounded-xl shadow-lg"
                  style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                >
                  <span style={{ color: 'rgb(var(--color-text))' }}>
                    {config.alias || config.aliasEn || (isEn ? field.nameEn : field.name)}
                  </span>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>

        {selectedFields.length === 0 && (
          <div 
            className="text-center py-12 rounded-xl border-2 border-dashed"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <Plus 
              className="w-10 h-10 mx-auto mb-2 opacity-30"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
            <p style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Click fields on the left to add them'
                : 'Cliquez sur les champs à gauche pour les ajouter'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldPicker;
