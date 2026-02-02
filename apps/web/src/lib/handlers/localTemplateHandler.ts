/**
 * Local Template Handler
 * 
 * Handles calculation-based queries without LLM calls.
 * Patterns: "what is my runway", "can I afford to hire", "calculate burn rate"
 * 
 * Cost: $0 (no API calls)
 * Latency: <10ms (instant)
 */

import { FinancialContext } from '../jamesPrompts';
import { QueryIntent } from '../queryRouter';
import { LocalResponse, TemplateOptions } from './types';

// Salary extraction patterns
const SALARY_PATTERNS = [
  /\$\s*([\d,]+)\s*(?:k|K)?/,                    // $50,000 or $50k
  /(\d+)\s*(?:k|K)\s*(?:salary|salaire)?/i,       // 50k salary
  /salary\s*(?:of\s*)?\$?([\d,]+)\s*(?:k|K)?/i,   // salary of $50k
  /salaire\s*(?:de\s*)?\$?([\d,]+)\s*(?:k|K)?/i,  // salaire de 50k
  /(?:pay|paying)\s*\$?([\d,]+)\s*(?:k|K)?/i,     // paying $50k
  /(\d{4,6})\s*(?:per\s*month|\/\s*month|mensuel)/i, // 5000 per month
];

/**
 * Detect language from query
 */
function detectLanguage(query: string): 'en' | 'fr' {
  const frenchKeywords = ['quel', 'quelle', 'combien', 'puis-je', 'mon', 'ma', 'autonomie', 'embaucher'];
  const lowerQuery = query.toLowerCase();
  return frenchKeywords.some(kw => lowerQuery.includes(kw)) ? 'fr' : 'en';
}

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
 * Extract salary amount from query
 */
function extractSalary(query: string): number | null {
  for (const pattern of SALARY_PATTERNS) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let salary = parseFloat(match[1].replace(/,/g, ''));
      
      // Convert 'k' notation (50k -> 50000)
      if (/k/i.test(match[0])) {
        salary *= 1000;
      }
      
      // If salary seems like monthly, convert to annual
      if (salary < 20000) {
        salary *= 12;
      }
      
      return salary;
    }
  }
  return null;
}

/**
 * Calculate runway analysis
 */
function calculateRunwayAnalysis(
  context: FinancialContext,
  language: 'en' | 'fr'
): LocalResponse {
  const startTime = performance.now();
  
  const { currentCash, burnRate, runwayMonths } = context;
  
  // Calculate zero date
  const zeroDate = new Date();
  zeroDate.setMonth(zeroDate.getMonth() + Math.floor(runwayMonths));
  const formattedZeroDate = zeroDate.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Runway health assessment
  let healthStatus: string;
  let healthEmoji: string;
  if (runwayMonths >= 18) {
    healthStatus = language === 'fr' ? 'Excellente' : 'Excellent';
    healthEmoji = '🟢';
  } else if (runwayMonths >= 12) {
    healthStatus = language === 'fr' ? 'Bonne' : 'Good';
    healthEmoji = '🟡';
  } else if (runwayMonths >= 6) {
    healthStatus = language === 'fr' ? 'Attention requise' : 'Needs attention';
    healthEmoji = '🟠';
  } else {
    healthStatus = language === 'fr' ? 'Critique' : 'Critical';
    healthEmoji = '🔴';
  }
  
  const message = language === 'fr'
    ? `**Analyse de l'autonomie de trésorerie:**\n\n` +
      `📊 **Métriques actuelles:**\n` +
      `- Encaisse: ${formatCurrency(currentCash, language)}\n` +
      `- Taux de brûlage mensuel: ${formatCurrency(burnRate, language)}/mois\n` +
      `- Autonomie: **${runwayMonths.toFixed(1)} mois**\n\n` +
      `📅 **Projection:**\n` +
      `- Date de zéro trésorerie: ${formattedZeroDate}\n\n` +
      `${healthEmoji} **Santé:** ${healthStatus}\n\n` +
      `${runwayMonths < 12 
        ? `⚠️ *Recommandation: Avec moins de 12 mois d'autonomie, envisagez des actions pour réduire les dépenses ou augmenter les revenus.*`
        : `✅ *Votre autonomie est saine. Continuez à surveiller votre taux de brûlage.*`}`
    : `**Cash Runway Analysis:**\n\n` +
      `📊 **Current Metrics:**\n` +
      `- Cash: ${formatCurrency(currentCash, language)}\n` +
      `- Monthly Burn Rate: ${formatCurrency(burnRate, language)}/month\n` +
      `- Runway: **${runwayMonths.toFixed(1)} months**\n\n` +
      `📅 **Projection:**\n` +
      `- Zero Cash Date: ${formattedZeroDate}\n\n` +
      `${healthEmoji} **Health:** ${healthStatus}\n\n` +
      `${runwayMonths < 12
        ? `⚠️ *Recommendation: With less than 12 months runway, consider actions to reduce expenses or increase revenue.*`
        : `✅ *Your runway is healthy. Continue monitoring your burn rate.*`}`;

  return {
    message,
    handlerType: 'local_template',
    tokensUsed: 0,
    latencyMs: Math.round(performance.now() - startTime),
    confidence: 0.95,
    metadata: {
      metricsReturned: ['runway', 'burnRate', 'cash'],
      runwayProjection: {
        currentRunway: runwayMonths,
        projectedRunway: runwayMonths,
        zeroDate: zeroDate.toISOString(),
        burnRate,
      },
    },
  };
}

/**
 * Calculate hiring affordability
 */
function calculateHiringAnalysis(
  query: string,
  context: FinancialContext,
  language: 'en' | 'fr'
): LocalResponse {
  const startTime = performance.now();
  
  const { currentCash, burnRate, runwayMonths, monthlyExpenses } = context;
  const proposedSalary = extractSalary(query);
  
  // Minimum acceptable runway (months)
  const MIN_RUNWAY = 6;
  
  // Calculate max affordable salary (maintain MIN_RUNWAY months)
  // runway = cash / (burnRate + monthlySalary)
  // MIN_RUNWAY = cash / (burnRate + maxMonthlySalary)
  // maxMonthlySalary = (cash / MIN_RUNWAY) - burnRate
  const maxMonthlySalary = (currentCash / MIN_RUNWAY) - burnRate;
  const maxAnnualSalary = maxMonthlySalary * 12;
  
  let canAfford = false;
  let impactOnRunway = 0;
  let newRunway = runwayMonths;
  
  if (proposedSalary) {
    const monthlySalary = proposedSalary / 12;
    const newBurnRate = burnRate + monthlySalary;
    newRunway = currentCash / newBurnRate;
    impactOnRunway = runwayMonths - newRunway;
    canAfford = newRunway >= MIN_RUNWAY;
  }
  
  const message = language === 'fr'
    ? `**Analyse de capacité d'embauche:**\n\n` +
      `📊 **Situation actuelle:**\n` +
      `- Autonomie actuelle: ${runwayMonths.toFixed(1)} mois\n` +
      `- Taux de brûlage: ${formatCurrency(burnRate, language)}/mois\n\n` +
      (proposedSalary
        ? `💼 **Analyse du salaire proposé (${formatCurrency(proposedSalary, language)}/an):**\n` +
          `- Coût mensuel: ${formatCurrency(proposedSalary / 12, language)}/mois\n` +
          `- Nouvelle autonomie: ${newRunway.toFixed(1)} mois\n` +
          `- Impact: -${impactOnRunway.toFixed(1)} mois\n\n` +
          (canAfford
            ? `✅ **Oui, vous pouvez vous permettre cette embauche.**\n` +
              `Vous maintiendrez ${newRunway.toFixed(1)} mois d'autonomie.`
            : `❌ **Cette embauche réduirait votre autonomie en dessous de ${MIN_RUNWAY} mois.**\n` +
              `Considérez un salaire plus bas ou attendez plus de financement.`)
        : `💰 **Salaire maximum abordable:**\n` +
          `Pour maintenir ${MIN_RUNWAY} mois d'autonomie minimum:\n` +
          `- Salaire annuel max: ${formatCurrency(Math.max(0, maxAnnualSalary), language)}/an\n` +
          `- Salaire mensuel max: ${formatCurrency(Math.max(0, maxMonthlySalary), language)}/mois\n\n` +
          (maxAnnualSalary > 0
            ? `✅ *Vous avez de la marge pour embaucher.*`
            : `⚠️ *Votre autonomie actuelle ne permet pas d'embauche significative.*`))
    : `**Hiring Affordability Analysis:**\n\n` +
      `📊 **Current Situation:**\n` +
      `- Current Runway: ${runwayMonths.toFixed(1)} months\n` +
      `- Burn Rate: ${formatCurrency(burnRate, language)}/month\n\n` +
      (proposedSalary
        ? `💼 **Proposed Salary Analysis (${formatCurrency(proposedSalary, language)}/year):**\n` +
          `- Monthly Cost: ${formatCurrency(proposedSalary / 12, language)}/month\n` +
          `- New Runway: ${newRunway.toFixed(1)} months\n` +
          `- Impact: -${impactOnRunway.toFixed(1)} months\n\n` +
          (canAfford
            ? `✅ **Yes, you can afford this hire.**\n` +
              `You'll maintain ${newRunway.toFixed(1)} months of runway.`
            : `❌ **This hire would reduce your runway below ${MIN_RUNWAY} months.**\n` +
              `Consider a lower salary or wait for more funding.`)
        : `💰 **Maximum Affordable Salary:**\n` +
          `To maintain at least ${MIN_RUNWAY} months of runway:\n` +
          `- Max Annual Salary: ${formatCurrency(Math.max(0, maxAnnualSalary), language)}/year\n` +
          `- Max Monthly Salary: ${formatCurrency(Math.max(0, maxMonthlySalary), language)}/month\n\n` +
          (maxAnnualSalary > 0
            ? `✅ *You have room to hire.*`
            : `⚠️ *Your current runway doesn't support a significant hire.*`));

  return {
    message,
    handlerType: 'local_template',
    tokensUsed: 0,
    latencyMs: Math.round(performance.now() - startTime),
    confidence: 0.90,
    metadata: {
      metricsReturned: ['runway', 'burnRate'],
      hiringAnalysis: {
        canAfford,
        maxSalary: maxAnnualSalary,
        impactOnRunway,
        recommendation: canAfford 
          ? 'Hire within budget' 
          : 'Consider alternatives',
      },
      calculation: {
        formula: 'maxSalary = (cash / minRunway - burnRate) * 12',
        inputs: { cash: currentCash, minRunway: MIN_RUNWAY, burnRate },
        result: maxAnnualSalary,
      },
    },
  };
}

/**
 * Calculate burn rate analysis
 */
function calculateBurnRateAnalysis(
  context: FinancialContext,
  language: 'en' | 'fr'
): LocalResponse {
  const startTime = performance.now();
  
  const { monthlyRevenue, monthlyExpenses, burnRate } = context;
  const grossBurn = monthlyExpenses;
  const netBurn = burnRate; // expenses - revenue
  
  // Profitability check
  const isProfitable = netBurn < 0;
  
  const message = language === 'fr'
    ? `**Analyse du taux de brûlage:**\n\n` +
      `📊 **Métriques:**\n` +
      `- Dépenses brutes: ${formatCurrency(grossBurn, language)}/mois\n` +
      `- Revenus: ${formatCurrency(monthlyRevenue, language)}/mois\n` +
      `- **Brûlage net: ${formatCurrency(netBurn, language)}/mois**\n\n` +
      (isProfitable
        ? `✅ **Félicitations!** Vous êtes rentable avec un surplus de ${formatCurrency(Math.abs(netBurn), language)}/mois.`
        : `💡 **Objectif de rentabilité:**\n` +
          `Pour atteindre le seuil de rentabilité, vous devez:\n` +
          `- Réduire les dépenses de ${formatCurrency(netBurn, language)}/mois, OU\n` +
          `- Augmenter les revenus de ${formatCurrency(netBurn, language)}/mois`)
    : `**Burn Rate Analysis:**\n\n` +
      `📊 **Metrics:**\n` +
      `- Gross Burn: ${formatCurrency(grossBurn, language)}/month\n` +
      `- Revenue: ${formatCurrency(monthlyRevenue, language)}/month\n` +
      `- **Net Burn: ${formatCurrency(netBurn, language)}/month**\n\n` +
      (isProfitable
        ? `✅ **Congratulations!** You're profitable with a surplus of ${formatCurrency(Math.abs(netBurn), language)}/month.`
        : `💡 **Path to Profitability:**\n` +
          `To break even, you need to:\n` +
          `- Reduce expenses by ${formatCurrency(netBurn, language)}/month, OR\n` +
          `- Increase revenue by ${formatCurrency(netBurn, language)}/month`);

  return {
    message,
    handlerType: 'local_template',
    tokensUsed: 0,
    latencyMs: Math.round(performance.now() - startTime),
    confidence: 0.95,
    metadata: {
      metricsReturned: ['burnRate', 'revenue', 'expenses'],
      calculation: {
        formula: 'netBurn = expenses - revenue',
        inputs: { expenses: grossBurn, revenue: monthlyRevenue },
        result: netBurn,
      },
    },
  };
}

/**
 * Calculate spending capacity
 */
function calculateSpendingCapacity(
  context: FinancialContext,
  language: 'en' | 'fr'
): LocalResponse {
  const startTime = performance.now();
  
  const { currentCash, burnRate, runwayMonths } = context;
  
  // Calculate how much more can be spent while maintaining 6 months runway
  const MIN_RUNWAY = 6;
  // currentCash / (burnRate + additionalSpend) = MIN_RUNWAY
  // additionalSpend = (currentCash / MIN_RUNWAY) - burnRate
  const maxAdditionalMonthly = Math.max(0, (currentCash / MIN_RUNWAY) - burnRate);
  
  // One-time spending capacity (assuming 12 months)
  const oneTimeCapacity = maxAdditionalMonthly * 12;
  
  const message = language === 'fr'
    ? `**Capacité de dépenses:**\n\n` +
      `📊 **Situation actuelle:**\n` +
      `- Autonomie: ${runwayMonths.toFixed(1)} mois\n` +
      `- Brûlage mensuel: ${formatCurrency(burnRate, language)}/mois\n\n` +
      `💰 **Capacité de dépenses supplémentaires:**\n` +
      `(Pour maintenir ${MIN_RUNWAY} mois d'autonomie minimum)\n\n` +
      `- Dépense récurrente max: ${formatCurrency(maxAdditionalMonthly, language)}/mois\n` +
      `- Dépense unique max: ${formatCurrency(oneTimeCapacity, language)}\n\n` +
      (maxAdditionalMonthly > 0
        ? `✅ *Vous avez de la marge pour des investissements.*`
        : `⚠️ *Votre capacité de dépenses supplémentaires est limitée.*`)
    : `**Spending Capacity:**\n\n` +
      `📊 **Current Situation:**\n` +
      `- Runway: ${runwayMonths.toFixed(1)} months\n` +
      `- Monthly Burn: ${formatCurrency(burnRate, language)}/month\n\n` +
      `💰 **Additional Spending Capacity:**\n` +
      `(To maintain at least ${MIN_RUNWAY} months runway)\n\n` +
      `- Max Recurring Spend: ${formatCurrency(maxAdditionalMonthly, language)}/month\n` +
      `- Max One-Time Spend: ${formatCurrency(oneTimeCapacity, language)}\n\n` +
      (maxAdditionalMonthly > 0
        ? `✅ *You have room for investments.*`
        : `⚠️ *Your additional spending capacity is limited.*`);

  return {
    message,
    handlerType: 'local_template',
    tokensUsed: 0,
    latencyMs: Math.round(performance.now() - startTime),
    confidence: 0.90,
    metadata: {
      metricsReturned: ['runway', 'burnRate'],
      calculation: {
        formula: 'maxAdditional = (cash / minRunway) - burnRate',
        inputs: { cash: currentCash, minRunway: MIN_RUNWAY, burnRate },
        result: maxAdditionalMonthly,
      },
    },
  };
}

/**
 * Main handler for local template queries
 * 
 * @param query - User's natural language query
 * @param intent - Classified query intent
 * @param context - Financial context data
 * @returns LocalResponse if handled, null if needs LLM
 */
export function handleLocalTemplate(
  query: string,
  intent: QueryIntent,
  context: FinancialContext
): LocalResponse | null {
  const language = detectLanguage(query);
  const lowerQuery = query.toLowerCase();
  
  // Route based on intent
  switch (intent) {
    case 'runway_analysis':
      return calculateRunwayAnalysis(context, language);
      
    case 'hiring_analysis':
      return calculateHiringAnalysis(query, context, language);
      
    case 'calculation':
      // Determine specific calculation type
      if (/burn|brûlage|taux/i.test(lowerQuery)) {
        return calculateBurnRateAnalysis(context, language);
      }
      if (/spend|spending|dépenser|dépense/i.test(lowerQuery)) {
        return calculateSpendingCapacity(context, language);
      }
      // Default to runway for generic calculations
      return calculateRunwayAnalysis(context, language);
      
    default:
      // Check query content for fallback routing
      if (/runway|autonomie|how\s*long|combien\s*de\s*temps/i.test(lowerQuery)) {
        return calculateRunwayAnalysis(context, language);
      }
      if (/hire|embaucher|afford|permettre|can\s*i/i.test(lowerQuery)) {
        return calculateHiringAnalysis(query, context, language);
      }
      if (/burn|brûlage/i.test(lowerQuery)) {
        return calculateBurnRateAnalysis(context, language);
      }
      if (/spend|dépense/i.test(lowerQuery)) {
        return calculateSpendingCapacity(context, language);
      }
      
      // Cannot handle - return null
      return null;
  }
}

/**
 * Check if a query can potentially be handled by template handler
 */
export function canHandleLocalTemplate(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  const templatePatterns = [
    /runway|autonomie/i,
    /hire|embaucher|afford/i,
    /burn\s*rate|taux\s*de\s*brûlage/i,
    /how\s*much.*spend|combien.*dépenser/i,
    /calculate|compute|calcule/i,
    /project|forecast|projection/i,
  ];
  
  return templatePatterns.some(pattern => pattern.test(lowerQuery));
}
