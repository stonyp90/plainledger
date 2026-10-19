/**
 * Chart Data Volume Tests
 * 
 * Tests charts with various data volumes to ensure performance:
 * - Small datasets (1-10 points)
 * - Medium datasets (100-500 points)
 * - Large datasets (1000+ points)
 * - Very large datasets (10000+ points)
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../test/test-utils';
import TrendChart from '../TrendChart';
import WaterfallChart from '../WaterfallChart';
import BudgetVsActualChart from '../BudgetVsActualChart';

// Mock TenantContext
vi.mock('../../../contexts/TenantContext', () => ({
  useTenant: vi.fn(() => ({
    currentTenant: { id: 'test', settings: { graphConfig: {} } },
    hasFeature: () => true,
    getGraphConfig: () => ({}),
  })),
}));

// Keep the real defaults so thresholds and display settings match production.
vi.mock('../../../hooks/useGraphConfig', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../hooks/useGraphConfig')>();
  const { DEFAULT_GRAPH_CONFIG } = await import('../../../lib/graphConfig');
  return { ...actual, useGraphConfig: () => DEFAULT_GRAPH_CONFIG };
});

// Mock useFinancialData
vi.mock('../../../hooks/useFinancialData', () => ({
  useFinancialData: vi.fn(() => ({ data: null })),
  useHasRealData: vi.fn(() => ({ hasRealData: false, shouldShowSandboxData: true })),
}));

describe('Chart Data Volume Performance', () => {
  describe('TrendChart - Data Volume', () => {
    it('renders efficiently with 10 data points', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        period: `2024-${String(i + 1).padStart(2, '0')}-01`,
        value: 50000 + i * 10,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.querySelector('[data-chart-state]')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should render in < 1s
    });

    it('renders efficiently with 100 data points', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        period: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        value: 50000 + i * 10,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.querySelector('[data-chart-state]')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(2000); // Should render in < 2s
    });

    it('renders efficiently with 1000 data points', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        period: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        value: 50000 + i * 10,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.querySelector('[data-chart-state]')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(5000); // Should render in < 5s
    });

    it('keeps all 10,000 observations in the line while bounding markers and labels', () => {
      const data = Array.from({ length: 10000 }, (_, i) => ({ period: `Period ${i + 1}`, value: 10000 + i }));
      const { container } = render(<TrendChart data={data} title="Revenue" titleEn="Revenue" />);
      expect(container.querySelector('[data-chart-state]')).toBeNull();
      const series = container.querySelector('svg[viewBox^="0 0 100 "] path[d]');
      expect(series).toBeTruthy();
      expect(series!.getAttribute('d')!.match(/ L /g)!.length).toBeGreaterThanOrEqual(9999);
      expect(container.querySelectorAll('[data-chart-point]').length).toBeLessThanOrEqual(152);
      expect(container.querySelectorAll('[data-chart-label]').length).toBeLessThanOrEqual(7);
      expect(container.querySelector('[data-chart-label="9999"]')).toHaveTextContent('Period 10000');
    });
  });

  describe('WaterfallChart - Data Volume', () => {
    it('renders efficiently with 50 items', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i}`,
        value: 50000 + i * 10,
        type: (i === 0 ? 'start' : i === 49 ? 'end' : 'increase') as 'start' | 'end' | 'increase',
      }));

      const startTime = performance.now();
      const { container } = render(
        <WaterfallChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.querySelector('[data-chart-state]')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('BudgetVsActualChart - Data Volume', () => {
    it('renders efficiently with 100 categories', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        category: `Category ${i}`,
        actual: 1000 + i * 100,
        budget: 1200 + i * 100,
      }));

      const startTime = performance.now();
      const { container } = render(
        <BudgetVsActualChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.querySelector('[data-chart-state]')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});
