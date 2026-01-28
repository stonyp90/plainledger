/**
 * Assumption Panel Component
 * 
 * Edit planning assumptions with drag-and-drop reordering
 */

import { useState, useRef } from 'react';
import { Plus, GripVertical, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Assumption, generatePlanningId } from '../../lib/strategicPlanning';

interface AssumptionPanelProps {
  assumptions: Assumption[];
  onUpdate: (assumptions: Assumption[]) => void;
}

const CATEGORIES: Array<{ value: Assumption['category']; label: string; labelEn: string }> = [
  { value: 'revenue', label: 'Revenus', labelEn: 'Revenue' },
  { value: 'expense', label: 'Dépenses', labelEn: 'Expense' },
  { value: 'funding', label: 'Financement', labelEn: 'Funding' },
  { value: 'timing', label: 'Calendrier', labelEn: 'Timing' },
];

const UNITS: Array<{ value: Assumption['unit']; label: string; labelEn: string }> = [
  { value: 'currency', label: 'Devise', labelEn: 'Currency' },
  { value: 'percentage', label: 'Pourcentage', labelEn: 'Percentage' },
  { value: 'months', label: 'Mois', labelEn: 'Months' },
  { value: 'number', label: 'Nombre', labelEn: 'Number' },
];

export default function AssumptionPanel({
  assumptions,
  onUpdate,
}: AssumptionPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, assumptionId: string, index: number) => {
    setDraggedId(assumptionId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedId) return;

    const draggedIndex = assumptions.findIndex(a => a.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedId(null);
      setDragOverIndex(null);
      return;
    }

    const newAssumptions = [...assumptions];
    const [removed] = newAssumptions.splice(draggedIndex, 1);
    newAssumptions.splice(dropIndex, 0, removed);
    
    onUpdate(newAssumptions);
    setDraggedId(null);
    setDragOverIndex(null);
  };

  const handleAdd = () => {
    const newAssumption: Assumption = {
      id: generatePlanningId('assumption'),
      category: 'revenue',
      name: 'Nouvelle hypothèse',
      nameEn: 'New Assumption',
      baseValue: 0,
      scenarioValue: 0,
      unit: 'currency',
    };
    onUpdate([...assumptions, newAssumption]);
    setEditingId(newAssumption.id);
  };

  const handleUpdate = (id: string, updates: Partial<Assumption>) => {
    onUpdate(assumptions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDelete = (id: string) => {
    if (confirm(isEn ? 'Delete this assumption?' : 'Supprimer cette hypothèse?')) {
      onUpdate(assumptions.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Planning Assumptions' : 'Hypothèses de planification'}
        </h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'rgb(var(--color-primary-500))',
            color: 'white',
          }}
        >
          <Plus className="w-4 h-4" />
          {isEn ? 'Add' : 'Ajouter'}
        </button>
      </div>

      <div className="space-y-2">
        {assumptions.map((assumption, index) => {
          const isDragged = draggedId === assumption.id;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={assumption.id}
              draggable
              onDragStart={(e) => handleDragStart(e, assumption.id, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`card p-4 cursor-move transition-all ${
                isDragged ? 'opacity-50 scale-95' : ''
              } ${
                isDragOver ? 'ring-2 ring-primary-500 scale-105' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div className="pt-1 flex-shrink-0">
                  <GripVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <select
                      value={assumption.category}
                      onChange={(e) => handleUpdate(assumption.id, { category: e.target.value as Assumption['category'] })}
                      className="px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {isEn ? cat.labelEn : cat.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={isEn ? assumption.nameEn : assumption.name}
                      onChange={(e) => handleUpdate(assumption.id, isEn ? { nameEn: e.target.value } : { name: e.target.value })}
                      placeholder={isEn ? 'Assumption name' : 'Nom de l\'hypothèse'}
                      className="flex-1 px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                    />
                    <select
                      value={assumption.unit}
                      onChange={(e) => handleUpdate(assumption.id, { unit: e.target.value as Assumption['unit'] })}
                      className="px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      {UNITS.map(unit => (
                        <option key={unit.value} value={unit.value}>
                          {isEn ? unit.labelEn : unit.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(assumption.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-error) / 0.1)',
                        color: 'rgb(var(--color-error))',
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Values */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Base Value' : 'Valeur de base'}
                      </label>
                      <input
                        type="number"
                        value={assumption.baseValue}
                        onChange={(e) => handleUpdate(assumption.id, { baseValue: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded text-sm"
                        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Scenario Value' : 'Valeur scénario'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={assumption.scenarioValue}
                          onChange={(e) => handleUpdate(assumption.id, { scenarioValue: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded text-sm"
                          style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                        />
                        {assumption.scenarioValue !== assumption.baseValue && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {assumption.scenarioValue > assumption.baseValue ? (
                              <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                            ) : (
                              <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--color-error))' }} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variance */}
                  {assumption.baseValue !== 0 && (
                    <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Variance' : 'Écart'}:{' '}
                      <span style={{
                        color: assumption.scenarioValue > assumption.baseValue
                          ? 'rgb(var(--color-success))'
                          : 'rgb(var(--color-error))',
                      }}>
                        {((assumption.scenarioValue - assumption.baseValue) / Math.abs(assumption.baseValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {assumptions.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'No assumptions yet. Click "Add" to create one.' : 'Aucune hypothèse. Cliquez sur "Ajouter" pour en créer une.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
