/**
 * Anomaly Detection System for Accounting Data
 * Detects inconsistencies, unusual patterns, and threshold breaches
 */

// =============================================================================
// TYPES
// =============================================================================

export type AnomalySeverity = 'critical' | 'warning' | 'info';
export type AnomalyCategory = 
  | 'variance' 
  | 'trend' 
  | 'balance' 
  | 'ratio' 
  | 'duplicate' 
  | 'missing' 
  | 'timing'
  | 'threshold';

export interface Anomaly {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  title: string;
  description: string;
  value: number;
  threshold?: number;
  percentageDeviation?: number;
  affectedAccount?: string;
  affectedPeriod?: string;
  recommendation: string;
  detectedAt: Date;
}

export interface ThresholdConfig {
  // Variance thresholds (percentage)
  varianceWarning: number;
  varianceCritical: number;
  
  // Ratio thresholds
  currentRatioMin: number;
  currentRatioMax: number;
  quickRatioMin: number;
  debtToEquityMax: number;
  
  // Trend thresholds (consecutive periods)
  trendConsecutivePeriods: number;
  trendPercentageChange: number;
  
  // Timing thresholds (days)
  receivablesAgingWarning: number;
  receivablesAgingCritical: number;
  payablesAgingWarning: number;
  
  // Balance thresholds
  negativeBalanceCheck: boolean;
  unusualHoursCheck: boolean;
  duplicateThresholdDays: number;
  
  // Amount thresholds
  largeTransactionAmount: number;
  roundNumberThreshold: number;
}

export interface FinancialDataPoint {
  period: string;
  value: number;
  account?: string;
  category?: string;
}

export interface AccountBalance {
  code: string;
  name: string;
  current: number;
  prior: number;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

// =============================================================================
// DEFAULT THRESHOLDS - Based on Industry Best Practices
// =============================================================================
// Sources: IFRS materiality guidelines, CPA Canada audit standards,
// Industry benchmarks from Bloomberg, S&P Capital IQ

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  // Variance: flag items with significant changes
  // IFRS suggests investigating variances >10% on material items
  // 15% warning is balanced between sensitivity and noise reduction
  varianceWarning: 15, // 15% change triggers warning (IFRS suggests 10-15%)
  varianceCritical: 30, // 30% change triggers critical (requires investigation)
  
  // Financial ratios - Industry standard ranges
  // Current Ratio: 1.5-2.0 is considered healthy across most industries
  // Quick Ratio: >1.0 indicates good short-term liquidity
  // Debt-to-Equity: varies by industry (1.5-2.5 general, 3-4 real estate)
  currentRatioMin: 1.2, // Below 1.0 indicates potential liquidity issues
  currentRatioMax: 3.0, // Above 3.0 may indicate inefficient asset use
  quickRatioMin: 0.8, // Acid test - ability to pay without selling inventory
  debtToEquityMax: 2.0, // Leverage threshold (lower = less risk)
  
  // Trend detection - Statistical significance thresholds
  // 3 consecutive periods with >10% change is statistically meaningful
  trendConsecutivePeriods: 3,
  trendPercentageChange: 10,
  
  // Aging - Based on DSO (Days Sales Outstanding) benchmarks
  // Average DSO across industries: 30-45 days
  // >60 days significantly increases bad debt risk
  // >90 days has ~25% probability of becoming uncollectible
  receivablesAgingWarning: 45, // Industry standard warning threshold
  receivablesAgingCritical: 90, // Significant collection risk
  payablesAgingWarning: 45, // May indicate cash flow issues
  
  // Balance checks - Control environment best practices
  negativeBalanceCheck: true, // Always flag negative asset balances
  unusualHoursCheck: true, // Flag transactions outside business hours
  duplicateThresholdDays: 7, // Window for duplicate detection
  
  // Amount thresholds - Based on company size (adjust per organization)
  // Default suitable for mid-size companies ($5M-50M revenue)
  largeTransactionAmount: 25000, // Transactions requiring additional review
  roundNumberThreshold: 1000, // Detect potential estimates/manipulations
};

// =============================================================================
// ANOMALY DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect variance anomalies between current and prior periods
 */
export function detectVarianceAnomalies(
  accounts: AccountBalance[],
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  accounts.forEach(account => {
    if (account.prior === 0) return;
    
    const variance = ((account.current - account.prior) / Math.abs(account.prior)) * 100;
    const absVariance = Math.abs(variance);
    
    if (absVariance >= config.varianceCritical) {
      anomalies.push({
        id: `variance-${account.code}-critical`,
        category: 'variance',
        severity: 'critical',
        title: `Variance critique: ${account.name}`,
        description: `Variation de ${variance.toFixed(1)}% par rapport à la période précédente.`,
        value: account.current,
        threshold: config.varianceCritical,
        percentageDeviation: variance,
        affectedAccount: account.code,
        recommendation: variance > 0 
          ? 'Investiguer la source de cette augmentation significative.'
          : 'Vérifier les raisons de cette diminution importante.',
        detectedAt: new Date(),
      });
    } else if (absVariance >= config.varianceWarning) {
      anomalies.push({
        id: `variance-${account.code}-warning`,
        category: 'variance',
        severity: 'warning',
        title: `Variance notable: ${account.name}`,
        description: `Variation de ${variance.toFixed(1)}% par rapport à la période précédente.`,
        value: account.current,
        threshold: config.varianceWarning,
        percentageDeviation: variance,
        affectedAccount: account.code,
        recommendation: 'Vérifier si cette variation est attendue et documentée.',
        detectedAt: new Date(),
      });
    }
  });
  
  return anomalies;
}

/**
 * Detect trend anomalies (consecutive increases/decreases)
 */
export function detectTrendAnomalies(
  data: FinancialDataPoint[],
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (data.length < config.trendConsecutivePeriods + 1) return anomalies;
  
  let consecutiveIncreases = 0;
  let consecutiveDecreases = 0;
  let totalChange = 0;
  
  for (let i = 1; i < data.length; i++) {
    const change = ((data[i].value - data[i-1].value) / Math.abs(data[i-1].value || 1)) * 100;
    
    if (change > config.trendPercentageChange) {
      consecutiveIncreases++;
      consecutiveDecreases = 0;
      totalChange += change;
    } else if (change < -config.trendPercentageChange) {
      consecutiveDecreases++;
      consecutiveIncreases = 0;
      totalChange += change;
    } else {
      consecutiveIncreases = 0;
      consecutiveDecreases = 0;
      totalChange = 0;
    }
    
    if (consecutiveIncreases >= config.trendConsecutivePeriods) {
      anomalies.push({
        id: `trend-increase-${data[i].period}`,
        category: 'trend',
        severity: 'warning',
      title: 'Tendance haussière continue',
      description: `${consecutiveIncreases} périodes consécutives d'augmentation (${totalChange.toFixed(1)}% au total).`,
        value: data[i].value,
        percentageDeviation: totalChange,
        affectedPeriod: data[i].period,
        recommendation: 'Analyser si cette tendance est soutenable et conforme aux projections.',
        detectedAt: new Date(),
      });
      consecutiveIncreases = 0;
      totalChange = 0;
    }
    
    if (consecutiveDecreases >= config.trendConsecutivePeriods) {
      anomalies.push({
        id: `trend-decrease-${data[i].period}`,
        category: 'trend',
        severity: 'critical',
      title: 'Tendance baissière continue',
      description: `${consecutiveDecreases} périodes consécutives de baisse (${totalChange.toFixed(1)}% au total).`,
        value: data[i].value,
        percentageDeviation: totalChange,
        affectedPeriod: data[i].period,
        recommendation: 'Investiguer les causes de cette baisse et prendre des mesures correctives.',
        detectedAt: new Date(),
      });
      consecutiveDecreases = 0;
      totalChange = 0;
    }
  }
  
  return anomalies;
}

/**
 * Detect balance anomalies (assets ≠ liabilities + equity)
 */
export function detectBalanceAnomalies(
  totalAssets: number,
  totalLiabilities: number,
  totalEquity: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const difference = totalAssets - (totalLiabilities + totalEquity);
  
  if (Math.abs(difference) > 0.01) {
    anomalies.push({
      id: 'balance-mismatch',
      category: 'balance',
      severity: 'critical',
      title: 'Bilan déséquilibré',
      description: `Écart de ${formatCurrency(Math.abs(difference))} entre l'actif et le passif + capitaux propres.`,
      value: difference,
      recommendation: 'Vérifier toutes les écritures comptables pour identifier l\'erreur.',
      detectedAt: new Date(),
    });
  }
  
  return anomalies;
}

/**
 * Detect financial ratio anomalies
 */
export function detectRatioAnomalies(
  currentAssets: number,
  currentLiabilities: number,
  inventory: number,
  totalDebt: number,
  totalEquity: number,
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Current Ratio
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  if (currentRatio < config.currentRatioMin) {
    anomalies.push({
      id: 'ratio-current-low',
      category: 'ratio',
      severity: 'critical',
      title: 'Ratio de liquidité insuffisant',
      description: `Le ratio de liquidité générale est de ${currentRatio.toFixed(2)}, sous le seuil de ${config.currentRatioMin}.`,
      value: currentRatio,
      threshold: config.currentRatioMin,
      recommendation: 'Risque de difficultés à honorer les obligations à court terme. Considérer des sources de financement.',
      detectedAt: new Date(),
    });
  } else if (currentRatio > config.currentRatioMax) {
    anomalies.push({
      id: 'ratio-current-high',
      category: 'ratio',
      severity: 'info',
      title: 'Ratio de liquidité élevé',
      description: `Le ratio de liquidité générale est de ${currentRatio.toFixed(2)}, au-dessus de ${config.currentRatioMax}.`,
      value: currentRatio,
      threshold: config.currentRatioMax,
      recommendation: 'Les actifs à court terme pourraient être mieux utilisés pour générer des rendements.',
      detectedAt: new Date(),
    });
  }
  
  // Quick Ratio (Acid Test)
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
  if (quickRatio < config.quickRatioMin) {
    anomalies.push({
      id: 'ratio-quick-low',
      category: 'ratio',
      severity: 'warning',
      title: 'Ratio de liquidité immédiate bas',
      description: `Le ratio de liquidité immédiate est de ${quickRatio.toFixed(2)}, sous le seuil de ${config.quickRatioMin}.`,
      value: quickRatio,
      threshold: config.quickRatioMin,
      recommendation: 'La capacité à payer les dettes à court terme sans vendre les stocks est limitée.',
      detectedAt: new Date(),
    });
  }
  
  // Debt to Equity
  const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 999;
  if (debtToEquity > config.debtToEquityMax) {
    anomalies.push({
      id: 'ratio-debt-equity-high',
      category: 'ratio',
      severity: 'warning',
      title: 'Ratio dette/capitaux propres élevé',
      description: `Le ratio dette/capitaux propres est de ${debtToEquity.toFixed(2)}, au-dessus de ${config.debtToEquityMax}.`,
      value: debtToEquity,
      threshold: config.debtToEquityMax,
      recommendation: 'L\'entreprise est fortement endettée. Évaluer les risques de solvabilité.',
      detectedAt: new Date(),
    });
  }
  
  return anomalies;
}

/**
 * Detect unusual patterns (round numbers, negative balances)
 */
export function detectUnusualPatterns(
  accounts: AccountBalance[],
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  accounts.forEach(account => {
    // Check for negative balances on assets
    if (config.negativeBalanceCheck && account.type === 'asset' && account.current < 0) {
      anomalies.push({
        id: `negative-${account.code}`,
        category: 'balance',
        severity: 'critical',
        title: `Solde négatif: ${account.name}`,
        description: `Solde négatif de ${formatCurrency(account.current)} sur un compte d'actif.`,
        value: account.current,
        affectedAccount: account.code,
        recommendation: 'Vérifier les écritures. Un compte d\'actif ne devrait pas être négatif.',
        detectedAt: new Date(),
      });
    }
    
    // Check for suspiciously round numbers on large amounts
    if (Math.abs(account.current) >= config.roundNumberThreshold) {
      const isRound = account.current % 1000 === 0 || account.current % 500 === 0;
      if (isRound && Math.abs(account.current) >= config.largeTransactionAmount) {
        anomalies.push({
          id: `round-${account.code}`,
          category: 'threshold',
          severity: 'info',
        title: `Montant rond suspect: ${account.name}`,
        description: `Montant rond de ${formatCurrency(account.current)} détecté.`,
          value: account.current,
          affectedAccount: account.code,
          recommendation: 'Vérifier si ce montant exact est justifié (estimations, provisions).',
          detectedAt: new Date(),
        });
      }
    }
  });
  
  return anomalies;
}

/**
 * Calculate statistical outliers using IQR method
 */
export function detectOutliers(
  data: FinancialDataPoint[],
  accountName: string
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (data.length < 4) return anomalies;
  
  const values = data.map(d => d.value).sort((a, b) => a - b);
  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);
  const q1 = values[q1Index];
  const q3 = values[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  data.forEach(point => {
    if (point.value < lowerBound || point.value > upperBound) {
      anomalies.push({
        id: `outlier-${point.period}`,
        category: 'variance',
        severity: point.value < lowerBound ? 'critical' : 'warning',
      title: `Valeur aberrante: ${accountName}`,
      description: `Valeur ${formatCurrency(point.value)} pour ${point.period} hors limites statistiques [${formatCurrency(lowerBound)} - ${formatCurrency(upperBound)}].`,
        value: point.value,
        threshold: point.value < lowerBound ? lowerBound : upperBound,
        affectedPeriod: point.period,
        recommendation: 'Vérifier cette valeur inhabituelle et son impact sur les analyses.',
        detectedAt: new Date(),
      });
    }
  });
  
  return anomalies;
}

// =============================================================================
// VISUALIZATION HELPERS
// =============================================================================

/**
 * Calculate threshold bands for charts
 */
export interface ThresholdBand {
  min: number;
  max: number;
  color: string;
  label: string;
}

export function calculateThresholdBands(
  baseValue: number,
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): ThresholdBand[] {
  return [
    {
      min: baseValue * (1 - config.varianceWarning / 100),
      max: baseValue * (1 + config.varianceWarning / 100),
      color: 'rgb(var(--color-success) / 0.1)',
      label: 'Normal',
    },
    {
      min: baseValue * (1 - config.varianceCritical / 100),
      max: baseValue * (1 - config.varianceWarning / 100),
      color: 'rgb(var(--color-warning) / 0.2)',
      label: 'Attention',
    },
    {
      min: baseValue * (1 + config.varianceWarning / 100),
      max: baseValue * (1 + config.varianceCritical / 100),
      color: 'rgb(var(--color-warning) / 0.2)',
      label: 'Attention',
    },
  ];
}

/**
 * Get color for a value based on thresholds
 */
export function getAnomalyColor(
  value: number,
  baseline: number,
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): string {
  if (baseline === 0) return 'rgb(var(--color-text))';
  
  const variance = Math.abs((value - baseline) / baseline) * 100;
  
  if (variance >= config.varianceCritical) {
    return 'rgb(var(--color-error))';
  } else if (variance >= config.varianceWarning) {
    return 'rgb(var(--color-warning))';
  }
  return 'rgb(var(--color-success))';
}

/**
 * Get severity icon and color
 */
export function getSeverityStyle(severity: AnomalySeverity): { 
  bgColor: string; 
  textColor: string; 
  icon: string;
  borderColor: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bgColor: 'rgb(var(--color-error) / 0.1)',
        textColor: 'rgb(var(--color-error))',
        borderColor: 'rgb(var(--color-error) / 0.3)',
        icon: '🚨',
      };
    case 'warning':
      return {
        bgColor: 'rgb(var(--color-warning) / 0.1)',
        textColor: 'rgb(var(--color-warning))',
        borderColor: 'rgb(var(--color-warning) / 0.3)',
        icon: '⚠️',
      };
    case 'info':
    default:
      return {
        bgColor: 'rgb(var(--color-info) / 0.1)',
        textColor: 'rgb(var(--color-info))',
        borderColor: 'rgb(var(--color-info) / 0.3)',
        icon: 'ℹ️',
      };
  }
}

/**
 * Format currency helper
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage helper
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// =============================================================================
// AGGREGATE ANALYSIS
// =============================================================================

/**
 * Run all anomaly detection checks and return aggregated results
 */
export function runFullAnalysis(
  accounts: AccountBalance[],
  trendData: FinancialDataPoint[],
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): {
  anomalies: Anomaly[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  healthScore: number;
} {
  const allAnomalies: Anomaly[] = [];
  
  // Variance detection
  allAnomalies.push(...detectVarianceAnomalies(accounts, config));
  
  // Trend detection
  allAnomalies.push(...detectTrendAnomalies(trendData, config));
  
  // Unusual patterns
  allAnomalies.push(...detectUnusualPatterns(accounts, config));
  
  // Calculate totals
  const assets = accounts.filter(a => a.type === 'asset');
  const liabilities = accounts.filter(a => a.type === 'liability');
  const equity = accounts.filter(a => a.type === 'equity');
  
  const totalAssets = assets.reduce((sum, a) => sum + a.current, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.current), 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.current, 0);
  
  // Balance check
  allAnomalies.push(...detectBalanceAnomalies(totalAssets, totalLiabilities, totalEquity));
  
  // Ratio checks
  const currentAssets = assets.filter(a => 
    a.code.startsWith('1') && parseInt(a.code) < 1500
  ).reduce((sum, a) => sum + a.current, 0);
  
  const currentLiabilities = liabilities.filter(a => 
    a.code.startsWith('2') && parseInt(a.code) < 2500
  ).reduce((sum, a) => sum + Math.abs(a.current), 0);
  
  const inventory = accounts.find(a => a.code === '1200')?.current || 0;
  
  allAnomalies.push(...detectRatioAnomalies(
    currentAssets,
    currentLiabilities,
    inventory,
    totalLiabilities,
    totalEquity,
    config
  ));
  
  // Calculate summary
  const summary = {
    critical: allAnomalies.filter(a => a.severity === 'critical').length,
    warning: allAnomalies.filter(a => a.severity === 'warning').length,
    info: allAnomalies.filter(a => a.severity === 'info').length,
    total: allAnomalies.length,
  };
  
  // Health score (0-100)
  const healthScore = Math.max(0, 100 - (summary.critical * 20 + summary.warning * 10 + summary.info * 2));
  
  return {
    anomalies: allAnomalies.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    summary,
    healthScore,
  };
}

export default {
  DEFAULT_THRESHOLDS,
  detectVarianceAnomalies,
  detectTrendAnomalies,
  detectBalanceAnomalies,
  detectRatioAnomalies,
  detectUnusualPatterns,
  detectOutliers,
  calculateThresholdBands,
  getAnomalyColor,
  getSeverityStyle,
  formatCurrency,
  formatPercentage,
  runFullAnalysis,
};
