/**
 * Montage Financier Page
 * 
 * Financial structuring tool for Quebec businesses
 * Supports debt, equity, and grant financing
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, Calendar, DollarSign, TrendingUp, PieChart } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  type FinancingSource,
  type FinancingUse,
  type MontageFinancier,
  FINANCING_TEMPLATES,
  FINANCING_USE_CATEGORIES,
  createFinancingSourceFromTemplate,
  calculateTotalProjectCost,
  calculateTotalFinancing,
  calculateEquityPercentage,
  calculateDebtToEquityRatio,
  calculateTotalMonthlyDebtService,
  generateRepaymentSchedule,
} from '../lib/financing';

const STORAGE_KEY = 'plainledger-montage-financier';

// Color palette
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    page: '#F3F4F6',
  },
  border: {
    default: '#E5E7EB',
    focus: '#3B82F6',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
  },
  accent: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

export default function MontageFinancierPage() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [montage, setMontage] = useState<MontageFinancier | null>(null);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editingUse, setEditingUse] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddUse, setShowAddUse] = useState(false);
  
  // Initialize or load from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMontage(JSON.parse(stored));
      } else {
        const newMontage: MontageFinancier = {
          id: `montage-${Date.now()}`,
          projectName: isEn ? 'New Project' : 'Nouveau projet',
          totalCost: 0,
          sources: [],
          uses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMontage(newMontage);
      }
    } catch (error) {
      console.error('Failed to load montage financier:', error);
    }
  }, [isEn]);
  
  // Auto-save
  useEffect(() => {
    if (montage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(montage));
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
  }, [montage]);
  
  const handleAddSource = useCallback((templateId: string, amount: number) => {
    const template = FINANCING_TEMPLATES.find(t => 
      t.name.en.toLowerCase().replace(/\s+/g, '_') === templateId ||
      t.name.fr.toLowerCase().replace(/\s+/g, '_') === templateId
    );
    
    if (!template || !montage) return;
    
    const newSource = createFinancingSourceFromTemplate(template, amount);
    
    setMontage({
      ...montage,
      sources: [...montage.sources, newSource],
      updatedAt: new Date().toISOString(),
    });
    
    setShowAddSource(false);
  }, [montage]);
  
  const handleAddUse = useCallback((category: string, description: string, amount: number) => {
    if (!montage) return;
    
    const newUse: FinancingUse = {
      id: `use-${Date.now()}`,
      category,
      description,
      amount,
      percentage: 0, // Will be calculated
    };
    
    const totalCost = calculateTotalProjectCost([...montage.uses, newUse]);
    
    const updatedUses = [...montage.uses, newUse].map(use => ({
      ...use,
      percentage: totalCost > 0 ? (use.amount / totalCost) * 100 : 0,
    }));
    
    setMontage({
      ...montage,
      uses: updatedUses,
      totalCost,
      updatedAt: new Date().toISOString(),
    });
    
    setShowAddUse(false);
  }, [montage]);
  
  const handleDeleteSource = useCallback((sourceId: string) => {
    if (!montage) return;
    
    setMontage({
      ...montage,
      sources: montage.sources.filter(s => s.id !== sourceId),
      updatedAt: new Date().toISOString(),
    });
  }, [montage]);
  
  const handleDeleteUse = useCallback((useId: string) => {
    if (!montage) return;
    
    const updatedUses = montage.uses.filter(u => u.id !== useId);
    const totalCost = calculateTotalProjectCost(updatedUses);
    
    const recalculatedUses = updatedUses.map(use => ({
      ...use,
      percentage: totalCost > 0 ? (use.amount / totalCost) * 100 : 0,
    }));
    
    setMontage({
      ...montage,
      uses: recalculatedUses,
      totalCost,
      updatedAt: new Date().toISOString(),
    });
  }, [montage]);
  
  if (!montage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p style={{ color: colors.text.muted }}>
            {isEn ? 'Loading...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }
  
  const totalFinancing = calculateTotalFinancing(montage.sources);
  const equityPct = calculateEquityPercentage(montage.sources, montage.totalCost);
  const debtToEquity = calculateDebtToEquityRatio(montage.sources);
  const monthlyDebtService = calculateTotalMonthlyDebtService(montage.sources);
  const financingGap = montage.totalCost - totalFinancing;
  
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: colors.bg.page,
        padding: '20px',
      }}
    >
      {/* Header */}
      <div 
        className="rounded-lg border mb-4"
        style={{ 
          backgroundColor: colors.bg.base,
          borderColor: colors.border.default,
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-lg font-semibold"
              style={{ color: colors.text.primary }}
            >
              {isEn ? 'Montage Financier' : 'Montage Financier'}
            </h1>
            <p 
              className="text-xs mt-0.5"
              style={{ color: colors.text.muted }}
            >
              {isEn
                ? 'Structure your financing sources and uses'
                : 'Structurez vos sources et utilisations de financement'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sources & Uses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financing Sources */}
          <div 
            className="rounded-lg border"
            style={{ 
              backgroundColor: colors.bg.base,
              borderColor: colors.border.default,
            }}
          >
            <div 
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: colors.border.default }}
            >
              <h2 
                className="text-sm font-semibold"
                style={{ color: colors.text.primary }}
              >
                {isEn ? 'Financing Sources' : 'Sources de financement'}
              </h2>
              <button
                onClick={() => setShowAddSource(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: '#FFFFFF',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? 'Add Source' : 'Ajouter'}
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {montage.sources.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: colors.text.muted }}>
                  {isEn ? 'No financing sources yet' : 'Aucune source de financement'}
                </p>
              ) : (
                montage.sources.map((source) => (
                  <FinancingSourceCard
                    key={source.id}
                    source={source}
                    isEn={isEn}
                    onDelete={() => handleDeleteSource(source.id)}
                  />
                ))
              )}
            </div>
            
            {showAddSource && (
              <AddSourceModal
                isEn={isEn}
                onAdd={handleAddSource}
                onClose={() => setShowAddSource(false)}
              />
            )}
          </div>
          
          {/* Financing Uses */}
          <div 
            className="rounded-lg border"
            style={{ 
              backgroundColor: colors.bg.base,
              borderColor: colors.border.default,
            }}
          >
            <div 
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: colors.border.default }}
            >
              <h2 
                className="text-sm font-semibold"
                style={{ color: colors.text.primary }}
              >
                {isEn ? 'Financing Uses' : 'Utilisations du financement'}
              </h2>
              <button
                onClick={() => setShowAddUse(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: '#FFFFFF',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? 'Add Use' : 'Ajouter'}
              </button>
            </div>
            
            <div className="p-3 space-y-2">
              {montage.uses.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: colors.text.muted }}>
                  {isEn ? 'No uses defined yet' : 'Aucune utilisation définie'}
                </p>
              ) : (
                montage.uses.map((use) => (
                  <FinancingUseCard
                    key={use.id}
                    use={use}
                    isEn={isEn}
                    onDelete={() => handleDeleteUse(use.id)}
                  />
                ))
              )}
            </div>
            
            {showAddUse && (
              <AddUseModal
                isEn={isEn}
                onAdd={handleAddUse}
                onClose={() => setShowAddUse(false)}
              />
            )}
          </div>
        </div>
        
        {/* Right Column - Summary */}
        <div className="space-y-6">
          <SummaryCard
            montage={montage}
            totalFinancing={totalFinancing}
            equityPct={equityPct}
            debtToEquity={debtToEquity}
            monthlyDebtService={monthlyDebtService}
            financingGap={financingGap}
            isEn={isEn}
          />
        </div>
      </div>
    </div>
  );
}

// Financing Source Card Component
function FinancingSourceCard({
  source,
  isEn,
  onDelete,
}: {
  source: FinancingSource;
  isEn: boolean;
  onDelete: () => void;
}) {
  const typeColors = {
    debt: colors.accent.warning,
    equity: colors.accent.success,
    grant: colors.accent.primary,
  };
  
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: colors.bg.muted,
        borderColor: colors.border.default,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="text-xs font-medium px-2 py-1 rounded"
              style={{
                backgroundColor: typeColors[source.type] + '20',
                color: typeColors[source.type],
              }}
            >
              {source.type.toUpperCase()}
            </span>
            <span className="font-semibold text-xs" style={{ color: colors.text.primary }}>
              {isEn ? source.name.en : source.name.fr}
            </span>
          </div>
          <p className="text-xs mb-1.5" style={{ color: colors.text.muted }}>
            {isEn ? source.description.en : source.description.fr}
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: colors.text.secondary }}>
              <DollarSign className="w-4 h-4 inline mr-1" />
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
              }).format(source.amount)}
            </span>
            {source.interestRate && (
              <span style={{ color: colors.text.secondary }}>
                {source.interestRate.toFixed(2)}% APR
              </span>
            )}
            {source.term && (
              <span style={{ color: colors.text.secondary }}>
                {source.term} {isEn ? 'months' : 'mois'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-100 transition-colors"
          title={isEn ? 'Delete' : 'Supprimer'}
        >
          <Trash2 className="w-4 h-4" style={{ color: colors.accent.error }} />
        </button>
      </div>
    </div>
  );
}

// Financing Use Card Component
function FinancingUseCard({
  use,
  isEn,
  onDelete,
}: {
  use: FinancingUse;
  isEn: boolean;
  onDelete: () => void;
}) {
  const category = FINANCING_USE_CATEGORIES.find(c => c.id === use.category);
  
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: colors.bg.muted,
        borderColor: colors.border.default,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-1 rounded" style={{
              backgroundColor: colors.accent.primary + '20',
              color: colors.accent.primary,
            }}>
              {category ? (isEn ? category.name.en : category.name.fr) : use.category}
            </span>
          </div>
          <p className="text-xs mb-1.5" style={{ color: colors.text.primary }}>
            {use.description}
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: colors.text.secondary }}>
              <DollarSign className="w-4 h-4 inline mr-1" />
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
              }).format(use.amount)}
            </span>
            <span style={{ color: colors.text.muted }}>
              {use.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-100 transition-colors"
          title={isEn ? 'Delete' : 'Supprimer'}
        >
          <Trash2 className="w-4 h-4" style={{ color: colors.accent.error }} />
        </button>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  montage,
  totalFinancing,
  equityPct,
  debtToEquity,
  monthlyDebtService,
  financingGap,
  isEn,
}: {
  montage: MontageFinancier;
  totalFinancing: number;
  equityPct: number;
  debtToEquity: number;
  monthlyDebtService: number;
  financingGap: number;
  isEn: boolean;
}) {
  return (
    <div 
      className="rounded-lg border"
      style={{ 
        backgroundColor: colors.bg.base,
        borderColor: colors.border.default,
      }}
    >
      <div 
        className="p-3 border-b"
        style={{ borderColor: colors.border.default }}
      >
        <h2 
          className="text-sm font-semibold"
          style={{ color: colors.text.primary }}
        >
          {isEn ? 'Summary' : 'Résumé'}
        </h2>
      </div>
      
      <div className="p-3 space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              {isEn ? 'Total Project Cost' : 'Coût total du projet'}
            </span>
            <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
              }).format(montage.totalCost)}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              {isEn ? 'Total Financing' : 'Financement total'}
            </span>
            <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
              }).format(totalFinancing)}
            </span>
          </div>
        </div>
        
        {financingGap !== 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: colors.text.secondary }}>
                {isEn ? 'Financing Gap' : 'Écart de financement'}
              </span>
              <span 
                className="text-xs font-semibold"
                style={{ 
                  color: financingGap > 0 ? colors.accent.error : colors.accent.success 
                }}
              >
                {new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  minimumFractionDigits: 0,
                }).format(Math.abs(financingGap))}
                {financingGap > 0 ? ' ⚠️' : ' ✓'}
              </span>
            </div>
          </div>
        )}
        
        <div className="pt-3 border-t" style={{ borderColor: colors.border.default }}>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: colors.text.secondary }}>
                  {isEn ? 'Equity %' : 'Pourcentage fonds propres'}
                </span>
                <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                  {equityPct.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {debtToEquity !== Infinity && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: colors.text.secondary }}>
                    {isEn ? 'Debt-to-Equity' : 'Ratio dette/fonds propres'}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                    {debtToEquity.toFixed(2)}:1
                  </span>
                </div>
              </div>
            )}
            
            {monthlyDebtService > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: colors.text.secondary }}>
                    {isEn ? 'Monthly Debt Service' : 'Service de la dette mensuel'}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                    {new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      minimumFractionDigits: 0,
                    }).format(monthlyDebtService)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Source Modal Component
function AddSourceModal({
  isEn,
  onAdd,
  onClose,
}: {
  isEn: boolean;
  onAdd: (templateId: string, amount: number) => void;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (selectedTemplate && !isNaN(numAmount) && numAmount > 0) {
      onAdd(selectedTemplate, numAmount);
      setSelectedTemplate('');
      setAmount('');
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.bg.base }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
          {isEn ? 'Add Financing Source' : 'Ajouter une source de financement'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
              {isEn ? 'Source Type' : 'Type de source'}
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: colors.border.default }}
            >
              <option value="">{isEn ? 'Select...' : 'Sélectionner...'}</option>
              {FINANCING_TEMPLATES.map((template, idx) => (
                <option key={idx} value={template.name.en.toLowerCase().replace(/\s+/g, '_')}>
                  {isEn ? template.name.en : template.name.fr}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
              {isEn ? 'Amount (CAD)' : 'Montant (CAD)'}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: colors.border.default }}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: colors.accent.primary }}
            disabled={!selectedTemplate || !amount || parseFloat(amount) <= 0}
          >
            {isEn ? 'Add' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Use Modal Component
function AddUseModal({
  isEn,
  onAdd,
  onClose,
}: {
  isEn: boolean;
  onAdd: (category: string, description: string, amount: number) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (category && description && !isNaN(numAmount) && numAmount > 0) {
      onAdd(category, description, numAmount);
      setCategory('');
      setDescription('');
      setAmount('');
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.bg.base }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
          {isEn ? 'Add Financing Use' : 'Ajouter une utilisation'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
              {isEn ? 'Category' : 'Catégorie'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: colors.border.default }}
            >
              <option value="">{isEn ? 'Select...' : 'Sélectionner...'}</option>
              {FINANCING_USE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {isEn ? cat.name.en : cat.name.fr}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
              {isEn ? 'Description' : 'Description'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEn ? 'e.g., Purchase equipment' : 'ex: Achat d\'équipement'}
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: colors.border.default }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
              {isEn ? 'Amount (CAD)' : 'Montant (CAD)'}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: colors.border.default }}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: colors.accent.primary }}
            disabled={!category || !description || !amount || parseFloat(amount) <= 0}
          >
            {isEn ? 'Add' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}
