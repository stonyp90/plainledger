/**
 * QueryEngine Tests
 * Tests for natural language query parsing and execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryEngine, type ParsedQuery } from '../QueryEngine';
import type { FinancialDataResponse } from '../../financialData';

describe('QueryEngine', () => {
  let engine: QueryEngine;

  // Mock financial data
  const mockFinancialData: Partial<FinancialDataResponse> = {
    summary: {
      revenue: { current: 200000, prior: 180000, budget: 190000, ytd: 2000000, ytdPrior: 1800000, ytdBudget: 1900000, varianceTobudget: 5.2 },
      expenses: { current: 150000, prior: 140000, budget: 145000, ytd: 1500000, ytdBudget: 1450000 },
      netIncome: { current: 50000, prior: 40000, ytd: 500000, ytdPrior: 400000 },
      cash: { current: 250000, prior: 200000, runway: 3.5, burnRate: 75000 },
      cashFlow: { operating: 100000, investing: -30000, financing: -20000, net: 50000, freeCashFlow: 70000 },
      receivables: { 
        current: 180000, 
        prior: 160000, 
        aging: [], 
        totalOverdue: 45000, 
        averageDaysOutstanding: 38 
      },
      payables: { 
        current: 80000, 
        prior: 75000, 
        aging: [], 
        totalOverdue: 12000, 
        averageDaysPayable: 25 
      },
      bankAccounts: [],
      budgetComparisons: [],
      upcomingDeadlines: [],
      trialBalance: { totalDebits: 1000000, totalCredits: 1000000, isBalanced: true, entries: [] },
    },
    metrics: {
      currentRatio: 2.5,
      quickRatio: 1.8,
      cashRatio: 0.9,
      grossMargin: 42,
      operatingMargin: 25,
      netMargin: 18,
      returnOnAssets: 12,
      returnOnEquity: 15,
      debtToEquity: 0.6,
      debtToAssets: 0.35,
      interestCoverage: 5.0,
      receivablesTurnover: 8,
      inventoryTurnover: 6,
      assetTurnover: 1.2,
      daysReceivable: 38,
      daysInventory: 45,
      daysPayable: 25,
      cashConversionCycle: 58,
      workingCapital: 350000,
      workingCapitalRatio: 2.5,
    },
    trends: {
      revenue: {
        label: 'Revenus',
        labelEn: 'Revenue',
        data: [
          { period: 'Jan', value: 150000 },
          { period: 'Feb', value: 160000 },
          { period: 'Mar', value: 170000 },
          { period: 'Apr', value: 180000 },
          { period: 'May', value: 175000 },
          { period: 'Jun', value: 190000 },
        ],
      },
      expenses: {
        label: 'Dépenses',
        labelEn: 'Expenses',
        data: [
          { period: 'Jan', value: 120000 },
          { period: 'Feb', value: 125000 },
          { period: 'Mar', value: 130000 },
          { period: 'Apr', value: 135000 },
          { period: 'May', value: 140000 },
          { period: 'Jun', value: 145000 },
        ],
      },
      cashFlow: {
        label: 'Flux de trésorerie',
        labelEn: 'Cash Flow',
        data: [
          { period: 'Jan', value: 30000 },
          { period: 'Feb', value: 35000 },
          { period: 'Mar', value: 40000 },
          { period: 'Apr', value: 45000 },
          { period: 'May', value: 35000 },
          { period: 'Jun', value: 45000 },
        ],
      },
      profit: {
        label: 'Résultat net',
        labelEn: 'Net Income',
        data: [
          { period: 'Jan', value: 30000 },
          { period: 'Feb', value: 35000 },
          { period: 'Mar', value: 40000 },
          { period: 'Apr', value: 45000 },
          { period: 'May', value: 35000 },
          { period: 'Jun', value: 45000 },
        ],
      },
    },
    accounts: [
      { code: '1000', name: 'Cash', nameEn: 'Cash', current: 250000, prior: 200000, type: 'asset' },
      { code: '1100', name: 'Accounts Receivable', nameEn: 'Accounts Receivable', current: 180000, prior: 160000, type: 'asset' },
      { code: '2000', name: 'Accounts Payable', nameEn: 'Accounts Payable', current: 80000, prior: 75000, type: 'liability' },
      { code: '4000', name: 'Sales Revenue', nameEn: 'Sales Revenue', current: 200000, prior: 180000, type: 'revenue' },
      { code: '5000', name: 'Cost of Goods Sold', nameEn: 'Cost of Goods Sold', current: 100000, prior: 90000, type: 'expense' },
    ],
  } as FinancialDataResponse;

  beforeEach(() => {
    engine = new QueryEngine();
    engine.setData(mockFinancialData as FinancialDataResponse);
  });

  describe('parseQuery', () => {
    it('should detect total intent', () => {
      const queries = [
        'What is the total revenue?',
        'How much cash do we have?',
        'Show me total expenses',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('total');
      });
    });

    it('should detect compare intent', () => {
      const queries = [
        'Compare revenue to budget',
        'How does cash compare to last month?',
        'Revenue vs prior year',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('compare');
      });
    });

    it('should detect trend intent', () => {
      const queries = [
        'Show revenue trend',
        'How has cash evolved over time?',
        'Revenue evolution over 12 months',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('trend');
      });
    });

    it('should detect breakdown intent', () => {
      const queries = [
        "What's the breakdown of expenses?",
        'Show expense composition',
        'Répartition des dépenses',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('breakdown');
      });
    });

    it('should detect ratio intent', () => {
      const queries = [
        'What is the current ratio?',
        'Show me financial ratios',
        'Quel est le ratio de liquidité?',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('ratio');
      });
    });

    it('should detect rank intent', () => {
      const queries = [
        'Show top 5 expense accounts',
        'What are the highest expenses?',
        'Top 10 biggest accounts',
      ];

      queries.forEach(query => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe('rank');
      });
    });

    it('should extract metrics from query', () => {
      const parsed = engine.parseQuery('What is the total revenue for this month?');
      expect(parsed.entities.metrics).toContain('revenue');
    });

    it('should extract time frame from query', () => {
      const parsed = engine.parseQuery('Show revenue for last year');
      expect(parsed.entities.timeFrame).toBe('prior_year');
    });

    it('should extract comparison type', () => {
      const parsed = engine.parseQuery('Compare revenue to budget');
      expect(parsed.entities.comparisonType).toBe('vs_budget');
    });

    it('should extract limit for ranking queries', () => {
      const parsed = engine.parseQuery('Show top 5 accounts');
      expect(parsed.entities.limit).toBe(5);
    });

    it('should handle French queries', () => {
      const parsed = engine.parseQuery("Quelle est l'évolution des revenus?");
      expect(parsed.intent).toBe('trend');
      expect(parsed.entities.metrics).toContain('revenue');
    });
  });

  describe('executeQuery', () => {
    it('should execute total query successfully', async () => {
      const parsed = engine.parseQuery('What is the total revenue?');
      const result = await engine.executeQuery(parsed);

      expect(result.success).toBe(true);
      expect(result.visualization.type).toBe('kpi_card');
      expect(result.data.value).toBe(200000);
    });

    it('should execute compare query successfully', async () => {
      const parsed = engine.parseQuery('Compare revenue to budget');
      const result = await engine.executeQuery(parsed);

      expect(result.success).toBe(true);
      expect(result.visualization.type).toBe('bar_chart');
      expect(result.data.current).toBe(200000);
      expect(result.data.comparison).toBe(190000);
    });

    it('should execute trend query successfully', async () => {
      const parsed = engine.parseQuery('Show revenue trend');
      const result = await engine.executeQuery(parsed);

      expect(result.success).toBe(true);
      expect(result.visualization.type).toBe('line_chart');
      expect(result.data).toHaveLength(6);
    });

    it('should execute ratio query successfully', async () => {
      const parsed = engine.parseQuery('What are the financial ratios?');
      const result = await engine.executeQuery(parsed);

      expect(result.success).toBe(true);
      expect(result.visualization.type).toBe('gauge');
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should include suggested follow-ups', async () => {
      const parsed = engine.parseQuery('What is total revenue?');
      const result = await engine.executeQuery(parsed);

      expect(result.suggestedFollowUps).toBeInstanceOf(Array);
      expect(result.suggestedFollowUps.length).toBeGreaterThan(0);
    });

    it('should include summary highlights', async () => {
      const parsed = engine.parseQuery('What is total revenue?');
      const result = await engine.executeQuery(parsed);

      expect(result.summary.highlights).toBeInstanceOf(Array);
      expect(result.summary.highlights.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', () => {
      const parsed = engine.parseQuery('');
      expect(parsed.confidence).toBeLessThan(1);
    });

    it('should handle unknown query gracefully', () => {
      const parsed = engine.parseQuery('xyzabc123');
      expect(parsed.intent).toBe('total'); // Default intent
    });

    it('should return error result when no data is set', async () => {
      const emptyEngine = new QueryEngine();
      const parsed = emptyEngine.parseQuery('What is revenue?');
      const result = await emptyEngine.executeQuery(parsed);

      expect(result.success).toBe(false);
    });
  });

  describe('bilingual support', () => {
    it('should parse French queries', () => {
      const frenchQueries = [
        { query: 'Quel est le total des revenus?', expectedIntent: 'total' },
        { query: 'Comparer les dépenses au budget', expectedIntent: 'compare' },
        { query: "Montre l'évolution des ventes", expectedIntent: 'trend' },
        { query: 'Répartition des dépenses', expectedIntent: 'breakdown' },
      ];

      frenchQueries.forEach(({ query, expectedIntent }) => {
        const parsed = engine.parseQuery(query);
        expect(parsed.intent).toBe(expectedIntent);
      });
    });

    it('should include bilingual summaries', async () => {
      const parsed = engine.parseQuery('What is revenue?');
      const result = await engine.executeQuery(parsed);

      expect(result.summary.text).toBeTruthy();
      expect(result.summary.textEn).toBeTruthy();
      expect(result.visualization.title).toBeTruthy();
      expect(result.visualization.titleEn).toBeTruthy();
    });
  });
});
