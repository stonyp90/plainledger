/**
 * Expense Drawer Component
 * 
 * Slide-out panel for editing expense details with quick templates
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Copy, Lock, Unlock, Zap, Users, Laptop, Building2, Truck, TrendingDown } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense, generatePlanningId } from '../../lib/strategicPlanning';

interface ExpenseDrawerProps {
  expense?: PlannedExpense;
  isOpen: boolean;
  onSave: (expense: PlannedExpense) => void;
  onCancel: () => void;
  onDelete?: (expenseId: string) => void;
  onDuplicate?: (expense: PlannedExpense) => void;
}

// Quick templates for common expenses
const QUICK_TEMPLATES = [
  {
    id: 'hire',
    icon: Users,
    name: 'Nouvelle embauche',
    nameEn: 'New Hire',
    type: 'opex' as const,
    category: 'salaries',
    amount: 6500,
    frequency: 'monthly' as const,
    color: '#3B82F6',
  },
  {
    id: 'software',
    icon: Laptop,
    name: 'Abonnement SaaS',
    nameEn: 'SaaS Subscription',
    type: 'opex' as const,
    category: 'software',
    amount: 500,
    frequency: 'monthly' as const,
    color: '#8B5CF6',
  },
  {
    id: 'office',
    icon: Building2,
    name: 'Bureaux / Loyer',
    nameEn: 'Office / Rent',
    type: 'opex' as const,
    category: 'rent',
    amount: 8000,
    frequency: 'monthly' as const,
    color: '#EC4899',
  },
  {
    id: 'equipment',
    icon: Truck,
    name: 'Équipement',
    nameEn: 'Equipment',
    type: 'capex' as const,
    category: 'equipment',
    amount: 25000,
    frequency: 'one_time' as const,
    color: '#F59E0B',
  },
];

const EXPENSE_CATEGORIES = {
  opex: [
    { value: 'salaries', label: 'Salaires', labelEn: 'Salaries' },
    { value: 'rent', label: 'Loyer', labelEn: 'Rent' },
    { value: 'marketing', label: 'Marketing', labelEn: 'Marketing' },
    { value: 'software', label: 'Logiciels', labelEn: 'Software' },
    { value: 'utilities', label: 'Services publics', labelEn: 'Utilities' },
    { value: 'operations', label: 'Opérations', labelEn: 'Operations' },
    { value: 'other', label: 'Autre', labelEn: 'Other' },
  ],
  capex: [
    { value: 'equipment', label: 'Équipement', labelEn: 'Equipment' },
    { value: 'property', label: 'Immobilier', labelEn: 'Property' },
    { value: 'vehicles', label: 'Véhicules', labelEn: 'Vehicles' },
    { value: 'infrastructure', label: 'Infrastructure', labelEn: 'Infrastructure' },
    { value: 'other', label: 'Autre', labelEn: 'Other' },
  ],
};

const FREQUENCIES: Array<{ value: PlannedExpense['frequency']; label: string; labelEn: string }> = [
  { value: 'one_time', label: 'Unique', labelEn: 'One-time' },
  { value: 'monthly', label: 'Mensuel', labelEn: 'Monthly' },
  { value: 'quarterly', label: 'Trimestriel', labelEn: 'Quarterly' },
  { value: 'annual', label: 'Annuel', labelEn: 'Annual' },
];

export default function ExpenseDrawer({
  expense,
  isOpen,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
}: ExpenseDrawerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<'opex' | 'capex'>('opex');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<PlannedExpense['frequency']>('monthly');
  const [isLocked, setIsLocked] = useState(false);
  const [confidence, setConfidence] = useState(75);
  const [notes, setNotes] = useState('');

  // Update form when expense changes
  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setNameEn(expense.nameEn);
      setType(expense.type);
      setCategory(expense.category);
      setStartDate(expense.startDate);
      setEndDate(expense.endDate);
      setAmount(expense.amount);
      setFrequency(expense.frequency);
      setIsLocked(expense.isLocked);
      setConfidence(expense.confidence);
      setNotes(expense.notes || '');
    } else {
      // Reset to defaults
      setName('');
      setNameEn('');
      setType('opex');
      setCategory('operations');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setAmount(5000);
      setFrequency('monthly');
      setIsLocked(false);
      setConfidence(75);
      setNotes('');
    }
  }, [expense]);

  // Update frequency when type changes
  useEffect(() => {
    if (type === 'capex') {
      setFrequency('one_time');
    } else if (frequency === 'one_time') {
      setFrequency('monthly');
    }
  }, [type, frequency]);

  const handleSave = () => {
    const newExpense: PlannedExpense = {
      id: expense?.id || generatePlanningId('expense'),
      name: name || nameEn,
      nameEn: nameEn || name,
      type,
      category,
      startDate,
      endDate,
      amount,
      frequency,
      isLocked,
      confidence,
      notes: notes || undefined,
    };
    
    onSave(newExpense);
  };

  const handleDuplicate = () => {
    if (!expense) return;
    const duplicated: PlannedExpense = {
      ...expense,
      id: generatePlanningId('expense'),
      name: `${expense.name} (copie)`,
      nameEn: `${expense.nameEn} (copy)`,
    };
    onDuplicate?.(duplicated);
  };

  // Calculate 12-month impact
  const yearlyImpact = useMemo(() => {
    if (frequency === 'one_time') return amount;
    if (frequency === 'monthly') return amount * 12;
    if (frequency === 'quarterly') return amount * 4;
    if (frequency === 'annual') return amount;
    return 0;
  }, [amount, frequency]);

  // Apply template
  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setName(template.name);
    setNameEn(template.nameEn);
    setType(template.type);
    setCategory(template.category);
    setAmount(template.amount);
    setFrequency(template.frequency);
    
    const today = new Date();
    today.setDate(1);
    setStartDate(today.toISOString().split('T')[0]);
    
    const end = new Date(today);
    if (template.type === 'opex') {
      end.setMonth(end.getMonth() + 12);
    } else {
      end.setDate(end.getDate() + 1);
    }
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  const categories = type === 'opex' ? EXPENSE_CATEGORIES.opex : EXPENSE_CATEGORIES.capex;
  const isNewExpense = !expense;

  return (
    <div 
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 2000 }}
    >
      <div
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(4px)',
          zIndex: 2001,
        }}
        onClick={onCancel}
      />
      
      <div
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 2002,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {expense ? (isEn ? 'Edit Expense' : 'Modifier la dépense') : (isEn ? 'Add Expense' : 'Ajouter une dépense')}
            </h2>
            {amount > 0 && (
              <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <TrendingDown className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                {isEn ? '12-month impact:' : 'Impact sur 12 mois:'}{' '}
                <span className="font-semibold" style={{ color: '#EF4444' }}>
                  -${yearlyImpact.toLocaleString()}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {expense && onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Duplicate' : 'Dupliquer'}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quick Templates - Only for new expenses */}
          {isNewExpense && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <label className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Quick Templates' : 'Modèles rapides'}
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ 
                        backgroundColor: `${template.color}10`,
                        border: `1px solid ${template.color}30`,
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${template.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: template.color }} />
                      </div>
                      <span className="text-xs font-medium text-center" style={{ color: template.color }}>
                        {isEn ? template.nameEn : template.name}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        ${template.amount.toLocaleString()}{template.frequency === 'monthly' ? '/mo' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Name' : 'Nom'} *
            </label>
            <input
              type="text"
              value={isEn ? nameEn : name}
              onChange={(e) => {
                if (isEn) {
                  setNameEn(e.target.value);
                } else {
                  setName(e.target.value);
                }
              }}
              placeholder={isEn ? 'Expense name...' : 'Nom de la dépense...'}
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Type' : 'Type'} *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('opex')}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: type === 'opex' ? '#3B82F6' : 'rgb(var(--color-bg-muted))',
                  color: type === 'opex' ? 'white' : 'rgb(var(--color-text))',
                }}
              >
                {isEn ? 'OPEX' : 'OpEx'}
              </button>
              <button
                onClick={() => setType('capex')}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: type === 'capex' ? '#F59E0B' : 'rgb(var(--color-bg-muted))',
                  color: type === 'capex' ? 'white' : 'rgb(var(--color-text))',
                }}
              >
                {isEn ? 'CAPEX' : 'CapEx'}
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Category' : 'Catégorie'} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {isEn ? cat.labelEn : cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Amount' : 'Montant'} *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {frequency === 'one_time' 
                ? (isEn ? 'Total amount for this expense' : 'Montant total pour cette dépense')
                : (isEn ? `Amount per ${frequency}` : `Montant par ${frequency === 'monthly' ? 'mois' : frequency === 'quarterly' ? 'trimestre' : 'année'}`)
              }
            </p>
          </div>

          {/* Frequency (only for OPEX) */}
          {type === 'opex' && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Frequency' : 'Fréquence'} *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PlannedExpense['frequency'])}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {FREQUENCIES.filter(f => f.value !== 'one_time').map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {isEn ? freq.labelEn : freq.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Start Date' : 'Date de début'} *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'End Date' : 'Date de fin'} *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Confidence' : 'Confiance'}
              </label>
              <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-primary-500))' }}>
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-500)) ${confidence}%, rgb(var(--color-border)) ${confidence}%, rgb(var(--color-border)) 100%)`,
              }}
            />
          </div>

          {/* Locked */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <div>
              <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Locked (Committed)' : 'Verrouillé (Engagé)'}
              </label>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Prevents moving or resizing' : 'Empêche le déplacement ou le redimensionnement'}
              </p>
            </div>
            <button
              onClick={() => setIsLocked(!isLocked)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isLocked ? 'rgb(var(--color-primary-500))' : 'transparent',
                color: isLocked ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Notes' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Additional notes...' : 'Notes supplémentaires...'}
              rows={3}
              className="w-full px-4 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t gap-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {expense && onDelete && (
            <button
              onClick={() => {
                if (window.confirm(isEn ? 'Delete this expense?' : 'Supprimer cette dépense ?')) {
                  onDelete(expense.id);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'rgb(var(--color-error))' }}
            >
              <Trash2 className="w-4 h-4" />
              {isEn ? 'Delete' : 'Supprimer'}
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              onClick={handleSave}
              disabled={!name && !nameEn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Save className="w-4 h-4" />
              {isEn ? 'Save' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
