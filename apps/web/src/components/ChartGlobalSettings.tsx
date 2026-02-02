/**
 * Chart Global Settings Component
 * 
 * Allows users to configure their default chart preferences.
 * IBCS is always enforced - only individual IBCS options can be customized.
 * 
 * These global preferences apply to all charts unless overridden at the chart level.
 */

import { useState, useEffect } from 'react';
import {
  Target,
  Settings2,
  TrendingUp,
  FileText,
  Check,
  Info,
  RotateCcw,
  Globe,
  Save,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  DEFAULT_GRAPH_CONFIG,
  DEFAULT_IBCS_CONFIG,
  DEFAULT_DISPLAY_CONFIG,
  type IBCSConfig,
  type DisplayConfig,
  type PartialGraphConfig,
} from '../lib/graphConfig';
import {
  saveUserPreferences,
  getAllChartSettings,
  resetAllChartSettings,
} from '../hooks/useGraphConfig';

export default function ChartGlobalSettings() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [ibcsConfig, setIBCSConfig] = useState<IBCSConfig>({ ...DEFAULT_IBCS_CONFIG });
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>({ ...DEFAULT_DISPLAY_CONFIG });
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [chartOverridesCount, setChartOverridesCount] = useState(0);
  
  // Load saved preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('plainledger-graph-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        const config = parsed.config || parsed;
        if (config.ibcs) {
          setIBCSConfig({ ...DEFAULT_IBCS_CONFIG, ...config.ibcs });
        }
        if (config.display) {
          setDisplayConfig({ ...DEFAULT_DISPLAY_CONFIG, ...config.display });
        }
      }
      // Count chart-specific overrides
      const chartSettings = getAllChartSettings();
      setChartOverridesCount(Object.keys(chartSettings).length);
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
  }, []);
  
  const handleSave = () => {
    const preferences: PartialGraphConfig = {
      ibcs: ibcsConfig,
      display: displayConfig,
    };
    saveUserPreferences(preferences);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };
  
  const handleResetAll = () => {
    setIBCSConfig({ ...DEFAULT_IBCS_CONFIG });
    setDisplayConfig({ ...DEFAULT_DISPLAY_CONFIG });
    saveUserPreferences({});
    resetAllChartSettings();
    setChartOverridesCount(0);
  };
  
  const updateIBCS = (updates: Partial<IBCSConfig>) => {
    setIBCSConfig(prev => ({ ...prev, ...updates }));
  };
  
  const updateDisplay = (updates: Partial<DisplayConfig>) => {
    setDisplayConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {isEn ? 'Chart & IBCS Settings' : 'Paramètres Graphiques & IBCS'}
        </h2>
        <p className="text-sm text-muted mt-1">
          {isEn 
            ? 'Configure your default chart preferences. These apply to all charts unless customized individually.'
            : 'Configurez vos préférences graphiques par défaut. Elles s\'appliquent à tous les graphiques sauf personnalisation individuelle.'}
        </p>
      </div>

      {/* IBCS Enforced Notice */}
      <div 
        className="flex items-start gap-3 p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', border: '1px solid rgb(var(--color-success) / 0.2)' }}
      >
        <div 
          className="p-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
        >
          <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
        </div>
        <div>
          <h3 className="font-medium" style={{ color: 'rgb(var(--color-success))' }}>
            {isEn ? 'IBCS Compliance Enforced' : 'Conformité IBCS appliquée'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'International Business Communication Standards (IBCS) are always enabled for professional financial reporting. Customize the options below to fine-tune the visualization style.'
              : 'Les normes IBCS (International Business Communication Standards) sont toujours activées pour des rapports financiers professionnels. Personnalisez les options ci-dessous pour ajuster le style de visualisation.'}
          </p>
        </div>
      </div>

      {/* Per-chart overrides count */}
      {chartOverridesCount > 0 && (
        <div 
          className="flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? `${chartOverridesCount} chart(s) have custom settings`
                : `${chartOverridesCount} graphique(s) ont des paramètres personnalisés`}
            </span>
          </div>
          <button
            onClick={() => {
              resetAllChartSettings();
              setChartOverridesCount(0);
            }}
            className="text-xs px-2 py-1 rounded hover:bg-surface transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Reset all to global' : 'Réinitialiser tous'}
          </button>
        </div>
      )}

      {/* IBCS Scenario Comparison */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          {isEn ? 'Scenario Comparison' : 'Comparaison de scénarios'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label 
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <input
              type="checkbox"
              checked={ibcsConfig.showPlan}
              onChange={(e) => updateIBCS({ showPlan: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Budget/Plan (PL)' : 'Budget/Plan (PL)'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Outlined bars' : 'Barres contourées'}
              </span>
            </div>
          </label>
          
          <label 
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <input
              type="checkbox"
              checked={ibcsConfig.showForecast}
              onChange={(e) => updateIBCS({ showForecast: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Forecast (FC)' : 'Prévision (FC)'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Hatched pattern' : 'Motif hachuré'}
              </span>
            </div>
          </label>
          
          <label 
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <input
              type="checkbox"
              checked={ibcsConfig.showPriorYear}
              onChange={(e) => updateIBCS({ showPriorYear: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium block">
                {isEn ? 'Prior Year (PY)' : 'Année précédente (PY)'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Gray reference' : 'Référence grise'}
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* Visual Elements */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-primary" />
          {isEn ? 'Visual Elements' : 'Éléments visuels'}
        </h3>
        
        <div className="space-y-3">
          <label 
            className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showVariancePins}
                onChange={(e) => updateIBCS({ showVariancePins: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Variance Pins' : 'Épingles de variance'}
                </span>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Show +/- variance indicators on bars' : 'Afficher les indicateurs de variance +/- sur les barres'}
                </p>
              </div>
            </div>
          </label>
          
          <label 
            className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showVarianceShading}
                onChange={(e) => updateIBCS({ showVarianceShading: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Variance Shading' : 'Ombrage de variance'}
                </span>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Shade area between actual and comparison in trend charts' : 'Ombrer la zone entre réel et comparaison dans les graphiques de tendance'}
                </p>
              </div>
            </div>
          </label>
          
          <label 
            className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showLegend}
                onChange={(e) => updateIBCS({ showLegend: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'IBCS Legend' : 'Légende IBCS'}
                </span>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Show scenario notation legend on charts' : 'Afficher la légende des notations de scénario'}
                </p>
              </div>
            </div>
          </label>
          
          <label 
            className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
            style={{ border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ibcsConfig.showBenchmark}
                onChange={(e) => updateIBCS({ showBenchmark: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="text-sm font-medium">
                  {isEn ? 'Industry Benchmark' : 'Benchmark sectoriel'}
                </span>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Show industry benchmark comparison when available' : 'Afficher la comparaison au benchmark sectoriel si disponible'}
                </p>
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Color Scheme */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          {isEn ? 'Color Scheme' : 'Schéma de couleurs'}
        </h3>
        
        <label 
          className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
          style={{ border: '1px solid rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={ibcsConfig.useSemanticColors}
              onChange={(e) => updateIBCS({ useSemanticColors: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium">
                {isEn ? 'Semantic Colors' : 'Couleurs sémantiques'}
              </span>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Green for favorable variance, red for unfavorable' 
                  : 'Vert pour variance favorable, rouge pour défavorable'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(var(--color-success))' }}></span>
            <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(var(--color-error))' }}></span>
          </div>
        </label>
      </section>

      {/* Variance Settings */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-4">
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
              onChange={(e) => updateIBCS({ metricType: e.target.value as 'revenue' | 'expense' | 'profit' | 'ratio' })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            >
              <option value="revenue">{isEn ? 'Revenue (↑ favorable)' : 'Revenus (↑ favorable)'}</option>
              <option value="expense">{isEn ? 'Expense (↓ favorable)' : 'Dépenses (↓ favorable)'}</option>
              <option value="profit">{isEn ? 'Profit (↑ favorable)' : 'Profit (↑ favorable)'}</option>
              <option value="ratio">{isEn ? 'Ratio (context-dependent)' : 'Ratio (selon contexte)'}</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Determines how +/- variance is colored by default'
                : 'Détermine la couleur de la variance +/- par défaut'}
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
              onChange={(e) => updateIBCS({ varianceHighlightThreshold: parseFloat(e.target.value) || 10 })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Variances above this % are emphasized'
                : 'Les variances au-dessus de ce % sont mises en évidence'}
            </p>
          </div>
        </div>
      </section>

      {/* Display Formatting */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-primary" />
          {isEn ? 'Number Formatting' : 'Format des nombres'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Currency' : 'Devise'}
            </label>
            <select
              value={displayConfig.currency}
              onChange={(e) => updateDisplay({ currency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            >
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Number Format' : 'Format numérique'}
            </label>
            <select
              value={displayConfig.numberFormat}
              onChange={(e) => updateDisplay({ numberFormat: e.target.value as 'thousands' | 'millions' | 'billions' | 'actual' })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            >
              <option value="actual">{isEn ? 'Actual Values' : 'Valeurs réelles'}</option>
              <option value="thousands">{isEn ? 'Thousands (K)' : 'Milliers (K)'}</option>
              <option value="millions">{isEn ? 'Millions (M)' : 'Millions (M)'}</option>
              <option value="billions">{isEn ? 'Billions (B)' : 'Milliards (B)'}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              {isEn ? 'Currency Decimals' : 'Décimales devise'}
            </label>
            <input
              type="number"
              min="0"
              max="4"
              value={displayConfig.currencyDecimals}
              onChange={(e) => updateDisplay({ currencyDecimals: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
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
              value={displayConfig.percentageDecimals}
              onChange={(e) => updateDisplay({ percentageDecimals: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))', 
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={displayConfig.useAccountingFormat}
              onChange={(e) => updateDisplay({ useAccountingFormat: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">
              {isEn ? 'Use Accounting Format (negative in parentheses)' : 'Format comptable (négatif entre parenthèses)'}
            </span>
          </label>
        </div>
      </section>

      {/* IBCS Reference */}
      <div 
        className="flex items-center gap-2 p-3 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}
      >
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Learn more about IBCS standards at '
            : 'En savoir plus sur les normes IBCS sur '}
          <a 
            href="https://www.ibcs.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'rgb(var(--color-primary))' }}
          >
            ibcs.com
          </a>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
        <button
          onClick={handleResetAll}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors hover:bg-surface-hover"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <RotateCcw className="w-4 h-4" />
          {isEn ? 'Reset All to Defaults' : 'Tout réinitialiser'}
        </button>
        
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
          style={{ 
            backgroundColor: showSaveConfirm ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary))',
            color: 'white'
          }}
        >
          {showSaveConfirm ? (
            <>
              <Check className="w-4 h-4" />
              {isEn ? 'Saved!' : 'Sauvegardé!'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEn ? 'Save Preferences' : 'Enregistrer'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
