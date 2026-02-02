/**
 * Graph Configuration Panel
 * 
 * Allows users to customize graph parameters from both
 * Entrepreneur and CPA perspectives.
 */

import { useState } from 'react';
import { Settings2, TrendingUp, FileText, X } from 'lucide-react';
import { useGraphConfig, saveUserPreferences } from '../../hooks/useGraphConfig';
import type { GraphConfig, PartialGraphConfig } from '../../lib/graphConfig';
import { useI18n } from '../../lib/i18n';

interface GraphConfigPanelProps {
  chartId?: string;
  currentConfig?: Partial<GraphConfig>;
  onConfigChange?: (config: Partial<GraphConfig>) => void;
  onClose?: () => void;
}

export default function GraphConfigPanel({
  chartId,
  currentConfig,
  onConfigChange,
  onClose,
}: GraphConfigPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const defaultConfig = useGraphConfig(chartId);
  const [activeTab, setActiveTab] = useState<'display' | 'entrepreneur' | 'cpa'>('display');
  const [config, setConfig] = useState<Partial<GraphConfig>>(currentConfig || {});
  
  const handleConfigUpdate = (updates: Partial<GraphConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
    
    // Save to user preferences
    saveUserPreferences(newConfig);
  };
  
  const effectiveConfig = { ...defaultConfig, ...config };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              {isEn ? 'Graph Configuration' : 'Configuration des graphiques'}
            </h2>
            {chartId && (
              <span className="text-sm text-muted">
                {isEn ? `Chart: ${chartId}` : `Graphique: ${chartId}`}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-hover rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('display')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'display'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            {isEn ? 'Display' : 'Affichage'}
          </button>
          <button
            onClick={() => setActiveTab('entrepreneur')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'entrepreneur'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {isEn ? 'Business View' : 'Vue entrepreneur'}
          </button>
          <button
            onClick={() => setActiveTab('cpa')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'cpa'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isEn ? 'CPA View' : 'Vue CPA'}
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
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
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={() => {
              setConfig({});
              saveUserPreferences({});
              onConfigChange?.({});
            }}
            className="px-4 py-2 text-sm text-muted hover:text-text"
          >
            {isEn ? 'Reset to Defaults' : 'Réinitialiser'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary-hover"
            >
              {isEn ? 'Done' : 'Terminé'}
            </button>
          )}
        </div>
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEn ? 'Currency' : 'Devise'}
        </label>
        <select
          value={config.display.currency}
          onChange={(e) => onUpdate({ currency: e.target.value })}
          className="w-full px-3 py-2 border rounded"
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
          className="w-full px-3 py-2 border rounded"
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
            className="w-full px-3 py-2 border rounded"
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
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.display.useAccountingFormat}
            onChange={(e) => onUpdate({ useAccountingFormat: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Use Accounting Format (negative in parentheses)' : 'Format comptable (négatif entre parenthèses)'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.display.showZeroValues}
            onChange={(e) => onUpdate({ showZeroValues: e.target.checked })}
            className="rounded"
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
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.entrepreneur.showGrowthIndicators}
            onChange={(e) => onUpdate({ showGrowthIndicators: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Growth Indicators' : 'Afficher les indicateurs de croissance'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.entrepreneur.showBenchmarks}
            onChange={(e) => onUpdate({ showBenchmarks: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Industry Benchmarks' : 'Afficher les références sectorielles'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.entrepreneur.showCashRunway}
            onChange={(e) => onUpdate({ showCashRunway: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Cash Runway' : 'Afficher la piste de trésorerie'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.entrepreneur.showBurnRate}
            onChange={(e) => onUpdate({ showBurnRate: e.target.checked })}
            className="rounded"
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
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium">{isEn ? 'Alert Thresholds' : 'Seuils d\'alerte'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
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
              className="w-full px-3 py-2 border rounded"
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
    <div className="space-y-4">
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
          className="w-full px-3 py-2 border rounded"
        />
        <p className="text-xs text-muted mt-1">
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
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.cpa.showAccountCodes}
            onChange={(e) => onUpdate({ showAccountCodes: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Account Codes' : 'Afficher les codes de compte'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.cpa.showVarianceAnalysis}
            onChange={(e) => onUpdate({ showVarianceAnalysis: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Variance Analysis' : 'Afficher l\'analyse des écarts'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.cpa.showAgingAnalysis}
            onChange={(e) => onUpdate({ showAgingAnalysis: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">
            {isEn ? 'Show Aging Analysis' : 'Afficher l\'analyse du vieillissement'}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.cpa.showPriorYear}
            onChange={(e) => onUpdate({ showPriorYear: e.target.checked })}
            className="rounded"
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
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium">{isEn ? 'Aging Buckets (days)' : 'Seuils de vieillissement (jours)'}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
