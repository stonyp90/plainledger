/**
 * ChartColorPicker Component
 * 
 * FP&A-optimized color selection for charts with:
 * - Pre-built IBCS-compliant color presets
 * - Custom color overrides
 * - Live preview
 * - Theme-aware defaults
 * 
 * Bilingual support (EN/FR)
 */

import { useState } from 'react';
import {
  Palette,
  Check,
  ChevronDown,
  RefreshCw,
  Paintbrush,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { FPA_COLOR_PRESETS, type ChartColorPreset } from './types';

// =====================================================
// TYPES
// =====================================================

interface ChartColorPickerProps {
  selectedPreset: string;
  customColors?: Partial<ChartColorPreset>;
  onPresetChange: (presetId: string) => void;
  onCustomColorChange: (key: keyof ChartColorPreset, color: string) => void;
  onReset: () => void;
  showCustomizer?: boolean;
}

interface ColorSwatchProps {
  color: string;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

// =====================================================
// COLOR SWATCH COMPONENT
// =====================================================

function ColorSwatch({ color, label, selected, onClick }: ColorSwatchProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-8 h-8 rounded-lg transition-all duration-200
        ${selected ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105'}
      `}
      style={{ backgroundColor: color }}
      title={label}
    >
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check className="w-4 h-4 text-white drop-shadow-md" />
        </div>
      )}
    </button>
  );
}

// =====================================================
// COLOR INPUT COMPONENT
// =====================================================

interface ColorInputProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

function ColorInput({ label, color, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-xs font-medium"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md border"
          style={{
            backgroundColor: color,
            borderColor: 'rgb(var(--color-border))',
          }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          style={{ backgroundColor: 'transparent' }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs font-mono rounded border"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ChartColorPicker({
  selectedPreset,
  customColors,
  onPresetChange,
  onCustomColorChange,
  onReset,
  showCustomizer = true,
}: ChartColorPickerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const currentPreset = FPA_COLOR_PRESETS.find((p) => p.id === selectedPreset) || FPA_COLOR_PRESETS[0];

  // Merge custom colors with preset
  const activeColors: ChartColorPreset = {
    ...currentPreset,
    ...customColors,
  };

  return (
    <div className="space-y-4">
      {/* Preset Selector */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Color Theme' : 'Thème de couleur'}
        </label>

        {/* Compact preset dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: isExpanded
                ? 'rgb(var(--color-primary-500))'
                : 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Color preview dots */}
              <div className="flex gap-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeColors.primary }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeColors.positive }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeColors.negative }}
                />
              </div>
              <span className="text-sm font-medium">
                {isEn ? currentPreset.nameEn : currentPreset.name}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </button>

          {/* Dropdown menu */}
          {isExpanded && (
            <div
              className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2"
              style={{
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              {FPA_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onPresetChange(preset.id);
                    setIsExpanded(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                  style={{
                    color:
                      preset.id === selectedPreset
                        ? 'rgb(var(--color-primary-500))'
                        : 'rgb(var(--color-text))',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Color preview dots */}
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.positive }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.negative }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {isEn ? preset.nameEn : preset.name}
                    </span>
                  </div>
                  {preset.id === selectedPreset && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: 'rgb(var(--color-primary-500))' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Color Preview Bar */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Color Preview' : 'Aperçu des couleurs'}
        </label>
        <div
          className="grid grid-cols-9 gap-1 p-2 rounded-lg"
          style={{
            backgroundColor: 'rgb(var(--color-bg-muted))',
          }}
        >
          {[
            { key: 'primary', label: isEn ? 'Primary' : 'Principal' },
            { key: 'secondary', label: isEn ? 'Secondary' : 'Secondaire' },
            { key: 'accent', label: 'Accent' },
            { key: 'positive', label: isEn ? 'Positive' : 'Positif' },
            { key: 'negative', label: isEn ? 'Negative' : 'Négatif' },
            { key: 'neutral', label: isEn ? 'Neutral' : 'Neutre' },
            { key: 'actual', label: isEn ? 'Actual' : 'Réel' },
            { key: 'plan', label: 'Plan' },
            { key: 'forecast', label: isEn ? 'Forecast' : 'Prévision' },
          ].map((item) => (
            <div key={item.key} className="flex flex-col items-center gap-1">
              <div
                className="w-full aspect-square rounded-md"
                style={{
                  backgroundColor: activeColors[item.key as keyof ChartColorPreset] as string,
                }}
              />
              <span
                className="text-[8px] truncate w-full text-center"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Color Editor */}
      {showCustomizer && (
        <div>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center gap-2 text-xs font-medium transition-colors"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            {isEn ? 'Customize colors' : 'Personnaliser les couleurs'}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showCustom ? 'rotate-180' : ''}`}
            />
          </button>

          {showCustom && (
            <div
              className="mt-3 p-4 rounded-lg space-y-3"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <p
                className="text-xs mb-3"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn
                  ? 'Override preset colors for this chart'
                  : 'Remplacer les couleurs prédéfinies pour ce graphique'}
              </p>

              <div className="grid grid-cols-1 gap-3">
                <ColorInput
                  label={isEn ? 'Primary Color' : 'Couleur principale'}
                  color={activeColors.primary}
                  onChange={(color) => onCustomColorChange('primary', color)}
                />
                <ColorInput
                  label={isEn ? 'Positive (Favorable)' : 'Positif (Favorable)'}
                  color={activeColors.positive}
                  onChange={(color) => onCustomColorChange('positive', color)}
                />
                <ColorInput
                  label={isEn ? 'Negative (Unfavorable)' : 'Négatif (Défavorable)'}
                  color={activeColors.negative}
                  onChange={(color) => onCustomColorChange('negative', color)}
                />
                <ColorInput
                  label={isEn ? 'Actual (AC)' : 'Réel (AC)'}
                  color={activeColors.actual}
                  onChange={(color) => onCustomColorChange('actual', color)}
                />
                <ColorInput
                  label="Plan (PL)"
                  color={activeColors.plan}
                  onChange={(color) => onCustomColorChange('plan', color)}
                />
              </div>

              <button
                onClick={onReset}
                className="flex items-center gap-2 mt-4 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text-muted))',
                }}
              >
                <RefreshCw className="w-3 h-3" />
                {isEn ? 'Reset to preset' : 'Réinitialiser'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* IBCS Compliance Note */}
      <div
        className="flex items-start gap-2 p-3 rounded-lg"
        style={{
          backgroundColor: 'rgb(var(--color-info) / 0.08)',
          border: '1px solid rgb(var(--color-info) / 0.2)',
        }}
      >
        <Palette className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-info))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn
            ? 'IBCS Compliance: Green/Red colors follow variance semantics. Green = favorable for revenue/profit, unfavorable for expenses.'
            : 'Conformité IBCS : Les couleurs vert/rouge suivent la sémantique des écarts. Vert = favorable pour revenus/bénéfices, défavorable pour dépenses.'}
        </p>
      </div>
    </div>
  );
}
