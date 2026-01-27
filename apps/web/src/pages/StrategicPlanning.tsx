/**
 * Strategic Planning Page (Strategix)
 * 
 * Executive-focused expense planning tool for cash runway forecasting
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Save, Loader2, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
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
  cloneScenario,
} from '../lib/scenarioEngine';
import QuickMetrics from '../components/strategic/QuickMetrics';
import EnterpriseExpenseTimeline from '../components/strategic/EnterpriseExpenseTimeline';
import LiveCashChart from '../components/strategic/LiveCashChart';
import ExpenseDrawer from '../components/strategic/ExpenseDrawer';
import type { ViewMode } from '../components/strategic/EnterpriseTimelineHeader';

const STORAGE_KEY = 'plainledger-strategic-planning';

export default function StrategicPlanning() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, isLoading: dataLoading } = useFinancialData();
  

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [showExpenseDrawer, setShowExpenseDrawer] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannedExpense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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

  const handleBulkDelete = useCallback((expenseIds: string[]) => {
    const updated = expenses.filter(e => !expenseIds.includes(e.id));
    setExpenses(updated);
    saveToStorage(scenarios, activeScenarioId, updated);
    setShowExpenseDrawer(false);
    setEditingExpense(null);
  }, [expenses, scenarios, activeScenarioId, saveToStorage]);

  const handleSaveScenario = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveToStorage(scenarios, activeScenarioId, expenses);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const handleCreateScenario = () => {
    const baseScenario = activeScenario || scenarios[0];
    if (!baseScenario) {
      // Create a new base scenario if none exists
      const cashToUse = currentCash;
      const revenueToUse = baseRevenue;
      const expensesToUse = runwayData.monthlyBurnRate + revenueToUse;
      const newBase = createBaseScenario(cashToUse, revenueToUse, expensesToUse);
      const updated = [newBase];
      setScenarios(updated);
      setActiveScenarioId(newBase.id);
      setExpenses([]);
      saveToStorage(updated, newBase.id, []);
      return;
    }
    
    const newScenario = cloneScenario(baseScenario, {
      name: 'Nouveau scénario',
      nameEn: 'New Scenario',
      type: 'custom',
    });
    
    const updated = [...scenarios, newScenario];
    setScenarios(updated);
    setActiveScenarioId(newScenario.id);
    setExpenses([]);
    saveToStorage(updated, newScenario.id, []);
  };

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

  return (
    <div className="min-h-screen">
      {/* Quick Metrics - Top bar style */}
      <QuickMetrics
        cash={currentCash}
        burnRate={runwayData.monthlyBurnRate}
        runwayMonths={runwayData.runwayMonths}
        zeroDate={runwayData.zeroDate}
      />

      {/* Enterprise Expense Timeline */}
      <div className="p-4 sm:p-6">
        <div className="card p-4 sm:p-6">
          {/* Timeline Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex items-center gap-3">
              {/* Scenario Selector */}
              {scenarios.length > 0 && (
                <div className="relative">
                  <select
                    value={activeScenarioId || scenarios[0]?.id || ''}
                    onChange={(e) => {
                      setActiveScenarioId(e.target.value);
                      const scenario = scenarios.find(s => s.id === e.target.value);
                      if (scenario) {
                        setExpenses((scenario.initiatives || []).map(initiativeToExpense));
                      }
                      saveToStorage(scenarios, e.target.value, expenses);
                    }}
                    className="appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text))',
                      border: '2px solid rgb(var(--color-border))',
                      minWidth: '200px',
                    }}
                  >
                    {scenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {isEn ? scenario.nameEn : scenario.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" 
                    style={{ color: 'rgb(var(--color-text-muted))' }} 
                  />
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* New Scenario */}
              <button
                onClick={handleCreateScenario}
                className="group px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  color: 'white',
                  boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.3)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'New Scenario' : 'Nouveau scénario'}</span>
              </button>
              
              {/* Save Button */}
              <button
                onClick={handleSaveScenario}
                disabled={isSaving}
                className="group px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: saveSuccess 
                    ? 'linear-gradient(135deg, rgb(var(--color-success)) 0%, rgb(16 185 129) 100%)'
                    : 'linear-gradient(135deg, rgb(var(--color-success)) 0%, rgb(34 197 94) 100%)',
                  color: 'white',
                  boxShadow: '0 4px 14px rgb(var(--color-success) / 0.3)',
                }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSaving 
                    ? (isEn ? 'Saving...' : 'Sauvegarde...') 
                    : saveSuccess 
                      ? (isEn ? 'Saved!' : 'Enregistré!')
                      : (isEn ? 'Save' : 'Enregistrer')
                  }
                </span>
              </button>
            </div>
          </div>
          
          <EnterpriseExpenseTimeline
          expenses={expenses}
          startDate={new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)}
          endDate={new Date(currentDate.getFullYear(), currentDate.getMonth() + 18, 0)}
          onExpenseUpdate={handleExpenseUpdate}
          onExpenseClick={(expense) => {
            setEditingExpense(expense);
            setShowExpenseDrawer(true);
          }}
          onExpenseAdd={handleExpenseAdd}
          onExpenseDelete={handleExpenseDelete}
          onExpenseDuplicate={handleExpenseDuplicate}
          onBulkDelete={handleBulkDelete}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        </div>

        {/* Live Cash Chart */}
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
