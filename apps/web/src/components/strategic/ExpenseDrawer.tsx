/**
 * Expense Drawer Component
 * 
 * Slide-out panel for editing expense details
 */

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Copy, Lock, Unlock } from 'lucide-react';
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

  if (!isOpen) return null;

  const categories = type === 'opex' ? EXPENSE_CATEGORIES.opex : EXPENSE_CATEGORIES.capex;

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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {expense ? (isEn ? 'Edit Expense' : 'Modifier la dépense') : (isEn ? 'New Expense' : 'Nouvelle dépense')}
          </h2>
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
