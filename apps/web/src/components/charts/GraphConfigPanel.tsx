/**
 * Graph Configuration Panel
 * 
 * Allows users to customize graph parameters from both
 * Entrepreneur and CPA perspectives.
 * 
 * Supports:
 * - Per-chart settings (when chartId is provided)
 * - Global user preferences
 * - IBCS is always enforced - only options within IBCS can be customized
 */

import { useState, useEffect } from 'react';
import { Settings2, TrendingUp, FileText, Target, X, Globe, RotateCcw, Info, Check, Calendar } from 'lucide-react';
import { useGraphConfig, saveUserPreferences, saveChartSettings, clearChartSettings } from '../../hooks/useGraphConfig';
import type { GraphConfig, PartialGraphConfig, IBCSConfig, PeriodConfig } from '../../lib/graphConfig';
import { useI18n } from '../../lib/i18n';

interface GraphConfigPanelProps {
  /** Chart ID for per-chart settings. If not provided, shows global settings */
  chartId?: string;
  /** Chart display name */
  chartName?: string;
  currentConfig?: Partial<GraphConfig>;
  onConfigChange?: (config: Partial<GraphConfig>) => void;
  onClose?: () => void;
  /** If true, shows option to save as global preferences */
  showGlobalOption?: boolean;
}

export default function GraphConfigPanel({
  chartId,
  chartName,
  currentConfig,
  onConfigChange,
  onClose,
  showGlobalOption = true,
}: GraphConfigPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const defaultConfig = useGraphConfig(chartId);
  const [activeTab, setActiveTab] = useState<'period' | 'display' | 'entrepreneur' | 'cpa' | 'ibcs'>('period');
  const [config, setConfig] = useState<Partial<GraphConfig>>(currentConfig || {});
  const [saveMode, setSaveMode] = useState<'chart' | 'global'>(chartId ? 'chart' : 'global');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // Sync config state when currentConfig prop changes
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);
  
  const handleConfigUpdate = (updates: Partial<GraphConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
    
    // Save based on mode
    if (chartId && saveMode === 'chart') {
      saveChartSettings(chartId, newConfig);
    } else {
      saveUserPreferences(newConfig);
    }
  };
  
  const handleResetToGlobal = () => {
    if (chartId) {
      clearChartSettings(chartId);
      setConfig({});
      onConfigChange?.({});
    }
  };
  
  const handleSaveAsGlobal = () => {
    saveUserPreferences(config);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };
  
  const effectiveConfig = { ...defaultConfig, ...config };
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        backdropFilter: 'blur(8px)', 
        zIndex: 99999,
        isolation: 'isolate',
      }}
      onClick={(e) => {
        // Close modal when clicking on the overlay (not the modal content)
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-semibold">
                {chartName || (isEn ? 'Chart Settings' : 'Paramètres du graphique')}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {chartId ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Target className="w-3 h-3" />
                    {isEn ? 'Per-chart settings' : 'Paramètres par graphique'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                    <Globe className="w-3 h-3" />
                    {isEn ? 'Global preferences' : 'Préférences globales'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                  <Check className="w-3 h-3" />
                  IBCS {isEn ? 'enforced' : 'appliqué'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                aria-label={isEn ? 'Close' : 'Fermer'}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('period')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all relative ${
              activeTab === 'period'
                ? 'text-primary'
                : 'text-muted hover:text-text hover:bg-surface-hover'
            }`}
            style={activeTab === 'period' ? {
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            } : undefined}
          >
            <Calendar className="w-4 h-4" />
            {isEn ? 'Period' : 'Période'}
            {activeTab === 'period' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
              activeTab === 'display'
                ? 'text-primary'
                : 'text-muted hover:text-text hover:bg-surface-hover'
            }`}
            style={activeTab === 'display' ? {
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            } : undefined}
          >
            {isEn ? 'Display' : 'Affichage'}
            {activeTab === 'display' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('entrepreneur')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-all relative ${
              activeTab === 'entrepreneur'
                ? 'text-primary'
                : 'text-muted hover:text-text hover:bg-surface-hover'
            }`}
            style={activeTab === 'entrepreneur' ? {
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            } : undefined}
          >
            <TrendingUp className="w-4 h-4" />
            {isEn ? 'Business View' : 'Vue entrepreneur'}
            {activeTab === 'entrepreneur' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cpa')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-all relative ${
              activeTab === 'cpa'
                ? 'text-primary'
                : 'text-muted hover:text-text hover:bg-surface-hover'
            }`}
            style={activeTab === 'cpa' ? {
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            } : undefined}
          >
            <FileText className="w-4 h-4" />
            {isEn ? 'CPA View' : 'Vue CPA'}
            {activeTab === 'cpa' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('ibcs')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-all relative ${
              activeTab === 'ibcs'
                ? 'text-primary'
                : 'text-muted hover:text-text hover:bg-surface-hover'
            }`}
            style={activeTab === 'ibcs' ? {
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            } : undefined}
          >
            <Target className="w-4 h-4" />
            {isEn ? 'IBCS' : 'IBCS'}
            {activeTab === 'ibcs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Content wrapper */}
          <div>
            {activeTab === 'period' && (
              <PeriodConfigTab
                config={effectiveConfig}
                onUpdate={(updates) => handleConfigUpdate({ period: { ...effectiveConfig.period, ...updates } })}
                isEn={isEn}
                chartId={chartId}
              />
            )}
            
            {activeTab === 'display' && (
              <DisplayConfigTab
                config={effectiveConfig}
                onUpdate={(updates) => handleConfigUpdate({ display: { ...effectiveConfig.display, ...updates } })}
                isEn={isEn}
              />
            )}
            
            {activeTab === 'entrepreneur' && (
              <EntrepreneurConfigTab
                config={effectiveConfig}
                onUpdate={(updates) => handleConfigUpdate({ entrepreneur: { ...effectiveConfig.entrepreneur, ...updates } })}
                isEn={isEn}
              />
            )}
            
            {activeTab === 'cpa' && (
              <CPAConfigTab
                config={effectiveConfig}
                onUpdate={(updates) => handleConfigUpdate({ cpa: { ...effectiveConfig.cpa, ...updates } })}
                isEn={isEn}
              />
            )}
            
            {activeTab === 'ibcs' && (
              <IBCSConfigTab
                config={effectiveConfig}
                onUpdate={(updates) => handleConfigUpdate({ ibcs: { ...effectiveConfig.ibcs, ...updates } })}
                isEn={isEn}
              />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-2">
            {chartId && (
              <>
                <button
                  onClick={handleResetToGlobal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isEn ? 'Reset to Global' : 'Réinitialiser global'}
                </button>
                {showGlobalOption && (
                  <button
                    onClick={handleSaveAsGlobal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {showSaveConfirm ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        {isEn ? 'Saved!' : 'Sauvegardé!'}
                      </span>
                    ) : (
                      isEn ? 'Save as Global Default' : 'Sauvegarder comme défaut'
                    )}
                  </button>
                )}
              </>
            )}
            {!chartId && (
              <button
                onClick={() => {
                  setConfig({});
                  saveUserPreferences({});
                  onConfigChange?.({});
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {isEn ? 'Reset All' : 'Tout réinitialiser'}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
              >
                {isEn ? 'Done' : 'Terminé'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Period Configuration Tab
 * 
 * Allows users to set the date range for THIS SPECIFIC CHART.
 * Settings are saved per-chart and do not affect other charts.
 */
function PeriodConfigTab({
  config,
  onUpdate,
  isEn,
  chartId,
}: {
  config: GraphConfig;
  onUpdate: (updates: Partial<PeriodConfig>) => void;
  isEn: boolean;
  chartId?: string;
}) {
  const periodPresets = [
    { id: 'mtd', label: 'Mois en cours', labelEn: 'Month to Date' },
    { id: 'qtd', label: 'Trimestre en cours', labelEn: 'Quarter to Date' },
    { id: 'ytd', label: 'Année en cours', labelEn: 'Year to Date' },
    { id: 'last_month', label: 'Mois dernier', labelEn: 'Last Month' },
    { id: 'last_quarter', label: 'Trimestre dernier', labelEn: 'Last Quarter' },
    { id: 'last_year', label: 'Année dernière', labelEn: 'Last Year' },
    { id: 'custom', label: 'Personnalisé', labelEn: 'Custom Range' },
  ];

  const comparisonModes = [
    { id: 'none', label: 'Aucune', labelEn: 'None' },
    { id: 'previousPeriod', label: 'Période précédente', labelEn: 'Previous Period' },
    { id: 'previousYear', label: 'Année précédente', labelEn: 'Previous Year' },
    { id: 'budget', label: 'Budget', labelEn: 'Budget' },
    { id: 'forecast', label: 'Prévision', labelEn: 'Forecast' },
    { id: 'benchmark', label: 'Benchmark', labelEn: 'Benchmark' },
  ];

  const aggregationLevels = [
    { id: 'daily', label: 'Quotidien', labelEn: 'Daily' },
    { id: 'weekly', label: 'Hebdomadaire', labelEn: 'Weekly' },
    { id: 'monthly', label: 'Mensuel', labelEn: 'Monthly' },
    { id: 'quarterly', label: 'Trimestriel', labelEn: 'Quarterly' },
    { id: 'annual', label: 'Annuel', labelEn: 'Annual' },
  ];

  return (
    <div className="space-y-6">
      {/* Per-chart notice */}
      {chartId && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="p-2 rounded-full bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-primary">
              {isEn ? 'Chart-Specific Date Filter' : 'Filtre de date spécifique au graphique'}
            </h3>
            <p className="text-sm text-muted mt-1">
              {isEn 
                ? 'These date settings apply ONLY to this chart and will not affect other charts on the dashboard.'
                : 'Ces paramètres de date s\'appliquent UNIQUEMENT à ce graphique et n\'affecteront pas les autres graphiques du tableau de bord.'}
            </p>
          </div>
        </div>
      )}

      {/* Period Preset */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {isEn ? 'Time Period' : 'Période'}
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {periodPresets.map((preset) => {
            const isSelected = config.period.defaultPeriod === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onUpdate({ defaultPeriod: preset.id as any })}
                className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-all font-medium ${
                  isSelected
                    ? 'border-primary shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-surface-hover'
                }`}
                style={isSelected ? {
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                  borderColor: 'rgb(var(--color-primary-500))',
                } : undefined}
              >
                {isEn ? preset.labelEn : preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range (only shown when 'custom' is selected) */}
      {config.period.defaultPeriod === 'custom' && (
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Start Date' : 'Date de début'}
            </label>
            <input
              type="date"
              value={config.period.customStartDate || ''}
              onChange={(e) => onUpdate({ customStartDate: e.target.value })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'End Date' : 'Date de fin'}
            </label>
            <input
              type="date"
              value={config.period.customEndDate || ''}
              onChange={(e) => onUpdate({ customEndDate: e.target.value })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Comparison Mode */}
      <div className="space-y-3">
        <h3 className="font-medium">
          {isEn ? 'Compare With' : 'Comparer avec'}
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {comparisonModes.map((mode) => {
            const isSelected = config.period.comparisonMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onUpdate({ comparisonMode: mode.id as any })}
                className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-all font-medium ${
                  isSelected
                    ? 'border-primary shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-surface-hover'
                }`}
                style={isSelected ? {
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                  borderColor: 'rgb(var(--color-primary-500))',
                } : undefined}
              >
                {isEn ? mode.labelEn : mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aggregation Level */}
      <div className="space-y-3">
        <h3 className="font-medium">
          {isEn ? 'Data Aggregation' : 'Agrégation des données'}
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {aggregationLevels.map((level) => {
            const isSelected = config.period.aggregationLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => onUpdate({ aggregationLevel: level.id as any })}
                className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-all font-medium ${
                  isSelected
                    ? 'border-primary shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-surface-hover'
                }`}
                style={isSelected ? {
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                  borderColor: 'rgb(var(--color-primary-500))',
                } : undefined}
              >
                {isEn ? level.labelEn : level.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {isEn 
            ? 'Choose how data points are grouped on this chart'
            : 'Choisissez comment les points de données sont regroupés sur ce graphique'}
        </p>
      </div>

      {/* Fiscal Year Settings */}
      <div className="space-y-3">
        <h3 className="font-medium">
          {isEn ? 'Fiscal Year' : 'Année fiscale'}
        </h3>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-2">
              {isEn ? 'Fiscal Year Start Month' : 'Mois de début de l\'année fiscale'}
            </label>
            <select
              value={config.period.fiscalYearStartMonth}
              onChange={(e) => onUpdate({ fiscalYearStartMonth: parseInt(e.target.value) })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            >
              {[
                { value: 1, label: isEn ? 'January' : 'Janvier' },
                { value: 2, label: isEn ? 'February' : 'Février' },
                { value: 3, label: isEn ? 'March' : 'Mars' },
                { value: 4, label: isEn ? 'April' : 'Avril' },
                { value: 5, label: isEn ? 'May' : 'Mai' },
                { value: 6, label: isEn ? 'June' : 'Juin' },
                { value: 7, label: isEn ? 'July' : 'Juillet' },
                { value: 8, label: isEn ? 'August' : 'Août' },
                { value: 9, label: isEn ? 'September' : 'Septembre' },
                { value: 10, label: isEn ? 'October' : 'Octobre' },
                { value: 11, label: isEn ? 'November' : 'Novembre' },
                { value: 12, label: isEn ? 'December' : 'Décembre' },
              ].map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-hover">
        <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted">
          {isEn 
            ? 'Tip: Each chart can have its own date filter. This allows you to compare different time periods side by side on the same dashboard.'
            : 'Astuce : Chaque graphique peut avoir son propre filtre de date. Cela vous permet de comparer différentes périodes côte à côte sur le même tableau de bord.'}
        </p>
      </div>
    </div>
  );
}

function DisplayConfigTab({
  config,
  onUpdate,
  isEn,
}: {
  config: GraphConfig;
  onUpdate: (updates: Partial<GraphConfig['display']>) => void;
  isEn: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Currency' : 'Devise'}
        </label>
        <select
          value={config.display.currency}
          onChange={(e) => onUpdate({ currency: e.target.value })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
        >
          <option value="CAD">CAD - Canadian Dollar</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Number Format' : 'Format des nombres'}
        </label>
        <select
          value={config.display.numberFormat}
          onChange={(e) => onUpdate({ numberFormat: e.target.value as any })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
        >
          <option value="actual">{isEn ? 'Actual Values' : 'Valeurs réelles'}</option>
          <option value="thousands">{isEn ? 'Thousands (K)' : 'Milliers (K)'}</option>
          <option value="millions">{isEn ? 'Millions (M)' : 'Millions (M)'}</option>
          <option value="billions">{isEn ? 'Billions (B)' : 'Milliards (B)'}</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {isEn ? 'Currency Decimals' : 'Décimales devise'}
          </label>
          <input
            type="number"
            min="0"
            max="4"
            value={config.display.currencyDecimals}
            onChange={(e) => onUpdate({ currencyDecimals: parseInt(e.target.value) })}
            className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            {isEn ? 'Percentage Decimals' : 'Décimales pourcentage'}
          </label>
          <input
            type="number"
            min="0"
            max="4"
            value={config.display.percentageDecimals}
            onChange={(e) => onUpdate({ percentageDecimals: parseInt(e.target.value) })}
            className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.display.useAccountingFormat}
            onChange={(e) => onUpdate({ useAccountingFormat: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Use Accounting Format (negative in parentheses)' : 'Format comptable (négatif entre parenthèses)'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.display.showZeroValues}
            onChange={(e) => onUpdate({ showZeroValues: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Zero Values' : 'Afficher les valeurs zéro'}
          </span>
        </label>
      </div>
    </div>
  );
}

function EntrepreneurConfigTab({
  config,
  onUpdate,
  isEn,
}: {
  config: GraphConfig;
  onUpdate: (updates: Partial<GraphConfig['entrepreneur']>) => void;
  isEn: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.entrepreneur.showGrowthIndicators}
            onChange={(e) => onUpdate({ showGrowthIndicators: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Growth Indicators' : 'Afficher les indicateurs de croissance'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.entrepreneur.showBenchmarks}
            onChange={(e) => onUpdate({ showBenchmarks: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Industry Benchmarks' : 'Afficher les références sectorielles'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.entrepreneur.showCashRunway}
            onChange={(e) => onUpdate({ showCashRunway: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Cash Runway' : 'Afficher la piste de trésorerie'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.entrepreneur.showBurnRate}
            onChange={(e) => onUpdate({ showBurnRate: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Burn Rate' : 'Afficher le taux de consommation'}
          </span>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Significant Change Threshold (%)' : 'Seuil de changement significatif (%)'}
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={config.entrepreneur.significantChangeThreshold}
          onChange={(e) => onUpdate({ significantChangeThreshold: parseFloat(e.target.value) })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>
      
      <div className="space-y-3">
        <h3 className="font-medium">{isEn ? 'Alert Thresholds' : 'Seuils d\'alerte'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">
              {isEn ? 'Cash Runway (days)' : 'Piste de trésorerie (jours)'}
            </label>
            <input
              type="number"
              min="0"
              value={config.entrepreneur.alertThresholds.cashRunwayDays}
              onChange={(e) => onUpdate({
                alertThresholds: {
                  ...config.entrepreneur.alertThresholds,
                  cashRunwayDays: parseInt(e.target.value),
                },
              })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">
              {isEn ? 'Revenue Decline (%)' : 'Baisse de revenus (%)'}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.entrepreneur.alertThresholds.revenueDecline}
              onChange={(e) => onUpdate({
                alertThresholds: {
                  ...config.entrepreneur.alertThresholds,
                  revenueDecline: parseFloat(e.target.value),
                },
              })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CPAConfigTab({
  config,
  onUpdate,
  isEn,
}: {
  config: GraphConfig;
  onUpdate: (updates: Partial<GraphConfig['cpa']>) => void;
  isEn: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Materiality Threshold (%)' : 'Seuil de matérialité (%)'}
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={config.cpa.materialityThreshold}
          onChange={(e) => onUpdate({ materialityThreshold: parseFloat(e.target.value) })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <p className="text-xs text-muted mt-1.5">
          {isEn 
            ? 'Items below this threshold may be considered immaterial'
            : 'Les éléments en dessous de ce seuil peuvent être considérés comme non matériels'}
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Variance Threshold (%)' : 'Seuil de variance (%)'}
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={config.cpa.varianceThreshold}
          onChange={(e) => onUpdate({ varianceThreshold: parseFloat(e.target.value) })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.cpa.showAccountCodes}
            onChange={(e) => onUpdate({ showAccountCodes: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Account Codes' : 'Afficher les codes de compte'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.cpa.showVarianceAnalysis}
            onChange={(e) => onUpdate({ showVarianceAnalysis: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Variance Analysis' : 'Afficher l\'analyse des écarts'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.cpa.showAgingAnalysis}
            onChange={(e) => onUpdate({ showAgingAnalysis: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Aging Analysis' : 'Afficher l\'analyse du vieillissement'}
          </span>
        </label>
        <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={config.cpa.showPriorYear}
            onChange={(e) => onUpdate({ showPriorYear: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm">
            {isEn ? 'Show Prior Year Comparison' : 'Afficher la comparaison année précédente'}
          </span>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Rounding Tolerance' : 'Tolérance d\'arrondi'}
        </label>
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={config.cpa.roundingTolerance}
          onChange={(e) => onUpdate({ roundingTolerance: parseFloat(e.target.value) })}
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>
      
      <div className="space-y-3">
        <h3 className="font-medium">{isEn ? 'Aging Buckets (days)' : 'Seuils de vieillissement (jours)'}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-2">
              {isEn ? 'Current' : 'Courant'}
            </label>
            <input
              type="number"
              min="0"
              value={config.cpa.agingBuckets.current}
              onChange={(e) => onUpdate({
                agingBuckets: {
                  ...config.cpa.agingBuckets,
                  current: parseInt(e.target.value),
                },
              })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">
              {isEn ? 'Warning' : 'Avertissement'}
            </label>
            <input
              type="number"
              min="0"
              value={config.cpa.agingBuckets.warning}
              onChange={(e) => onUpdate({
                agingBuckets: {
                  ...config.cpa.agingBuckets,
                  warning: parseInt(e.target.value),
                },
              })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">
              {isEn ? 'Critical' : 'Critique'}
            </label>
            <input
              type="number"
              min="0"
              value={config.cpa.agingBuckets.critical}
              onChange={(e) => onUpdate({
                agingBuckets: {
                  ...config.cpa.agingBuckets,
                  critical: parseInt(e.target.value),
                },
              })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * IBCS Configuration Tab
 * 
 * Note: IBCS is always enforced - this tab allows customization
 * of IBCS options, not enabling/disabling IBCS itself.
 */
function IBCSConfigTab({
  config,
  onUpdate,
  isEn,
}: {
  config: GraphConfig;
  onUpdate: (updates: Partial<IBCSConfig>) => void;
  isEn: boolean;
}) {
  const ibcsConfig = config.ibcs || {
    enabled: true,
    showVariancePins: true,
    showLegend: true,
    showBenchmark: false,
    showVarianceShading: true,
    metricType: 'revenue' as const,
    showPlan: true,
    showForecast: false,
    showPriorYear: true,
    varianceHighlightThreshold: 10,
    useSemanticColors: true,
  };

  return (
    <div className="space-y-6">
      {/* IBCS Enforced Notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-success/5 border border-success/20">
        <div className="p-2 rounded-full bg-success/10">
          <Check className="w-5 h-5 text-success" />
        </div>
        <div>
          <h3 className="font-medium text-success">
            {isEn ? 'IBCS Compliance Enforced' : 'Conformité IBCS appliquée'}
          </h3>
          <p className="text-sm text-muted mt-1">
            {isEn 
              ? 'IBCS (International Business Communication Standards) is always enabled to ensure professional, consistent financial reporting. Customize the options below to fine-tune the visualization.'
              : 'L\'IBCS (International Business Communication Standards) est toujours activé pour garantir des rapports financiers professionnels et cohérents. Personnalisez les options ci-dessous pour affiner la visualisation.'}
          </p>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          {isEn ? 'Scenario Comparison' : 'Comparaison de scénarios'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={ibcsConfig.showPlan}
              onChange={(e) => onUpdate({ showPlan: e.target.checked })}
              className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Budget/Plan (PL)' : 'Budget/Plan (PL)'}
              </span>
              <span className="text-xs text-muted">
                {isEn ? 'Outlined bars' : 'Barres contourées'}
              </span>
            </div>
          </label>
          
          <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={ibcsConfig.showForecast}
              onChange={(e) => onUpdate({ showForecast: e.target.checked })}
              className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Forecast (FC)' : 'Prévision (FC)'}
              </span>
              <span className="text-xs text-muted">
                {isEn ? 'Hatched pattern' : 'Motif hachuré'}
              </span>
            </div>
          </label>
          
          <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={ibcsConfig.showPriorYear}
              onChange={(e) => onUpdate({ showPriorYear: e.target.checked })}
              className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Prior Year (PY)' : 'Année précédente (PY)'}
              </span>
              <span className="text-xs text-muted">
                {isEn ? 'Gray reference' : 'Référence grise'}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Visual Elements */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          {isEn ? 'Visual Elements' : 'Éléments visuels'}
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showVariancePins}
                onChange={(e) => onUpdate({ showVariancePins: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Variance Pins' : 'Épingles de variance'}
                </span>
                <p className="text-xs text-muted">
                  {isEn ? 'Show +/- variance indicators on bars' : 'Afficher les indicateurs de variance +/- sur les barres'}
                </p>
              </div>
            </div>
          </label>
          
          <label className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showVarianceShading}
                onChange={(e) => onUpdate({ showVarianceShading: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Variance Shading' : 'Ombrage de variance'}
                </span>
                <p className="text-xs text-muted">
                  {isEn ? 'Shade area between actual and comparison' : 'Ombrer la zone entre réel et comparaison'}
                </p>
              </div>
            </div>
          </label>
          
          <label className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showLegend}
                onChange={(e) => onUpdate({ showLegend: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'IBCS Legend' : 'Légende IBCS'}
                </span>
                <p className="text-xs text-muted">
                  {isEn ? 'Show scenario notation legend' : 'Afficher la légende des notations de scénario'}
                </p>
              </div>
            </div>
          </label>
          
          <label className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showBenchmark}
                onChange={(e) => onUpdate({ showBenchmark: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Industry Benchmark' : 'Benchmark sectoriel'}
                </span>
                <p className="text-xs text-muted">
                  {isEn ? 'Show industry benchmark comparison' : 'Afficher la comparaison au benchmark sectoriel'}
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Semantic Colors */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {isEn ? 'Color Scheme' : 'Schéma de couleurs'}
        </h3>
        
        <label className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover cursor-pointer transition-all">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={ibcsConfig.useSemanticColors}
              onChange={(e) => onUpdate({ useSemanticColors: e.target.checked })}
              className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-sm font-medium">
                {isEn ? 'Semantic Colors' : 'Couleurs sémantiques'}
              </span>
              <p className="text-xs text-muted">
                {isEn 
                  ? 'Green for favorable variance, red for unfavorable' 
                  : 'Vert pour variance favorable, rouge pour défavorable'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-success shadow-sm"></span>
            <span className="w-5 h-5 rounded-md bg-error shadow-sm"></span>
          </div>
        </label>
      </div>

      {/* Metric Type & Thresholds */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          {isEn ? 'Variance Settings' : 'Paramètres de variance'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Default Metric Type' : 'Type de métrique par défaut'}
            </label>
            <select
              value={ibcsConfig.metricType}
              onChange={(e) => onUpdate({ metricType: e.target.value as 'revenue' | 'expense' | 'profit' | 'ratio' })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            >
              <option value="revenue">{isEn ? 'Revenue (↑ favorable)' : 'Revenus (↑ favorable)'}</option>
              <option value="expense">{isEn ? 'Expense (↓ favorable)' : 'Dépenses (↓ favorable)'}</option>
              <option value="profit">{isEn ? 'Profit (↑ favorable)' : 'Profit (↑ favorable)'}</option>
              <option value="ratio">{isEn ? 'Ratio (depends)' : 'Ratio (dépend)'}</option>
            </select>
            <p className="text-xs text-muted mt-1.5">
              {isEn 
                ? 'Determines how +/- variance is colored'
                : 'Détermine la couleur de la variance +/-'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Highlight Threshold (%)' : 'Seuil de mise en évidence (%)'}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={ibcsConfig.varianceHighlightThreshold}
              onChange={(e) => onUpdate({ varianceHighlightThreshold: parseFloat(e.target.value) })}
              className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <p className="text-xs text-muted mt-1.5">
              {isEn 
                ? 'Variances above this % are highlighted'
                : 'Les variances au-dessus de ce % sont mises en évidence'}
            </p>
          </div>
        </div>
      </div>

      {/* IBCS Reference Link */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-hover">
        <Info className="w-4 h-4 text-muted" />
        <p className="text-xs text-muted">
          {isEn 
            ? 'Learn more about IBCS standards at '
            : 'En savoir plus sur les normes IBCS sur '}
          <a 
            href="https://www.ibcs.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ibcs.com
          </a>
        </p>
      </div>
    </div>
  );
}
