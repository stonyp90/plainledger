/**
 * AI Suggestions Component
 * 
 * Provides AI-powered insights and suggestions for strategic planning
 */

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, X, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Scenario, RunwayAnalysis } from '../../lib/strategicPlanning';

interface AISuggestionsProps {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  runwayAnalysis: RunwayAnalysis | null;
  onApplySuggestion?: (suggestion: Suggestion) => void;
}

interface Suggestion {
  id: string;
  type: 'warning' | 'opportunity' | 'optimization' | 'insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  action?: {
    label: string;
    labelEn: string;
    onClick: () => void;
  };
}

export default function AISuggestions({
  scenarios,
  activeScenarioId,
  runwayAnalysis,
  onApplySuggestion,
}: AISuggestionsProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // Generate AI suggestions based on data
  useEffect(() => {
    if (!activeScenario || !runwayAnalysis) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate AI analysis (in production, this would call an AI API)
    setTimeout(() => {
      const newSuggestions: Suggestion[] = [];

      // Runway warnings
      if (runwayAnalysis.runwayMonths < 6) {
        newSuggestions.push({
          id: 'runway-warning',
          type: 'warning',
          priority: 'high',
          title: 'Autonomie critique',
          titleEn: 'Critical Runway',
          description: `Votre autonomie de ${runwayAnalysis.runwayMonths.toFixed(1)} mois est critique. Considérez réduire les dépenses ou augmenter les revenus.`,
          descriptionEn: `Your runway of ${runwayAnalysis.runwayMonths.toFixed(1)} months is critical. Consider reducing expenses or increasing revenue.`,
        });
      }

      // Initiative optimization
      if (activeScenario.initiatives.length === 0) {
        newSuggestions.push({
          id: 'no-initiatives',
          type: 'opportunity',
          priority: 'medium',
          title: 'Aucune initiative',
          titleEn: 'No Initiatives',
          description: 'Ajoutez des initiatives stratégiques pour améliorer votre prévision de trésorerie.',
          descriptionEn: 'Add strategic initiatives to improve your cash forecast.',
        });
      }

      // High burn rate
      if (runwayAnalysis.monthlyBurnRate > 0 && runwayAnalysis.monthlyBurnRate > runwayAnalysis.currentCash * 0.1) {
        newSuggestions.push({
          id: 'high-burn',
          type: 'warning',
          priority: 'medium',
          title: 'Taux de brûlage élevé',
          titleEn: 'High Burn Rate',
          description: `Votre taux de brûlage mensuel représente ${((runwayAnalysis.monthlyBurnRate / runwayAnalysis.currentCash) * 100).toFixed(1)}% de votre trésorerie.`,
          descriptionEn: `Your monthly burn rate represents ${((runwayAnalysis.monthlyBurnRate / runwayAnalysis.currentCash) * 100).toFixed(1)}% of your cash.`,
        });
      }

      // Scenario comparison insights
      if (scenarios.length > 1) {
        const baseScenario = scenarios.find(s => s.type === 'base');
        const optimisticScenario = scenarios.find(s => s.type === 'optimistic');
        
        if (baseScenario && optimisticScenario) {
          const baseRunway = runwayAnalysis.runwayMonths;
          // This would be calculated properly in production
          const optimisticRunway = baseRunway * 1.3;
          
          if (optimisticRunway - baseRunway > 6) {
            newSuggestions.push({
              id: 'scenario-opportunity',
              type: 'opportunity',
              priority: 'low',
              title: 'Potentiel d\'amélioration',
              titleEn: 'Improvement Potential',
              description: 'Le scénario optimiste montre un potentiel d\'amélioration significatif de l\'autonomie.',
              descriptionEn: 'The optimistic scenario shows significant runway improvement potential.',
            });
          }
        }
      }

      // Low confidence initiatives
      const lowConfidenceInitiatives = activeScenario.initiatives.filter(i => i.confidence < 60);
      if (lowConfidenceInitiatives.length > 0) {
        newSuggestions.push({
          id: 'low-confidence',
          type: 'optimization',
          priority: 'medium',
          title: 'Initiatives à faible confiance',
          titleEn: 'Low Confidence Initiatives',
          description: `${lowConfidenceInitiatives.length} initiative(s) ont une confiance inférieure à 60%. Revisitez ces estimations.`,
          descriptionEn: `${lowConfidenceInitiatives.length} initiative(s) have confidence below 60%. Revisit these estimates.`,
        });
      }

      setSuggestions(newSuggestions);
      setIsLoading(false);
    }, 500);
  }, [activeScenario, runwayAnalysis, scenarios]);

  const handleDismiss = (id: string) => {
    setDismissedIds(new Set([...dismissedIds, id]));
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  if (visibleSuggestions.length === 0 && !isLoading) {
    return null;
  }

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'opportunity':
        return TrendingUp;
      case 'optimization':
        return Lightbulb;
      default:
        return Sparkles;
    }
  };

  const getSuggestionColor = (type: Suggestion['type'], priority: Suggestion['priority']) => {
    if (type === 'warning') {
      return priority === 'high' ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))';
    }
    if (type === 'opportunity') {
      return 'rgb(var(--color-success))';
    }
    return 'rgb(var(--color-primary-500))';
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
        }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'AI Insights' : 'Suggestions IA'}
          </h3>
          <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'AI-powered recommendations' : 'Recommandations alimentées par IA'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'rgb(var(--color-primary-500))' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSuggestions.map((suggestion) => {
            const Icon = getSuggestionIcon(suggestion.type);
            const color = getSuggestionColor(suggestion.type, suggestion.priority);
            
            return (
              <div
                key={suggestion.id}
                className="p-3 sm:p-4 rounded-lg border-l-4 transition-all hover:shadow-md"
                style={{
                  backgroundColor: `${color}08`,
                  borderLeftColor: color,
                  border: `1px solid ${color}20`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      backgroundColor: `${color}15`,
                    }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? suggestion.titleEn : suggestion.title}
                        </h4>
                        {suggestion.priority === 'high' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                            backgroundColor: 'rgb(var(--color-error) / 0.15)',
                            color: 'rgb(var(--color-error))',
                          }}>
                            {isEn ? 'High' : 'Élevé'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? suggestion.descriptionEn : suggestion.description}
                      </p>
                      {suggestion.action && (
                        <button
                          onClick={() => {
                            onApplySuggestion?.(suggestion);
                            suggestion.action?.onClick();
                          }}
                          className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 touch-manipulation min-h-[36px]"
                          style={{
                            backgroundColor: color,
                            color: 'white',
                          }}
                        >
                          {isEn ? suggestion.action.labelEn : suggestion.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                    title={isEn ? 'Dismiss' : 'Ignorer'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
