/**
 * AnomalyDetectionService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetectionService, DEFAULT_THRESHOLDS, type ThresholdConfig } from '../services/AnomalyDetectionService';
import { Account } from '../entities/Account';
import { Money } from '../value-objects/Money';
import { AccountCode } from '../value-objects/AccountCode';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  beforeEach(() => {
    service = new AnomalyDetectionService(DEFAULT_THRESHOLDS);
  });

  const createAccount = (
    code: string,
    name: string,
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    current: number,
    prior: number,
    subType?: 'current' | 'fixed' | 'longTerm'
  ): Account => {
    return Account.create({
      id: `account-${code}`,
      code: AccountCode.create(code),
      name,
      nameEn: name,
      type,
      subType,
      currentBalance: Money.create(current),
      priorBalance: Money.create(prior),
      isActive: true,
    });
  };

  describe('detectVarianceAnomalies', () => {
    it('should detect critical variance anomaly (>30%)', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 7000, 'current'), // +42.8% variance
      ];

      const anomalies = service.detectVarianceAnomalies(accounts);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].severity).toBe('critical');
      expect(anomalies[0].category).toBe('variance');
      expect(anomalies[0].affectedAccount).toBe('1000');
    });

    it('should detect warning variance anomaly (15-30%)', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 8000, 'current'), // +25% variance
      ];

      const anomalies = service.detectVarianceAnomalies(accounts);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].severity).toBe('warning');
    });

    it('should detect info variance anomaly (5-15%)', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 9000, 'current'), // +11% variance
      ];

      const anomalies = service.detectVarianceAnomalies(accounts);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].severity).toBe('info');
    });

    it('should not detect anomaly for small variance (<5%)', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 9700, 'current'), // +3% variance
      ];

      const anomalies = service.detectVarianceAnomalies(accounts);

      expect(anomalies).toHaveLength(0);
    });

    it('should detect negative variance anomalies', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 7000, 10000, 'current'), // -30% variance
      ];

      const anomalies = service.detectVarianceAnomalies(accounts);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].percentageDeviation).toBeLessThan(0);
    });
  });

  describe('detectBalanceAnomalies', () => {
    it('should detect negative asset balance', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', -500, 1000, 'current'),
      ];

      const anomalies = service.detectBalanceAnomalies(accounts);

      expect(anomalies.some(a => a.title.includes('Solde négatif'))).toBe(true);
    });

    it('should not flag accumulated depreciation as negative balance anomaly', () => {
      const accounts = [
        createAccount('1600', 'Accumulated Depreciation', 'asset', -50000, -40000, 'fixed'),
      ];

      const anomalies = service.detectBalanceAnomalies(accounts);

      expect(anomalies.filter(a => a.title.includes('Solde négatif'))).toHaveLength(0);
    });

    it('should detect unbalanced balance sheet', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 8000, 'current'),
        createAccount('2000', 'Accounts Payable', 'liability', 3000, 2500, 'current'),
        createAccount('3000', 'Equity', 'equity', 5000, 4500, 'current'),
        // Unbalanced: Assets (10000) ≠ Liabilities (3000) + Equity (5000)
      ];

      const anomalies = service.detectBalanceAnomalies(accounts);

      expect(anomalies.some(a => a.title.includes('Bilan déséquilibré'))).toBe(true);
    });

    it('should not flag balanced balance sheet', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 8000, 8000, 'current'),
        createAccount('2000', 'Accounts Payable', 'liability', 3000, 3000, 'current'),
        createAccount('3000', 'Equity', 'equity', 5000, 5000, 'current'),
        // Balanced: Assets (8000) = Liabilities (3000) + Equity (5000)
      ];

      const anomalies = service.detectBalanceAnomalies(accounts);

      expect(anomalies.filter(a => a.title.includes('Bilan déséquilibré'))).toHaveLength(0);
    });
  });

  describe('detectTrendAnomalies', () => {
    it('should detect outliers in trend data', () => {
      const trendData = [
        { period: 'Jan', value: 100000 },
        { period: 'Feb', value: 102000 },
        { period: 'Mar', value: 101000 },
        { period: 'Apr', value: 103000 },
        { period: 'May', value: 500000 }, // Clear outlier (5x average)
        { period: 'Jun', value: 102000 },
        { period: 'Jul', value: 101000 },
        { period: 'Aug', value: 103000 },
      ];

      const anomalies = service.detectTrendAnomalies(trendData);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].affectedPeriod).toBe('May');
    });

    it('should not detect anomalies in consistent data', () => {
      const trendData = [
        { period: 'Jan', value: 100000 },
        { period: 'Feb', value: 102000 },
        { period: 'Mar', value: 101000 },
        { period: 'Apr', value: 103000 },
        { period: 'May', value: 102500 },
        { period: 'Jun', value: 101500 },
      ];

      const anomalies = service.detectTrendAnomalies(trendData);

      expect(anomalies).toHaveLength(0);
    });

    it('should handle empty trend data', () => {
      const anomalies = service.detectTrendAnomalies([]);
      expect(anomalies).toHaveLength(0);
    });

    it('should handle insufficient trend data', () => {
      const anomalies = service.detectTrendAnomalies([{ period: 'Jan', value: 100 }]);
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('detectRatioAnomalies', () => {
    it('should detect low current ratio', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 5000, 5000, 'current'),
        createAccount('1100', 'AR', 'asset', 5000, 5000, 'current'),
        createAccount('2000', 'AP', 'liability', 15000, 15000, 'current'),
      ];

      const anomalies = service.detectRatioAnomalies(accounts);

      expect(anomalies.some(a => a.title.includes('Ratio de liquidité faible'))).toBe(true);
    });

    it('should detect high current ratio', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 100000, 100000, 'current'),
        createAccount('2000', 'AP', 'liability', 10000, 10000, 'current'),
      ];

      const anomalies = service.detectRatioAnomalies(accounts);

      expect(anomalies.some(a => a.title.includes('Ratio de liquidité élevé'))).toBe(true);
    });

    it('should not flag healthy current ratio', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 20000, 20000, 'current'),
        createAccount('2000', 'AP', 'liability', 10000, 10000, 'current'),
      ];

      const anomalies = service.detectRatioAnomalies(accounts);

      expect(anomalies.filter(a => a.category === 'ratio')).toHaveLength(0);
    });
  });

  describe('runFullAnalysis', () => {
    it('should aggregate all anomalies', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 7000, 'current'), // Critical variance
        createAccount('2000', 'AP', 'liability', 5000, 5000, 'current'),
        createAccount('3000', 'Equity', 'equity', 5000, 2000, 'current'),
      ];

      const trendData = [
        { period: 'Jan', value: 100000 },
        { period: 'Feb', value: 105000 },
        { period: 'Mar', value: 102000 },
      ];

      const result = service.runFullAnalysis(accounts, trendData);

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.summary.total).toBe(result.anomalies.length);
    });

    it('should calculate correct summary counts', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 7000, 'current'), // Critical
        createAccount('1100', 'AR', 'asset', 10000, 8000, 'current'), // Warning
        createAccount('2000', 'AP', 'liability', 5000, 5000, 'current'),
        createAccount('3000', 'Equity', 'equity', 15000, 10000, 'current'),
      ];

      const result = service.runFullAnalysis(accounts, []);

      expect(result.summary.critical + result.summary.warning + result.summary.info)
        .toBe(result.summary.total);
    });

    it('should calculate health score between 0 and 100', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 10000, 'current'),
        createAccount('2000', 'AP', 'liability', 5000, 5000, 'current'),
        createAccount('3000', 'Equity', 'equity', 5000, 5000, 'current'),
      ];

      const result = service.runFullAnalysis(accounts, []);

      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it('should sort anomalies by severity', () => {
      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 9000, 'current'), // Info
        createAccount('1100', 'AR', 'asset', 10000, 7000, 'current'), // Critical
        createAccount('1200', 'Inventory', 'asset', 10000, 8000, 'current'), // Warning
      ];

      const result = service.runFullAnalysis(accounts, []);

      // First anomaly should be critical
      const criticalIndex = result.anomalies.findIndex(a => a.severity === 'critical');
      const warningIndex = result.anomalies.findIndex(a => a.severity === 'warning');
      
      if (criticalIndex !== -1 && warningIndex !== -1) {
        expect(criticalIndex).toBeLessThan(warningIndex);
      }
    });
  });

  describe('custom thresholds', () => {
    it('should use custom thresholds', () => {
      const customThresholds: ThresholdConfig = {
        ...DEFAULT_THRESHOLDS,
        varianceCritical: 50, // More lenient
      };

      const customService = new AnomalyDetectionService(customThresholds);

      const accounts = [
        createAccount('1000', 'Cash', 'asset', 10000, 7000, 'current'), // +42.8% variance
      ];

      const anomalies = customService.detectVarianceAnomalies(accounts);

      // Should be warning, not critical, with custom thresholds
      expect(anomalies[0].severity).toBe('warning');
    });
  });
});
