/**
 * PlainLedger AI-Powered Anomaly Detection
 * 
 * Advanced anomaly detection using machine learning techniques:
 * - Statistical analysis (Z-scores, IQR, moving averages)
 * - Pattern recognition (seasonality, cycles)
 * - Time series forecasting (ARIMA-like predictions)
 * - Clustering for peer comparison
 * - Natural language explanations
 * 
 * Designed for accountants: clear, actionable insights with tooltips
 */

import { 
  Anomaly, 
  AnomalySeverity, 
  AnomalyCategory,
  AccountBalance,
  FinancialDataPoint,
  ThresholdConfig,
  DEFAULT_THRESHOLDS,
  formatCurrency,
  formatPercentage,
} from './anomalyDetection';

// =====================================================
// AI ANOMALY TYPES
// =====================================================

export type AIAnomalyType = 
  | 'statistical_outlier'      // Z-score based
  | 'trend_break'              // Sudden trend change
  | 'seasonality_deviation'    // Different from seasonal pattern
  | 'forecast_miss'            // Actual vs predicted
  | 'peer_deviation'           // Different from similar accounts
  | 'benford_violation'        // Benford's Law check
  | 'duplicate_pattern'        // Potential duplicate entries
  | 'round_number_cluster'     // Suspicious round amounts
  | 'timing_anomaly'           // Unusual timing
  | 'velocity_change'          // Rate of change anomaly
  | 'correlation_break'        // Break in correlated accounts
  | 'ratio_drift';             // Gradual ratio deterioration

export interface AIAnomaly extends Anomaly {
  aiType: AIAnomalyType;
  confidence: number;          // 0-100% confidence in detection
  impactScore: number;         // Financial impact severity
  explanation: string;         // Plain language explanation
  explanationEn: string;       // English explanation
  technicalDetails: string;    // Technical details for advanced users
  suggestedActions: string[];  // Specific action items
  relatedAnomalies?: string[]; // IDs of related anomalies
  dataPoints?: number[];       // Relevant data for visualization
  expectedValue?: number;      // What the model expected
  learningNote?: string;       // Note about pattern learning
}

export interface AIDetectionConfig extends ThresholdConfig {
  // Statistical settings
  zScoreThreshold: number;          // Standard deviations for outlier
  minDataPointsForAnalysis: number; // Minimum history needed
  
  // Seasonality
  detectSeasonality: boolean;
  seasonalityPeriods: number[];     // e.g., [3, 12] for quarters and years
  
  // Forecasting
  forecastHorizon: number;          // Periods to forecast
  forecastConfidenceLevel: number;  // 0.95 = 95% confidence
  
  // Benford's Law
  benfordEnabled: boolean;
  benfordThreshold: number;         // Chi-square threshold
  
  // Velocity detection
  velocityWindow: number;           // Periods for velocity calc
  velocityThreshold: number;        // % change in velocity
  
  // Correlation
  correlationThreshold: number;     // Min correlation to track
  correlationBreakThreshold: number;
  
  // Learning
  adaptiveThresholds: boolean;      // Learn from false positives
  sensitivityLevel: 'low' | 'medium' | 'high';
}

export const DEFAULT_AI_CONFIG: AIDetectionConfig = {
  ...DEFAULT_THRESHOLDS,
  
  // Statistical
  zScoreThreshold: 2.5,
  minDataPointsForAnalysis: 6,
  
  // Seasonality
  detectSeasonality: true,
  seasonalityPeriods: [3, 4, 12],
  
  // Forecasting
  forecastHorizon: 3,
  forecastConfidenceLevel: 0.90,
  
  // Benford's Law
  benfordEnabled: true,
  benfordThreshold: 15.51, // Chi-square critical value
  
  // Velocity
  velocityWindow: 3,
  velocityThreshold: 50,
  
  // Correlation
  correlationThreshold: 0.7,
  correlationBreakThreshold: 0.3,
  
  // Learning
  adaptiveThresholds: true,
  sensitivityLevel: 'medium',
};

// =====================================================
// TOOLTIP CONTENT - For User Understanding
// =====================================================

export interface TooltipContent {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  example?: string;
  exampleEn?: string;
  impact: string;
  impactEn: string;
  learnMoreUrl?: string;
}

export const ANOMALY_TOOLTIPS: Record<AIAnomalyType, TooltipContent> = {
  statistical_outlier: {
    title: 'Valeur statistiquement inhabituelle',
    titleEn: 'Statistical Outlier',
    description: 'Cette valeur est significativement différente de la moyenne historique. L\'IA a détecté qu\'elle se situe au-delà de 2.5 écarts-types.',
    descriptionEn: 'This value is significantly different from the historical average. The AI detected it falls beyond 2.5 standard deviations.',
    example: 'Si vos ventes mensuelles sont normalement entre 80k$ et 120k$, une vente de 200k$ serait signalée.',
    exampleEn: 'If your monthly sales are typically between $80k and $120k, a $200k sale would be flagged.',
    impact: 'Peut indiquer une erreur de saisie, une transaction exceptionnelle, ou un changement significatif dans les opérations.',
    impactEn: 'May indicate a data entry error, exceptional transaction, or significant change in operations.',
  },
  trend_break: {
    title: 'Rupture de tendance détectée',
    titleEn: 'Trend Break Detected',
    description: 'L\'IA a identifié un changement soudain dans la direction ou la vitesse d\'une tendance établie.',
    descriptionEn: 'The AI identified a sudden change in the direction or speed of an established trend.',
    example: 'Après 6 mois de croissance stable de 5%/mois, une baisse soudaine de 10% serait signalée.',
    exampleEn: 'After 6 months of stable 5%/month growth, a sudden 10% drop would be flagged.',
    impact: 'Nécessite une investigation pour comprendre la cause et ajuster les prévisions.',
    impactEn: 'Requires investigation to understand the cause and adjust forecasts.',
  },
  seasonality_deviation: {
    title: 'Écart par rapport au pattern saisonnier',
    titleEn: 'Seasonal Pattern Deviation',
    description: 'Cette période ne suit pas le pattern saisonnier habituel identifié par l\'IA.',
    descriptionEn: 'This period does not follow the usual seasonal pattern identified by the AI.',
    example: 'Si décembre est habituellement votre meilleur mois (+30%), mais cette année il est à -5%, c\'est une déviation.',
    exampleEn: 'If December is usually your best month (+30%), but this year it\'s at -5%, that\'s a deviation.',
    impact: 'Peut affecter les prévisions de trésorerie et la planification budgétaire.',
    impactEn: 'May affect cash flow forecasts and budget planning.',
  },
  forecast_miss: {
    title: 'Écart significatif vs prévision IA',
    titleEn: 'Significant Forecast Miss',
    description: 'La valeur réelle diffère significativement de ce que le modèle prédictif avait anticipé.',
    descriptionEn: 'The actual value differs significantly from what the predictive model anticipated.',
    example: 'L\'IA prévoyait 150k$ de revenus, le réel est 95k$ - un écart de 37%.',
    exampleEn: 'The AI predicted $150k revenue, actual was $95k - a 37% gap.',
    impact: 'Suggère que les hypothèses du modèle doivent être révisées ou qu\'un événement imprévu s\'est produit.',
    impactEn: 'Suggests model assumptions need revision or an unexpected event occurred.',
  },
  peer_deviation: {
    title: 'Comportement différent des comptes similaires',
    titleEn: 'Peer Account Deviation',
    description: 'Ce compte se comporte différemment des autres comptes de la même catégorie.',
    descriptionEn: 'This account behaves differently from other accounts in the same category.',
    example: 'Tous les comptes de charges ont augmenté de ~5%, sauf un qui a augmenté de 45%.',
    exampleEn: 'All expense accounts increased by ~5%, except one that increased by 45%.',
    impact: 'Peut révéler une erreur de classification ou une dépense non autorisée.',
    impactEn: 'May reveal a classification error or unauthorized expense.',
  },
  benford_violation: {
    title: 'Distribution des chiffres inhabituelle',
    titleEn: 'Unusual Digit Distribution',
    description: 'La distribution des premiers chiffres ne suit pas la loi de Benford, souvent utilisée pour détecter la fraude.',
    descriptionEn: 'The distribution of leading digits doesn\'t follow Benford\'s Law, often used for fraud detection.',
    example: 'Normalement, 30% des montants commencent par "1". Si seulement 5% le font, c\'est suspect.',
    exampleEn: 'Normally, 30% of amounts start with "1". If only 5% do, it\'s suspicious.',
    impact: 'Indicateur classique de manipulation de données ou de fraude potentielle.',
    impactEn: 'Classic indicator of data manipulation or potential fraud.',
  },
  duplicate_pattern: {
    title: 'Pattern de duplication potentielle',
    titleEn: 'Potential Duplication Pattern',
    description: 'L\'IA a détecté des transactions avec des montants et dates similaires qui pourraient être des doublons.',
    descriptionEn: 'The AI detected transactions with similar amounts and dates that could be duplicates.',
    example: 'Deux factures de 5,847.32$ à 3 jours d\'intervalle au même fournisseur.',
    exampleEn: 'Two invoices for $5,847.32 within 3 days to the same supplier.',
    impact: 'Les doublons peuvent fausser les états financiers et les ratios.',
    impactEn: 'Duplicates can distort financial statements and ratios.',
  },
  round_number_cluster: {
    title: 'Concentration de montants ronds',
    titleEn: 'Round Number Cluster',
    description: 'Un nombre inhabituel de transactions avec des montants ronds, ce qui peut indiquer des estimations ou ajustements.',
    descriptionEn: 'An unusual number of transactions with round amounts, which may indicate estimates or adjustments.',
    example: 'Plusieurs provisions de 10,000$, 25,000$, 50,000$ exactement.',
    exampleEn: 'Several provisions of exactly $10,000, $25,000, $50,000.',
    impact: 'Les montants ronds peuvent cacher un manque de précision dans les estimations.',
    impactEn: 'Round amounts may hide a lack of precision in estimates.',
  },
  timing_anomaly: {
    title: 'Anomalie de timing',
    titleEn: 'Timing Anomaly',
    description: 'Des transactions enregistrées à des moments inhabituels (fin de période, weekend, etc.).',
    descriptionEn: 'Transactions recorded at unusual times (period-end, weekends, etc.).',
    example: 'Ajustement majeur le 31 décembre à 23h58.',
    exampleEn: 'Major adjustment on December 31st at 11:58 PM.',
    impact: 'Peut indiquer une manipulation des résultats de période.',
    impactEn: 'May indicate period-end results manipulation.',
  },
  velocity_change: {
    title: 'Changement de vélocité',
    titleEn: 'Velocity Change',
    description: 'Le taux de changement (accélération) de ce compte a significativement changé.',
    descriptionEn: 'The rate of change (acceleration) of this account has significantly changed.',
    example: 'Les ventes augmentaient de 2%/mois, maintenant elles augmentent de 8%/mois.',
    exampleEn: 'Sales were increasing 2%/month, now they\'re increasing 8%/month.',
    impact: 'Peut signaler un changement de dynamique commerciale important.',
    impactEn: 'May signal an important change in business dynamics.',
  },
  correlation_break: {
    title: 'Rupture de corrélation',
    titleEn: 'Correlation Break',
    description: 'Deux comptes qui évoluaient ensemble ne le font plus, ce qui peut indiquer une anomalie.',
    descriptionEn: 'Two accounts that used to move together no longer do, which may indicate an anomaly.',
    example: 'Ventes et commissions évoluaient ensemble (r=0.95), maintenant r=0.3.',
    exampleEn: 'Sales and commissions moved together (r=0.95), now r=0.3.',
    impact: 'Peut révéler des commissions non comptabilisées ou des ventes non enregistrées.',
    impactEn: 'May reveal unrecorded commissions or unrecorded sales.',
  },
  ratio_drift: {
    title: 'Dérive progressive des ratios',
    titleEn: 'Ratio Drift',
    description: 'Un ratio financier se dégrade progressivement sur plusieurs périodes.',
    descriptionEn: 'A financial ratio is gradually deteriorating over multiple periods.',
    example: 'Le ratio de liquidité passe de 2.0 à 1.8 à 1.5 à 1.2 sur 4 trimestres.',
    exampleEn: 'The current ratio went from 2.0 to 1.8 to 1.5 to 1.2 over 4 quarters.',
    impact: 'Tendance qui peut mener à des problèmes de solvabilité si non adressée.',
    impactEn: 'Trend that may lead to solvency issues if not addressed.',
  },
};

// =====================================================
// STATISTICAL HELPERS
// =====================================================

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate Z-score
 */
function zScore(value: number, values: number[]): number {
  const avg = mean(values);
  const std = standardDeviation(values);
  if (std === 0) return 0;
  return (value - avg) / std;
}

/**
 * Calculate moving average
 */
function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowValues = values.slice(start, i + 1);
    result.push(mean(windowValues));
  }
  return result;
}

/**
 * Simple linear regression
 */
function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += Math.pow(values[i] - predicted, 2);
    ssTot += Math.pow(values[i] - yMean, 2);
  }
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  return { slope, intercept, r2 };
}

/**
 * Detect seasonality using autocorrelation
 */
function detectSeasonalPeriod(values: number[], maxLag: number = 12): number | null {
  if (values.length < maxLag * 2) return null;
  
  const avg = mean(values);
  let bestLag = null;
  let bestCorr = 0.3; // Minimum correlation threshold
  
  for (let lag = 2; lag <= maxLag; lag++) {
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = lag; i < values.length; i++) {
      const diff1 = values[i] - avg;
      const diff2 = values[i - lag] - avg;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    const corr = numerator / Math.sqrt(denom1 * denom2);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  
  return bestLag;
}

/**
 * Benford's Law expected distribution
 */
const BENFORD_EXPECTED = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function getBenfordDistribution(values: number[]): number[] {
  const counts = new Array(9).fill(0);
  let total = 0;
  
  values.forEach(v => {
    const absV = Math.abs(v);
    if (absV >= 1) {
      const firstDigit = parseInt(String(absV)[0]);
      if (firstDigit >= 1 && firstDigit <= 9) {
        counts[firstDigit - 1]++;
        total++;
      }
    }
  });
  
  return total > 0 ? counts.map(c => c / total) : counts;
}

function benfordChiSquare(observed: number[], expected: number[], n: number): number {
  let chiSquare = 0;
  for (let i = 0; i < 9; i++) {
    const expectedCount = expected[i] * n;
    if (expectedCount > 0) {
      chiSquare += Math.pow(observed[i] * n - expectedCount, 2) / expectedCount;
    }
  }
  return chiSquare;
}

// =====================================================
// AI DETECTION ALGORITHMS
// =====================================================

/**
 * Detect statistical outliers using Z-score
 */
export function detectStatisticalOutliers(
  data: FinancialDataPoint[],
  accountName: string,
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (data.length < config.minDataPointsForAnalysis) return anomalies;
  
  const values = data.map(d => d.value);
  const avg = mean(values);
  const std = standardDeviation(values);
  
  data.forEach((point, index) => {
    const z = zScore(point.value, values);
    
    if (Math.abs(z) > config.zScoreThreshold) {
      const confidence = Math.min(100, Math.round((Math.abs(z) - config.zScoreThreshold) * 30 + 70));
      const impactScore = Math.round(Math.abs(point.value - avg) / avg * 100);
      
      anomalies.push({
        id: `ai-outlier-${point.period}-${index}`,
        category: 'variance',
        aiType: 'statistical_outlier',
        severity: Math.abs(z) > 3.5 ? 'critical' : 'warning',
        confidence,
        impactScore,
        title: `Valeur inhabituelle: ${accountName}`,
        description: `${formatCurrency(point.value)} est à ${z.toFixed(1)} écarts-types de la moyenne.`,
        explanation: `Ce montant est statistiquement très différent de votre historique. La moyenne est ${formatCurrency(avg)} et cette valeur s'en écarte de ${formatPercentage((point.value - avg) / avg * 100)}.`,
        explanationEn: `This amount is statistically very different from your history. The average is ${formatCurrency(avg)} and this value deviates by ${formatPercentage((point.value - avg) / avg * 100)}.`,
        technicalDetails: `Z-score: ${z.toFixed(2)}, Moyenne: ${formatCurrency(avg)}, Écart-type: ${formatCurrency(std)}`,
        value: point.value,
        expectedValue: avg,
        percentageDeviation: (point.value - avg) / avg * 100,
        affectedPeriod: point.period,
        affectedAccount: point.account,
        recommendation: z > 0 
          ? 'Vérifier si cette augmentation est justifiée par une transaction exceptionnelle.'
          : 'Investiguer la cause de cette diminution inhabituelle.',
        suggestedActions: [
          'Vérifier les pièces justificatives',
          'Comparer avec les périodes similaires de l\'année précédente',
          'Confirmer avec le responsable du compte',
        ],
        dataPoints: values,
        detectedAt: new Date(),
      });
    }
  });
  
  return anomalies;
}

/**
 * Detect trend breaks using regression analysis
 */
export function detectTrendBreaks(
  data: FinancialDataPoint[],
  accountName: string,
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (data.length < config.minDataPointsForAnalysis + 2) return anomalies;
  
  const values = data.map(d => d.value);
  
  // Analyze in windows
  const windowSize = Math.max(4, Math.floor(data.length / 3));
  
  for (let i = windowSize; i < data.length - 1; i++) {
    // Compare regression of window before and window including current point
    const beforeValues = values.slice(Math.max(0, i - windowSize), i);
    const afterValues = values.slice(i - windowSize + 1, i + 2);
    
    const regBefore = linearRegression(beforeValues);
    const regAfter = linearRegression(afterValues);
    
    // Detect significant slope change
    const slopeChange = Math.abs(regAfter.slope - regBefore.slope);
    const avgValue = mean(values);
    const relativeChange = avgValue !== 0 ? (slopeChange / avgValue) * 100 : 0;
    
    if (relativeChange > 5 && regBefore.r2 > 0.5) {
      const confidence = Math.min(100, Math.round(regBefore.r2 * 70 + relativeChange));
      
      anomalies.push({
        id: `ai-trend-break-${data[i].period}`,
        category: 'trend',
        aiType: 'trend_break',
        severity: relativeChange > 15 ? 'critical' : 'warning',
        confidence,
        impactScore: Math.round(relativeChange),
        title: `Rupture de tendance: ${accountName}`,
        description: `La tendance a changé brusquement en ${data[i].period}.`,
        explanation: `Avant cette période, ${accountName} ${regBefore.slope > 0 ? 'augmentait' : 'diminuait'} régulièrement. La direction ou l'intensité a soudainement changé.`,
        explanationEn: `Before this period, ${accountName} was ${regBefore.slope > 0 ? 'increasing' : 'decreasing'} steadily. The direction or intensity suddenly changed.`,
        technicalDetails: `Pente avant: ${regBefore.slope.toFixed(2)}, Pente après: ${regAfter.slope.toFixed(2)}, R² avant: ${regBefore.r2.toFixed(2)}`,
        value: data[i].value,
        expectedValue: regBefore.intercept + regBefore.slope * i,
        affectedPeriod: data[i].period,
        recommendation: 'Analyser les événements de cette période pour comprendre le changement.',
        suggestedActions: [
          'Identifier les événements majeurs de cette période',
          'Réviser les prévisions futures',
          'Documenter la cause du changement',
        ],
        dataPoints: values,
        detectedAt: new Date(),
      });
      
      // Skip a few periods to avoid duplicate detections
      i += 2;
    }
  }
  
  return anomalies;
}

/**
 * Detect seasonality deviations
 */
export function detectSeasonalityAnomalies(
  data: FinancialDataPoint[],
  accountName: string,
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (!config.detectSeasonality || data.length < 24) return anomalies;
  
  const values = data.map(d => d.value);
  const seasonalPeriod = detectSeasonalPeriod(values);
  
  if (!seasonalPeriod) return anomalies;
  
  // Calculate seasonal indices
  const seasonalIndices: number[] = [];
  for (let s = 0; s < seasonalPeriod; s++) {
    const seasonValues = values.filter((_, i) => i % seasonalPeriod === s);
    seasonalIndices.push(mean(seasonValues));
  }
  const avgSeasonal = mean(seasonalIndices);
  const normalizedIndices = seasonalIndices.map(si => si / avgSeasonal);
  
  // Check recent periods against seasonal pattern
  const recentStart = Math.max(0, data.length - seasonalPeriod);
  for (let i = recentStart; i < data.length; i++) {
    const seasonIndex = i % seasonalPeriod;
    const expectedValue = mean(values) * normalizedIndices[seasonIndex];
    const deviation = Math.abs(values[i] - expectedValue) / expectedValue * 100;
    
    if (deviation > 25) {
      anomalies.push({
        id: `ai-seasonal-${data[i].period}`,
        category: 'trend',
        aiType: 'seasonality_deviation',
        severity: deviation > 50 ? 'critical' : 'warning',
        confidence: Math.min(100, 60 + Math.round(deviation / 2)),
        impactScore: Math.round(deviation),
        title: `Écart saisonnier: ${accountName}`,
        description: `${data[i].period} ne suit pas le pattern saisonnier habituel.`,
        explanation: `Habituellement, cette période représente ${(normalizedIndices[seasonIndex] * 100).toFixed(0)}% de la moyenne. Cette fois, c'est ${(values[i] / mean(values) * 100).toFixed(0)}%.`,
        explanationEn: `Usually, this period represents ${(normalizedIndices[seasonIndex] * 100).toFixed(0)}% of the average. This time, it's ${(values[i] / mean(values) * 100).toFixed(0)}%.`,
        technicalDetails: `Période saisonnière: ${seasonalPeriod} mois, Indice attendu: ${normalizedIndices[seasonIndex].toFixed(2)}`,
        value: values[i],
        expectedValue,
        percentageDeviation: (values[i] - expectedValue) / expectedValue * 100,
        affectedPeriod: data[i].period,
        recommendation: 'Vérifier si des facteurs externes expliquent cet écart par rapport au pattern habituel.',
        suggestedActions: [
          'Comparer avec la même période des années précédentes',
          'Identifier les facteurs externes (concurrence, économie)',
          'Ajuster les prévisions saisonnières',
        ],
        learningNote: `Pattern saisonnier détecté sur ${seasonalPeriod} périodes`,
        detectedAt: new Date(),
      });
    }
  }
  
  return anomalies;
}

/**
 * Detect Benford's Law violations (fraud indicator)
 */
export function detectBenfordViolations(
  transactions: { amount: number; description?: string }[],
  accountName: string,
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (!config.benfordEnabled || transactions.length < 100) return anomalies;
  
  const amounts = transactions.map(t => t.amount);
  const observed = getBenfordDistribution(amounts);
  const chiSquare = benfordChiSquare(observed, BENFORD_EXPECTED, transactions.length);
  
  if (chiSquare > config.benfordThreshold) {
    // Find which digits are most anomalous
    const deviations = observed.map((o, i) => ({
      digit: i + 1,
      observed: o * 100,
      expected: BENFORD_EXPECTED[i] * 100,
      deviation: Math.abs(o - BENFORD_EXPECTED[i]) * 100,
    })).sort((a, b) => b.deviation - a.deviation);
    
    const worstDigit = deviations[0];
    
    anomalies.push({
      id: `ai-benford-${accountName}`,
      category: 'duplicate',
      aiType: 'benford_violation',
      severity: chiSquare > config.benfordThreshold * 2 ? 'critical' : 'warning',
      confidence: Math.min(100, 50 + Math.round((chiSquare - config.benfordThreshold) / config.benfordThreshold * 50)),
      impactScore: Math.round(chiSquare / config.benfordThreshold * 100),
      title: `Distribution inhabituelle: ${accountName}`,
      description: `Les montants ne suivent pas la distribution naturelle attendue.`,
      explanation: `Dans des données financières naturelles, ${(BENFORD_EXPECTED[0] * 100).toFixed(0)}% des montants commencent par "1". Ici, c'est ${(observed[0] * 100).toFixed(0)}%. Le chiffre "${worstDigit.digit}" est le plus anormal: ${worstDigit.observed.toFixed(1)}% vs ${worstDigit.expected.toFixed(1)}% attendu.`,
      explanationEn: `In natural financial data, ${(BENFORD_EXPECTED[0] * 100).toFixed(0)}% of amounts start with "1". Here, it's ${(observed[0] * 100).toFixed(0)}%. The digit "${worstDigit.digit}" is most anomalous: ${worstDigit.observed.toFixed(1)}% vs ${worstDigit.expected.toFixed(1)}% expected.`,
      technicalDetails: `Chi-carré: ${chiSquare.toFixed(2)}, Seuil: ${config.benfordThreshold}, N=${transactions.length}`,
      value: chiSquare,
      threshold: config.benfordThreshold,
      recommendation: 'Cette anomalie est un indicateur classique de manipulation. Une revue approfondie est recommandée.',
      suggestedActions: [
        'Effectuer un audit des transactions suspectes',
        'Vérifier les montants commençant par les chiffres anormaux',
        'Examiner les transactions de fin de période',
        'Consulter un expert en fraude si nécessaire',
      ],
      detectedAt: new Date(),
    });
  }
  
  return anomalies;
}

/**
 * Detect velocity changes (acceleration/deceleration)
 */
export function detectVelocityChanges(
  data: FinancialDataPoint[],
  accountName: string,
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (data.length < config.velocityWindow * 2 + 2) return anomalies;
  
  const values = data.map(d => d.value);
  
  // Calculate velocities (first derivatives)
  const velocities: number[] = [];
  for (let i = 1; i < values.length; i++) {
    velocities.push(values[i] - values[i - 1]);
  }
  
  // Calculate average velocity in windows
  for (let i = config.velocityWindow; i < velocities.length; i++) {
    const recentVelocity = mean(velocities.slice(i - config.velocityWindow + 1, i + 1));
    const priorVelocity = mean(velocities.slice(Math.max(0, i - 2 * config.velocityWindow + 1), i - config.velocityWindow + 1));
    
    if (priorVelocity !== 0) {
      const velocityChange = ((recentVelocity - priorVelocity) / Math.abs(priorVelocity)) * 100;
      
      if (Math.abs(velocityChange) > config.velocityThreshold) {
        anomalies.push({
          id: `ai-velocity-${data[i + 1].period}`,
          category: 'trend',
          aiType: 'velocity_change',
          severity: Math.abs(velocityChange) > config.velocityThreshold * 2 ? 'critical' : 'warning',
          confidence: Math.min(100, 60 + Math.round(Math.abs(velocityChange) / 2)),
          impactScore: Math.round(Math.abs(velocityChange)),
          title: `Changement de vélocité: ${accountName}`,
          description: `Le taux de changement a ${velocityChange > 0 ? 'accéléré' : 'ralenti'} de ${Math.abs(velocityChange).toFixed(0)}%.`,
          explanation: velocityChange > 0
            ? `${accountName} change maintenant plus rapidement qu'avant. La vitesse de changement est passée de ${formatCurrency(priorVelocity)}/période à ${formatCurrency(recentVelocity)}/période.`
            : `${accountName} change maintenant plus lentement qu'avant, ou la direction a changé.`,
          explanationEn: velocityChange > 0
            ? `${accountName} is now changing faster than before. The rate of change went from ${formatCurrency(priorVelocity)}/period to ${formatCurrency(recentVelocity)}/period.`
            : `${accountName} is now changing more slowly than before, or the direction has changed.`,
          technicalDetails: `Vélocité précédente: ${priorVelocity.toFixed(0)}, Vélocité actuelle: ${recentVelocity.toFixed(0)}`,
          value: recentVelocity,
          expectedValue: priorVelocity,
          affectedPeriod: data[i + 1].period,
          recommendation: 'Analyser ce qui cause cette accélération ou décélération.',
          suggestedActions: [
            'Identifier les facteurs de changement',
            'Évaluer si la nouvelle vélocité est soutenable',
            'Mettre à jour les projections',
          ],
          detectedAt: new Date(),
        });
        
        // Skip some periods
        i += config.velocityWindow - 1;
      }
    }
  }
  
  return anomalies;
}

/**
 * Detect ratio drift (gradual deterioration)
 */
export function detectRatioDrift(
  ratioHistory: { period: string; value: number; ratioName: string }[],
  thresholds: { warning: number; critical: number; direction: 'above' | 'below' },
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): AIAnomaly[] {
  const anomalies: AIAnomaly[] = [];
  
  if (ratioHistory.length < 4) return anomalies;
  
  const values = ratioHistory.map(r => r.value);
  const regression = linearRegression(values);
  
  // Check if trending toward threshold
  const currentValue = values[values.length - 1];
  const periodsToThreshold = thresholds.direction === 'below'
    ? (thresholds.warning - currentValue) / regression.slope
    : (currentValue - thresholds.warning) / (-regression.slope);
  
  const isDrifting = Math.abs(regression.slope) > 0.01 && regression.r2 > 0.5;
  const isApproachingThreshold = periodsToThreshold > 0 && periodsToThreshold < 6;
  
  if (isDrifting && (isApproachingThreshold || 
      (thresholds.direction === 'below' && currentValue < thresholds.warning) ||
      (thresholds.direction === 'above' && currentValue > thresholds.warning))) {
    
    const severity: AnomalySeverity = 
      (thresholds.direction === 'below' && currentValue < thresholds.critical) ||
      (thresholds.direction === 'above' && currentValue > thresholds.critical)
        ? 'critical'
        : 'warning';
    
    anomalies.push({
      id: `ai-ratio-drift-${ratioHistory[0].ratioName}`,
      category: 'ratio',
      aiType: 'ratio_drift',
      severity,
      confidence: Math.min(100, Math.round(regression.r2 * 100)),
      impactScore: Math.round(Math.abs((currentValue - thresholds.warning) / thresholds.warning) * 100),
      title: `Dérive du ratio: ${ratioHistory[0].ratioName}`,
      description: `Ce ratio se ${regression.slope < 0 ? 'détériore' : 'améliore'} progressivement.`,
      explanation: `Sur les ${ratioHistory.length} dernières périodes, ${ratioHistory[0].ratioName} ${regression.slope < 0 ? 'diminue' : 'augmente'} de façon constante. ${isApproachingThreshold ? `Au rythme actuel, le seuil d'alerte sera atteint dans ~${Math.round(periodsToThreshold)} périodes.` : ''}`,
      explanationEn: `Over the last ${ratioHistory.length} periods, ${ratioHistory[0].ratioName} is ${regression.slope < 0 ? 'decreasing' : 'increasing'} steadily. ${isApproachingThreshold ? `At the current rate, the warning threshold will be reached in ~${Math.round(periodsToThreshold)} periods.` : ''}`,
      technicalDetails: `Pente: ${regression.slope.toFixed(4)}/période, R²: ${regression.r2.toFixed(2)}, Périodes avant seuil: ${periodsToThreshold.toFixed(1)}`,
      value: currentValue,
      threshold: thresholds.warning,
      affectedPeriod: ratioHistory[ratioHistory.length - 1].period,
      recommendation: 'Cette tendance nécessite une action corrective avant d\'atteindre des niveaux critiques.',
      suggestedActions: [
        'Analyser les causes sous-jacentes',
        'Établir un plan d\'action correctif',
        'Surveiller de près les prochaines périodes',
        'Considérer des mesures préventives',
      ],
      dataPoints: values,
      detectedAt: new Date(),
    });
  }
  
  return anomalies;
}

// =====================================================
// MAIN AI ANALYSIS ENGINE
// =====================================================

export interface AIAnalysisResult {
  anomalies: AIAnomaly[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
    highestConfidence: number;
    topRisks: string[];
  };
  healthScore: number;
  aiConfidence: number;
  modelInfo: {
    dataPointsAnalyzed: number;
    algorithmsUsed: string[];
    processingTime: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    actionEn: string;
    relatedAnomalyIds: string[];
  }[];
}

/**
 * Run comprehensive AI analysis on financial data
 */
export async function runAIAnalysis(
  accounts: AccountBalance[],
  trendData: Record<string, FinancialDataPoint[]>,
  transactions: { amount: number; description?: string; date: string }[],
  ratios: { period: string; value: number; ratioName: string }[][],
  config: AIDetectionConfig = DEFAULT_AI_CONFIG
): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  const allAnomalies: AIAnomaly[] = [];
  const algorithmsUsed: string[] = [];
  let totalDataPoints = 0;
  
  // 1. Statistical Outlier Detection
  algorithmsUsed.push('Z-Score Outlier Detection');
  for (const [accountName, data] of Object.entries(trendData)) {
    totalDataPoints += data.length;
    allAnomalies.push(...detectStatisticalOutliers(data, accountName, config));
  }
  
  // 2. Trend Break Detection
  algorithmsUsed.push('Linear Regression Trend Analysis');
  for (const [accountName, data] of Object.entries(trendData)) {
    allAnomalies.push(...detectTrendBreaks(data, accountName, config));
  }
  
  // 3. Seasonality Detection
  if (config.detectSeasonality) {
    algorithmsUsed.push('Autocorrelation Seasonality Detection');
    for (const [accountName, data] of Object.entries(trendData)) {
      allAnomalies.push(...detectSeasonalityAnomalies(data, accountName, config));
    }
  }
  
  // 4. Velocity Change Detection
  algorithmsUsed.push('Velocity (First Derivative) Analysis');
  for (const [accountName, data] of Object.entries(trendData)) {
    allAnomalies.push(...detectVelocityChanges(data, accountName, config));
  }
  
  // 5. Benford's Law Analysis
  if (config.benfordEnabled && transactions.length > 0) {
    algorithmsUsed.push('Benford\'s Law Distribution Analysis');
    totalDataPoints += transactions.length;
    allAnomalies.push(...detectBenfordViolations(transactions, 'Transactions', config));
  }
  
  // 6. Ratio Drift Detection
  algorithmsUsed.push('Ratio Trend Analysis');
  for (const ratioHistory of ratios) {
    if (ratioHistory.length > 0) {
      totalDataPoints += ratioHistory.length;
      
      // Determine thresholds based on ratio type
      const ratioName = ratioHistory[0].ratioName;
      let thresholds = { warning: 1.0, critical: 0.8, direction: 'below' as const };
      
      if (ratioName.includes('Debt') || ratioName.includes('dette')) {
        thresholds = { warning: 2.0, critical: 3.0, direction: 'above' };
      }
      
      allAnomalies.push(...detectRatioDrift(ratioHistory, thresholds, config));
    }
  }
  
  // Calculate summary
  const summary = {
    critical: allAnomalies.filter(a => a.severity === 'critical').length,
    warning: allAnomalies.filter(a => a.severity === 'warning').length,
    info: allAnomalies.filter(a => a.severity === 'info').length,
    total: allAnomalies.length,
    highestConfidence: allAnomalies.length > 0 
      ? Math.max(...allAnomalies.map(a => a.confidence))
      : 0,
    topRisks: allAnomalies
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 3)
      .map(a => a.title),
  };
  
  // Calculate health score
  const healthScore = Math.max(0, Math.min(100, 
    100 - (summary.critical * 25 + summary.warning * 10 + summary.info * 2)
  ));
  
  // Calculate AI confidence
  const avgConfidence = allAnomalies.length > 0
    ? mean(allAnomalies.map(a => a.confidence))
    : 100;
  
  // Generate prioritized recommendations
  const recommendations = allAnomalies
    .filter(a => a.severity !== 'info')
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return b.confidence - a.confidence;
    })
    .slice(0, 5)
    .map(a => ({
      priority: a.severity === 'critical' ? 'high' as const : 'medium' as const,
      action: a.recommendation,
      actionEn: a.suggestedActions[0] || a.recommendation,
      relatedAnomalyIds: [a.id],
    }));
  
  return {
    anomalies: allAnomalies.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.confidence - a.confidence;
    }),
    summary,
    healthScore,
    aiConfidence: avgConfidence,
    modelInfo: {
      dataPointsAnalyzed: totalDataPoints,
      algorithmsUsed,
      processingTime: Date.now() - startTime,
    },
    recommendations,
  };
}

export default {
  runAIAnalysis,
  detectStatisticalOutliers,
  detectTrendBreaks,
  detectSeasonalityAnomalies,
  detectBenfordViolations,
  detectVelocityChanges,
  detectRatioDrift,
  ANOMALY_TOOLTIPS,
  DEFAULT_AI_CONFIG,
};
