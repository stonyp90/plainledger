/**
 * VisualizationBuilder - Advanced chart builder modal
 * 
 * Full-featured visualization builder with:
 * - Multi-step wizard interface
 * - Data source selection
 * - Field configuration with drag-and-drop
 * - Chart type selection
 * - Live preview
 * - Metadata editing
 * - Premium feature gating
 * - Bilingual support (EN/FR)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Columns3,
  BarChart3,
  FileText,
  Save,
  Sparkles,
  Crown,
  Check,
  Loader2,
  Link2,
  Filter,
  Eye,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { 
  VisualizationConfig, 
  DataSourceReference, 
  FieldConfig,
  JoinConfig,
  FilterConfig,
  BuilderStep,
  generateId,
} from '../../lib/visualizationTypes';
import { ChartType, TimeRange, ComparisonMode } from '../../lib/chartFavorites';
import DataSourceSelector from './DataSourceSelector';
import { FieldPicker } from './FieldPicker';
import { MetadataEditor } from './MetadataEditor';
import { JoinBuilder } from './JoinBuilder';
import { FilterBuilder } from './FilterBuilder';
import { ChartPreview } from './ChartPreview';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import PremiumFeatureGate from '../PremiumFeatureGate';

// =====================================================
// STEP DEFINITIONS
// =====================================================

interface Step {
  id: BuilderStep;
  labelEn: string;
  labelFr: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionEn: string;
  descriptionFr: string;
}

const STEPS: Step[] = [
  {
    id: 'sources',
    labelEn: 'Data Sources',
    labelFr: 'Sources de données',
    icon: Database,
    descriptionEn: 'Select which data to visualize',
    descriptionFr: 'Sélectionnez les données à visualiser',
  },
  {
    id: 'joins',
    labelEn: 'Joins',
    labelFr: 'Jointures',
    icon: Link2,
    descriptionEn: 'Connect your data sources',
    descriptionFr: 'Connectez vos sources de données',
  },
  {
    id: 'fields',
    labelEn: 'Fields',
    labelFr: 'Champs',
    icon: Columns3,
    descriptionEn: 'Choose and configure fields',
    descriptionFr: 'Choisissez et configurez les champs',
  },
  {
    id: 'filters',
    labelEn: 'Filters',
    labelFr: 'Filtres',
    icon: Filter,
    descriptionEn: 'Filter your data',
    descriptionFr: 'Filtrez vos données',
  },
  {
    id: 'chart',
    labelEn: 'Chart Type',
    labelFr: 'Type de graphique',
    icon: BarChart3,
    descriptionEn: 'Select visualization style',
    descriptionFr: 'Sélectionnez le style de visualisation',
  },
  {
    id: 'metadata',
    labelEn: 'Details',
    labelFr: 'Détails',
    icon: FileText,
    descriptionEn: 'Name and describe your chart',
    descriptionFr: 'Nommez et décrivez votre graphique',
  },
];

// =====================================================
// CHART TYPE OPTIONS
// =====================================================

interface ChartTypeOption {
  type: ChartType;
  labelEn: string;
  labelFr: string;
  icon: string;
  descriptionEn: string;
  descriptionFr: string;
  category: 'basic' | 'comparison' | 'distribution' | 'advanced';
}

const CHART_TYPES: ChartTypeOption[] = [
  // Basic
  { type: 'line', labelEn: 'Line', labelFr: 'Ligne', icon: '📈', descriptionEn: 'Trends over time', descriptionFr: 'Tendances dans le temps', category: 'basic' },
  { type: 'bar', labelEn: 'Bar', labelFr: 'Barres', icon: '📊', descriptionEn: 'Compare categories', descriptionFr: 'Comparer des catégories', category: 'basic' },
  { type: 'area', labelEn: 'Area', labelFr: 'Aire', icon: '📉', descriptionEn: 'Volume over time', descriptionFr: 'Volume dans le temps', category: 'basic' },
  // Distribution
  { type: 'pie', labelEn: 'Pie', labelFr: 'Secteurs', icon: '🥧', descriptionEn: 'Parts of whole', descriptionFr: 'Parts d\'un tout', category: 'distribution' },
  { type: 'donut', labelEn: 'Donut', labelFr: 'Anneau', icon: '🍩', descriptionEn: 'Parts with center', descriptionFr: 'Parts avec centre', category: 'distribution' },
  { type: 'treemap', labelEn: 'Treemap', labelFr: 'Treemap', icon: '🗺️', descriptionEn: 'Hierarchical data', descriptionFr: 'Données hiérarchiques', category: 'distribution' },
  // Comparison
  { type: 'waterfall', labelEn: 'Waterfall', labelFr: 'Cascade', icon: '🌊', descriptionEn: 'Running totals', descriptionFr: 'Totaux cumulés', category: 'comparison' },
  { type: 'radar', labelEn: 'Radar', labelFr: 'Radar', icon: '🕸️', descriptionEn: 'Multi-dimensional', descriptionFr: 'Multi-dimensionnel', category: 'comparison' },
  // Advanced
  { type: 'gauge', labelEn: 'Gauge', labelFr: 'Jauge', icon: '🎯', descriptionEn: 'Progress to goal', descriptionFr: 'Progression vers objectif', category: 'advanced' },
  { type: 'heatmap', labelEn: 'Heatmap', labelFr: 'Carte de chaleur', icon: '🔥', descriptionEn: 'Intensity patterns', descriptionFr: 'Patterns d\'intensité', category: 'advanced' },
  { type: 'table', labelEn: 'Table', labelFr: 'Tableau', icon: '📋', descriptionEn: 'Detailed data', descriptionFr: 'Données détaillées', category: 'advanced' },
];

// =====================================================
// CHART TYPE SELECTOR
// =====================================================

interface ChartTypeSelectorStepProps {
  selected: ChartType;
  onChange: (type: ChartType) => void;
  isEn: boolean;
}

function ChartTypeSelectorStep({ selected, onChange, isEn }: ChartTypeSelectorStepProps) {
  const categories = [
    { id: 'basic', labelEn: 'Basic', labelFr: 'De base' },
    { id: 'distribution', labelEn: 'Distribution', labelFr: 'Distribution' },
    { id: 'comparison', labelEn: 'Comparison', labelFr: 'Comparaison' },
    { id: 'advanced', labelEn: 'Advanced', labelFr: 'Avancé' },
  ];

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const types = CHART_TYPES.filter(t => t.category === cat.id);
        
        return (
          <div key={cat.id}>
            <h4 
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? cat.labelEn : cat.labelFr}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {types.map(type => (
                <button
                  key={type.type}
                  onClick={() => onChange(type.type)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${selected === type.type 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-transparent hover:border-primary-500/30'
                    }
                  `}
                  style={{
                    backgroundColor: selected === type.type 
                      ? undefined 
                      : 'rgb(var(--color-surface))',
                  }}
                >
                  <span className="text-3xl">{type.icon}</span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? type.labelEn : type.labelFr}
                  </span>
                  <span 
                    className="text-xs text-center"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? type.descriptionEn : type.descriptionFr}
                  </span>
                  {selected === type.type && (
                    <div 
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface VisualizationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: VisualizationConfig) => void;
  initialConfig?: Partial<VisualizationConfig>;
  mode?: 'create' | 'edit';
}

export function VisualizationBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  mode = 'create',
}: VisualizationBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [config, setConfig] = useState<Partial<VisualizationConfig>>({
    id: generateId('viz'),
    chartType: 'line',
    timeRange: '1Y' as TimeRange,
    comparison: 'none' as ComparisonMode,
    sources: [],
    fields: [],
    showLegend: true,
    showGrid: true,
    animate: true,
    isPublic: false,
    category: 'custom',
    ...initialConfig,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      if (!initialConfig) {
        setConfig({
          id: generateId('viz'),
          chartType: 'line',
          timeRange: '1Y' as TimeRange,
          comparison: 'none' as ComparisonMode,
          sources: [],
          fields: [],
          showLegend: true,
          showGrid: true,
          animate: true,
          isPublic: false,
          category: 'custom',
        });
      }
    }
  }, [isOpen, initialConfig]);

  const currentStep = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Update config
  const updateConfig = useCallback((updates: Partial<VisualizationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation
  const goToNextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex(i => i + 1);
    }
  };

  const goToPreviousStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  // Can proceed to next step?
  const canProceed = () => {
    switch (currentStep.id) {
      case 'sources':
        return (config.sources?.length ?? 0) > 0;
      case 'joins':
        // Joins are optional - can always proceed
        return true;
      case 'fields':
        return (config.fields?.length ?? 0) > 0;
      case 'filters':
        // Filters are optional - can always proceed
        return true;
      case 'chart':
        return !!config.chartType;
      case 'metadata':
        return !!(config.name || config.nameEn);
      default:
        return true;
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!config.name && !config.nameEn) {
      // Auto-generate name if not provided
      updateConfig({
        name: 'Graphique personnalisé',
        nameEn: 'Custom Chart',
      });
    }

    setIsSaving(true);
    try {
      const finalConfig: VisualizationConfig = {
        id: config.id || generateId('viz'),
        name: config.name || 'Graphique personnalisé',
        nameEn: config.nameEn || 'Custom Chart',
        chartType: config.chartType || 'line',
        timeRange: config.timeRange || '1Y',
        comparison: config.comparison || 'none',
        sources: config.sources || [],
        fields: config.fields || [],
        ...config,
      } as VisualizationConfig;

      await onSave(finalConfig);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <PremiumFeatureGate feature="advancedAnalytics">
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      >
        {/* Modal Container */}
        <div 
          className="w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          style={{ backgroundColor: 'rgb(var(--color-bg))' }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 
                  className="text-lg font-semibold flex items-center gap-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Advanced Chart Builder' : 'Créateur de graphiques avancé'}
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-accent-500) / 0.2)',
                      color: 'rgb(var(--color-accent-500))',
                    }}
                  >
                    <Crown className="w-3 h-3 inline mr-1" />
                    PRO
                  </span>
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {mode === 'edit' 
                    ? (isEn ? 'Edit your visualization' : 'Modifier votre visualisation')
                    : (isEn ? 'Create powerful custom visualizations' : 'Créez des visualisations personnalisées puissantes')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          </div>

          {/* Progress Steps */}
          <div 
            className="flex items-center justify-center gap-2 px-6 py-4 border-b overflow-x-auto"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isClickable = index <= currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStepIndex(index)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl transition-all
                    ${isActive 
                      ? 'bg-primary-500/20' 
                      : isCompleted
                        ? 'bg-primary-500/10 hover:bg-primary-500/15'
                        : ''
                    }
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  `}
                >
                  <div 
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${isActive || isCompleted 
                        ? 'bg-primary-500' 
                        : 'bg-gray-700'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p 
                      className="text-sm font-medium"
                      style={{ 
                        color: isActive || isCompleted 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-text-muted))',
                      }}
                    >
                      {isEn ? step.labelEn : step.labelFr}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step Content with Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <ChartErrorBoundary 
                chartName={isEn ? currentStep.labelEn : currentStep.labelFr}
                isEn={isEn}
              >
                {currentStep.id === 'sources' && (
                  <DataSourceSelector
                    selectedSources={config.sources || []}
                    onSelectionChange={(sources) => updateConfig({ sources })}
                  />
                )}

                {currentStep.id === 'joins' && (
                  <JoinBuilder
                    sources={config.sources || []}
                    joins={config.joins || []}
                    onJoinsChange={(joins) => updateConfig({ joins })}
                  />
                )}

                {currentStep.id === 'fields' && (
                  <FieldPicker
                    sources={config.sources || []}
                    selectedFields={config.fields || []}
                    onFieldsChange={(fields) => updateConfig({ fields })}
                  />
                )}

                {currentStep.id === 'filters' && (
                  <FilterBuilder
                    sources={config.sources || []}
                    filters={config.filters || []}
                    onFiltersChange={(filters) => updateConfig({ filters })}
                  />
                )}

                {currentStep.id === 'chart' && (
                  <ChartTypeSelectorStep
                    selected={config.chartType || 'line'}
                    onChange={(chartType) => updateConfig({ chartType })}
                    isEn={isEn}
                  />
                )}

                {currentStep.id === 'metadata' && (
                  <MetadataEditor
                    config={config}
                    onChange={updateConfig}
                  />
                )}
              </ChartErrorBoundary>
            </div>

            {/* Preview Panel (visible when fields are selected) */}
            {(config.fields?.length ?? 0) > 0 && currentStep.id !== 'metadata' && (
              <div 
                className="w-80 border-l p-4 hidden lg:block"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <ChartPreview config={config} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <button
              onClick={goToPreviousStep}
              disabled={isFirstStep}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                ${isFirstStep 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-800'
                }
              `}
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <ChevronLeft className="w-4 h-4" />
              {isEn ? 'Back' : 'Retour'}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-medium transition-all hover:bg-gray-800"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>

              {isLastStep ? (
                <button
                  onClick={handleSave}
                  disabled={!canProceed() || isSaving}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                    ${canProceed() && !isSaving
                      ? 'text-white'
                      : 'opacity-50 cursor-not-allowed'
                    }
                  `}
                  style={{
                    background: canProceed() && !isSaving
                      ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)'
                      : 'rgb(var(--color-surface))',
                  }}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving 
                    ? (isEn ? 'Saving...' : 'Enregistrement...')
                    : (isEn ? 'Save Chart' : 'Enregistrer')
                  }
                </button>
              ) : (
                <button
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                    ${canProceed()
                      ? 'text-white'
                      : 'opacity-50 cursor-not-allowed'
                    }
                  `}
                  style={{
                    background: canProceed()
                      ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)'
                      : 'rgb(var(--color-surface))',
                  }}
                >
                  {isEn ? 'Next' : 'Suivant'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PremiumFeatureGate>
  );
}

export default VisualizationBuilder;
