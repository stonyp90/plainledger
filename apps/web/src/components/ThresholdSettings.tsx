import { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertTriangle, Info, TrendingUp, Scale, Clock } from 'lucide-react';
import { DEFAULT_THRESHOLDS, type ThresholdConfig } from '../lib/anomalyDetection';

interface ThresholdSettingsProps {
  onSave?: (thresholds: ThresholdConfig) => void;
}

export default function ThresholdSettings({ onSave }: ThresholdSettingsProps) {
  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    const saved = localStorage.getItem('plainledger-thresholds');
    return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('plainledger-thresholds');
    const savedThresholds = saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
    setHasChanges(JSON.stringify(thresholds) !== JSON.stringify(savedThresholds));
  }, [thresholds]);

  const handleChange = (key: keyof ThresholdConfig, value: number | boolean) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('plainledger-thresholds', JSON.stringify(thresholds));
    setHasChanges(false);
    onSave?.(thresholds);
  };

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem('plainledger-thresholds');
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-title">Configuration des seuils d'alerte</h3>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Personnalisez les seuils de détection d'anomalies selon vos besoins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="btn-primary text-sm flex items-center gap-2"
            style={{ opacity: hasChanges ? 1 : 0.5 }}
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {/* Variance Thresholds */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
          <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Seuils de variance
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1">
              Seuil d'attention (%)
              <Info className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="50"
                value={thresholds.varianceWarning}
                onChange={(e) => handleChange('varianceWarning', parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="w-16">
                <input
                  type="number"
                  value={thresholds.varianceWarning}
                  onChange={(e) => handleChange('varianceWarning', parseInt(e.target.value) || 0)}
                  className="input text-center text-sm"
                />
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Variation déclenchant un avertissement
            </p>
          </div>
          
          <div>
            <label className="label flex items-center gap-1">
              Seuil critique (%)
              <AlertTriangle className="w-3 h-3" style={{ color: 'rgb(var(--color-error))' }} />
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="100"
                value={thresholds.varianceCritical}
                onChange={(e) => handleChange('varianceCritical', parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="w-16">
                <input
                  type="number"
                  value={thresholds.varianceCritical}
                  onChange={(e) => handleChange('varianceCritical', parseInt(e.target.value) || 0)}
                  className="input text-center text-sm"
                />
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Variation déclenchant une alerte critique
            </p>
          </div>
        </div>
        
        {/* Visual preview */}
        <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Aperçu:</p>
          <div className="h-4 rounded-full overflow-hidden flex">
            <div 
              className="h-full flex items-center justify-center text-[9px] text-white font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-success))',
                width: `${thresholds.varianceWarning}%`
              }}
            >
              Normal
            </div>
            <div 
              className="h-full flex items-center justify-center text-[9px] text-white font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning))',
                width: `${thresholds.varianceCritical - thresholds.varianceWarning}%`
              }}
            >
              Attention
            </div>
            <div 
              className="h-full flex-1 flex items-center justify-center text-[9px] text-white font-medium"
              style={{ backgroundColor: 'rgb(var(--color-error))' }}
            >
              Critique
            </div>
          </div>
        </div>
      </div>

      {/* Ratio Thresholds */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
          <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Seuils des ratios financiers
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Ratio liquidité min.</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.currentRatioMin}
              onChange={(e) => handleChange('currentRatioMin', parseFloat(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Actifs courants / Passifs courants
            </p>
          </div>
          
          <div>
            <label className="label">Ratio liquidité max.</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.currentRatioMax}
              onChange={(e) => handleChange('currentRatioMax', parseFloat(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Un ratio trop élevé peut indiquer une inefficacité
            </p>
          </div>
          
          <div>
            <label className="label">Ratio rapide min.</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.quickRatioMin}
              onChange={(e) => handleChange('quickRatioMin', parseFloat(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              (Actifs - Stocks) / Passifs
            </p>
          </div>
          
          <div>
            <label className="label">Dette/Capitaux max.</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.debtToEquityMax}
              onChange={(e) => handleChange('debtToEquityMax', parseFloat(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Ratio d'endettement maximum
            </p>
          </div>
        </div>
      </div>

      {/* Trend Detection */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-accent))' }} />
          <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Détection de tendances
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Périodes consécutives</label>
            <input
              type="number"
              min="2"
              max="12"
              value={thresholds.trendConsecutivePeriods}
              onChange={(e) => handleChange('trendConsecutivePeriods', parseInt(e.target.value) || 2)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Nombre de périodes pour confirmer une tendance
            </p>
          </div>
          
          <div>
            <label className="label">Changement de tendance (%)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={thresholds.trendPercentageChange}
              onChange={(e) => handleChange('trendPercentageChange', parseInt(e.target.value) || 1)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Variation minimale entre périodes
            </p>
          </div>
        </div>
      </div>

      {/* Amount Thresholds */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
          <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Seuils de montants
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Transaction importante ($)</label>
            <input
              type="number"
              step="1000"
              value={thresholds.largeTransactionAmount}
              onChange={(e) => handleChange('largeTransactionAmount', parseInt(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Montant déclenchant une vérification
            </p>
          </div>
          
          <div>
            <label className="label">Seuil montant rond ($)</label>
            <input
              type="number"
              step="100"
              value={thresholds.roundNumberThreshold}
              onChange={(e) => handleChange('roundNumberThreshold', parseInt(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Pour détecter les estimations suspectes
            </p>
          </div>
        </div>
      </div>

      {/* Additional Checks */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <h4 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          Vérifications supplémentaires
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={thresholds.negativeBalanceCheck}
              onChange={(e) => handleChange('negativeBalanceCheck', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                Vérifier les soldes négatifs
              </span>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Alerter si un compte d'actif affiche un solde négatif
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={thresholds.unusualHoursCheck}
              onChange={(e) => handleChange('unusualHoursCheck', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                Vérifier les heures inhabituelles
              </span>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Alerter pour les transactions hors heures de bureau
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Aging Thresholds */}
      <div 
        className="p-4 rounded-lg border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <h4 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          Seuils de vieillissement (jours)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Créances - Attention</label>
            <input
              type="number"
              value={thresholds.receivablesAgingWarning}
              onChange={(e) => handleChange('receivablesAgingWarning', parseInt(e.target.value) || 0)}
              className="input"
            />
          </div>
          
          <div>
            <label className="label">Créances - Critique</label>
            <input
              type="number"
              value={thresholds.receivablesAgingCritical}
              onChange={(e) => handleChange('receivablesAgingCritical', parseInt(e.target.value) || 0)}
              className="input"
            />
          </div>
          
          <div>
            <label className="label">Fournisseurs - Attention</label>
            <input
              type="number"
              value={thresholds.payablesAgingWarning}
              onChange={(e) => handleChange('payablesAgingWarning', parseInt(e.target.value) || 0)}
              className="input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
