/**
 * Strategic Planning Page (Strategix)
 * 
 * Executive-focused expense planning tool for cash runway forecasting
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Target, Calendar, ArrowRight, Crown, Check, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import {
  Scenario,
  PlannedExpense,
  calculateRunwayFromExpenses,
  initiativeToExpense,
  expenseToInitiative,
  createBaseScenario,
} from '../lib/strategicPlanning';
import {
  createOptimisticScenario,
  createPessimisticScenario,
} from '../lib/scenarioEngine';
import QuickMetrics from '../components/strategic/QuickMetrics';
import LiveCashChart from '../components/strategic/LiveCashChart';
import ExpenseDrawer from '../components/strategic/ExpenseDrawer';
import PremiumFeatureGate, { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';

const STORAGE_KEY = 'plainledger-strategic-planning';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function StrategicPlanning() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, isLoading: dataLoading } = useFinancialData();
  const { currentTenant } = useTenant();
  const { hasAccess } = usePremiumFeature('strategicPlanning');
  

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [showExpenseDrawer, setShowExpenseDrawer] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannedExpense | null>(null);

  // Demo financial data for when no real data is available
  const DEMO_FINANCIAL = {
    currentCash: 850000,
    monthlyRevenue: 120000,
    monthlyExpenses: 145000,
  };

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setScenarios(data.scenarios || []);
        setActiveScenarioId(data.activeScenarioId || null);
        
        // Convert initiatives to expenses
        const activeScenario = data.scenarios?.find((s: Scenario) => s.id === data.activeScenarioId);
        if (activeScenario?.initiatives) {
          const convertedExpenses = activeScenario.initiatives.map(initiativeToExpense);
          setExpenses(convertedExpenses);
        }
      }
    } catch (error) {
      console.error('Failed to load strategic planning data:', error);
    }
  }, []);

  // Initialize with base scenario if none exists
  useEffect(() => {
    if (scenarios.length === 0 && !dataLoading) {
      const hasRealData = financialData && (
        financialData.summary?.cashBalance > 0 ||
        financialData.metrics?.revenue > 0 ||
        financialData.metrics?.expenses > 0
      );
      
      const cashToUse = hasRealData ? (financialData.summary?.cashBalance || 0) : DEMO_FINANCIAL.currentCash;
      const revenueToUse = hasRealData ? (financialData.metrics?.revenue || 0) : DEMO_FINANCIAL.monthlyRevenue;
      const expensesToUse = hasRealData ? (financialData.metrics?.expenses || 0) : DEMO_FINANCIAL.monthlyExpenses;
      
      const base = createBaseScenario(cashToUse, revenueToUse, expensesToUse);
      const optimistic = createOptimisticScenario(base);
      const pessimistic = createPessimisticScenario(base);
      
      const newScenarios = [base, optimistic, pessimistic];
      setScenarios(newScenarios);
      setActiveScenarioId(base.id);
      setExpenses([]);
      saveToStorage(newScenarios, base.id, []);
    }
  }, [scenarios.length, financialData, dataLoading]);

  // Compute active scenario
  const activeScenario = useMemo(() => {
    return scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  // Sync expenses when active scenario changes
  useEffect(() => {
    if (activeScenarioId && activeScenario) {
      const convertedExpenses = activeScenario.initiatives.map(initiativeToExpense);
      setExpenses(convertedExpenses);
    }
  }, [activeScenarioId, activeScenario]);

  const saveToStorage = useCallback((scenariosToSave: Scenario[], activeId: string | null, expensesToSave: PlannedExpense[]) => {
    try {
      // Convert expenses back to initiatives for storage
      const activeScenario = scenariosToSave.find(s => s.id === activeId);
      if (activeScenario) {
        const updatedScenario = {
          ...activeScenario,
          initiatives: expensesToSave.map(expenseToInitiative),
          updatedAt: new Date().toISOString(),
        };
        const updatedScenarios = scenariosToSave.map(s => s.id === activeId ? updatedScenario : s);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          scenarios: updatedScenarios,
          activeScenarioId: activeId,
        }));
      } else {
        // If no active scenario found, just save scenarios as-is
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          scenarios: scenariosToSave,
          activeScenarioId: activeId,
        }));
      }
    } catch (error) {
      console.error('Failed to save strategic planning data:', error);
    }
  }, []);

  const hasRealData = financialData && (
    financialData.summary?.cashBalance > 0 ||
    financialData.metrics?.revenue > 0
  );
  const currentCash = hasRealData ? (financialData.summary?.cashBalance || 0) : DEMO_FINANCIAL.currentCash;
  const currentDate = new Date();
  
  // Get base revenue from assumptions
  const baseRevenue = useMemo(() => {
    if (!activeScenario || !activeScenario.assumptions) return 0;
    const revenueAssumption = activeScenario.assumptions.find(a => 
      a.category === 'revenue' && (a.nameEn === 'Monthly Revenue' || a.name === 'Revenus mensuels')
    );
    return revenueAssumption?.scenarioValue || 0;
  }, [activeScenario]);

  // Calculate runway from expenses (or base assumptions if no expenses)
  const runwayData = useMemo(() => {
    if (!activeScenario) {
      // Default values if no scenario
      return {
        runwayMonths: Infinity,
        zeroDate: new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        monthlyBurnRate: 0,
        projectedCashByMonth: [],
      };
    }

    if (expenses.length > 0) {
      return calculateRunwayFromExpenses(currentCash, currentDate, expenses, baseRevenue, 24);
    }
    
    // If no expenses, calculate from base assumptions
    const baseExpenses = activeScenario.assumptions?.find(a => 
      a.category === 'expense' && (a.nameEn === 'Monthly Expenses' || a.name === 'Dépenses mensuelles')
    )?.scenarioValue || 0;
    
    const monthlyBurnRate = baseExpenses - baseRevenue;
    const runwayMonths = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : Infinity;
    const zeroDate = monthlyBurnRate > 0 
      ? new Date(currentDate.getTime() + runwayMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    // Generate projected cash by month
    const projectedCashByMonth = [];
    let runningCash = currentCash;
    for (let i = 0; i < 24; i++) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(monthDate.getMonth() + i);
      runningCash += baseRevenue - baseExpenses;
      projectedCashByMonth.push({
        date: monthDate.toISOString(),
        cash: Math.max(0, runningCash),
        burn: baseExpenses - baseRevenue,
      });
      if (runningCash <= 0 && i > 0) break;
    }
    
    return {
      runwayMonths,
      zeroDate,
      monthlyBurnRate: Math.abs(monthlyBurnRate),
      projectedCashByMonth,
    };
  }, [currentCash, currentDate, expenses, baseRevenue, activeScenario]);

  // Handle expense updates
  const handleExpenseUpdate = useCallback((expense: PlannedExpense) => {
    const updated = expenses.map(e => e.id === expense.id ? expense : e);
    setExpenses(updated);
    saveToStorage(scenarios, activeScenarioId, updated);
  }, [expenses, scenarios, activeScenarioId, saveToStorage]);

  const handleExpenseAdd = useCallback((expense: PlannedExpense) => {
    const updated = [...expenses, expense];
    setExpenses(updated);
    saveToStorage(scenarios, activeScenarioId, updated);
    setEditingExpense(expense);
    setShowExpenseDrawer(true);
  }, [expenses, scenarios, activeScenarioId, saveToStorage]);

  const handleExpenseDelete = useCallback((expenseId: string) => {
    const updated = expenses.filter(e => e.id !== expenseId);
    setExpenses(updated);
    saveToStorage(scenarios, activeScenarioId, updated);
    setShowExpenseDrawer(false);
    setEditingExpense(null);
  }, [expenses, scenarios, activeScenarioId, saveToStorage]);

  const handleExpenseDuplicate = useCallback((expense: PlannedExpense) => {
    const duplicated = {
      ...expense,
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${expense.name} (copie)`,
      nameEn: `${expense.nameEn} (copy)`,
    };
    handleExpenseAdd(duplicated);
  }, [handleExpenseAdd]);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p className="text-muted">{isEn ? 'Loading...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }


  // Show loading while scenarios are being initialized
  if (dataLoading || (!activeScenario && scenarios.length === 0)) {
    return (
      <div className="card p-8 text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <h3 className="font-semibold text-lg mb-2" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Initializing...' : 'Initialisation...'}</h3>
        <p className="text-muted mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Setting up expense planning workspace.' : 'Configuration de l\'espace de planification des dépenses.'}
        </p>
      </div>
    );
  }

  // If still no activeScenario but we have scenarios, use the first one
  const displayScenario = activeScenario || scenarios[0];
  if (!displayScenario) {
    return (
      <div className="card p-8 text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="text-muted" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'No scenario available' : 'Aucun scénario disponible'}</p>
      </div>
    );
  }

  // Ensure we have runwayData
  if (!runwayData) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <h3 className="font-semibold text-lg mb-2">{isEn ? 'Calculating...' : 'Calcul en cours...'}</h3>
      </div>
    );
  }

  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  // If user doesn't have access, show premium gate with preview
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 
              className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap" 
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <Target className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <span className="whitespace-nowrap">
                {isEn ? 'Strategic Planning' : 'Planification stratégique'}
              </span>
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                  color: 'white',
                }}
              >
                <Crown className="w-3 h-3" />
                PRO
              </span>
            </h1>
            <p 
              className="mt-1 text-sm line-clamp-2 sm:line-clamp-none" 
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Plan your cash runway with confidence. Model expenses, forecast scenarios, and make data-driven decisions for sustainable growth.'
                : 'Planifiez votre trésorerie en toute confiance. Modélisez vos dépenses, prévoyez des scénarios et prenez des décisions éclairées pour une croissance durable.'}
            </p>
          </div>
        </div>

        {/* Premium Upgrade Banner */}
        <PremiumUpgradeBanner feature="strategicPlanning" />
        
        {/* Value Proposition Card */}
        <div 
          className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {/* Gold accent stripe at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ 
              background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
            }}
          />
          
          {/* Background decoration */}
          <div 
            className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgb(var(--color-accent-500)) 0%, transparent 70%)',
            }}
          />
          
          <div className="relative flex flex-col lg:flex-row items-start gap-6">
            {/* Left: Value Props */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                    boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.25)',
                  }}
                >
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn 
                      ? 'Unlock Strategic Planning' 
                      : 'Débloquez la planification stratégique'}
                  </h2>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Model scenarios and forecast your cash runway' : 'Modélisez des scénarios et prévoyez votre trésorerie'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {[
                  { en: 'Scenario modeling', fr: 'Modélisation de scénarios' },
                  { en: 'Cash flow forecasting', fr: 'Prévision trésorerie' },
                  { en: 'Budget planning', fr: 'Planification budget' },
                  { en: 'Runway visualization', fr: 'Visualisation de la trésorerie' },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {isEn ? item.en : item.fr}
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleUpgradeClick}
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)',
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                {isEn ? 'Schedule Demo' : 'Planifier une démo'}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            
            {/* Right: Runway Chart Preview */}
            <div 
              className="lg:w-64 w-full rounded-xl p-4"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Cash Runway Preview' : 'Aperçu de la trésorerie'}
                </span>
              </div>
              
              {/* Chart Preview with Sample Data */}
              <div className="relative rounded-lg p-3 overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                {/* Sample runway data visualization */}
                <div className="flex items-end justify-between gap-1 h-20">
                  {[
                    { month: isEn ? 'Jan' : 'Jan', cash: 850, color: '#10B981' },
                    { month: isEn ? 'Feb' : 'Fév', cash: 825, color: '#10B981' },
                    { month: isEn ? 'Mar' : 'Mar', cash: 800, color: '#10B981' },
                    { month: isEn ? 'Apr' : 'Avr', cash: 775, color: '#10B981' },
                    { month: isEn ? 'May' : 'Mai', cash: 750, color: '#10B981' },
                    { month: isEn ? 'Jun' : 'Jun', cash: 720, color: '#F59E0B' },
                    { month: isEn ? 'Jul' : 'Jul', cash: 690, color: '#F59E0B' },
                    { month: isEn ? 'Aug' : 'Aoû', cash: 655, color: '#F59E0B' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full rounded-t transition-all"
                        style={{ 
                          height: `${(item.cash / 850) * 56}px`,
                          backgroundColor: `${item.color}40`,
                          borderTop: `2px solid ${item.color}`,
                        }}
                      />
                      <span className="text-[7px] mt-1 font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Cash labels */}
                <div className="flex justify-between mt-2 text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>$850K</span>
                  <span>$655K</span>
                </div>
                {/* Runway indicator */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Runway' : 'Piste'}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>
                      8 {isEn ? 'months' : 'mois'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Metrics Preview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Cash Balance */}
          <div 
            className="group relative rounded-xl p-4 overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10" 
              style={{ backgroundColor: '#10B981' }} 
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Cash Balance' : 'Solde de trésorerie'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#10B981' }}>$850K</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                  +12%
                </span>
                <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'vs last month' : 'vs mois dernier'}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Burn */}
          <div 
            className="group relative rounded-xl p-4 overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10" 
              style={{ backgroundColor: '#F59E0B' }} 
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                >
                  <TrendingDown className="w-4 h-4" style={{ color: '#F59E0B' }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Monthly Burn' : 'Brûlage mensuel'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#F59E0B' }}>$25K</span>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  /{isEn ? 'mo' : 'mois'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                  -5%
                </span>
                <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'reduced costs' : 'coûts réduits'}
                </span>
              </div>
            </div>
          </div>

          {/* Runway */}
          <div 
            className="group relative rounded-xl p-4 overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10" 
              style={{ backgroundColor: '#10B981' }} 
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <Target className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Runway' : 'Piste financière'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#10B981' }}>34</span>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'months' : 'mois'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                  ✓ {isEn ? 'Excellent' : 'Excellent'}
                </span>
              </div>
            </div>
          </div>

          {/* Zero Date */}
          <div 
            className="group relative rounded-xl p-4 overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10" 
              style={{ backgroundColor: '#6366F1' }} 
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                >
                  <Calendar className="w-4 h-4" style={{ color: '#6366F1' }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Zero Date' : 'Date zéro'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#6366F1' }}>
                  {isEn ? 'Nov' : 'Nov'}
                </span>
                <span className="text-lg font-semibold" style={{ color: '#6366F1' }}>2028</span>
              </div>
              <div className="mt-2">
                <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? '34 months from now' : 'Dans 34 mois'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Quick Metrics - Top bar style */}
      <QuickMetrics
        cash={currentCash}
        burnRate={runwayData.monthlyBurnRate}
        runwayMonths={runwayData.runwayMonths}
        zeroDate={runwayData.zeroDate}
      />

      {/* Live Cash Chart */}
      <div className="p-4 sm:p-6">
        <LiveCashChart
          currentCash={currentCash}
          currentDate={currentDate}
          expenses={expenses}
          baseRevenue={baseRevenue}
          months={24}
        />
      </div>

      {/* Expense Drawer */}
      <ExpenseDrawer
        expense={editingExpense || undefined}
        isOpen={showExpenseDrawer}
        onSave={(expense) => {
          if (editingExpense) {
            handleExpenseUpdate(expense);
          } else {
            handleExpenseAdd(expense);
          }
          setShowExpenseDrawer(false);
          setEditingExpense(null);
        }}
        onCancel={() => {
          setShowExpenseDrawer(false);
          setEditingExpense(null);
        }}
        onDelete={editingExpense ? handleExpenseDelete : undefined}
        onDuplicate={handleExpenseDuplicate}
      />
    </div>
  );
}
