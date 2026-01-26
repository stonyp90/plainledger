/**
 * AnomalyDetectionService
 * Domain service for detecting financial anomalies
 */

import { Account } from '../entities/Account';
import { Money } from '../value-objects/Money';

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
  severity: AnomalySeverity;
  category: AnomalyCategory;
  title: string;
  description: string;
  affectedAccount?: string;
  affectedPeriod?: string;
  value?: number;
  threshold?: number;
  percentageDeviation?: number;
  recommendation: string;
  detectedAt: Date;
}

export interface ThresholdConfig {
  varianceCritical: number;
  varianceWarning: number;
  varianceInfo: number;
  balanceThreshold: number;
  ratioMinCurrent: number;
  ratioMaxCurrent: number;
  trendOutlierStdDev: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  varianceCritical: 30,
  varianceWarning: 15,
  varianceInfo: 5,
  balanceThreshold: 0.01,
  ratioMinCurrent: 1.0,
  ratioMaxCurrent: 3.0,
  trendOutlierStdDev: 2.5,
};

export interface FinancialDataPoint {
  period: string;
  value: number;
}

export class AnomalyDetectionService {
  constructor(private readonly thresholds: ThresholdConfig = DEFAULT_THRESHOLDS) {}

  detectVarianceAnomalies(accounts: Account[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const account of accounts) {
      const variance = account.calculateVariancePercentage();
      const absVariance = Math.abs(variance);

      if (absVariance >= this.thresholds.varianceCritical) {
        anomalies.push({
          id: `variance-critical-${account.code.value}`,
          severity: 'critical',
          category: 'variance',
          title: `Variance critique: ${account.name}`,
          description: `Le compte ${account.name} (${account.code.value}) a varié de ${variance.toFixed(1)}% par rapport à la période précédente.`,
          affectedAccount: account.code.value,
          value: account.currentBalance.amount,
          threshold: this.thresholds.varianceCritical,
          percentageDeviation: variance,
          recommendation: `Examiner les transactions du compte ${account.code.value} pour comprendre cette variation significative.`,
          detectedAt: new Date(),
        });
      } else if (absVariance >= this.thresholds.varianceWarning) {
        anomalies.push({
          id: `variance-warning-${account.code.value}`,
          severity: 'warning',
          category: 'variance',
          title: `Variance notable: ${account.name}`,
          description: `Le compte ${account.name} (${account.code.value}) a varié de ${variance.toFixed(1)}%.`,
          affectedAccount: account.code.value,
          value: account.currentBalance.amount,
          threshold: this.thresholds.varianceWarning,
          percentageDeviation: variance,
          recommendation: `Surveiller ce compte et valider que la variation est attendue.`,
          detectedAt: new Date(),
        });
      } else if (absVariance >= this.thresholds.varianceInfo) {
        anomalies.push({
          id: `variance-info-${account.code.value}`,
          severity: 'info',
          category: 'variance',
          title: `Variation détectée: ${account.name}`,
          description: `Le compte ${account.name} a varié de ${variance.toFixed(1)}%.`,
          affectedAccount: account.code.value,
          percentageDeviation: variance,
          recommendation: `Variation dans les limites normales mais à noter.`,
          detectedAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  detectBalanceAnomalies(accounts: Account[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for assets with negative balances
    const assetAccounts = accounts.filter(a => a.type === 'asset');
    for (const account of assetAccounts) {
      if (account.currentBalance.isNegative() && !account.code.value.startsWith('16')) {
        // 16xx is typically accumulated depreciation, which should be negative
        anomalies.push({
          id: `balance-negative-asset-${account.code.value}`,
          severity: 'warning',
          category: 'balance',
          title: `Solde négatif sur actif`,
          description: `Le compte d'actif ${account.name} (${account.code.value}) affiche un solde négatif de ${account.currentBalance.format()}.`,
          affectedAccount: account.code.value,
          value: account.currentBalance.amount,
          recommendation: `Vérifier les transactions récentes pour corriger toute erreur de saisie.`,
          detectedAt: new Date(),
        });
      }
    }

    // Check balance sheet equilibrium
    const totalAssets = this.sumAccountsByType(accounts, 'asset');
    const totalLiabilities = this.sumAccountsByType(accounts, 'liability');
    const totalEquity = this.sumAccountsByType(accounts, 'equity');
    
    const balanceDifference = totalAssets.subtract(totalLiabilities.add(totalEquity));
    
    if (!balanceDifference.isZero()) {
      anomalies.push({
        id: 'balance-sheet-unbalanced',
        severity: 'critical',
        category: 'balance',
        title: `Bilan déséquilibré`,
        description: `Écart de ${balanceDifference.format()} entre l'actif et le passif + capitaux propres.`,
        value: balanceDifference.amount,
        recommendation: `Réviser les écritures comptables pour identifier la source du déséquilibre.`,
        detectedAt: new Date(),
      });
    }

    return anomalies;
  }

  detectTrendAnomalies(data: FinancialDataPoint[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (data.length < 3) return anomalies;

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const threshold = this.thresholds.trendOutlierStdDev * stdDev;

    data.forEach((point, index) => {
      const deviation = Math.abs(point.value - mean);
      if (deviation > threshold) {
        const percentDeviation = ((point.value - mean) / mean) * 100;
        anomalies.push({
          id: `trend-outlier-${index}`,
          severity: deviation > threshold * 1.5 ? 'critical' : 'warning',
          category: 'trend',
          title: `Valeur aberrante détectée`,
          description: `La valeur de ${point.period} (${point.value.toLocaleString()}) est significativement ${point.value > mean ? 'supérieure' : 'inférieure'} à la moyenne.`,
          affectedPeriod: point.period,
          value: point.value,
          threshold: mean + (point.value > mean ? threshold : -threshold),
          percentageDeviation: percentDeviation,
          recommendation: `Examiner les transactions de la période ${point.period} pour comprendre cette variation.`,
          detectedAt: new Date(),
        });
      }
    });

    return anomalies;
  }

  detectRatioAnomalies(accounts: Account[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Calculate current ratio
    const currentAssets = this.sumCurrentAssets(accounts);
    const currentLiabilities = this.sumCurrentLiabilities(accounts);
    
    if (!currentLiabilities.isZero()) {
      const currentRatio = currentAssets.amount / currentLiabilities.amount;

      if (currentRatio < this.thresholds.ratioMinCurrent) {
        anomalies.push({
          id: 'ratio-current-low',
          severity: 'critical',
          category: 'ratio',
          title: `Ratio de liquidité faible`,
          description: `Le ratio de liquidité générale (${currentRatio.toFixed(2)}) est inférieur au seuil minimum de ${this.thresholds.ratioMinCurrent}.`,
          value: currentRatio,
          threshold: this.thresholds.ratioMinCurrent,
          recommendation: `Améliorer la gestion du fonds de roulement en accélérant les encaissements ou en négociant des délais de paiement.`,
          detectedAt: new Date(),
        });
      } else if (currentRatio > this.thresholds.ratioMaxCurrent) {
        anomalies.push({
          id: 'ratio-current-high',
          severity: 'info',
          category: 'ratio',
          title: `Ratio de liquidité élevé`,
          description: `Le ratio de liquidité générale (${currentRatio.toFixed(2)}) est supérieur au seuil de ${this.thresholds.ratioMaxCurrent}.`,
          value: currentRatio,
          threshold: this.thresholds.ratioMaxCurrent,
          recommendation: `L'excès de liquidité pourrait être investi pour améliorer le rendement.`,
          detectedAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  runFullAnalysis(
    accounts: Account[], 
    trendData: FinancialDataPoint[]
  ): { anomalies: Anomaly[]; summary: { critical: number; warning: number; info: number; total: number }; healthScore: number } {
    const allAnomalies = [
      ...this.detectVarianceAnomalies(accounts),
      ...this.detectBalanceAnomalies(accounts),
      ...this.detectTrendAnomalies(trendData),
      ...this.detectRatioAnomalies(accounts),
    ];

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allAnomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const summary = {
      critical: allAnomalies.filter(a => a.severity === 'critical').length,
      warning: allAnomalies.filter(a => a.severity === 'warning').length,
      info: allAnomalies.filter(a => a.severity === 'info').length,
      total: allAnomalies.length,
    };

    // Calculate health score (0-100)
    const healthScore = Math.max(0, Math.min(100, 
      100 - (summary.critical * 20) - (summary.warning * 5) - (summary.info * 1)
    ));

    return { anomalies: allAnomalies, summary, healthScore };
  }

  // Helper methods
  private sumAccountsByType(accounts: Account[], type: Account['type']): Money {
    return accounts
      .filter(a => a.type === type)
      .reduce((sum, a) => sum.add(a.currentBalance), Money.zero());
  }

  private sumCurrentAssets(accounts: Account[]): Money {
    return accounts
      .filter(a => a.isCurrentAsset())
      .reduce((sum, a) => sum.add(a.currentBalance), Money.zero());
  }

  private sumCurrentLiabilities(accounts: Account[]): Money {
    return accounts
      .filter(a => a.isCurrentLiability())
      .reduce((sum, a) => sum.add(a.currentBalance.abs()), Money.zero());
  }
}
