/**
 * Local NLQ Handler
 * 
 * Handles simple data queries without LLM calls.
 * Patterns: "show revenue", "what is cash balance", "how much expenses"
 * 
 * Cost: $0 (no API calls)
 * Latency: <10ms (instant)
 */

import { FinancialContext } from '../jamesPrompts';
import { LocalResponse } from './types';

// Metric extraction patterns
const METRIC_PATTERNS: Record<string, {
  keywords: string[];
  extractor: (context: FinancialContext) => { value: number; unit: string };
  formatter: (value: number, language: 'en' | 'fr') => string;
}> = {
  cash: {
    keywords: ['cash', 'encaisse', 'liquidity', 'liquidité', 'balance', 'solde'],
    extractor: (ctx) => ({ value: ctx.currentCash, unit: 'currency' }),
    formatter: (v, lang) => lang === 'fr' 
      ? `Votre encaisse actuelle est de ${formatCurrency(v, lang)}.`
      : `Your current cash balance is ${formatCurrency(v, lang)}.`,
  },
  revenue: {
    keywords: ['revenue', 'revenus', 'sales', 'ventes', 'income', 'recettes'],
    extractor: (ctx) => ({ value: ctx.monthlyRevenue, unit: 'currency' }),
    formatter: (v, lang) => lang === 'fr'
      ? `Vos revenus mensuels sont de ${formatCurrency(v, lang)}/mois.`
      : `Your monthly revenue is ${formatCurrency(v, lang)}/month.`,
  },
  expenses: {
    keywords: ['expense', 'dépense', 'cost', 'coût', 'spending', 'dépenses'],
    extractor: (ctx) => ({ value: ctx.monthlyExpenses, unit: 'currency' }),
    formatter: (v, lang) => lang === 'fr'
      ? `Vos dépenses mensuelles sont de ${formatCurrency(v, lang)}/mois.`
      : `Your monthly expenses are ${formatCurrency(v, lang)}/month.`,
  },
  burnRate: {
    keywords: ['burn', 'burn rate', 'taux de brûlage', 'brûlage'],
    extractor: (ctx) => ({ value: ctx.burnRate, unit: 'currency' }),
    formatter: (v, lang) => lang === 'fr'
      ? `Votre taux de brûlage mensuel est de ${formatCurrency(v, lang)}/mois.`
      : `Your monthly burn rate is ${formatCurrency(v, lang)}/month.`,
  },
  runway: {
    keywords: ['runway', 'autonomie', 'months left', 'mois restants'],
    extractor: (ctx) => ({ value: ctx.runwayMonths, unit: 'months' }),
    formatter: (v, lang) => {
      const months = v.toFixed(1);
      return lang === 'fr'
        ? `Votre autonomie de trésorerie est de ${months} mois.`
        : `Your cash runway is ${months} months.`;
    },
  },
};

/**
 * Format currency value
 */
function formatCurrency(value: number, language: 'en' | 'fr'): string {
  const formatted = Math.abs(value).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-US', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * Detect language from query
 */
function detectLanguage(query: string): 'en' | 'fr' {
  const frenchKeywords = ['quel', 'quelle', 'combien', 'montre', 'affiche', 'mon', 'ma', 'mes'];
  const lowerQuery = query.toLowerCase();
  return frenchKeywords.some(kw => lowerQuery.includes(kw)) ? 'fr' : 'en';
}

/**
 * Extract requested metric from query
 */
function extractRequestedMetric(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  for (const [metric, config] of Object.entries(METRIC_PATTERNS)) {
    if (config.keywords.some(kw => lowerQuery.includes(kw))) {
      return metric;
    }
  }
  
  return null;
}

/**
 * Handle summary queries (multiple metrics)
 */
function handleSummaryQuery(context: FinancialContext, language: 'en' | 'fr'): LocalResponse {
  const summary = language === 'fr'
    ? `**Résumé financier:**\n` +
      `- Encaisse: ${formatCurrency(context.currentCash, language)}\n` +
      `- Revenus mensuels: ${formatCurrency(context.monthlyRevenue, language)}/mois\n` +
      `- Dépenses mensuelles: ${formatCurrency(context.monthlyExpenses, language)}/mois\n` +
      `- Taux de brûlage: ${formatCurrency(context.burnRate, language)}/mois\n` +
      `- Autonomie: ${context.runwayMonths.toFixed(1)} mois`
    : `**Financial Summary:**\n` +
      `- Cash: ${formatCurrency(context.currentCash, language)}\n` +
      `- Monthly Revenue: ${formatCurrency(context.monthlyRevenue, language)}/month\n` +
      `- Monthly Expenses: ${formatCurrency(context.monthlyExpenses, language)}/month\n` +
      `- Burn Rate: ${formatCurrency(context.burnRate, language)}/month\n` +
      `- Runway: ${context.runwayMonths.toFixed(1)} months`;

  return {
    message: summary,
    handlerType: 'local_nlq',
    tokensUsed: 0,
    latencyMs: 0,
    confidence: 0.95,
    metadata: {
      metricsReturned: ['cash', 'revenue', 'expenses', 'burnRate', 'runway'],
    },
  };
}

/**
 * Handle comparison queries
 */
function handleComparisonQuery(
  query: string,
  context: FinancialContext,
  language: 'en' | 'fr'
): LocalResponse | null {
  const lowerQuery = query.toLowerCase();
  
  // Revenue vs Expenses comparison
  if (
    (lowerQuery.includes('revenue') || lowerQuery.includes('revenus')) &&
    (lowerQuery.includes('expense') || lowerQuery.includes('dépense'))
  ) {
    const diff = context.monthlyRevenue - context.monthlyExpenses;
    const isProfit = diff > 0;
    
    const message = language === 'fr'
      ? `**Comparaison Revenus vs Dépenses:**\n` +
        `- Revenus mensuels: ${formatCurrency(context.monthlyRevenue, language)}\n` +
        `- Dépenses mensuelles: ${formatCurrency(context.monthlyExpenses, language)}\n` +
        `- Différence: ${formatCurrency(diff, language)} (${isProfit ? 'profit' : 'perte'})`
      : `**Revenue vs Expenses Comparison:**\n` +
        `- Monthly Revenue: ${formatCurrency(context.monthlyRevenue, language)}\n` +
        `- Monthly Expenses: ${formatCurrency(context.monthlyExpenses, language)}\n` +
        `- Difference: ${formatCurrency(diff, language)} (${isProfit ? 'profit' : 'loss'})`;

    return {
      message,
      handlerType: 'local_nlq',
      tokensUsed: 0,
      latencyMs: 0,
      confidence: 0.90,
      metadata: {
        metricsReturned: ['revenue', 'expenses'],
        comparison: { difference: diff, isProfit },
      },
    };
  }
  
  return null;
}

/**
 * Main handler for local NLQ queries
 * 
 * @param query - User's natural language query
 * @param context - Financial context data
 * @returns LocalResponse if handled, null if needs LLM
 */
export function handleLocalNLQ(
  query: string,
  context: FinancialContext
): LocalResponse | null {
  const startTime = performance.now();
  const language = detectLanguage(query);
  const lowerQuery = query.toLowerCase();
  
  // Check for summary/overview queries
  if (/summary|overview|aperçu|résumé|all|tout|position/i.test(lowerQuery)) {
    const response = handleSummaryQuery(context, language);
    response.latencyMs = Math.round(performance.now() - startTime);
    return response;
  }
  
  // Check for comparison queries
  if (/compare|vs|versus|comparer|comparaison/i.test(lowerQuery)) {
    const response = handleComparisonQuery(query, context, language);
    if (response) {
      response.latencyMs = Math.round(performance.now() - startTime);
      return response;
    }
  }
  
  // Extract single metric query
  const metric = extractRequestedMetric(query);
  
  if (metric && METRIC_PATTERNS[metric]) {
    const config = METRIC_PATTERNS[metric];
    const { value } = config.extractor(context);
    const message = config.formatter(value, language);
    
    return {
      message,
      handlerType: 'local_nlq',
      tokensUsed: 0,
      latencyMs: Math.round(performance.now() - startTime),
      confidence: 0.90,
      metadata: {
        metricsReturned: [metric],
        extractedValue: value,
      },
    };
  }
  
  // Cannot handle locally - return null to fall through to LLM
  return null;
}

/**
 * Check if a query can potentially be handled locally
 * (Quick check without full processing)
 */
export function canHandleLocalNLQ(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Check for known metric keywords
  const allKeywords = Object.values(METRIC_PATTERNS)
    .flatMap(p => p.keywords);
  
  // Must be a simple query (not strategic/complex)
  const complexIndicators = [
    'strategy', 'stratégie',
    'recommend', 'suggère',
    'initiative', 'okr',
    'optimize', 'améliorer',
    'plan', 'planifier',
    'generate', 'créer',
  ];
  
  const isComplex = complexIndicators.some(ind => lowerQuery.includes(ind));
  if (isComplex) return false;
  
  // Must contain a metric keyword or be a summary query
  const hasMetricKeyword = allKeywords.some(kw => lowerQuery.includes(kw));
  const isSummaryQuery = /summary|overview|aperçu|résumé|position/i.test(lowerQuery);
  
  return hasMetricKeyword || isSummaryQuery;
}
