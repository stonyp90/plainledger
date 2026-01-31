/**
 * Industry Benchmark Display Data Tests
 * 
 * BDD-style tests ensuring data integrity for industry benchmark display.
 * These benchmarks are used in the dashboard and industry KPI sections.
 */

import { describe, it, expect } from 'vitest';
import { 
  INDUSTRY_KPIS, 
  type IndustryData, 
  type KPIDefinition 
} from '../industryBenchmarkDisplay';

describe('Industry Benchmark Display Data', () => {
  describe('INDUSTRY_KPIS structure', () => {
    it('should contain at least one industry', () => {
      expect(INDUSTRY_KPIS.length).toBeGreaterThan(0);
    });

    it('should have real_estate as the first industry (primary focus)', () => {
      expect(INDUSTRY_KPIS[0].id).toBe('real_estate');
    });

    it('should have unique industry IDs', () => {
      const ids = INDUSTRY_KPIS.map(industry => industry.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('each industry', () => {
    INDUSTRY_KPIS.forEach((industry: IndustryData) => {
      describe(`${industry.id}`, () => {
        it('should have required properties', () => {
          expect(industry.id).toBeDefined();
          expect(industry.name.en).toBeDefined();
          expect(industry.name.fr).toBeDefined();
          expect(industry.icon).toBeDefined();
          expect(industry.roiHighlight.en).toBeDefined();
          expect(industry.roiHighlight.fr).toBeDefined();
          expect(industry.roiValue).toBeDefined();
        });

        it('should have at least one KPI', () => {
          expect(industry.kpis.length).toBeGreaterThan(0);
        });

        it('should have valid KPIs with all required fields', () => {
          industry.kpis.forEach((kpi: KPIDefinition) => {
            // Required fields
            expect(kpi.name).toBeDefined();
            expect(kpi.nameFr).toBeDefined();
            expect(kpi.formula).toBeDefined();
            expect(kpi.target).toBeDefined();
            expect(typeof kpi.currentValue).toBe('number');
            expect(typeof kpi.targetValue).toBe('number');
            expect(['up', 'down', 'stable']).toContain(kpi.trend);
            expect(kpi.trendValue).toBeDefined();
            expect(kpi.impact).toBeDefined();
            expect(kpi.impactFr).toBeDefined();

            // Chart data should have 7 data points (weekly trend)
            expect(kpi.chartData.length).toBe(7);
            expect(kpi.industryBenchmark.length).toBe(7);
          });
        });
      });
    });
  });

  describe('KPI data integrity', () => {
    it('should have numeric chart data points', () => {
      INDUSTRY_KPIS.forEach(industry => {
        industry.kpis.forEach(kpi => {
          kpi.chartData.forEach(point => {
            expect(typeof point).toBe('number');
            expect(Number.isFinite(point)).toBe(true);
          });
          kpi.industryBenchmark.forEach(point => {
            expect(typeof point).toBe('number');
            expect(Number.isFinite(point)).toBe(true);
          });
        });
      });
    });

    it('should have consistent trend indicators', () => {
      INDUSTRY_KPIS.forEach(industry => {
        industry.kpis.forEach(kpi => {
          const lastChartValue = kpi.chartData[kpi.chartData.length - 1];
          const firstChartValue = kpi.chartData[0];
          
          // Basic sanity check: trend direction should generally match data direction
          // (allowing for some edge cases where stable might have slight movement)
          if (kpi.trend === 'up') {
            expect(lastChartValue).toBeGreaterThanOrEqual(firstChartValue * 0.9);
          } else if (kpi.trend === 'down') {
            expect(lastChartValue).toBeLessThanOrEqual(firstChartValue * 1.1);
          }
        });
      });
    });
  });

  describe('bilingual support', () => {
    it('should have both English and French names for all industries', () => {
      INDUSTRY_KPIS.forEach(industry => {
        expect(industry.name.en.length).toBeGreaterThan(0);
        expect(industry.name.fr.length).toBeGreaterThan(0);
      });
    });

    it('should have both English and French ROI highlights for all industries', () => {
      INDUSTRY_KPIS.forEach(industry => {
        expect(industry.roiHighlight.en.length).toBeGreaterThan(0);
        expect(industry.roiHighlight.fr.length).toBeGreaterThan(0);
      });
    });

    it('should have both English and French KPI names and impacts', () => {
      INDUSTRY_KPIS.forEach(industry => {
        industry.kpis.forEach(kpi => {
          expect(kpi.name.length).toBeGreaterThan(0);
          expect(kpi.nameFr.length).toBeGreaterThan(0);
          expect(kpi.impact.length).toBeGreaterThan(0);
          expect(kpi.impactFr.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('industry coverage', () => {
    const requiredIndustries = [
      'real_estate',
      'restaurant',
      'hospitality',
      'retail',
      'construction',
      'professional_services',
    ];

    requiredIndustries.forEach(industryId => {
      it(`should include ${industryId} industry`, () => {
        const found = INDUSTRY_KPIS.find(i => i.id === industryId);
        expect(found).toBeDefined();
      });
    });
  });
});
