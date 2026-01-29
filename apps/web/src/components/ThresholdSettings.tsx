import { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Scale, 
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  HelpCircle,
  Lightbulb,
  Shield,
  DollarSign,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';
import { DEFAULT_THRESHOLDS, type ThresholdConfig } from '../lib/anomalyDetection';
import { InfoTooltip } from './Tooltip';
import { useI18n } from '../lib/i18n';
import { organizationSettingsApi } from '../lib/settings-api';
import { useTenant } from '../contexts/TenantContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { isMockAuthEnabled } from '../lib/keycloak';

interface ThresholdSettingsProps {
  onSave?: (thresholds: ThresholdConfig) => void;
}

// Industry-specific presets based on best practices
const INDUSTRY_PRESETS: Record<string, { 
  name: string; 
  nameEn: string;
  description: string;
  descriptionEn: string;
  thresholds: Partial<ThresholdConfig>;
}> = {
  conservative: {
    name: 'Conservateur',
    nameEn: 'Conservative',
    description: 'Seuils stricts pour une détection précoce des anomalies',
    descriptionEn: 'Strict thresholds for early anomaly detection',
    thresholds: {
      varianceWarning: 10,
      varianceCritical: 20,
      currentRatioMin: 1.5,
      currentRatioMax: 2.5,
      quickRatioMin: 1.0,
      debtToEquityMax: 1.5,
    },
  },
  balanced: {
    name: 'Équilibré',
    nameEn: 'Balanced',
    description: 'Configuration recommandée pour la plupart des entreprises',
    descriptionEn: 'Recommended configuration for most businesses',
    thresholds: {
      varianceWarning: 15,
      varianceCritical: 30,
      currentRatioMin: 1.2,
      currentRatioMax: 3.0,
      quickRatioMin: 0.8,
      debtToEquityMax: 2.0,
    },
  },
  aggressive: {
    name: 'Flexible',
    nameEn: 'Flexible',
    description: 'Seuils plus permissifs pour entreprises en croissance',
    descriptionEn: 'More permissive thresholds for growing businesses',
    thresholds: {
      varianceWarning: 25,
      varianceCritical: 50,
      currentRatioMin: 1.0,
      currentRatioMax: 4.0,
      quickRatioMin: 0.6,
      debtToEquityMax: 3.0,
    },
  },
  real_estate: {
    name: 'Immobilier',
    nameEn: 'Real Estate',
    description: 'Optimisé pour le secteur immobilier et locatif',
    descriptionEn: 'Optimized for real estate and rental sector',
    thresholds: {
      varianceWarning: 12,
      varianceCritical: 25,
      currentRatioMin: 1.0,
      currentRatioMax: 2.0,
      quickRatioMin: 0.5,
      debtToEquityMax: 4.0, // Higher leverage is normal in real estate
      receivablesAgingWarning: 30,
      receivablesAgingCritical: 60,
    },
  },
};

// Threshold explanations with industry context
const THRESHOLD_INFO = {
  variance: {
    title: 'Seuils de variance',
    titleEn: 'Variance Thresholds',
    description: 'Détecte les variations significatives entre périodes comptables.',
    descriptionEn: 'Detects significant changes between accounting periods.',
    bestPractice: 'Les normes IFRS suggèrent d\'investiguer les variances >10% sur les postes matériels.',
    bestPracticeEn: 'IFRS standards suggest investigating variances >10% on material items.',
  },
  ratios: {
    title: 'Ratios financiers',
    titleEn: 'Financial Ratios',
    description: 'Indicateurs clés de santé financière et de liquidité.',
    descriptionEn: 'Key indicators of financial health and liquidity.',
    bestPractice: 'Les ratios varient par industrie. Un ratio de liquidité de 1.5-2.0 est généralement sain.',
    bestPracticeEn: 'Ratios vary by industry. A current ratio of 1.5-2.0 is generally healthy.',
  },
  trends: {
    title: 'Détection de tendances',
    titleEn: 'Trend Detection',
    description: 'Identifie les hausses ou baisses consécutives anormales.',
    descriptionEn: 'Identifies abnormal consecutive increases or decreases.',
    bestPractice: '3+ périodes consécutives de variation >10% méritent attention.',
    bestPracticeEn: '3+ consecutive periods with >10% change deserve attention.',
  },
  aging: {
    title: 'Vieillissement des créances',
    titleEn: 'Receivables Aging',
    description: 'Surveille les délais de paiement pour optimiser le flux de trésorerie.',
    descriptionEn: 'Monitors payment delays to optimize cash flow.',
    bestPractice: 'Les créances >90 jours augmentent significativement le risque de défaut.',
    bestPracticeEn: 'Receivables >90 days significantly increase default risk.',
  },
};

export default function ThresholdSettings({ onSave }: ThresholdSettingsProps) {
  const { language } = useI18n();
  const { currentTenant } = useTenant();
  const { isDemoMode } = useDemoMode();
  const isEn = language === 'en';
  
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [originalThresholds, setOriginalThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['variance', 'ratios']));
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Load thresholds from API on mount
  useEffect(() => {
    const loadThresholds = async () => {
      if (!currentTenant?.id) {
        // For demo mode, apply real estate preset by default
        if (isDemoMode) {
          const realEstatePreset = INDUSTRY_PRESETS.real_estate.thresholds;
          const demoThresholds = { ...DEFAULT_THRESHOLDS, ...realEstatePreset };
          setThresholds(demoThresholds);
          setOriginalThresholds(demoThresholds);
          setSelectedPreset('real_estate');
        } else {
          setThresholds(DEFAULT_THRESHOLDS);
          setOriginalThresholds(DEFAULT_THRESHOLDS);
        }
        setLoading(false);
        return;
      }

      // Skip API call in mock auth mode - no valid token to authenticate
      if (!isMockAuthEnabled()) {
        try {
          const settings = await organizationSettingsApi.get();
          let loadedThresholds = DEFAULT_THRESHOLDS;
          
          if (settings?.thresholdSettings) {
            loadedThresholds = settings.thresholdSettings;
          } else if (isDemoMode) {
            // Apply real estate preset for demo mode if no saved settings
            const realEstatePreset = INDUSTRY_PRESETS.real_estate.thresholds;
            loadedThresholds = { ...DEFAULT_THRESHOLDS, ...realEstatePreset };
            setSelectedPreset('real_estate');
          } else {
            // Fallback to localStorage for backward compatibility
            const saved = localStorage.getItem('plainledger-thresholds');
            if (saved) {
              loadedThresholds = JSON.parse(saved);
            }
          }
          
          setThresholds(loadedThresholds);
          setOriginalThresholds(loadedThresholds);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Failed to load thresholds:', error);
        }
      }
      
      // Fallback to localStorage (always used in mock auth mode)
      const saved = localStorage.getItem('plainledger-thresholds');
      if (saved) {
        const savedThresholds = JSON.parse(saved);
        setThresholds(savedThresholds);
        setOriginalThresholds(savedThresholds);
      } else if (isDemoMode) {
        // Apply real estate preset for demo mode
        const realEstatePreset = INDUSTRY_PRESETS.real_estate.thresholds;
        const demoThresholds = { ...DEFAULT_THRESHOLDS, ...realEstatePreset };
        setThresholds(demoThresholds);
        setOriginalThresholds(demoThresholds);
        setSelectedPreset('real_estate');
      }
      setLoading(false);
    };

    loadThresholds();
  }, [currentTenant?.id, isDemoMode]);

  // Track changes by comparing with original loaded values
  useEffect(() => {
    const hasActualChanges = JSON.stringify(thresholds) !== JSON.stringify(originalThresholds);
    setHasChanges(hasActualChanges);
  }, [thresholds, originalThresholds]);

  // Detect current preset match
  useEffect(() => {
    const matchingPreset = Object.entries(INDUSTRY_PRESETS).find(([_, preset]) => {
      return Object.entries(preset.thresholds).every(([key, value]) => 
        thresholds[key as keyof ThresholdConfig] === value
      );
    });
    setSelectedPreset(matchingPreset ? matchingPreset[0] : null);
  }, [thresholds]);

  const handleChange = (key: keyof ThresholdConfig, value: number | boolean) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
    setSelectedPreset(null); // Clear preset when manually changing
  };

  const handleSave = async () => {
    // In mock auth mode or without tenant, just use localStorage
    if (isMockAuthEnabled() || !currentTenant?.id) {
      localStorage.setItem('plainledger-thresholds', JSON.stringify(thresholds));
      setOriginalThresholds(thresholds);
      setHasChanges(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      onSave?.(thresholds);
      return;
    }

    setSaving(true);
    try {
      await organizationSettingsApi.updateThresholds(thresholds);
      // Also save to localStorage for backward compatibility
      localStorage.setItem('plainledger-thresholds', JSON.stringify(thresholds));
      setOriginalThresholds(thresholds);
      setHasChanges(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      onSave?.(thresholds);
    } catch (error) {
      console.error('Failed to save thresholds:', error);
      alert(isEn ? 'Failed to save thresholds. Please try again.' : 'Échec de l\'enregistrement des seuils. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const resetThresholds = isDemoMode 
      ? { ...DEFAULT_THRESHOLDS, ...INDUSTRY_PRESETS.real_estate.thresholds }
      : DEFAULT_THRESHOLDS;
    
    setThresholds(resetThresholds);
    setOriginalThresholds(resetThresholds);
    localStorage.removeItem('plainledger-thresholds');
    
    // Also reset in database (skip in mock auth mode)
    if (currentTenant?.id && !isMockAuthEnabled()) {
      try {
        await organizationSettingsApi.updateThresholds(resetThresholds);
      } catch (error) {
        console.error('Failed to reset thresholds:', error);
      }
    }
    
    setHasChanges(false);
    setSelectedPreset(isDemoMode ? 'real_estate' : null);
  };

  const applyPreset = (presetKey: string) => {
    const preset = INDUSTRY_PRESETS[presetKey];
    if (preset) {
      const newThresholds = { ...thresholds, ...preset.thresholds };
      setThresholds(newThresholds);
      setSelectedPreset(presetKey);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Calculate anomaly preview counts based on current thresholds
  const previewStats = useMemo(() => {
    // This would typically come from actual data analysis
    // For now, we'll show relative sensitivity
    const sensitivity = (100 - thresholds.varianceWarning) / 10;
    return {
      expectedWarnings: Math.round(sensitivity * 3),
      expectedCritical: Math.round(sensitivity * 1),
    };
  }, [thresholds.varianceWarning]);

  return (
    <div className="space-y-6">
      {/* Header with Save Status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            {isEn ? 'Alert Threshold Configuration' : 'Configuration des seuils d\'alerte'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Customize anomaly detection thresholds for your organization'
              : 'Personnalisez les seuils de détection d\'anomalies selon vos besoins'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMessage && (
            <span 
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg animate-fade-in"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.1)',
                color: 'rgb(var(--color-success))',
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {isEn ? 'Saved' : 'Enregistré'}
            </span>
          )}
          <button
            onClick={handleReset}
            className="btn-secondary btn-sm flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Reset' : 'Réinitialiser'}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="loading-spinner w-4 h-4" />
                {isEn ? 'Saving...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEn ? 'Save' : 'Enregistrer'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
          <h4 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Quick Presets' : 'Préréglages rapides'}
          </h4>
          <InfoTooltip
            title={isEn ? 'Industry Presets' : 'Préréglages sectoriels'}
            titleEn="Industry Presets"
            content="Configurations optimisées selon les meilleures pratiques de l'industrie."
            contentEn="Configurations optimized according to industry best practices."
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedPreset === key 
                  ? 'ring-2 ring-offset-1' 
                  : 'hover:border-[rgb(var(--color-primary-500)/0.5)]'
              }`}
              style={{ 
                backgroundColor: selectedPreset === key 
                  ? 'rgb(var(--color-primary-500) / 0.08)' 
                  : 'rgb(var(--color-surface))',
                borderColor: selectedPreset === key 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-border))',
                '--tw-ring-color': 'rgb(var(--color-primary-500) / 0.3)',
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-2 mb-1">
                {key === 'real_estate' ? (
                  <Building2 className="w-4 h-4" style={{ color: selectedPreset === key ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }} />
                ) : key === 'conservative' ? (
                  <Shield className="w-4 h-4" style={{ color: selectedPreset === key ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }} />
                ) : key === 'aggressive' ? (
                  <Zap className="w-4 h-4" style={{ color: selectedPreset === key ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }} />
                ) : (
                  <Target className="w-4 h-4" style={{ color: selectedPreset === key ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }} />
                )}
                <span 
                  className="font-medium text-sm"
                  style={{ color: selectedPreset === key ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))' }}
                >
                  {isEn ? preset.nameEn : preset.name}
                </span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? preset.descriptionEn : preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Variance Thresholds Section */}
      <ThresholdSection
        id="variance"
        icon={TrendingUp}
        iconColor="rgb(var(--color-warning))"
        title={isEn ? THRESHOLD_INFO.variance.titleEn : THRESHOLD_INFO.variance.title}
        description={isEn ? THRESHOLD_INFO.variance.descriptionEn : THRESHOLD_INFO.variance.description}
        bestPractice={isEn ? THRESHOLD_INFO.variance.bestPracticeEn : THRESHOLD_INFO.variance.bestPractice}
        isExpanded={expandedSections.has('variance')}
        onToggle={() => toggleSection('variance')}
        isEn={isEn}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Warning Threshold */}
          <div>
            <label className="label flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-warning))' }} />
              {isEn ? 'Warning Threshold' : 'Seuil d\'attention'} (%)
              <InfoTooltip
                title={isEn ? 'Warning Level' : 'Niveau d\'attention'}
                titleEn="Warning Level"
                content="Variations au-dessus de ce seuil génèrent un avertissement pour investigation."
                contentEn="Variations above this threshold generate a warning for investigation."
                example="15% = variations de ±15% ou plus"
                exampleEn="15% = variations of ±15% or more"
              />
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={thresholds.varianceWarning}
                  onChange={(e) => handleChange('varianceWarning', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--color-warning)) 0%, rgb(var(--color-warning)) ${((thresholds.varianceWarning - 5) / 35) * 100}%, rgb(var(--color-border)) ${((thresholds.varianceWarning - 5) / 35) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>5%</span>
                  <span>{isEn ? 'Recommended: 10-15%' : 'Recommandé: 10-15%'}</span>
                  <span>40%</span>
                </div>
              </div>
              <div className="w-20">
                <input
                  type="number"
                  min="5"
                  max="40"
                  value={thresholds.varianceWarning}
                  onChange={(e) => handleChange('varianceWarning', Math.min(40, Math.max(5, parseInt(e.target.value) || 5)))}
                  className="input text-center text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Critical Threshold */}
          <div>
            <label className="label flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
              {isEn ? 'Critical Threshold' : 'Seuil critique'} (%)
              <InfoTooltip
                title={isEn ? 'Critical Level' : 'Niveau critique'}
                titleEn="Critical Level"
                content="Variations au-dessus de ce seuil génèrent une alerte critique nécessitant action immédiate."
                contentEn="Variations above this threshold generate a critical alert requiring immediate action."
                impact="Les alertes critiques apparaissent en rouge dans le tableau de bord."
                impactEn="Critical alerts appear in red on the dashboard."
              />
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={thresholds.varianceWarning + 5}
                  max="75"
                  step="1"
                  value={thresholds.varianceCritical}
                  onChange={(e) => handleChange('varianceCritical', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--color-error)) 0%, rgb(var(--color-error)) ${((thresholds.varianceCritical - thresholds.varianceWarning - 5) / (70 - thresholds.varianceWarning)) * 100}%, rgb(var(--color-border)) ${((thresholds.varianceCritical - thresholds.varianceWarning - 5) / (70 - thresholds.varianceWarning)) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>{thresholds.varianceWarning + 5}%</span>
                  <span>{isEn ? 'Recommended: 25-30%' : 'Recommandé: 25-30%'}</span>
                  <span>75%</span>
                </div>
              </div>
              <div className="w-20">
                <input
                  type="number"
                  min={thresholds.varianceWarning + 5}
                  max="75"
                  value={thresholds.varianceCritical}
                  onChange={(e) => handleChange('varianceCritical', Math.min(75, Math.max(thresholds.varianceWarning + 5, parseInt(e.target.value) || thresholds.varianceWarning + 5)))}
                  className="input text-center text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Preview */}
        <div 
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Threshold Preview' : 'Aperçu des seuils'}
            </span>
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'How variations will be classified' : 'Classification des variations'}
            </span>
          </div>
          <div className="relative h-8 rounded-lg overflow-hidden flex">
            <div 
              className="h-full flex items-center justify-center transition-all duration-300"
              style={{ 
                backgroundColor: 'rgb(var(--color-success))',
                width: `${thresholds.varianceWarning}%`,
                minWidth: '60px',
              }}
            >
              <span className="text-[10px] font-medium text-white whitespace-nowrap px-1">
                {isEn ? 'Normal' : 'Normal'} (0-{thresholds.varianceWarning}%)
              </span>
            </div>
            <div 
              className="h-full flex items-center justify-center transition-all duration-300"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning))',
                width: `${thresholds.varianceCritical - thresholds.varianceWarning}%`,
                minWidth: '60px',
              }}
            >
              <span className="text-[10px] font-medium text-white whitespace-nowrap px-1">
                {isEn ? 'Warning' : 'Attention'} ({thresholds.varianceWarning}-{thresholds.varianceCritical}%)
              </span>
            </div>
            <div 
              className="h-full flex-1 flex items-center justify-center transition-all duration-300"
              style={{ backgroundColor: 'rgb(var(--color-error))' }}
            >
              <span className="text-[10px] font-medium text-white whitespace-nowrap px-1">
                {isEn ? 'Critical' : 'Critique'} ({thresholds.varianceCritical}%+)
              </span>
            </div>
          </div>
          <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-warning))' }} />
            {isEn 
              ? `With these settings, ~${previewStats.expectedWarnings} warnings and ~${previewStats.expectedCritical} critical alerts are expected per analysis.`
              : `Avec ces paramètres, ~${previewStats.expectedWarnings} avertissements et ~${previewStats.expectedCritical} alertes critiques sont attendus par analyse.`}
          </p>
        </div>
      </ThresholdSection>

      {/* Financial Ratios Section */}
      <ThresholdSection
        id="ratios"
        icon={Scale}
        iconColor="rgb(var(--color-info))"
        title={isEn ? THRESHOLD_INFO.ratios.titleEn : THRESHOLD_INFO.ratios.title}
        description={isEn ? THRESHOLD_INFO.ratios.descriptionEn : THRESHOLD_INFO.ratios.description}
        bestPractice={isEn ? THRESHOLD_INFO.ratios.bestPracticeEn : THRESHOLD_INFO.ratios.bestPractice}
        isExpanded={expandedSections.has('ratios')}
        onToggle={() => toggleSection('ratios')}
        isEn={isEn}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Ratio Min */}
          <RatioInput
            label={isEn ? 'Current Ratio Min' : 'Ratio liquidité min.'}
            value={thresholds.currentRatioMin}
            onChange={(v) => handleChange('currentRatioMin', v)}
            min={0.5}
            max={2.5}
            step={0.1}
            recommended="1.2 - 1.5"
            description={isEn ? 'Current Assets / Current Liabilities' : 'Actifs courants / Passifs courants'}
            tooltipTitle={isEn ? 'Minimum Current Ratio' : 'Ratio de liquidité minimum'}
            tooltipContent={isEn 
              ? 'Below this level, the company may struggle to meet short-term obligations.' 
              : 'En dessous de ce niveau, l\'entreprise peut avoir du mal à honorer ses obligations à court terme.'}
            isEn={isEn}
          />

          {/* Current Ratio Max */}
          <RatioInput
            label={isEn ? 'Current Ratio Max' : 'Ratio liquidité max.'}
            value={thresholds.currentRatioMax}
            onChange={(v) => handleChange('currentRatioMax', v)}
            min={2.0}
            max={5.0}
            step={0.1}
            recommended="2.5 - 3.0"
            description={isEn ? 'High ratio may indicate inefficiency' : 'Un ratio trop élevé peut indiquer une inefficacité'}
            tooltipTitle={isEn ? 'Maximum Current Ratio' : 'Ratio de liquidité maximum'}
            tooltipContent={isEn 
              ? 'Above this level, assets may not be used efficiently to generate returns.' 
              : 'Au-dessus de ce niveau, les actifs ne sont peut-être pas utilisés efficacement.'}
            isEn={isEn}
          />

          {/* Quick Ratio Min */}
          <RatioInput
            label={isEn ? 'Quick Ratio Min' : 'Ratio rapide min.'}
            value={thresholds.quickRatioMin}
            onChange={(v) => handleChange('quickRatioMin', v)}
            min={0.3}
            max={2.0}
            step={0.1}
            recommended="0.8 - 1.0"
            description={isEn ? '(Assets - Inventory) / Liabilities' : '(Actifs - Stocks) / Passifs'}
            tooltipTitle={isEn ? 'Acid Test Ratio' : 'Ratio de liquidité immédiate'}
            tooltipContent={isEn 
              ? 'Measures ability to pay short-term debts without selling inventory.' 
              : 'Mesure la capacité à payer les dettes à court terme sans vendre les stocks.'}
            isEn={isEn}
          />

          {/* Debt to Equity Max */}
          <RatioInput
            label={isEn ? 'Debt/Equity Max' : 'Dette/Capitaux max.'}
            value={thresholds.debtToEquityMax}
            onChange={(v) => handleChange('debtToEquityMax', v)}
            min={0.5}
            max={5.0}
            step={0.1}
            recommended="1.5 - 2.0"
            description={isEn ? 'Maximum leverage ratio' : 'Ratio d\'endettement maximum'}
            tooltipTitle={isEn ? 'Debt-to-Equity Ratio' : 'Ratio dette/capitaux propres'}
            tooltipContent={isEn 
              ? 'Higher values indicate higher financial risk. Real estate typically tolerates higher ratios (3-4).' 
              : 'Des valeurs élevées indiquent un risque financier plus élevé. L\'immobilier tolère généralement des ratios plus élevés (3-4).'}
            isEn={isEn}
          />
        </div>

        {/* Ratio Health Indicators */}
        <div 
          className="mt-4 p-3 rounded-lg flex flex-wrap gap-3"
          style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
        >
          <RatioHealthBadge
            label={isEn ? 'Liquidity' : 'Liquidité'}
            value={thresholds.currentRatioMin}
            goodRange={[1.2, 2.0]}
            isEn={isEn}
          />
          <RatioHealthBadge
            label={isEn ? 'Quick Ratio' : 'Ratio rapide'}
            value={thresholds.quickRatioMin}
            goodRange={[0.8, 1.5]}
            isEn={isEn}
          />
          <RatioHealthBadge
            label={isEn ? 'Leverage' : 'Endettement'}
            value={thresholds.debtToEquityMax}
            goodRange={[1.0, 2.5]}
            inverted
            isEn={isEn}
          />
        </div>
      </ThresholdSection>

      {/* Trend Detection Section */}
      <ThresholdSection
        id="trends"
        icon={BarChart3}
        iconColor="rgb(var(--color-accent-500))"
        title={isEn ? THRESHOLD_INFO.trends.titleEn : THRESHOLD_INFO.trends.title}
        description={isEn ? THRESHOLD_INFO.trends.descriptionEn : THRESHOLD_INFO.trends.description}
        bestPractice={isEn ? THRESHOLD_INFO.trends.bestPracticeEn : THRESHOLD_INFO.trends.bestPractice}
        isExpanded={expandedSections.has('trends')}
        onToggle={() => toggleSection('trends')}
        isEn={isEn}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label flex items-center gap-2">
              {isEn ? 'Consecutive Periods' : 'Périodes consécutives'}
              <InfoTooltip
                title={isEn ? 'Trend Confirmation' : 'Confirmation de tendance'}
                titleEn="Trend Confirmation"
                content="Nombre de périodes consécutives nécessaires pour confirmer une tendance."
                contentEn="Number of consecutive periods needed to confirm a trend."
              />
            </label>
            <div className="flex items-center gap-3">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleChange('trendConsecutivePeriods', num)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                    thresholds.trendConsecutivePeriods === num
                      ? 'ring-2'
                      : 'hover:bg-[rgb(var(--color-surface))]'
                  }`}
                  style={{
                    backgroundColor: thresholds.trendConsecutivePeriods === num 
                      ? 'rgb(var(--color-primary-500) / 0.1)' 
                      : 'rgb(var(--color-surface))',
                    color: thresholds.trendConsecutivePeriods === num 
                      ? 'rgb(var(--color-primary-600))' 
                      : 'rgb(var(--color-text))',
                    border: `1px solid ${thresholds.trendConsecutivePeriods === num 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'rgb(var(--color-border))'}`,
                    '--tw-ring-color': 'rgb(var(--color-primary-500) / 0.3)',
                  } as React.CSSProperties}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Recommended: 3 periods' : 'Recommandé: 3 périodes'}
            </p>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              {isEn ? 'Trend Change Threshold' : 'Changement de tendance'} (%)
              <InfoTooltip
                title={isEn ? 'Minimum Change' : 'Changement minimum'}
                titleEn="Minimum Change"
                content="Variation minimale entre périodes pour être considérée comme significative."
                contentEn="Minimum variation between periods to be considered significant."
              />
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="3"
                max="25"
                value={thresholds.trendPercentageChange}
                onChange={(e) => handleChange('trendPercentageChange', parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-500)) ${((thresholds.trendPercentageChange - 3) / 22) * 100}%, rgb(var(--color-border)) ${((thresholds.trendPercentageChange - 3) / 22) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
              />
              <div className="w-16">
                <input
                  type="number"
                  min="3"
                  max="25"
                  value={thresholds.trendPercentageChange}
                  onChange={(e) => handleChange('trendPercentageChange', parseInt(e.target.value) || 3)}
                  className="input text-center text-sm font-mono"
                />
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Recommended: 8-12%' : 'Recommandé: 8-12%'}
            </p>
          </div>
        </div>
      </ThresholdSection>

      {/* Aging Thresholds Section */}
      <ThresholdSection
        id="aging"
        icon={Clock}
        iconColor="rgb(var(--color-primary-600))"
        title={isEn ? THRESHOLD_INFO.aging.titleEn : THRESHOLD_INFO.aging.title}
        description={isEn ? THRESHOLD_INFO.aging.descriptionEn : THRESHOLD_INFO.aging.description}
        bestPractice={isEn ? THRESHOLD_INFO.aging.bestPracticeEn : THRESHOLD_INFO.aging.bestPractice}
        isExpanded={expandedSections.has('aging')}
        onToggle={() => toggleSection('aging')}
        isEn={isEn}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AgingInput
            label={isEn ? 'Receivables - Warning' : 'Créances - Attention'}
            value={thresholds.receivablesAgingWarning}
            onChange={(v) => handleChange('receivablesAgingWarning', v)}
            recommended={45}
            severity="warning"
            isEn={isEn}
          />
          <AgingInput
            label={isEn ? 'Receivables - Critical' : 'Créances - Critique'}
            value={thresholds.receivablesAgingCritical}
            onChange={(v) => handleChange('receivablesAgingCritical', v)}
            recommended={90}
            severity="critical"
            isEn={isEn}
          />
          <AgingInput
            label={isEn ? 'Payables - Warning' : 'Fournisseurs - Attention'}
            value={thresholds.payablesAgingWarning}
            onChange={(v) => handleChange('payablesAgingWarning', v)}
            recommended={45}
            severity="warning"
            isEn={isEn}
          />
        </div>
      </ThresholdSection>

      {/* Amount Thresholds Section */}
      <ThresholdSection
        id="amounts"
        icon={DollarSign}
        iconColor="rgb(var(--color-success))"
        title={isEn ? 'Amount Thresholds' : 'Seuils de montants'}
        description={isEn ? 'Configure thresholds for large transactions and suspicious amounts' : 'Configurez les seuils pour les transactions importantes et montants suspects'}
        bestPractice={isEn ? 'Large transaction thresholds typically start at $10,000-50,000 depending on company size.' : 'Les seuils de transactions importantes commencent généralement à 10 000-50 000 $ selon la taille de l\'entreprise.'}
        isExpanded={expandedSections.has('amounts')}
        onToggle={() => toggleSection('amounts')}
        isEn={isEn}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label flex items-center gap-2">
              {isEn ? 'Large Transaction ($)' : 'Transaction importante ($)'}
              <InfoTooltip
                title={isEn ? 'Large Transactions' : 'Transactions importantes'}
                titleEn="Large Transactions"
                content="Les transactions au-dessus de ce montant seront signalées pour vérification."
                contentEn="Transactions above this amount will be flagged for verification."
              />
            </label>
            <input
              type="number"
              step="5000"
              min="1000"
              value={thresholds.largeTransactionAmount}
              onChange={(e) => handleChange('largeTransactionAmount', parseInt(e.target.value) || 0)}
              className="input font-mono"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Recommended: $25,000-50,000' : 'Recommandé: 25 000-50 000 $'}
            </p>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              {isEn ? 'Round Number Threshold ($)' : 'Seuil montant rond ($)'}
              <InfoTooltip
                title={isEn ? 'Round Number Detection' : 'Détection des montants ronds'}
                titleEn="Round Number Detection"
                content="Détecte les montants ronds suspicieux (estimations potentielles)."
                contentEn="Detects suspicious round amounts (potential estimates)."
              />
            </label>
            <input
              type="number"
              step="100"
              min="100"
              value={thresholds.roundNumberThreshold}
              onChange={(e) => handleChange('roundNumberThreshold', parseInt(e.target.value) || 0)}
              className="input font-mono"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Recommended: $1,000' : 'Recommandé: 1 000 $'}
            </p>
          </div>
        </div>
      </ThresholdSection>

      {/* Additional Checks Section */}
      <ThresholdSection
        id="checks"
        icon={Shield}
        iconColor="rgb(var(--color-text-muted))"
        title={isEn ? 'Additional Checks' : 'Vérifications supplémentaires'}
        description={isEn ? 'Enable or disable specific anomaly detection rules' : 'Activez ou désactivez des règles de détection spécifiques'}
        bestPractice={isEn ? 'All checks are recommended for comprehensive monitoring.' : 'Toutes les vérifications sont recommandées pour une surveillance complète.'}
        isExpanded={expandedSections.has('checks')}
        onToggle={() => toggleSection('checks')}
        isEn={isEn}
      >
        <div className="space-y-4">
          <ToggleCheck
            label={isEn ? 'Negative Balance Check' : 'Vérifier les soldes négatifs'}
            description={isEn ? 'Alert if an asset account shows a negative balance' : 'Alerter si un compte d\'actif affiche un solde négatif'}
            checked={thresholds.negativeBalanceCheck}
            onChange={(v) => handleChange('negativeBalanceCheck', v)}
          />
          <ToggleCheck
            label={isEn ? 'Unusual Hours Check' : 'Vérifier les heures inhabituelles'}
            description={isEn ? 'Alert for transactions outside business hours' : 'Alerter pour les transactions hors heures de bureau'}
            checked={thresholds.unusualHoursCheck}
            onChange={(v) => handleChange('unusualHoursCheck', v)}
          />
        </div>
      </ThresholdSection>

      {/* Footer with Unsaved Changes Warning */}
      {hasChanges && (
        <div 
          className="sticky bottom-4 z-50 p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-up"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-warning))',
            boxShadow: '0 -4px 20px rgb(0 0 0 / 0.15), 0 4px 20px rgb(0 0 0 / 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-warning) / 0.15)' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning-dark))' }} />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Unsaved changes' : 'Modifications non enregistrées'}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Save your changes to apply the new thresholds' : 'Enregistrez pour appliquer les nouveaux seuils'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleReset} 
              className="btn-secondary btn-sm flex-1 sm:flex-initial"
            >
              {isEn ? 'Discard' : 'Annuler'}
            </button>
            <button 
              onClick={handleSave} 
              className="btn-primary btn-sm flex items-center gap-2 flex-1 sm:flex-initial justify-center"
            >
              <Save className="w-4 h-4" />
              {isEn ? 'Save' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ThresholdSectionProps {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  bestPractice: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isEn: boolean;
}

function ThresholdSection({ 
  id, 
  icon: Icon, 
  iconColor, 
  title, 
  description, 
  bestPractice,
  isExpanded, 
  onToggle, 
  children,
  isEn,
}: ThresholdSectionProps) {
  return (
    <div 
      className="rounded-xl border overflow-hidden transition-all"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: isExpanded ? 'rgb(var(--color-primary-500) / 0.3)' : 'rgb(var(--color-border))',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-[rgb(var(--color-surface))]"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor.replace(')', ' / 0.1)')}` }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <h4 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              {title}
            </h4>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {description}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 pt-0 animate-fade-in">
          {/* Best Practice Tip */}
          <div 
            className="mb-4 p-3 rounded-lg flex items-start gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
              border: '1px solid rgb(var(--color-primary-500) / 0.15)',
            }}
          >
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <strong style={{ color: 'rgb(var(--color-primary-700))' }}>
                {isEn ? 'Best Practice:' : 'Meilleure pratique :'}
              </strong>{' '}
              {bestPractice}
            </p>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

interface RatioInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  recommended: string;
  description: string;
  tooltipTitle: string;
  tooltipContent: string;
  isEn: boolean;
}

function RatioInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  recommended,
  description,
  tooltipTitle,
  tooltipContent,
  isEn,
}: RatioInputProps) {
  return (
    <div 
      className="p-3 rounded-lg border"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      <label className="label flex items-center gap-1 mb-2">
        {label}
        <InfoTooltip title={tooltipTitle} titleEn={tooltipTitle} content={tooltipContent} contentEn={tooltipContent} />
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || min)}
        className="input text-center font-mono font-semibold"
      />
      <p className="text-[10px] mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {description}
      </p>
      <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
        {isEn ? 'Recommended:' : 'Recommandé:'} {recommended}
      </p>
    </div>
  );
}

interface RatioHealthBadgeProps {
  label: string;
  value: number;
  goodRange: [number, number];
  inverted?: boolean;
  isEn: boolean;
}

function RatioHealthBadge({ label, value, goodRange, inverted = false, isEn }: RatioHealthBadgeProps) {
  const isGood = inverted 
    ? value <= goodRange[1] 
    : value >= goodRange[0] && value <= goodRange[1];
  
  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isGood ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-warning) / 0.1)',
        color: isGood ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))',
      }}
    >
      {isGood ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {label}: {isGood ? (isEn ? 'Optimal' : 'Optimal') : (isEn ? 'Review' : 'À revoir')}
    </div>
  );
}

interface AgingInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  recommended: number;
  severity: 'warning' | 'critical';
  isEn: boolean;
}

function AgingInput({ label, value, onChange, recommended, severity, isEn }: AgingInputProps) {
  const color = severity === 'critical' ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))';
  
  return (
    <div>
      <label className="label flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="15"
          max="180"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 30)}
          className="input font-mono"
        />
        <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'days' : 'jours'}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {isEn ? 'Recommended:' : 'Recommandé:'} {recommended} {isEn ? 'days' : 'jours'}
      </p>
    </div>
  );
}

interface ToggleCheckProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleCheck({ label, description, checked, onChange }: ToggleCheckProps) {
  return (
    <label 
      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-[rgb(var(--color-surface))]"
      style={{ 
        backgroundColor: checked ? 'rgb(var(--color-primary-500) / 0.05)' : 'rgb(var(--color-surface))',
        border: `1px solid ${checked ? 'rgb(var(--color-primary-500) / 0.2)' : 'rgb(var(--color-border))'}`,
      }}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div 
          className={`w-10 h-6 rounded-full transition-colors ${checked ? '' : ''}`}
          style={{ 
            backgroundColor: checked ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border-strong))',
          }}
        >
          <div 
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
            style={{ marginTop: '2px' }}
          />
        </div>
      </div>
      <div className="flex-1">
        <span 
          className="text-sm font-medium"
          style={{ color: checked ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))' }}
        >
          {label}
        </span>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {description}
        </p>
      </div>
    </label>
  );
}
