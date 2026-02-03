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
  Eye,
  EyeOff,
  MousePointer,
  MessageSquare,
  Crosshair,
  Zap,
  BarChart3,
  Percent,
  Clock,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  DEFAULT_GRAPH_CONFIG,
  DEFAULT_IBCS_CONFIG,
  DEFAULT_DISPLAY_CONFIG,
  DEFAULT_TOOLTIP_CONFIG,
  type IBCSConfig,
  type DisplayConfig,
  type TooltipConfig,
  type PartialGraphConfig,
} from '../lib/graphConfig';
import {
  saveUserPreferences,
  getAllChartSettings,
  resetAllChartSettings,
} from '../hooks/useGraphConfig';
import { useChartControls, type ChartControlsMode } from '../hooks/useChartControls';

export default function ChartGlobalSettings() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [ibcsConfig, setIBCSConfig] = useState<IBCSConfig>({ ...DEFAULT_IBCS_CONFIG });
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>({ ...DEFAULT_DISPLAY_CONFIG });
  const [tooltipConfig, setTooltipConfig] = useState<TooltipConfig>({ ...DEFAULT_TOOLTIP_CONFIG });
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [chartOverridesCount, setChartOverridesCount] = useState(0);
  
  // Chart controls visibility
  const { mode: controlsMode, setMode: setControlsMode } = useChartControls();
  
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
        if (config.tooltip) {
          setTooltipConfig({ ...DEFAULT_TOOLTIP_CONFIG, ...config.tooltip });
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
      tooltip: tooltipConfig,
    };
    saveUserPreferences(preferences);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };
  
  const handleResetAll = () => {
    setIBCSConfig({ ...DEFAULT_IBCS_CONFIG });
    setDisplayConfig({ ...DEFAULT_DISPLAY_CONFIG });
    setTooltipConfig({ ...DEFAULT_TOOLTIP_CONFIG });
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
  
  const updateTooltip = (updates: Partial<TooltipConfig>) => {
    setTooltipConfig(prev => ({ ...prev, ...updates }));
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

      {/* Chart Controls Visibility */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-primary" />
          {isEn ? 'Chart Controls Visibility' : 'Visibilité des contrôles'}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Choose when to show chart controls (resize, settings, etc.)'
            : 'Choisissez quand afficher les contrôles des graphiques (redimensionner, paramètres, etc.)'}
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Hover mode */}
          <button
            onClick={() => setControlsMode('hover')}
            className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
              controlsMode === 'hover' ? 'ring-2 ring-primary' : ''
            }`}
            style={{ 
              backgroundColor: controlsMode === 'hover' 
                ? 'rgb(var(--color-primary-500) / 0.1)' 
                : 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: controlsMode === 'hover' 
                  ? 'rgb(var(--color-primary-500) / 0.2)' 
                  : 'rgb(var(--color-bg-muted))',
              }}
            >
              <MousePointer className="w-4 h-4" style={{ 
                color: controlsMode === 'hover' 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-text-muted))'
              }} />
            </div>
            <div>
              <span className="text-sm font-medium block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'On Hover' : 'Au survol'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Show when hovering' : 'Afficher au survol'}
              </span>
            </div>
          </button>
          
          {/* Always mode */}
          <button
            onClick={() => setControlsMode('always')}
            className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
              controlsMode === 'always' ? 'ring-2 ring-primary' : ''
            }`}
            style={{ 
              backgroundColor: controlsMode === 'always' 
                ? 'rgb(var(--color-primary-500) / 0.1)' 
                : 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: controlsMode === 'always' 
                  ? 'rgb(var(--color-primary-500) / 0.2)' 
                  : 'rgb(var(--color-bg-muted))',
              }}
            >
              <Eye className="w-4 h-4" style={{ 
                color: controlsMode === 'always' 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-text-muted))'
              }} />
            </div>
            <div>
              <span className="text-sm font-medium block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Always Visible' : 'Toujours visible'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Always show controls' : 'Toujours afficher'}
              </span>
            </div>
          </button>
          
          {/* Hidden mode */}
          <button
            onClick={() => setControlsMode('hidden')}
            className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
              controlsMode === 'hidden' ? 'ring-2 ring-primary' : ''
            }`}
            style={{ 
              backgroundColor: controlsMode === 'hidden' 
                ? 'rgb(var(--color-primary-500) / 0.1)' 
                : 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: controlsMode === 'hidden' 
                  ? 'rgb(var(--color-primary-500) / 0.2)' 
                  : 'rgb(var(--color-bg-muted))',
              }}
            >
              <EyeOff className="w-4 h-4" style={{ 
                color: controlsMode === 'hidden' 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-text-muted))'
              }} />
            </div>
            <div>
              <span className="text-sm font-medium block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Hidden' : 'Masqués'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Hide all controls' : 'Masquer les contrôles'}
              </span>
            </div>
          </button>
        </div>
        
        <p className="text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Tip: You can also toggle this by clicking the eye icon on any chart when hovering.'
            : 'Astuce: Vous pouvez aussi basculer en cliquant l\'icône œil sur n\'importe quel graphique au survol.'}
        </p>
      </section>

      {/* Tooltip/Hover Settings */}
      <section 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
      >
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          {isEn ? 'Hover Tooltip Settings' : 'Paramètres des infobulles'}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Customize what information appears when you hover over chart data points'
            : 'Personnalisez les informations affichées au survol des points de données'}
        </p>

        {/* Master toggle */}
        <div 
          className="flex items-center justify-between p-3 rounded-lg mb-4"
          style={{ 
            backgroundColor: tooltipConfig.enabled 
              ? 'rgb(var(--color-success) / 0.1)' 
              : 'rgb(var(--color-bg-muted))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: tooltipConfig.enabled 
                  ? 'rgb(var(--color-success) / 0.2)' 
                  : 'rgb(var(--color-bg-muted))',
              }}
            >
              <MessageSquare className="w-4 h-4" style={{ 
                color: tooltipConfig.enabled 
                  ? 'rgb(var(--color-success))' 
                  : 'rgb(var(--color-text-muted))'
              }} />
            </div>
            <div>
              <span className="text-sm font-medium block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Enable Tooltips' : 'Activer les infobulles'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Show information on hover' : 'Afficher les infos au survol'}
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={tooltipConfig.enabled}
              onChange={(e) => updateTooltip({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[rgb(var(--color-success))]"></div>
          </label>
        </div>

        {tooltipConfig.enabled && (
          <>
            {/* Timing Settings */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                {isEn ? 'Timing' : 'Délais'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Show delay (ms)' : 'Délai d\'apparition (ms)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="50"
                    value={tooltipConfig.delayShow}
                    onChange={(e) => updateTooltip({ delayShow: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg))', 
                      border: '1px solid rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Hide delay (ms)' : 'Délai de disparition (ms)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="50"
                    value={tooltipConfig.delayHide}
                    onChange={(e) => updateTooltip({ delayHide: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg))', 
                      border: '1px solid rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Information to Show */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                {isEn ? 'Information to Display' : 'Informations à afficher'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showValue}
                    onChange={(e) => updateTooltip({ showValue: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Current Value' : 'Valeur actuelle'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showLabel}
                    onChange={(e) => updateTooltip({ showLabel: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Label/Period' : 'Libellé/Période'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showComparison}
                    onChange={(e) => updateTooltip({ showComparison: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Comparison Value' : 'Valeur de comparaison'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showPercentageChange}
                    onChange={(e) => updateTooltip({ showPercentageChange: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Percentage Change' : 'Variation en %'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showTrendIndicator}
                    onChange={(e) => updateTooltip({ showTrendIndicator: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Trend Indicator' : 'Indicateur de tendance'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showStatus}
                    onChange={(e) => updateTooltip({ showStatus: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Status Badge' : 'Badge de statut'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showMovingAverage}
                    onChange={(e) => updateTooltip({ showMovingAverage: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Moving Average' : 'Moyenne mobile'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showBudget}
                    onChange={(e) => updateTooltip({ showBudget: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Budget/Target' : 'Budget/Cible'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showCategory}
                    onChange={(e) => updateTooltip({ showCategory: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Category' : 'Catégorie'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showCumulative}
                    onChange={(e) => updateTooltip({ showCumulative: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Cumulative Total' : 'Total cumulé'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showPercentOfTotal}
                    onChange={(e) => updateTooltip({ showPercentOfTotal: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? '% of Total' : '% du total'}</span>
                </label>
              </div>
            </div>

            {/* Visual Effects */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                {isEn ? 'Visual Effects' : 'Effets visuels'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.highlightOnHover}
                    onChange={(e) => updateTooltip({ highlightOnHover: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Highlight Data Point' : 'Mettre en évidence le point'}</span>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.showCrosshair}
                    onChange={(e) => updateTooltip({ showCrosshair: e.target.checked })}
                    className="rounded"
                  />
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <span className="text-sm">{isEn ? 'Show Crosshair' : 'Afficher le réticule'}</span>
                  </div>
                </label>
                
                <label 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <input
                    type="checkbox"
                    checked={tooltipConfig.animate}
                    onChange={(e) => updateTooltip({ animate: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{isEn ? 'Animate Tooltip' : 'Animer l\'infobulle'}</span>
                </label>
                
                <div 
                  className="flex items-center gap-2.5 p-2.5 rounded-lg"
                  style={{ border: '1px solid rgb(var(--color-border))' }}
                >
                  <label className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Theme:' : 'Thème:'}
                  </label>
                  <select
                    value={tooltipConfig.theme}
                    onChange={(e) => updateTooltip({ theme: e.target.value as 'auto' | 'light' | 'dark' })}
                    className="flex-1 px-2 py-1 rounded text-sm"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg))', 
                      border: '1px solid rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))'
                    }}
                  >
                    <option value="auto">{isEn ? 'Auto' : 'Auto'}</option>
                    <option value="light">{isEn ? 'Light' : 'Clair'}</option>
                    <option value="dark">{isEn ? 'Dark' : 'Sombre'}</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

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
