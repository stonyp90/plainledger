import { describe, expect, it } from 'vitest';
import { calculateCashForecast, type Assumption, type PlannedExpense } from '../strategicPlanning';
import { projectCashFlow } from '../expensePlanning';

function assumptions(revenue: number, expenses: number): Assumption[] {
  return [
    { id: 'revenue', category: 'revenue', name: 'Monthly Revenue', nameEn: 'Monthly Revenue', baseValue: revenue, scenarioValue: revenue, unit: 'currency' },
    { id: 'expenses', category: 'expense', name: 'Monthly Expenses', nameEn: 'Monthly Expenses', baseValue: expenses, scenarioValue: expenses, unit: 'currency' },
  ];
}

describe('Cash forecasts preserve the complete modeled cash position', () => {
  it('shows deficits across the full requested horizon after cash runs out', () => {
    const result = calculateCashForecast(100, new Date('2026-01-01T00:00:00Z'), [], assumptions(10, 60), 6);
    expect(result.projected.map(point => point.cash)).toEqual([50, 0, -50, -100, -150, -200]);
    expect(result.breakEvenDate).toBeUndefined();
  });

  it('defines operating break-even as revenue covering expenses, independently of opening cash', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    expect(calculateCashForecast(10000, start, [], assumptions(10, 60), 3).breakEvenDate).toBeUndefined();
    const profitable = calculateCashForecast(-100, start, [], assumptions(60, 50), 3);
    expect(profitable.breakEvenDate).toBe(profitable.projected[0].date);
    expect(profitable.projected[0].cash).toBe(-90);
  });

  it('does not skip February when starting on January 31', () => {
    const result = calculateCashForecast(100, new Date('2026-01-31T12:00:00Z'), [], assumptions(0, 0), 3);
    expect(result.projected.map(point => new Date(point.date).getMonth())).toEqual([0, 1, 2]);
    expect(result.breakEvenDate).toBeUndefined();
  });

  it('also keeps deficits and the complete horizon in expense-based projections', () => {
    const expense: PlannedExpense = {
      id: 'rent', name: 'Rent', nameEn: 'Rent', type: 'opex', category: 'rent',
      startDate: '2026-01-01', endDate: '2026-12-31', amount: 50,
      frequency: 'monthly', isLocked: false, confidence: 100,
    };
    const projected = projectCashFlow(100, new Date('2026-01-31T12:00:00Z'), [expense], 0, 4);
    expect(projected.map(point => point.cash)).toEqual([50, 0, -50, -100]);
    expect(projected.map(point => new Date(point.date).getMonth())).toEqual([0, 1, 2, 3]);
  });
});
