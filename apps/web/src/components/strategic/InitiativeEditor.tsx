/**
 * Initiative Editor Component
 * 
 * Create and edit strategic initiatives with drag-and-drop date adjustment
 */

import { useState, useRef } from 'react';
import { X, Calendar, DollarSign, GripVertical, Save, Trash2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Initiative, generatePlanningId } from '../../lib/strategicPlanning';

interface InitiativeEditorProps {
  initiative?: Initiative;
  onSave: (initiative: Initiative) => void;
  onCancel: () => void;
  onDelete?: (initiativeId: string) => void;
}

const CATEGORIES: Array<{ value: Initiative['category']; label: string; labelEn: string }> = [
  { value: 'growth', label: 'Croissance', labelEn: 'Growth' },
  { value: 'operations', label: 'Opérations', labelEn: 'Operations' },
  { value: 'product', label: 'Produit', labelEn: 'Product' },
  { value: 'people', label: 'Personnel', labelEn: 'People' },
  { value: 'infrastructure', label: 'Infrastructure', labelEn: 'Infrastructure' },
];

const STATUSES: Array<{ value: Initiative['status']; label: string; labelEn: string }> = [
  { value: 'planned', label: 'Planifié', labelEn: 'Planned' },
  { value: 'in_progress', label: 'En cours', labelEn: 'In Progress' },
  { value: 'completed', label: 'Terminé', labelEn: 'Completed' },
  { value: 'on_hold', label: 'En attente', labelEn: 'On Hold' },
];

export default function InitiativeEditor({
  initiative,
  onSave,
  onCancel,
  onDelete,
}: InitiativeEditorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [name, setName] = useState(initiative?.name || '');
  const [nameEn, setNameEn] = useState(initiative?.nameEn || '');
  const [category, setCategory] = useState<Initiative['category']>(initiative?.category || 'growth');
  const [status, setStatus] = useState<Initiative['status']>(initiative?.status || 'planned');
  const [startDate, setStartDate] = useState(initiative?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initiative?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [impactType, setImpactType] = useState<'one_time' | 'recurring'>(initiative?.cashImpact.type || 'recurring');
  const [impactAmount, setImpactAmount] = useState(initiative?.cashImpact.amount || 0);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>(initiative?.cashImpact.frequency || 'monthly');
  const [confidence, setConfidence] = useState(initiative?.confidence || 75);
  const [description, setDescription] = useState(initiative?.description || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSave = () => {
    const newInitiative: Initiative = {
      id: initiative?.id || generatePlanningId('initiative'),
      name: name || nameEn,
      nameEn: nameEn || name,
      category,
      status,
      startDate,
      endDate,
      cashImpact: {
        type: impactType,
        amount: impactAmount,
        frequency: impactType === 'recurring' ? frequency : undefined,
      },
      milestones: initiative?.milestones || [],
      dependencies: initiative?.dependencies || [],
      confidence,
      description: description || undefined,
    };
    
    onSave(newInitiative);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
      />
      
      <div
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {initiative ? (isEn ? 'Edit Initiative' : 'Modifier l\'initiative') : (isEn ? 'New Initiative' : 'Nouvelle initiative')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1" style={{ 
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Initiative Name' : 'Nom de l\'initiative'} *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={isEn ? nameEn : name}
                onChange={(e) => isEn ? setNameEn(e.target.value) : setName(e.target.value)}
                placeholder={isEn ? 'e.g. Sales Expansion' : 'ex. Expansion des ventes'}
                className="input w-full min-h-[44px] touch-manipulation"
                style={{ backgroundColor: 'rgb(var(--color-bg))' }}
              />
              <input
                type="text"
                value={isEn ? name : nameEn}
                onChange={(e) => isEn ? setName(e.target.value) : setNameEn(e.target.value)}
                placeholder={isEn ? 'French name' : 'Nom anglais'}
                className="input w-full min-h-[44px] touch-manipulation"
                style={{ backgroundColor: 'rgb(var(--color-bg))' }}
              />
            </div>
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Category' : 'Catégorie'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Initiative['category'])}
                className="input w-full min-h-[44px] touch-manipulation"
                style={{ backgroundColor: 'rgb(var(--color-bg))' }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {isEn ? cat.labelEn : cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Status' : 'Statut'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Initiative['status'])}
                className="input w-full min-h-[44px] touch-manipulation"
                style={{ backgroundColor: 'rgb(var(--color-bg))' }}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {isEn ? s.labelEn : s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Start Date' : 'Date de début'} *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full pl-10"
                  style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'End Date' : 'Date de fin'} *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-full pl-10"
                  style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                />
              </div>
            </div>
          </div>

          {/* Cash Impact */}
          <div className="space-y-4 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Cash Impact' : 'Impact sur la trésorerie'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Impact Type' : 'Type d\'impact'}
                </label>
                <select
                  value={impactType}
                  onChange={(e) => setImpactType(e.target.value as 'one_time' | 'recurring')}
                  className="input w-full"
                  style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                >
                  <option value="one_time">{isEn ? 'One-time' : 'Unique'}</option>
                  <option value="recurring">{isEn ? 'Recurring' : 'Récurrent'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Amount' : 'Montant'} *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <input
                    type="number"
                    value={impactAmount}
                    onChange={(e) => setImpactAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="input w-full pl-10"
                    style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Negative = cash outflow, Positive = cash inflow' : 'Négatif = sortie, Positif = entrée'}
                </p>
              </div>
            </div>

            {impactType === 'recurring' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Frequency' : 'Fréquence'}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                  className="input w-full"
                  style={{ backgroundColor: 'rgb(var(--color-bg))' }}
                >
                  <option value="monthly">{isEn ? 'Monthly' : 'Mensuel'}</option>
                  <option value="quarterly">{isEn ? 'Quarterly' : 'Trimestriel'}</option>
                  <option value="annual">{isEn ? 'Annual' : 'Annuel'}</option>
                </select>
              </div>
            )}
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Confidence Level' : 'Niveau de confiance'}: {confidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'rgb(var(--color-primary-500))' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span>{isEn ? 'Low' : 'Faible'}</span>
              <span>{isEn ? 'High' : 'Élevé'}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Description' : 'Description'} (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEn ? 'Additional details...' : 'Détails supplémentaires...'}
              rows={3}
              className="input w-full resize-none"
              style={{ backgroundColor: 'rgb(var(--color-bg))' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {initiative && onDelete && (
            <button
              onClick={() => {
                if (confirm(isEn ? 'Delete this initiative?' : 'Supprimer cette initiative?')) {
                  onDelete(initiative.id);
                }
              }}
              className="px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors touch-manipulation min-h-[44px] order-3 sm:order-1"
              style={{
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
              }}
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              {isEn ? 'Delete' : 'Supprimer'}
            </button>
          )}
          <div className="flex items-center gap-3 order-1 sm:order-2 sm:ml-auto">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px]"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text))',
              }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              onClick={handleSave}
              disabled={!name && !nameEn}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 touch-manipulation min-h-[44px]"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Save className="w-4 h-4 flex-shrink-0" />
              {isEn ? 'Save' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
