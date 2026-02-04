/**
 * DecisionCapture Component
 * 
 * Inline component that captures decision context from charts.
 * Part of the Context Graphs flywheel - charts become decision surfaces.
 * 
 * Features:
 * - Industry-specific action templates
 * - Expected impact estimation
 * - Outcome tracking reminder scheduling
 * - AI-suggested actions based on similar businesses
 */

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Calendar,
  Lightbulb,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Users,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import {
  type IndustryType,
  type BusinessSize,
  type ActionType,
  type ConfidenceLevel,
  type DataMetric,
  type DecisionEvent,
  type DecisionTrigger,
  type ActionTemplate,
  getActionTemplatesForIndustry,
  createDecisionEvent,
  calculateGapPercentage,
  formatDecisionSummary,
  getIndustryName,
} from '../lib/decisionContext';

// Theme colors - Corporate green palette (using CSS variables)
const colors = {
  green: 'rgb(var(--color-primary-600))',      // emerald-600
  greenDark: 'rgb(var(--color-primary-700))',  // emerald-700
  greenLight: 'rgb(var(--color-primary-500))', // emerald-500
  gold: 'rgb(var(--color-accent-500))',        // amber-500 (for UI)
  goldDark: 'rgb(var(--color-accent-600))',    // amber-600
};

// =====================================================
// TYPES
// =====================================================

interface DecisionCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (decision: DecisionEvent) => void;
  
  // Context from the chart
  trigger: {
    metricType: DataMetric;
    metricLabel?: string;
    chartId?: string;
    currentValue: number;
    benchmarkValue?: number;
    period?: string;
  };
  
  // Organization context
  organizationId: string;
  industry: IndustryType;
  businessSize: BusinessSize;
  
  // Optional: AI-suggested patterns
  suggestedPatterns?: {
    actionType: ActionType;
    description: string;
    successRate: number;
    sampleSize: number;
    avgImpact: number;
  }[];
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

function ActionTemplateCard({ 
  template, 
  isSelected, 
  onSelect, 
  language,
  isDark,
}: { 
  template: ActionTemplate;
  isSelected: boolean;
  onSelect: () => void;
  language: 'en' | 'fr';
  isDark: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl transition-all duration-200"
      style={{
        backgroundColor: isSelected 
          ? (isDark ? `${colors.green}25` : `${colors.green}12`)
          : (isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)'),
        border: `2px solid ${isSelected ? colors.green : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-semibold mb-1 truncate"
            style={{ color: isSelected ? colors.green : (isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)') }}
          >
            {language === 'fr' ? template.label.fr : template.label.en}
          </p>
          <p 
            className="text-xs line-clamp-2"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {language === 'fr' ? template.description.fr : template.description.en}
          </p>
        </div>
        {isSelected && (
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.green }} />
        )}
      </div>
      
      {/* Success rate and impact */}
      {(template.successRate || template.avgImpact) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.5)' }}>
          {template.successRate && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" style={{ color: colors.green }} />
              <span className="text-[10px] font-semibold" style={{ color: colors.green }}>
                {template.successRate}% {language === 'fr' ? 'succès' : 'success'}
              </span>
            </div>
          )}
          {template.avgImpact && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" style={{ color: colors.gold }} />
              <span className="text-[10px] font-medium" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                ${template.avgImpact.min.toLocaleString()}-${template.avgImpact.max.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function SuggestedPatternCard({
  pattern,
  onSelect,
  language,
  isDark,
}: {
  pattern: {
    actionType: ActionType;
    description: string;
    successRate: number;
    sampleSize: number;
    avgImpact: number;
  };
  onSelect: () => void;
  language: 'en' | 'fr';
  isDark: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl transition-all duration-200 hover:scale-102"
      style={{
        background: isDark 
          ? `linear-gradient(135deg, ${colors.gold}15 0%, ${colors.green}10 100%)`
          : `linear-gradient(135deg, ${colors.gold}10 0%, ${colors.green}08 100%)`,
        border: `1px solid ${isDark ? `${colors.gold}40` : `${colors.gold}30`}`,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
        <div className="flex-1">
          <p 
            className="text-xs font-semibold mb-1"
            style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
          >
            {language === 'fr' ? 'Basé sur' : 'Based on'} {pattern.sampleSize} {language === 'fr' ? 'entreprises similaires' : 'similar businesses'}
          </p>
          <p 
            className="text-xs"
            style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
          >
            {pattern.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span 
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${colors.green}20`, color: colors.green }}
          >
            {pattern.successRate}% {language === 'fr' ? 'succès' : 'success'}
          </span>
          <span 
            className="text-[10px] font-medium"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            ~${pattern.avgImpact.toLocaleString()}/mo
          </span>
        </div>
        <ArrowRight className="w-4 h-4" style={{ color: colors.gold }} />
      </div>
    </button>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function DecisionCapture({
  isOpen,
  onClose,
  onSave,
  trigger,
  organizationId,
  industry,
  businessSize,
  suggestedPatterns,
}: DecisionCaptureProps) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  
  // Form state
  const [step, setStep] = useState<'action' | 'details' | 'confirm'>('action');
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [customAction, setCustomAction] = useState('');
  const [description, setDescription] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [impactPeriod, setImpactPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('medium');
  const [reasoning, setReasoning] = useState('');
  const [reminderDays, setReminderDays] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get action templates for this industry
  const actionTemplates = getActionTemplatesForIndustry(industry);
  
  // Calculate gap percentage if benchmark is available
  const gapPercentage = trigger.benchmarkValue 
    ? calculateGapPercentage(trigger.currentValue, trigger.benchmarkValue)
    : undefined;
  
  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('action');
        setSelectedAction(null);
        setCustomAction('');
        setDescription('');
        setExpectedImpact('');
        setImpactPeriod('monthly');
        setConfidence('medium');
        setReasoning('');
        setReminderDays(30);
      }, 300);
    }
  }, [isOpen]);
  
  // Handle action selection from template
  const handleSelectTemplate = (template: ActionTemplate) => {
    setSelectedAction(template.actionType);
    setDescription(isEn ? template.description.en : template.description.fr);
    if (template.avgImpact) {
      setExpectedImpact(String(Math.round((template.avgImpact.min + template.avgImpact.max) / 2)));
    }
  };
  
  // Handle suggested pattern selection
  const handleSelectPattern = (pattern: NonNullable<typeof suggestedPatterns>[0]) => {
    setSelectedAction(pattern.actionType);
    setDescription(pattern.description);
    setExpectedImpact(String(pattern.avgImpact));
    setConfidence('high'); // AI-suggested = high confidence
  };
  
  // Handle save
  const handleSave = async () => {
    if (!selectedAction && !customAction) return;
    
    setIsSaving(true);
    
    try {
      const decisionTrigger: DecisionTrigger = {
        metricType: trigger.metricType,
        metricLabel: trigger.metricLabel,
        chartId: trigger.chartId,
        currentValue: trigger.currentValue,
        benchmarkValue: trigger.benchmarkValue,
        gapPercentage,
        period: trigger.period,
      };
      
      const decision = createDecisionEvent({
        organizationId,
        industry,
        businessSize,
        trigger: decisionTrigger,
        decision: {
          actionType: selectedAction || 'custom',
          actionLabel: customAction || undefined,
          description,
          expectedImpact: parseFloat(expectedImpact) || 0,
          expectedImpactPeriod: impactPeriod,
          confidence,
          reasoning: reasoning || undefined,
        },
        source: suggestedPatterns?.some(p => p.actionType === selectedAction) ? 'ai_suggested' : 'user',
      });
      
      // Set reminder days
      decision.reminderDays = reminderDays;
      decision.reminderScheduled = true;
      
      // Save to API
      try {
        const { intelligenceApi } = await import('../lib/intelligence-api');
        await intelligenceApi.captureDecision({
          organizationId,
          industry,
          businessSize,
          trigger: {
            metric: trigger.metricType,
            currentValue: trigger.currentValue,
            benchmarkValue: trigger.benchmarkValue || trigger.currentValue,
            gapPercentage: gapPercentage || 0,
            chartContext: trigger.chartId,
          },
          decision: {
            actionType: selectedAction || 'custom',
            description,
            reasoning: reasoning || undefined,
            expectedImpact: parseFloat(expectedImpact) || 0,
            confidence,
          },
          source: suggestedPatterns?.some(p => p.actionType === selectedAction) ? 'ai_suggested' : 'user',
        });
      } catch (error) {
        console.error('Failed to save decision to API:', error);
        // Still call onSave for local state management
      }
      
      await onSave(decision);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };
  
  // Determine if we can proceed to next step
  const canProceed = step === 'action' 
    ? (selectedAction || customAction.trim())
    : step === 'details'
      ? (description.trim() && expectedImpact)
      : true;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
          />
          
          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-hidden flex flex-col"
            style={{
              backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${colors.green}20` }}
                >
                  <Target className="w-5 h-5" style={{ color: colors.green }} />
                </div>
                <div>
                  <h2 
                    className="text-lg font-bold"
                    style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                  >
                    {isEn ? 'Record Decision' : 'Enregistrer une décision'}
                  </h2>
                  <p 
                    className="text-xs"
                    style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                  >
                    {getIndustryName(industry, language)} • {trigger.metricLabel || trigger.metricType}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-opacity-80"
                style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(241, 245, 249, 1)' }}
              >
                <X className="w-5 h-5" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }} />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div 
              className="flex items-center gap-2 px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.5)' }}
            >
              {(['action', 'details', 'confirm'] as const).map((s, idx) => (
                <div key={s} className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: step === s || (idx < ['action', 'details', 'confirm'].indexOf(step)) 
                        ? colors.green 
                        : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 1)'),
                      color: step === s || (idx < ['action', 'details', 'confirm'].indexOf(step))
                        ? 'white'
                        : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span 
                    className="text-xs font-medium hidden sm:inline"
                    style={{ color: step === s ? colors.green : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)') }}
                  >
                    {s === 'action' 
                      ? (isEn ? 'Action' : 'Action')
                      : s === 'details'
                        ? (isEn ? 'Details' : 'Détails')
                        : (isEn ? 'Confirm' : 'Confirmer')
                    }
                  </span>
                  {idx < 2 && (
                    <ChevronRight className="w-4 h-4" style={{ color: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 1)' }} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Context Banner */}
            <div 
              className="mx-5 mt-4 p-3 rounded-xl flex-shrink-0"
              style={{
                background: isDark 
                  ? `linear-gradient(135deg, rgba(71, 85, 105, 0.5) 0%, rgba(51, 65, 85, 0.5) 100%)`
                  : `linear-gradient(135deg, rgba(241, 245, 249, 1) 0%, rgba(248, 250, 252, 1) 100%)`,
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p 
                    className="text-xs font-medium mb-0.5"
                    style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                  >
                    {isEn ? 'Current Value' : 'Valeur actuelle'}
                  </p>
                  <p 
                    className="text-lg font-bold"
                    style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                  >
                    {typeof trigger.currentValue === 'number' && trigger.currentValue > 100
                      ? `$${trigger.currentValue.toLocaleString()}`
                      : `${trigger.currentValue}${trigger.metricLabel?.includes('%') ? '%' : ''}`
                    }
                  </p>
                </div>
                {trigger.benchmarkValue && (
                  <div className="text-right">
                    <p 
                      className="text-xs font-medium mb-0.5"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'vs Benchmark' : 'vs Référence'}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {gapPercentage && gapPercentage < 0 ? (
                        <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                      ) : (
                        <TrendingUp className="w-4 h-4" style={{ color: colors.green }} />
                      )}
                      <p 
                        className="text-lg font-bold"
                        style={{ color: gapPercentage && gapPercentage < 0 ? '#ef4444' : colors.green }}
                      >
                        {gapPercentage && gapPercentage >= 0 ? '+' : ''}{gapPercentage?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Step 1: Action Selection */}
              {step === 'action' && (
                <div className="space-y-4">
                  {/* AI-Suggested Patterns */}
                  {suggestedPatterns && suggestedPatterns.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4" style={{ color: colors.gold }} />
                        <h3 
                          className="text-sm font-semibold"
                          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                        >
                          {isEn ? 'Recommended by Similar Businesses' : 'Recommandé par des entreprises similaires'}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {suggestedPatterns.slice(0, 2).map((pattern, idx) => (
                          <SuggestedPatternCard
                            key={idx}
                            pattern={pattern}
                            onSelect={() => handleSelectPattern(pattern)}
                            language={language}
                            isDark={isDark}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Templates */}
                  <div>
                    <h3 
                      className="text-sm font-semibold mb-3"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {isEn ? 'What action are you taking?' : 'Quelle action prenez-vous?'}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {actionTemplates.map((template, idx) => (
                        <ActionTemplateCard
                          key={idx}
                          template={template}
                          isSelected={selectedAction === template.actionType}
                          onSelect={() => handleSelectTemplate(template)}
                          language={language}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Custom Action */}
                  <div>
                    <label 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Or describe a custom action:' : 'Ou décrivez une action personnalisée:'}
                    </label>
                    <input
                      type="text"
                      value={customAction}
                      onChange={(e) => {
                        setCustomAction(e.target.value);
                        if (e.target.value) setSelectedAction(null);
                      }}
                      placeholder={isEn ? 'e.g., Hire a new sales rep...' : 'ex., Embaucher un nouveau représentant...'}
                      className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                      style={{
                        backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                        border: `1px solid ${customAction ? colors.green : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
                        color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)',
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Step 2: Details */}
              {step === 'details' && (
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <label 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Describe your action *' : 'Décrivez votre action *'}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={isEn ? 'What specifically are you doing?' : 'Que faites-vous exactement?'}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                      style={{
                        backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                        color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)',
                      }}
                    />
                  </div>
                  
                  {/* Expected Impact */}
                  <div>
                    <label 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Expected impact ($) *' : 'Impact attendu ($) *'}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                        />
                        <input
                          type="number"
                          value={expectedImpact}
                          onChange={(e) => setExpectedImpact(e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                          style={{
                            backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                            color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)',
                          }}
                        />
                      </div>
                      <select
                        value={impactPeriod}
                        onChange={(e) => setImpactPeriod(e.target.value as typeof impactPeriod)}
                        className="px-3 py-3 rounded-xl text-sm"
                        style={{
                          backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                          border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                          color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)',
                        }}
                      >
                        <option value="monthly">{isEn ? '/month' : '/mois'}</option>
                        <option value="quarterly">{isEn ? '/quarter' : '/trim.'}</option>
                        <option value="annual">{isEn ? '/year' : '/an'}</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Confidence */}
                  <div>
                    <label 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Confidence level' : 'Niveau de confiance'}
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setConfidence(level)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: confidence === level 
                              ? (level === 'high' ? colors.green : level === 'medium' ? colors.gold : '#ef4444')
                              : (isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)'),
                            color: confidence === level 
                              ? 'white'
                              : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                            border: `1px solid ${confidence === level 
                              ? 'transparent' 
                              : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
                          }}
                        >
                          {isEn 
                            ? (level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low')
                            : (level === 'high' ? 'Élevé' : level === 'medium' ? 'Moyen' : 'Faible')
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Reasoning (optional) */}
                  <div>
                    <label 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Why this action? (optional)' : 'Pourquoi cette action? (optionnel)'}
                    </label>
                    <textarea
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      placeholder={isEn ? 'Document your reasoning...' : 'Documentez votre raisonnement...'}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                      style={{
                        backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                        color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)',
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div 
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                    }}
                  >
                    <h4 
                      className="text-sm font-semibold mb-3"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {isEn ? 'Decision Summary' : 'Résumé de la décision'}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p 
                          className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                        >
                          {isEn ? 'Action' : 'Action'}
                        </p>
                        <p 
                          className="text-sm font-semibold"
                          style={{ color: colors.green }}
                        >
                          {customAction || (selectedAction 
                            ? (actionTemplates.find(t => t.actionType === selectedAction)?.label[language] || selectedAction)
                            : ''
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <p 
                          className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                        >
                          {isEn ? 'Description' : 'Description'}
                        </p>
                        <p 
                          className="text-sm"
                          style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)' }}
                        >
                          {description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div>
                          <p 
                            className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                          >
                            {isEn ? 'Expected Impact' : 'Impact attendu'}
                          </p>
                          <p 
                            className="text-lg font-bold"
                            style={{ color: colors.gold }}
                          >
                            ${parseFloat(expectedImpact || '0').toLocaleString()}
                            <span className="text-xs font-normal ml-1">
                              /{impactPeriod === 'monthly' ? (isEn ? 'mo' : 'mois') : impactPeriod === 'quarterly' ? (isEn ? 'qtr' : 'trim') : (isEn ? 'yr' : 'an')}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p 
                            className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                          >
                            {isEn ? 'Confidence' : 'Confiance'}
                          </p>
                          <span 
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: confidence === 'high' ? `${colors.green}20` : confidence === 'medium' ? `${colors.gold}20` : '#fee2e220',
                              color: confidence === 'high' ? colors.green : confidence === 'medium' ? colors.gold : '#ef4444',
                            }}
                          >
                            {isEn 
                              ? (confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low')
                              : (confidence === 'high' ? 'Élevé' : confidence === 'medium' ? 'Moyen' : 'Faible')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Outcome Tracking */}
                  <div 
                    className="p-4 rounded-xl"
                    style={{
                      background: isDark 
                        ? `linear-gradient(135deg, ${colors.gold}15 0%, ${colors.green}10 100%)`
                        : `linear-gradient(135deg, ${colors.gold}08 0%, ${colors.green}05 100%)`,
                      border: `1px solid ${isDark ? `${colors.gold}30` : `${colors.gold}20`}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div className="flex-1">
                        <h4 
                          className="text-sm font-semibold mb-1"
                          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                        >
                          {isEn ? 'Track your outcome' : 'Suivez votre résultat'}
                        </h4>
                        <p 
                          className="text-xs mb-3"
                          style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
                        >
                          {isEn 
                            ? 'We\'ll remind you to check if this decision worked.' 
                            : 'Nous vous rappellerons de vérifier si cette décision a fonctionné.'
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-xs font-medium"
                            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                          >
                            {isEn ? 'Remind me in:' : 'Me rappeler dans:'}
                          </span>
                          <select
                            value={reminderDays}
                            onChange={(e) => setReminderDays(parseInt(e.target.value))}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'white',
                              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                              color: colors.gold,
                            }}
                          >
                            <option value={30}>{isEn ? '30 days' : '30 jours'}</option>
                            <option value={60}>{isEn ? '60 days' : '60 jours'}</option>
                            <option value={90}>{isEn ? '90 days' : '90 jours'}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Network Effect Note */}
                  <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)' }}>
                    <Users className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.green }} />
                    <p 
                      className="text-[11px]"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn 
                        ? 'Your anonymized decision helps improve recommendations for all businesses in your industry.'
                        : 'Votre décision anonymisée aide à améliorer les recommandations pour toutes les entreprises de votre secteur.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-t flex-shrink-0"
              style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)' }}
            >
              {step !== 'action' ? (
                <button
                  onClick={() => setStep(step === 'confirm' ? 'details' : 'action')}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 1)',
                    color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)',
                  }}
                >
                  {isEn ? 'Back' : 'Retour'}
                </button>
              ) : (
                <div />
              )}
              
              <button
                onClick={() => {
                  if (step === 'action') setStep('details');
                  else if (step === 'details') setStep('confirm');
                  else handleSave();
                }}
                disabled={!canProceed || isSaving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  background: canProceed 
                    ? `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`
                    : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 1)'),
                  boxShadow: canProceed ? `0 4px 12px ${colors.green}35` : 'none',
                }}
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEn ? 'Saving...' : 'Sauvegarde...'}
                  </>
                ) : step === 'confirm' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {isEn ? 'Save Decision' : 'Sauvegarder'}
                  </>
                ) : (
                  <>
                    {isEn ? 'Continue' : 'Continuer'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export a trigger button component for use in charts
export function DecisionCaptureButton({
  onClick,
  isDark,
  compact = false,
}: {
  onClick: () => void;
  isDark: boolean;
  compact?: boolean;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="p-1.5 rounded-lg transition-all hover:scale-110"
        style={{
          backgroundColor: `${colors.green}20`,
          color: colors.green,
        }}
        title={isEn ? 'Record Decision' : 'Enregistrer une décision'}
      >
        <Target className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
      style={{
        backgroundColor: `${colors.green}15`,
        color: colors.green,
        border: `1px solid ${colors.green}30`,
      }}
    >
      <Target className="w-3.5 h-3.5" />
      {isEn ? 'Record Decision' : 'Décision'}
    </button>
  );
}
