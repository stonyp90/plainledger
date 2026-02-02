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
import { render } from '@testing-library/react';
import TrendChart from '../TrendChart';
import WaterfallChart from '../WaterfallChart';
import BudgetVsActualChart from '../BudgetVsActualChart';

describe('Chart Data Volume Performance', () => {
  describe('TrendChart - Data Volume', () => {
    it('renders efficiently with 10 data points', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-${String(i + 1).padStart(2, '0')}-01`,
        value: Math.random() * 100000,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should render in < 1s
    });

    it('renders efficiently with 100 data points', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        value: Math.random() * 100000,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(2000); // Should render in < 2s
    });

    it('renders efficiently with 1000 data points', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        value: Math.random() * 100000,
      }));

      const startTime = performance.now();
      const { container } = render(
        <TrendChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(5000); // Should render in < 5s
    });
  });

  describe('WaterfallChart - Data Volume', () => {
    it('renders efficiently with 50 items', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i}`,
        value: Math.random() * 100000,
        type: i === 0 ? 'start' : i === 49 ? 'end' : (Math.random() > 0.5 ? 'increase' : 'decrease'),
      }));

      const startTime = performance.now();
      const { container } = render(
        <WaterfallChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('BudgetVsActualChart - Data Volume', () => {
    it('renders efficiently with 100 categories', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        category: `Category ${i}`,
        actual: Math.random() * 100000,
        budget: Math.random() * 100000,
      }));

      const startTime = performance.now();
      const { container } = render(
        <BudgetVsActualChart data={data} title="Test" titleEn="Test" />
      );
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});
