/**
 * Formula Library Component - Linear/Notion Style
 * 
 * Features:
 * - AI-powered formula generation
 * - Clean, modern search with proper styling
 * - Keyboard-first navigation
 * - Category filtering
 * - Formula templates
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Star, 
  Trash2, 
  Edit2, 
  X, 
  Save,
  Sparkles,
  Loader2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Percent,
  Calculator,
  Users,
  BarChart3,
  Zap,
  CheckCircle,
  Copy,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { formulaLibrary, type SavedFormula, FORMULA_CATEGORIES } from '../../lib/formulaLibrary';
import { useI18n } from '../../lib/i18n';

interface FormulaLibraryProps {
  onSelectFormula: (formula: string) => void;
  onClose: () => void;
  currentFormula?: string;
}

// Category icons
const CATEGORY_ICONS: Record<string, typeof TrendingUp> = {
  financial: DollarSign,
  metrics: BarChart3,
  operations: Calculator,
  growth: TrendingUp,
  hr: Users,
  revenue: DollarSign,
  expenses: Calculator,
  cashflow: TrendingUp,
  ratios: Percent,
  custom: Zap,
};

// AI prompt examples
const AI_PROMPTS = [
  { text: 'Calculate monthly burn rate', icon: TrendingUp },
  { text: 'Revenue growth percentage', icon: Percent },
  { text: 'Customer acquisition cost', icon: Users },
  { text: 'Gross margin calculation', icon: DollarSign },
];

export default function FormulaLibrary({ onSelectFormula, onClose, currentFormula }: FormulaLibraryProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formulas, setFormulas] = useState(formulaLibrary.getAllFormulas());
  const [isEditing, setIsEditing] = useState(false);
  const [editingFormula, setEditingFormula] = useState<SavedFormula | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<{ formula: string; explanation: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formula: currentFormula || '',
    category: 'custom',
    tags: [] as string[],
    isPublic: true,
  });

  // Filtered formulas - defined first so useEffect can reference it
  const filteredFormulas = useMemo(() => {
    let result = formulas;
    
    if (searchQuery) {
      result = formulaLibrary.searchFormulas(searchQuery);
    } else if (selectedCategory) {
      result = formulaLibrary.getFormulasByCategory(selectedCategory);
    }
    
    return result;
  }, [formulas, searchQuery, selectedCategory]);

  // Handle formula selection - defined before useEffect that uses it
  const handleUseFormula = useCallback((formula: SavedFormula) => {
    formulaLibrary.incrementUsage(formula.id);
    onSelectFormula(formula.formula);
    onClose();
  }, [onSelectFormula, onClose]);

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAIAssistant) {
          setShowAIAssistant(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' && !isEditing) {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredFormulas.length - 1));
      } else if (e.key === 'ArrowUp' && !isEditing) {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && !isEditing && filteredFormulas[selectedIndex]) {
        e.preventDefault();
        handleUseFormula(filteredFormulas[selectedIndex]);
      } else if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, showAIAssistant, selectedIndex, filteredFormulas, onClose, handleUseFormula]);

  const handleSaveFormula = () => {
    if (!formData.name || !formData.formula) return;
    
    if (editingFormula) {
      formulaLibrary.updateFormula(editingFormula.id, formData);
    } else {
      formulaLibrary.saveFormula({
        ...formData,
        createdBy: 'user',
      });
    }
    
    setFormulas(formulaLibrary.getAllFormulas());
    setIsEditing(false);
    setEditingFormula(null);
    resetFormData();
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      formula: currentFormula || '',
      category: 'custom',
      tags: [],
      isPublic: true,
    });
  };

  const handleDeleteFormula = (id: string) => {
    if (window.confirm(isEn ? 'Delete this formula?' : 'Supprimer cette formule?')) {
      formulaLibrary.deleteFormula(id);
      setFormulas(formulaLibrary.getAllFormulas());
    }
  };

  const handleEditFormula = (formula: SavedFormula) => {
    setEditingFormula(formula);
    setFormData({
      name: formula.name,
      description: formula.description || '',
      formula: formula.formula,
      category: formula.category || 'custom',
      tags: formula.tags || [],
      isPublic: formula.isPublic ?? true,
    });
    setIsEditing(true);
    setShowAIAssistant(false);
  };

  const handleCopyFormula = (formula: SavedFormula, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formula.formula);
    setCopiedId(formula.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // AI Formula Generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    setAILoading(true);
    setAISuggestion(null);
    
    // Simulate AI response (in real app, call your AI service)
    await new Promise(r => setTimeout(r, 1500));
    
    const prompt = aiPrompt.toLowerCase();
    let suggestion = { formula: '', explanation: '' };
    
    // Smart formula suggestions based on prompt
    if (prompt.includes('burn') || prompt.includes('runway')) {
      suggestion = {
        formula: 'ROUND(Cash Balance / Monthly Burn, 1)',
        explanation: isEn 
          ? 'Calculates runway in months by dividing available cash by monthly burn rate. Rounded to 1 decimal.'
          : 'Calcule la piste en mois en divisant la trésorerie par le taux de dépenses mensuel.',
      };
    } else if (prompt.includes('growth') || prompt.includes('croissance')) {
      suggestion = {
        formula: '((Current Period - Previous Period) / Previous Period) * 100',
        explanation: isEn
          ? 'Calculates period-over-period growth as a percentage. Replace with your actual driver names.'
          : 'Calcule la croissance période sur période en pourcentage.',
      };
    } else if (prompt.includes('margin') || prompt.includes('marge')) {
      suggestion = {
        formula: 'ROUND((Revenue - COGS) / Revenue * 100, 1)',
        explanation: isEn
          ? 'Gross margin percentage: (Revenue - Cost of Goods Sold) / Revenue × 100'
          : 'Marge brute en pourcentage: (Revenus - Coûts) / Revenus × 100',
      };
    } else if (prompt.includes('cac') || prompt.includes('acquisition')) {
      suggestion = {
        formula: 'Marketing Spend / New Customers',
        explanation: isEn
          ? 'Customer Acquisition Cost: Total marketing spend divided by number of new customers acquired.'
          : 'Coût d\'acquisition client: Dépenses marketing divisées par nouveaux clients.',
      };
    } else if (prompt.includes('ltv') || prompt.includes('lifetime')) {
      suggestion = {
        formula: 'Average Revenue Per User * Average Customer Lifespan',
        explanation: isEn
          ? 'Customer Lifetime Value: Average revenue per user multiplied by average customer lifespan in months/years.'
          : 'Valeur vie client: Revenu moyen par utilisateur × durée de vie moyenne.',
      };
    } else if (prompt.includes('revenue') || prompt.includes('revenu')) {
      suggestion = {
        formula: 'Units Sold * Price Per Unit',
        explanation: isEn
          ? 'Basic revenue calculation: quantity sold times unit price.'
          : 'Calcul de revenu de base: quantité vendue × prix unitaire.',
      };
    } else if (prompt.includes('headcount') || prompt.includes('employee')) {
      suggestion = {
        formula: '((Current Headcount - Previous Headcount) / Previous Headcount) * 100',
        explanation: isEn
          ? 'Headcount growth rate as percentage change from previous period.'
          : 'Taux de croissance des effectifs en pourcentage.',
      };
    } else {
      // Default intelligent suggestion
      suggestion = {
        formula: 'Driver A / Driver B * 100',
        explanation: isEn
          ? 'I created a basic ratio formula. Please specify more details about what you want to calculate.'
          : 'J\'ai créé une formule de ratio de base. Veuillez préciser ce que vous souhaitez calculer.',
      };
    }
    
    setAISuggestion(suggestion);
    setAILoading(false);
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      setFormData(prev => ({
        ...prev,
        formula: aiSuggestion.formula,
        description: aiSuggestion.explanation,
      }));
      setShowAIAssistant(false);
      setIsEditing(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEn ? 'Formula Library' : 'Bibliothèque de formules'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEn ? 'Save and reuse formulas across your organization' : 'Enregistrez et réutilisez des formules'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAIAssistant(true);
                setIsEditing(false);
                setTimeout(() => aiInputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isEn ? 'AI Assistant' : 'Assistant IA'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Categories */}
          <div className="w-52 border-r border-gray-200 overflow-y-auto p-3 bg-gray-50/50">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setIsEditing(true);
                setShowAIAssistant(false);
                setEditingFormula(null);
                resetFormData();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-500 text-white hover:bg-blue-600 shadow-sm mb-3"
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'New Formula' : 'Nouvelle formule'}
            </button>
            
            <div className="text-[11px] font-semibold uppercase text-gray-400 px-3 mb-2 tracking-wider">
              {isEn ? 'Categories' : 'Catégories'}
            </div>
            
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setIsEditing(false);
                  setShowAIAssistant(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  selectedCategory === null && !isEditing && !showAIAssistant
                    ? 'bg-white shadow-sm font-medium text-blue-600' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                {isEn ? 'All Formulas' : 'Toutes'}
              </button>
              
              {Object.entries(FORMULA_CATEGORIES).map(([key, label]) => {
                const Icon = CATEGORY_ICONS[key] || Calculator;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key);
                      setIsEditing(false);
                      setShowAIAssistant(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      selectedCategory === key
                        ? 'bg-white shadow-sm font-medium text-blue-600' 
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isEn ? 'Search formulas... (⌘K)' : 'Rechercher... (⌘K)'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* AI Assistant Panel */}
            {showAIAssistant && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-xl mx-auto">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {isEn ? 'AI Formula Assistant' : 'Assistant de formules IA'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isEn ? 'Describe what you want to calculate and I\'ll create the formula' : 'Décrivez ce que vous voulez calculer'}
                    </p>
                  </div>

                  {/* AI Input */}
                  <div className="relative mb-4">
                    <input
                      ref={aiInputRef}
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAIPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                      placeholder={isEn ? 'e.g., Calculate runway in months...' : 'ex: Calculer la piste en mois...'}
                      className="w-full px-4 py-3 pr-24 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isEn ? 'Generate' : 'Générer'}
                    </button>
                  </div>

                  {/* Quick Prompts */}
                  {!aiSuggestion && (
                    <div className="mb-6">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        {isEn ? 'Try these' : 'Essayez'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {AI_PROMPTS.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setAIPrompt(prompt.text);
                              setTimeout(() => aiInputRef.current?.focus(), 0);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <prompt.icon className="w-3 h-3" />
                            {prompt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestion Result */}
                  {aiSuggestion && (
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-violet-500" />
                        <span className="font-medium text-gray-900">
                          {isEn ? 'Generated Formula' : 'Formule générée'}
                        </span>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 border border-violet-200/50">
                        <code className="text-sm font-mono text-violet-700 block">
                          = {aiSuggestion.formula}
                        </code>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {aiSuggestion.explanation}
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={applyAISuggestion}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {isEn ? 'Use this formula' : 'Utiliser cette formule'}
                        </button>
                        <button
                          onClick={() => {
                            onSelectFormula(aiSuggestion.formula);
                            onClose();
                          }}
                          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
                        >
                          {isEn ? 'Insert directly' : 'Insérer directement'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Formula Editor */}
            {isEditing && !showAIAssistant && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-xl mx-auto space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isEn ? 'Formula Name' : 'Nom'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isEn ? 'e.g., Runway Calculation' : 'ex: Calcul de la piste'}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isEn ? 'Description' : 'Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={isEn ? 'What does this formula calculate?' : 'Que calcule cette formule?'}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">
                        {isEn ? 'Formula' : 'Formule'} <span className="text-red-500">*</span>
                      </label>
                      <button
                        onClick={() => {
                          setShowAIAssistant(true);
                        }}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                      >
                        <Sparkles className="w-3 h-3" />
                        {isEn ? 'Generate with AI' : 'Générer avec IA'}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 font-mono text-sm">=</span>
                      <textarea
                        value={formData.formula}
                        onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                        placeholder={isEn ? 'Cash Balance / Burn' : 'Solde / Dépenses'}
                        rows={3}
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isEn ? 'Category' : 'Catégorie'}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    >
                      {Object.entries(FORMULA_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleSaveFormula}
                      disabled={!formData.name || !formData.formula}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      {editingFormula ? (isEn ? 'Update' : 'Mettre à jour') : (isEn ? 'Save Formula' : 'Enregistrer')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingFormula(null);
                        resetFormData();
                      }}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      {isEn ? 'Cancel' : 'Annuler'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Formula List */}
            {!isEditing && !showAIAssistant && (
              <div className="flex-1 overflow-y-auto p-4">
                {filteredFormulas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                      <Calculator className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">
                      {searchQuery 
                        ? (isEn ? 'No formulas match your search' : 'Aucune formule trouvée')
                        : (isEn ? 'No formulas yet' : 'Aucune formule')}
                    </p>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        resetFormData();
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                    >
                      {isEn ? 'Create your first formula' : 'Créer votre première formule'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFormulas.map((formula, index) => {
                      const Icon = CATEGORY_ICONS[formula.category || 'custom'] || Calculator;
                      const isSelected = index === selectedIndex;
                      
                      return (
                        <div
                          key={formula.id}
                          className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-300 bg-blue-50/50 shadow-sm' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => handleUseFormula(formula)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {formula.name}
                                </h3>
                                {formula.isPublic && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                    {isEn ? 'Shared' : 'Partagé'}
                                  </span>
                                )}
                              </div>
                              
                              {formula.description && (
                                <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                                  {formula.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-3 flex-wrap">
                                <code className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-mono">
                                  = {formula.formula.length > 40 ? formula.formula.slice(0, 40) + '...' : formula.formula}
                                </code>
                                
                                {formula.category && (
                                  <span className="text-xs text-gray-400">
                                    {FORMULA_CATEGORIES[formula.category as keyof typeof FORMULA_CATEGORIES] || formula.category}
                                  </span>
                                )}
                                
                                {formula.usageCount && formula.usageCount > 0 && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formula.usageCount}×
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleCopyFormula(formula, e)}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                title={isEn ? 'Copy' : 'Copier'}
                              >
                                {copiedId === formula.id ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFormula(formula);
                                }}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                title={isEn ? 'Edit' : 'Modifier'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFormula(formula.id);
                                }}
                                className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                title={isEn ? 'Delete' : 'Supprimer'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">↑↓</kbd>
              {isEn ? 'Navigate' : 'Naviguer'}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">Enter</kbd>
              {isEn ? 'Select' : 'Sélectionner'}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">Esc</kbd>
              {isEn ? 'Close' : 'Fermer'}
            </span>
          </div>
          <span>
            {filteredFormulas.length} {isEn ? 'formulas' : 'formules'}
          </span>
        </div>
      </div>
    </div>
  );
}
