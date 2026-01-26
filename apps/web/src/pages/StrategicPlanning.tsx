/**
 * Strategic Planning Page
 * 
 * Executive-focused cashflow strategic planning dashboard
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Settings, Save, Download, RefreshCw, Loader2, AlertTriangle, Maximize2, Minimize2, ChevronLeft, ChevronRight, X, LayoutGrid } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import {
  Scenario,
  Initiative,
  Assumption,
  RunwayAnalysis,
  CashForecast,
  calculateRunwayAnalysis,
  calculateCashForecast,
  createBaseScenario,
  generatePlanningId,
} from '../lib/strategicPlanning';
import {
  compareScenarios,
  createOptimisticScenario,
  createPessimisticScenario,
  cloneScenario,
} from '../lib/scenarioEngine';
import GanttChart from '../components/strategic/GanttChart';
import RunwayTimeline from '../components/strategic/RunwayTimeline';
import ScenarioComparison from '../components/strategic/ScenarioComparison';
import BurnRateChart from '../components/strategic/BurnRateChart';
import CashForecastChart from '../components/strategic/CashForecastChart';
import MultiScenarioChart from '../components/strategic/MultiScenarioChart';
import InitiativeEditor from '../components/strategic/InitiativeEditor';
import AssumptionPanel from '../components/strategic/AssumptionPanel';
import AISuggestions from '../components/strategic/AISuggestions';
import JamesChatbot from '../components/strategic/JamesChatbot';
import OKRPanel from '../components/strategic/OKRPanel';
import { OKR } from '../lib/okrTypes';
import { FinancialContext } from '../lib/jamesPrompts';

const STORAGE_KEY = 'plainledger-strategic-planning';

export default function StrategicPlanning() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { currentTenant } = useTenant();
  const { data: financialData, isLoading: dataLoading, refresh } = useFinancialData();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [showInitiativeEditor, setShowInitiativeEditor] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [jamesOpen, setJamesOpen] = useState(false);
  const [okrs, setOKRs] = useState<OKR[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setScenarios(data.scenarios || []);
        setActiveScenarioId(data.activeScenarioId || null);
        setOKRs(data.okrs || []);
      }
    } catch (error) {
      console.error('Failed to load strategic planning data:', error);
    }
  }, []);

  // Demo financial data for when no real data is available
  const DEMO_FINANCIAL = {
    currentCash: 850000,
    monthlyRevenue: 120000,
    monthlyExpenses: 145000,
  };

  // Initialize with base scenario if none exists
  useEffect(() => {
    if (scenarios.length === 0 && !dataLoading) {
      // Use real data if available, otherwise use demo data
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
      saveToStorage(newScenarios, base.id);
    }
  }, [scenarios.length, financialData, dataLoading]);

  const saveToStorage = useCallback((scenariosToSave: Scenario[], activeId: string | null, okrsToSave?: OKR[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scenarios: scenariosToSave,
        activeScenarioId: activeId,
        okrs: okrsToSave !== undefined ? okrsToSave : okrs,
      }));
    } catch (error) {
      console.error('Failed to save strategic planning data:', error);
    }
  }, [okrs]);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  const hasRealData = financialData && (
    financialData.summary?.cashBalance > 0 ||
    financialData.metrics?.revenue > 0
  );
  const currentCash = hasRealData ? (financialData.summary?.cashBalance || 0) : DEMO_FINANCIAL.currentCash;
  const currentDate = new Date();

  // Calculate runway and forecast for active scenario
  const runwayAnalysis = useMemo(() => {
    if (!activeScenario) return null;
    
    const historicalCash = financialData?.trends?.cashBalance?.map((point: any) => ({
      date: point.date,
      cash: point.value,
    })) || [];

    return calculateRunwayAnalysis(
      currentCash,
      currentDate,
      activeScenario.initiatives,
      activeScenario.assumptions,
      historicalCash
    );
  }, [activeScenario, currentCash, currentDate, financialData]);

  const cashForecast = useMemo(() => {
    if (!activeScenario) return null;
    
    return calculateCashForecast(
      currentCash,
      currentDate,
      activeScenario.initiatives,
      activeScenario.assumptions,
      24
    );
  }, [activeScenario, currentCash, currentDate]);

  // Prepare scenario comparison data
  const scenarioComparisonData = useMemo(() => {
    if (scenarios.length === 0) return null;
    
    const historicalCash = financialData?.trends?.cashBalance?.map((point: any) => ({
      date: point.date,
      cash: point.value,
    })) || [];

    return scenarios.map(scenario => ({
      scenario,
      runway: calculateRunwayAnalysis(
        currentCash,
        currentDate,
        scenario.initiatives,
        scenario.assumptions,
        historicalCash
      ),
      forecast: calculateCashForecast(
        currentCash,
        currentDate,
        scenario.initiatives,
        scenario.assumptions,
        24
      ),
    }));
  }, [scenarios, currentCash, currentDate, financialData]);

  // Prepare burn rate data
  const burnRateData = useMemo(() => {
    const historical = financialData?.trends?.cashBalance?.map((point: any, index: number, arr: any[]) => {
      const prevPoint = arr[index - 1];
      const monthlyBurn = prevPoint ? prevPoint.value - point.value : 0;
      return {
        date: point.date,
        grossBurn: financialData.metrics?.expenses || 0,
        netBurn: monthlyBurn,
        revenue: financialData.metrics?.revenue || 0,
        expenses: financialData.metrics?.expenses || 0,
      };
    }) || [];

    const projected = cashForecast?.projected.map(point => ({
      date: point.date,
      grossBurn: point.expenses,
      netBurn: point.expenses - point.revenue,
      revenue: point.revenue,
      expenses: point.expenses,
      isProjected: true,
    })) || [];

    return { historical, projected };
  }, [financialData, cashForecast]);

  // Fullscreen toggle - MUST be before any early returns
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Handle fullscreen change events and keyboard shortcuts - MUST be before any early returns
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Escape to exit fullscreen
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen]);

  const handleSaveScenario = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveToStorage(scenarios, activeScenarioId);
      setIsSaving(false);
    }, 500);
  };

  const handleInitiativeSave = (initiative: Initiative) => {
    const updatedScenarios = scenarios.map(scenario => {
      if (scenario.id === activeScenarioId) {
        const existingIndex = scenario.initiatives.findIndex(i => i.id === initiative.id);
        const updatedInitiatives = existingIndex >= 0
          ? scenario.initiatives.map((i, idx) => idx === existingIndex ? initiative : i)
          : [...scenario.initiatives, initiative];
        
        return {
          ...scenario,
          initiatives: updatedInitiatives,
          updatedAt: new Date().toISOString(),
        };
      }
      return scenario;
    });
    
    setScenarios(updatedScenarios);
    setShowInitiativeEditor(false);
    setEditingInitiative(null);
    saveToStorage(updatedScenarios, activeScenarioId);
  };

  const handleInitiativeDelete = (initiativeId: string) => {
    const updatedScenarios = scenarios.map(scenario => {
      if (scenario.id === activeScenarioId) {
        return {
          ...scenario,
          initiatives: scenario.initiatives.filter(i => i.id !== initiativeId),
          updatedAt: new Date().toISOString(),
        };
      }
      return scenario;
    });
    
    setScenarios(updatedScenarios);
    setShowInitiativeEditor(false);
    setEditingInitiative(null);
    saveToStorage(updatedScenarios, activeScenarioId);
  };

  const handleAssumptionsUpdate = (assumptions: Assumption[]) => {
    const updatedScenarios = scenarios.map(scenario => {
      if (scenario.id === activeScenarioId) {
        return {
          ...scenario,
          assumptions,
          updatedAt: new Date().toISOString(),
        };
      }
      return scenario;
    });
    
    setScenarios(updatedScenarios);
    saveToStorage(updatedScenarios, activeScenarioId);
  };

  const handleScenarioReorder = (scenarioIds: string[]) => {
    const reordered = scenarioIds
      .map(id => scenarios.find(s => s.id === id))
      .filter(Boolean) as Scenario[];
    
    setScenarios(reordered);
    saveToStorage(reordered, activeScenarioId);
  };

  const handleSetBaseScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    saveToStorage(scenarios, scenarioId);
  };

  const handleDuplicateScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const duplicated = cloneScenario(scenario, {
      name: `${scenario.name} (copie)`,
      nameEn: `${scenario.nameEn} (copy)`,
    });
    
    const updated = [...scenarios, duplicated];
    setScenarios(updated);
    saveToStorage(updated, activeScenarioId);
  };

  const handleCreateScenario = () => {
    if (!activeScenario) return;
    
    const newScenario = cloneScenario(activeScenario, {
      name: 'Nouveau scénario',
      nameEn: 'New Scenario',
      type: 'custom',
    });
    
    const updated = [...scenarios, newScenario];
    setScenarios(updated);
    setActiveScenarioId(newScenario.id);
    saveToStorage(updated, newScenario.id);
  };

  // Handle initiatives generated by James AI
  const handleInitiativesGenerated = (initiatives: Initiative[]) => {
    if (!activeScenario) return;
    
    const updatedScenarios = scenarios.map(scenario => {
      if (scenario.id === activeScenarioId) {
        return {
          ...scenario,
          initiatives: [...scenario.initiatives, ...initiatives],
          updatedAt: new Date().toISOString(),
        };
      }
      return scenario;
    });
    
    setScenarios(updatedScenarios);
    saveToStorage(updatedScenarios, activeScenarioId);
    
    // Show initiative editor for the first generated initiative
    if (initiatives.length > 0) {
      setEditingInitiative(initiatives[0]);
      setShowInitiativeEditor(true);
    }
  };

  // Handle OKR generated by James AI
  const handleOKRGenerated = useCallback((okr: OKR) => {
    const newOKRs = [...okrs, okr];
    setOKRs(newOKRs);
    // Save to localStorage
    saveToStorage(scenarios, activeScenarioId, newOKRs);
  }, [okrs, scenarios, activeScenarioId, saveToStorage]);

  // Build financial context for James AI
  // Use demo data when no real financial data is available
  const financialContext: FinancialContext = useMemo(() => {
    // Demo data for development/testing
    const DEMO_DATA = {
      currentCash: 850000,
      monthlyRevenue: 120000,
      monthlyExpenses: 145000,
      runwayMonths: 34,
      burnRate: 25000,
    };

    const actualCash = runwayAnalysis?.currentCash || currentCash;
    const actualRevenue = financialData?.metrics?.revenue || 0;
    const actualExpenses = financialData?.metrics?.expenses || 0;
    const actualBurn = runwayAnalysis?.monthlyBurnRate || 0;

    // Use demo data if all values are 0 (no real data loaded)
    const useDemo = actualCash === 0 && actualRevenue === 0 && actualExpenses === 0;

    if (useDemo) {
      return {
        ...DEMO_DATA,
        zeroDate: new Date(Date.now() + DEMO_DATA.runwayMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    if (!runwayAnalysis) {
      return {
        currentCash: actualCash,
        monthlyRevenue: actualRevenue,
        monthlyExpenses: actualExpenses,
        runwayMonths: Infinity,
        burnRate: 0,
      };
    }

    return {
      currentCash: runwayAnalysis.currentCash,
      monthlyRevenue: actualRevenue,
      monthlyExpenses: actualExpenses,
      runwayMonths: runwayAnalysis.runwayMonths,
      zeroDate: runwayAnalysis.zeroDate,
      burnRate: runwayAnalysis.monthlyBurnRate,
    };
  }, [runwayAnalysis, currentCash, financialData]);

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

  if (!activeScenario || !runwayAnalysis || !cashForecast) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <h3 className="font-semibold text-lg mb-2">{isEn ? 'Initializing...' : 'Initialisation...'}</h3>
        <p className="text-muted mb-4">
          {isEn ? 'Setting up strategic planning workspace.' : 'Configuration de l\'espace de planification stratégique.'}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''
      } ${
        compactMode ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-6'
      }`}
      style={{
        backgroundColor: isFullscreen ? 'rgb(var(--color-bg-subtle))' : 'transparent',
        padding: isFullscreen ? (compactMode ? '1rem' : '1.5rem') : undefined,
      }}
    >
      {/* Enhanced Header with Logo and Controls */}
      <div 
        className={`card p-3 sm:p-4 md:p-6 transition-all ${
          isFullscreen ? 'sticky top-0 z-10 shadow-xl mb-4 sm:mb-6' : ''
        }`}
        style={{
          background: isFullscreen 
            ? 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-800)) 100%)'
            : undefined,
          border: isFullscreen ? 'none' : undefined,
        }}
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Top Row: Logo + Title */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {/* Logo */}
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.4)'
              }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5h16M4 5v14a1 1 0 001 1h14a1 1 0 001-1V5M4 5l2-3h12l2 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9h6M9 13h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 
                className="text-lg sm:text-xl md:text-2xl font-bold truncate" 
                style={{ color: isFullscreen ? 'white' : 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Strategic Planning' : 'Planification stratégique'}
              </h1>
              <p 
                className="text-xs sm:text-sm mt-0.5 line-clamp-1" 
                style={{ color: isFullscreen ? 'rgba(255,255,255,0.8)' : 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Cashflow strategy and runway analysis' : 'Stratégie de trésorerie et analyse de l\'autonomie'}
              </p>
            </div>
          </div>
          
          {/* Bottom Row: Controls - Stack on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            {/* Scenario Selector - Full width on mobile */}
            <select
              value={activeScenarioId || ''}
              onChange={(e) => {
                setActiveScenarioId(e.target.value);
                saveToStorage(scenarios, e.target.value);
              }}
              className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] touch-manipulation"
              style={{
                backgroundColor: isFullscreen ? 'rgba(255,255,255,0.15)' : 'rgb(var(--color-bg-muted))',
                color: isFullscreen ? 'white' : 'rgb(var(--color-text))',
                border: isFullscreen ? '1px solid rgba(255,255,255,0.2)' : 'none',
              }}
            >
              {scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id} style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? scenario.nameEn : scenario.name}
                </option>
              ))}
            </select>
            
            {/* Action Buttons - Flex row on mobile, wrap */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCreateScenario}
                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgb(var(--color-primary-500))',
                  color: 'white',
                  boxShadow: isFullscreen ? 'none' : '0 2px 8px rgb(var(--color-primary-500) / 0.3)',
                }}
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span>{isEn ? 'New' : 'Nouveau'}</span>
              </button>
              
              <button
                onClick={handleSaveScenario}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: isFullscreen ? 'rgba(16, 185, 129, 0.3)' : 'rgb(var(--color-success))',
                  color: 'white',
                  boxShadow: isFullscreen ? 'none' : '0 2px 8px rgb(var(--color-success) / 0.3)',
                }}
              >
                <Save className={`w-4 h-4 flex-shrink-0 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isEn ? 'Save' : 'Enregistrer'}</span>
              </button>

              {/* Compact Mode Toggle - Hide text on mobile */}
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`px-3 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 min-h-[44px] touch-manipulation ${
                  compactMode ? '' : ''
                }`}
                style={{
                  backgroundColor: compactMode 
                    ? (isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgb(var(--color-primary-500) / 0.1)')
                    : (isFullscreen ? 'rgba(255,255,255,0.1)' : 'rgb(var(--color-bg-muted))'),
                  color: isFullscreen ? 'white' : 'rgb(var(--color-text))',
                }}
                title={isEn ? (compactMode ? 'Normal spacing' : 'Compact spacing') : (compactMode ? 'Espacement normal' : 'Espacement compact')}
              >
                <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline">{isEn ? 'Compact' : 'Compact'}</span>
              </button>

              {/* Fullscreen Toggle - Hide text on mobile */}
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgb(var(--color-bg-muted))',
                  color: isFullscreen ? 'white' : 'rgb(var(--color-text))',
                }}
                title={isEn ? (isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F11)') : (isFullscreen ? 'Quitter plein écran (Esc)' : 'Plein écran (F11)')}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 flex-shrink-0" /> : <Maximize2 className="w-4 h-4 flex-shrink-0" />}
                <span className="hidden md:inline">{isEn ? (isFullscreen ? 'Exit' : 'Fullscreen') : (isFullscreen ? 'Quitter' : 'Plein écran')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {runwayAnalysis && (
        <AISuggestions
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          runwayAnalysis={runwayAnalysis}
        />
      )}

      {/* Runway Summary */}
      {runwayAnalysis && (
        <div className={isFullscreen ? 'mb-6' : ''}>
          <RunwayTimeline
            runway={runwayAnalysis}
            milestones={activeScenario.initiatives.flatMap(i => i.milestones)}
            currentDate={currentDate}
          />
        </div>
      )}

      {/* Strategic Initiatives Gantt */}
      <div className={`card transition-all ${
        compactMode 
          ? (isFullscreen ? 'p-4' : 'p-3 sm:p-4')
          : (isFullscreen ? 'p-8' : 'p-3 sm:p-4 md:p-6')
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Strategic Initiatives' : 'Initiatives stratégiques'}
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Drag bars to adjust timelines • Tap to edit' : 'Glisser les barres pour ajuster • Appuyer pour modifier'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingInitiative(null);
              setShowInitiativeEditor(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 min-h-[44px] touch-manipulation"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
              boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)',
            }}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>{isEn ? 'Add Initiative' : 'Ajouter initiative'}</span>
          </button>
        </div>
        
        <div className={isFullscreen ? 'p-4' : ''}>
          <GanttChart
            initiatives={activeScenario.initiatives}
            startDate={new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)}
            endDate={new Date(currentDate.getFullYear(), currentDate.getMonth() + 18, 0)}
            onInitiativeUpdate={handleInitiativeSave}
            onInitiativeAdd={handleInitiativeSave}
            onInitiativeDelete={handleInitiativeDelete}
            onInitiativeClick={(initiative) => {
              setEditingInitiative(initiative);
              setShowInitiativeEditor(true);
            }}
            viewMode="month"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className={`grid grid-cols-1 ${isFullscreen ? 'xl:grid-cols-2' : 'lg:grid-cols-2'} gap-4 sm:gap-6`}>
        {/* Burn Rate Chart */}
        {burnRateData && (
          <div className={isFullscreen ? (compactMode ? 'card p-4' : 'card p-6') : ''}>
            <BurnRateChart
              historical={burnRateData.historical}
              projected={burnRateData.projected}
            />
          </div>
        )}

        {/* Cash Forecast Chart */}
        {cashForecast && (
          <div className={isFullscreen ? (compactMode ? 'card p-4' : 'card p-6') : ''}>
            <CashForecastChart
              forecast={cashForecast}
              currentCash={currentCash}
            />
          </div>
        )}
      </div>

      {/* Multi-Scenario Chart - All scenarios on one chart */}
      {scenarios.length > 1 && (
        <MultiScenarioChart
          scenarios={scenarios}
          currentCash={currentCash}
          currentDate={currentDate}
          months={24}
          activeScenarioId={activeScenarioId}
          onScenarioSelect={(scenario) => setActiveScenarioId(scenario.id)}
        />
      )}

      {/* Detailed Scenario Comparison Table */}
      {scenarioComparisonData && scenarioComparisonData.length > 1 && (
        <div className={isFullscreen ? 'mb-6' : ''}>
          <ScenarioComparison
            scenarios={scenarioComparisonData}
            baseScenarioId={activeScenarioId || ''}
            onSetBase={handleSetBaseScenario}
            onReorder={handleScenarioReorder}
            onDuplicate={handleDuplicateScenario}
            maxScenarios={4}
          />
        </div>
      )}

      {/* Assumptions Panel */}
      <div className={`card transition-all ${
        compactMode 
          ? (isFullscreen ? 'p-4' : 'p-3 sm:p-4')
          : (isFullscreen ? 'p-8' : 'p-4 sm:p-6')
      }`}>
        <AssumptionPanel
          assumptions={activeScenario.assumptions}
          onUpdate={handleAssumptionsUpdate}
        />
      </div>

      {/* OKR Panel */}
      {okrs.length > 0 && (
        <div className={`card transition-all ${
          compactMode 
            ? (isFullscreen ? 'p-4' : 'p-3 sm:p-4')
            : (isFullscreen ? 'p-8' : 'p-4 sm:p-6')
        }`}>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'OKRs' : 'OKR'}
          </h2>
          <OKRPanel
            okrs={okrs}
            initiatives={activeScenario.initiatives}
            onUpdate={(okr) => {
              setOKRs(okrs.map(o => o.id === okr.id ? okr : o));
            }}
            onDelete={(okrId) => {
              setOKRs(okrs.filter(o => o.id !== okrId));
            }}
          />
        </div>
      )}

      {/* Initiative Editor Modal */}
      {showInitiativeEditor && (
        <InitiativeEditor
          initiative={editingInitiative || undefined}
          onSave={handleInitiativeSave}
          onCancel={() => {
            setShowInitiativeEditor(false);
            setEditingInitiative(null);
          }}
          onDelete={editingInitiative ? handleInitiativeDelete : undefined}
        />
      )}

      {/* James AI Chatbot */}
      <JamesChatbot
        isOpen={jamesOpen}
        onClose={() => setJamesOpen(false)}
        onToggle={() => setJamesOpen(!jamesOpen)}
        financialContext={financialContext}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        runwayAnalysis={runwayAnalysis}
        onInitiativesGenerated={handleInitiativesGenerated}
        onOKRGenerated={handleOKRGenerated}
      />
    </div>
  );
}
