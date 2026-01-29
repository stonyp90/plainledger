/**
 * Industry Memory Service
 * 
 * Aggregates anonymous decision patterns across businesses to provide
 * industry-specific intelligence. This is the "learning layer" of the
 * Context Graphs flywheel.
 * 
 * Key responsibilities:
 * - Aggregate decision patterns by industry
 * - Calculate success rates for different actions
 * - Identify top performer characteristics
 * - Generate AI-ready context for recommendations
 */

import {
  type DecisionEvent,
  type IndustryType,
  type DataMetric,
  type ActionType,
  type BusinessSize,
  type ActionTemplate,
  getActionTemplatesForIndustry,
} from './decisionContext';

// =====================================================
// TYPES
// =====================================================

export interface IndustryPattern {
  industry: IndustryType;
  triggerMetric: DataMetric;
  triggerCondition: {
    operator: 'above' | 'below' | 'between';
    valueLow?: number;
    valueHigh?: number;
  };
  businessSize?: BusinessSize;
  
  // Aggregated data
  sampleSize: number;
  
  // Common actions taken
  commonActions: Array<{
    actionType: ActionType;
    frequency: number; // Number of times this action was taken
    avgExpectedImpact: number;
    avgActualImpact: number;
    successRate: number; // Percentage (0-100)
    sampleSize: number;
  }>;
  
  // Success metrics by action type
  successRates: Record<ActionType, number>;
  
  // Top performer data
  topPerformers: {
    avgImpact: number;
    successRate: number;
    commonActions: ActionType[];
    sampleSize: number;
  };
  
  // Confidence
  statisticalSignificance: number; // 0-1
  lastUpdated: Date;
}

export interface SuggestedAction {
  actionType: ActionType;
  description: string;
  successRate: number;
  sampleSize: number;
  avgImpact: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'industry_pattern' | 'similar_business' | 'ai_generated';
}

export interface PatternInsight {
  metric: DataMetric;
  currentValue: number;
  benchmarkValue: number;
  gapPercentage: number;
  suggestions: SuggestedAction[];
  topPerformerNote?: string;
  industryContext?: string;
}

// =====================================================
// MOCK DATA
// Simulates aggregated patterns from many businesses
// In production, this would come from the API/database
// =====================================================

const MOCK_INDUSTRY_PATTERNS: IndustryPattern[] = [
  // Restaurant - Food Cost High
  {
    industry: 'restaurant',
    triggerMetric: 'food_cost_pct',
    triggerCondition: { operator: 'above', valueLow: 35 },
    sampleSize: 147,
    commonActions: [
      {
        actionType: 'cost_cut',
        frequency: 58,
        avgExpectedImpact: 2400,
        avgActualImpact: 2150,
        successRate: 85,
        sampleSize: 58,
      },
      {
        actionType: 'price_change',
        frequency: 45,
        avgExpectedImpact: 3200,
        avgActualImpact: 2800,
        successRate: 72,
        sampleSize: 45,
      },
      {
        actionType: 'renegotiate',
        frequency: 32,
        avgExpectedImpact: 1800,
        avgActualImpact: 1500,
        successRate: 65,
        sampleSize: 32,
      },
    ],
    successRates: {
      cost_cut: 85,
      price_change: 72,
      renegotiate: 65,
      optimize: 78,
      hire: 0,
      invest: 0,
      defer: 0,
      expand: 0,
      reduce: 68,
      custom: 55,
    },
    topPerformers: {
      avgImpact: 3800,
      successRate: 92,
      commonActions: ['cost_cut', 'price_change'],
      sampleSize: 23,
    },
    statisticalSignificance: 0.92,
    lastUpdated: new Date(),
  },
  
  // Restaurant - Labor Cost High
  {
    industry: 'restaurant',
    triggerMetric: 'labor_cost_pct',
    triggerCondition: { operator: 'above', valueLow: 32 },
    sampleSize: 89,
    commonActions: [
      {
        actionType: 'optimize',
        frequency: 42,
        avgExpectedImpact: 1800,
        avgActualImpact: 1650,
        successRate: 78,
        sampleSize: 42,
      },
      {
        actionType: 'reduce',
        frequency: 28,
        avgExpectedImpact: 2500,
        avgActualImpact: 2200,
        successRate: 62,
        sampleSize: 28,
      },
    ],
    successRates: {
      optimize: 78,
      reduce: 62,
      cost_cut: 55,
      price_change: 0,
      renegotiate: 0,
      hire: 0,
      invest: 0,
      defer: 0,
      expand: 0,
      custom: 45,
    },
    topPerformers: {
      avgImpact: 2800,
      successRate: 88,
      commonActions: ['optimize'],
      sampleSize: 15,
    },
    statisticalSignificance: 0.85,
    lastUpdated: new Date(),
  },
  
  // Real Estate - Low Occupancy
  {
    industry: 'real_estate',
    triggerMetric: 'occupancy_rate',
    triggerCondition: { operator: 'below', valueLow: 90 },
    sampleSize: 203,
    commonActions: [
      {
        actionType: 'reduce',
        frequency: 78,
        avgExpectedImpact: 6500,
        avgActualImpact: 5800,
        successRate: 75,
        sampleSize: 78,
      },
      {
        actionType: 'invest',
        frequency: 65,
        avgExpectedImpact: 12000,
        avgActualImpact: 9500,
        successRate: 70,
        sampleSize: 65,
      },
      {
        actionType: 'price_change',
        frequency: 45,
        avgExpectedImpact: 4000,
        avgActualImpact: 3200,
        successRate: 68,
        sampleSize: 45,
      },
    ],
    successRates: {
      reduce: 75,
      invest: 70,
      price_change: 68,
      cost_cut: 72,
      renegotiate: 0,
      hire: 0,
      optimize: 65,
      defer: 0,
      expand: 0,
      custom: 50,
    },
    topPerformers: {
      avgImpact: 15000,
      successRate: 88,
      commonActions: ['invest', 'reduce'],
      sampleSize: 32,
    },
    statisticalSignificance: 0.94,
    lastUpdated: new Date(),
  },
  
  // Real Estate - Net Margin Low
  {
    industry: 'real_estate',
    triggerMetric: 'net_margin',
    triggerCondition: { operator: 'below', valueLow: 20 },
    sampleSize: 156,
    commonActions: [
      {
        actionType: 'cost_cut',
        frequency: 62,
        avgExpectedImpact: 4500,
        avgActualImpact: 4100,
        successRate: 80,
        sampleSize: 62,
      },
      {
        actionType: 'price_change',
        frequency: 48,
        avgExpectedImpact: 7200,
        avgActualImpact: 6000,
        successRate: 68,
        sampleSize: 48,
      },
    ],
    successRates: {
      cost_cut: 80,
      price_change: 68,
      reduce: 72,
      invest: 0,
      renegotiate: 65,
      hire: 0,
      optimize: 75,
      defer: 0,
      expand: 0,
      custom: 55,
    },
    topPerformers: {
      avgImpact: 8500,
      successRate: 90,
      commonActions: ['cost_cut', 'optimize'],
      sampleSize: 28,
    },
    statisticalSignificance: 0.88,
    lastUpdated: new Date(),
  },
  
  // Professional Services - Low Utilization
  {
    industry: 'professional_services',
    triggerMetric: 'utilization_rate',
    triggerCondition: { operator: 'below', valueLow: 70 },
    sampleSize: 94,
    commonActions: [
      {
        actionType: 'optimize',
        frequency: 45,
        avgExpectedImpact: 8500,
        avgActualImpact: 7200,
        successRate: 72,
        sampleSize: 45,
      },
      {
        actionType: 'expand',
        frequency: 32,
        avgExpectedImpact: 15000,
        avgActualImpact: 12000,
        successRate: 65,
        sampleSize: 32,
      },
    ],
    successRates: {
      optimize: 72,
      expand: 65,
      price_change: 60,
      cost_cut: 0,
      renegotiate: 0,
      hire: 55,
      invest: 0,
      defer: 0,
      reduce: 0,
      custom: 50,
    },
    topPerformers: {
      avgImpact: 18000,
      successRate: 85,
      commonActions: ['optimize', 'expand'],
      sampleSize: 18,
    },
    statisticalSignificance: 0.82,
    lastUpdated: new Date(),
  },
];

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Find patterns matching the given context
 */
export function findMatchingPatterns(
  industry: IndustryType,
  metric: DataMetric,
  currentValue: number,
  benchmarkValue?: number
): IndustryPattern[] {
  const gapPct = benchmarkValue 
    ? ((currentValue - benchmarkValue) / Math.abs(benchmarkValue)) * 100
    : 0;
  
  return MOCK_INDUSTRY_PATTERNS.filter(pattern => {
    if (pattern.industry !== industry) return false;
    if (pattern.triggerMetric !== metric) return false;
    
    // Check if condition matches
    const { operator, valueLow, valueHigh } = pattern.triggerCondition;
    
    switch (operator) {
      case 'above':
        return valueLow !== undefined && currentValue > valueLow;
      case 'below':
        return valueLow !== undefined && currentValue < valueLow;
      case 'between':
        return (valueLow !== undefined && valueHigh !== undefined && 
                currentValue >= valueLow && currentValue <= valueHigh);
      default:
        return false;
    }
  });
}

/**
 * Get suggested actions based on industry patterns
 */
export function getSuggestedActions(
  industry: IndustryType,
  metric: DataMetric,
  currentValue: number,
  benchmarkValue?: number
): SuggestedAction[] {
  const patterns = findMatchingPatterns(industry, metric, currentValue, benchmarkValue);
  const templates = getActionTemplatesForIndustry(industry);
  
  if (patterns.length === 0) {
    // No patterns found, return template-based suggestions
    return templates
      .filter(t => t.commonMetrics.includes(metric))
      .slice(0, 3)
      .map(t => ({
        actionType: t.actionType,
        description: t.description.en,
        successRate: t.successRate || 50,
        sampleSize: 0,
        avgImpact: t.avgImpact 
          ? Math.round((t.avgImpact.min + t.avgImpact.max) / 2)
          : 0,
        confidence: 'low' as const,
        source: 'ai_generated' as const,
      }));
  }
  
  // Aggregate suggestions from matching patterns
  const suggestions: SuggestedAction[] = [];
  
  for (const pattern of patterns) {
    for (const action of pattern.commonActions) {
      const template = templates.find(t => t.actionType === action.actionType);
      
      suggestions.push({
        actionType: action.actionType,
        description: template?.description.en || `Take ${action.actionType} action`,
        successRate: action.successRate,
        sampleSize: action.sampleSize,
        avgImpact: Math.round(action.avgActualImpact),
        confidence: action.sampleSize >= 30 ? 'high' : action.sampleSize >= 10 ? 'medium' : 'low',
        source: 'industry_pattern',
      });
    }
  }
  
  // Sort by success rate and remove duplicates
  const uniqueSuggestions = new Map<ActionType, SuggestedAction>();
  
  suggestions
    .sort((a, b) => b.successRate - a.successRate)
    .forEach(s => {
      if (!uniqueSuggestions.has(s.actionType) || 
          s.sampleSize > (uniqueSuggestions.get(s.actionType)?.sampleSize || 0)) {
        uniqueSuggestions.set(s.actionType, s);
      }
    });
  
  return Array.from(uniqueSuggestions.values()).slice(0, 5);
}

/**
 * Get insight for a specific metric
 */
export function getPatternInsight(
  industry: IndustryType,
  metric: DataMetric,
  currentValue: number,
  benchmarkValue: number,
  language: 'en' | 'fr' = 'en'
): PatternInsight {
  const gapPercentage = ((currentValue - benchmarkValue) / Math.abs(benchmarkValue)) * 100;
  const suggestions = getSuggestedActions(industry, metric, currentValue, benchmarkValue);
  const patterns = findMatchingPatterns(industry, metric, currentValue, benchmarkValue);
  
  // Generate top performer note
  let topPerformerNote: string | undefined;
  if (patterns.length > 0 && patterns[0].topPerformers.sampleSize >= 10) {
    const tp = patterns[0].topPerformers;
    topPerformerNote = language === 'en'
      ? `Top performers (${tp.sampleSize} businesses) achieved ${tp.successRate}% success rate with avg impact of $${tp.avgImpact.toLocaleString()}/mo.`
      : `Les meilleurs performeurs (${tp.sampleSize} entreprises) ont atteint un taux de succès de ${tp.successRate}% avec un impact moyen de ${tp.avgImpact.toLocaleString()}$/mois.`;
  }
  
  // Generate industry context
  let industryContext: string | undefined;
  if (patterns.length > 0) {
    const totalSample = patterns.reduce((sum, p) => sum + p.sampleSize, 0);
    industryContext = language === 'en'
      ? `Based on ${totalSample} similar ${industry.replace('_', ' ')} businesses facing this situation.`
      : `Basé sur ${totalSample} entreprises similaires du secteur ${industry.replace('_', ' ')} dans cette situation.`;
  }
  
  return {
    metric,
    currentValue,
    benchmarkValue,
    gapPercentage,
    suggestions,
    topPerformerNote,
    industryContext,
  };
}

/**
 * Get summary statistics for an industry
 */
export function getIndustryStats(industry: IndustryType): {
  totalDecisions: number;
  avgSuccessRate: number;
  mostCommonActions: ActionType[];
  topMetrics: DataMetric[];
} {
  const patterns = MOCK_INDUSTRY_PATTERNS.filter(p => p.industry === industry);
  
  if (patterns.length === 0) {
    return {
      totalDecisions: 0,
      avgSuccessRate: 0,
      mostCommonActions: [],
      topMetrics: [],
    };
  }
  
  const totalDecisions = patterns.reduce((sum, p) => sum + p.sampleSize, 0);
  
  // Calculate weighted average success rate
  const weightedSuccess = patterns.reduce((sum, p) => {
    const avgRate = p.commonActions.reduce((s, a) => s + a.successRate * a.frequency, 0) /
                    p.commonActions.reduce((s, a) => s + a.frequency, 0);
    return sum + avgRate * p.sampleSize;
  }, 0);
  const avgSuccessRate = weightedSuccess / totalDecisions;
  
  // Find most common actions
  const actionCounts = new Map<ActionType, number>();
  patterns.forEach(p => {
    p.commonActions.forEach(a => {
      actionCounts.set(a.actionType, (actionCounts.get(a.actionType) || 0) + a.frequency);
    });
  });
  const mostCommonActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([action]) => action);
  
  // Find top metrics
  const topMetrics = patterns
    .sort((a, b) => b.sampleSize - a.sampleSize)
    .slice(0, 3)
    .map(p => p.triggerMetric);
  
  return {
    totalDecisions,
    avgSuccessRate: Math.round(avgSuccessRate),
    mostCommonActions,
    topMetrics,
  };
}

/**
 * Format suggestion for James AI context
 */
export function formatSuggestionForAI(
  suggestion: SuggestedAction,
  language: 'en' | 'fr' = 'en'
): string {
  if (language === 'en') {
    return `${suggestion.description} (${suggestion.successRate}% success rate based on ${suggestion.sampleSize} similar businesses, avg impact $${suggestion.avgImpact.toLocaleString()}/mo)`;
  } else {
    return `${suggestion.description} (taux de succès de ${suggestion.successRate}% basé sur ${suggestion.sampleSize} entreprises similaires, impact moyen ${suggestion.avgImpact.toLocaleString()}$/mois)`;
  }
}

/**
 * Get pattern context for James AI prompts
 */
export function getPatternContextForJames(
  industry: IndustryType,
  metric: DataMetric,
  currentValue: number,
  benchmarkValue: number,
  language: 'en' | 'fr' = 'en'
): string {
  const insight = getPatternInsight(industry, metric, currentValue, benchmarkValue, language);
  
  if (insight.suggestions.length === 0) {
    return '';
  }
  
  const suggestionsList = insight.suggestions
    .slice(0, 3)
    .map(s => `  - ${formatSuggestionForAI(s, language)}`)
    .join('\n');
  
  if (language === 'en') {
    return `
Industry Intelligence Context:
${insight.industryContext || ''}

Recommended actions based on similar businesses:
${suggestionsList}

${insight.topPerformerNote || ''}
`.trim();
  } else {
    return `
Contexte d'intelligence sectorielle:
${insight.industryContext || ''}

Actions recommandées basées sur des entreprises similaires:
${suggestionsList}

${insight.topPerformerNote || ''}
`.trim();
  }
}
