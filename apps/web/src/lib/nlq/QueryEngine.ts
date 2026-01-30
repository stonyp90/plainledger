/**
 * Natural Language Query Engine
 * Allows accountants to ask questions in plain language and get dynamic insights
 * Enhanced with Decision Context for learning from past decisions
 */

import type { FinancialDataResponse, AccountBalanceExtended } from '../financialData';
import type { DecisionEvent } from '../decisionContext';

// =====================================================
// TYPES
// =====================================================

export type QueryIntent = 
  | 'compare'
  | 'trend'
  | 'ratio'
  | 'total'
  | 'breakdown'
  | 'variance'
  | 'forecast'
  | 'anomaly'
  | 'rank'
  | 'filter'
  | 'hiring_analysis'
  | 'runway_analysis'
  | 'decision_history'
  | 'decision_impact';

export type VisualizationType = 
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'table'
  | 'kpi_card'
  | 'waterfall'
  | 'gauge'
  | 'treemap';

export type TimeFrame = 
  | 'current_month'
  | 'current_quarter'
  | 'current_year'
  | 'ytd'
  | 'prior_month'
  | 'prior_quarter'
  | 'prior_year'
  | 'last_12_months'
  | 'custom';

export interface ParsedQuery {
  intent: QueryIntent;
  entities: {
    metrics: string[];
    accounts: string[];
    timeFrame: TimeFrame;
    comparisonType?: 'vs_budget' | 'vs_prior' | 'vs_forecast';
    filters?: Record<string, string>;
    limit?: number;
    sortBy?: 'value' | 'variance' | 'name';
    sortOrder?: 'asc' | 'desc';
  };
  confidence: number;
  originalQuery: string;
}

export interface QueryResult {
  success: boolean;
  data: any;
  visualization: {
    type: VisualizationType;
    title: string;
    titleEn: string;
    config: Record<string, any>;
  };
  summary: {
    text: string;
    textEn: string;
    highlights: Array<{
      label: string;
      value: string;
      trend?: 'up' | 'down' | 'neutral';
    }>;
  };
  suggestedFollowUps: string[];
}

// =====================================================
// QUERY PATTERNS
// =====================================================

const QUERY_PATTERNS: Array<{
  patterns: RegExp[];
  intent: QueryIntent;
  visualization: VisualizationType;
}> = [
  {
    patterns: [
      /compare|vs|versus|against|difference|écart|comparer/i,
      /how does .* compare/i,
      /comment .* se compare/i,
    ],
    intent: 'compare',
    visualization: 'bar_chart',
  },
  {
    patterns: [
      /trend|over time|evolution|évolution|historique|monthly|quarterly/i,
      /how has .* changed/i,
      /comment .* a évolué/i,
    ],
    intent: 'trend',
    visualization: 'line_chart',
  },
  {
    patterns: [
      /ratio|percentage|percent|%|pourcentage|proportion/i,
      /what.*ratio|quel.*ratio/i,
    ],
    intent: 'ratio',
    visualization: 'gauge',
  },
  {
    patterns: [
      /total|sum|aggregate|somme|montant total/i,
      /how much|combien/i,
    ],
    intent: 'total',
    visualization: 'kpi_card',
  },
  {
    patterns: [
      /breakdown|composition|répartition|détail|by category/i,
      /what makes up|qu'est-ce qui compose/i,
    ],
    intent: 'breakdown',
    visualization: 'pie_chart',
  },
  {
    patterns: [
      /variance|change|variation|changement|écart/i,
      /what changed|qu'est-ce qui a changé/i,
    ],
    intent: 'variance',
    visualization: 'waterfall',
  },
  {
    patterns: [
      /forecast|predict|projection|prévision/i,
      /what will|que sera/i,
    ],
    intent: 'forecast',
    visualization: 'line_chart',
  },
  {
    patterns: [
      /anomaly|unusual|abnormal|anomalie|inhabituel/i,
      /what.*wrong|problème/i,
    ],
    intent: 'anomaly',
    visualization: 'table',
  },
  {
    patterns: [
      /top|highest|lowest|biggest|smallest|rank|plus grand|plus petit/i,
      /which.*most|lequel.*plus/i,
    ],
    intent: 'rank',
    visualization: 'bar_chart',
  },
  {
    patterns: [
      /can.*afford.*hire|should.*hire|can.*embaucher|peut.*embaucher/i,
      /hiring.*analysis|analyse.*embauche/i,
      /afford.*employee|embaucher.*employé/i,
    ],
    intent: 'hiring_analysis',
    visualization: 'kpi_card',
  },
  {
    patterns: [
      /runway|autonomie|how long.*cash|combien.*temps.*trésorerie/i,
      /project.*runway|forecast.*runway|prévision.*autonomie/i,
      /months.*cash|mois.*trésorerie/i,
    ],
    intent: 'runway_analysis',
    visualization: 'gauge',
  },
  {
    patterns: [
      /decisions?|décisions?|what decisions|quelles décisions/i,
      /past decisions|recent decisions|décisions récentes/i,
      /show.*decisions|afficher.*décisions/i,
      /what.*decided|qu'avons-nous.*décidé/i,
    ],
    intent: 'decision_history',
    visualization: 'table',
  },
  {
    patterns: [
      /decision.*impact|impact.*décision/i,
      /did.*decision work|la décision.*fonctionné/i,
      /outcome.*decision|résultat.*décision/i,
      /how.*decisions.*performed|comment.*décisions.*performé/i,
    ],
    intent: 'decision_impact',
    visualization: 'bar_chart',
  },
];

const METRIC_KEYWORDS: Record<string, string[]> = {
  revenue: ['revenue', 'sales', 'income', 'ventes', 'revenus', 'chiffre d\'affaires'],
  expenses: ['expense', 'cost', 'spending', 'dépenses', 'coûts', 'frais'],
  profit: ['profit', 'net income', 'earnings', 'bénéfice', 'résultat net'],
  cash: ['cash', 'liquidity', 'encaisse', 'liquidité', 'trésorerie'],
  receivables: ['receivable', 'ar', 'accounts receivable', 'créances', 'comptes clients'],
  payables: ['payable', 'ap', 'accounts payable', 'dettes', 'comptes fournisseurs'],
  assets: ['asset', 'actif', 'actifs'],
  liabilities: ['liability', 'debt', 'passif', 'dettes'],
  equity: ['equity', 'capital', 'capitaux propres'],
  inventory: ['inventory', 'stock', 'stocks', 'inventaire'],
};

const TIME_KEYWORDS: Record<TimeFrame, string[]> = {
  current_month: ['this month', 'current month', 'ce mois', 'mois en cours'],
  current_quarter: ['this quarter', 'current quarter', 'ce trimestre', 'trimestre en cours'],
  current_year: ['this year', 'current year', 'cette année', 'année en cours'],
  ytd: ['ytd', 'year to date', 'cumul annuel', 'depuis le début de l\'année'],
  prior_month: ['last month', 'prior month', 'mois dernier', 'mois précédent'],
  prior_quarter: ['last quarter', 'prior quarter', 'trimestre dernier'],
  prior_year: ['last year', 'prior year', 'année dernière', 'année précédente'],
  last_12_months: ['last 12 months', 'trailing twelve', 'ttm', '12 derniers mois'],
  custom: [],
};

// =====================================================
// QUERY ENGINE CLASS
// =====================================================

export class QueryEngine {
  private financialData: FinancialDataResponse | null = null;
  private decisionHistory: DecisionEvent[] = [];
  private industry: string = 'general';

  setData(data: FinancialDataResponse): void {
    this.financialData = data;
  }

  setDecisionHistory(decisions: DecisionEvent[]): void {
    this.decisionHistory = decisions;
  }

  setIndustry(industry: string): void {
    this.industry = industry;
  }

  addDecision(decision: DecisionEvent): void {
    this.decisionHistory = [decision, ...this.decisionHistory].slice(0, 100);
  }

  getDecisionHistory(): DecisionEvent[] {
    return this.decisionHistory;
  }

  getDecisionSuggestions(): string[] {
    // Generate decision-aware suggestions based on history
    const suggestions: string[] = [];
    
    if (this.decisionHistory.length > 0) {
      suggestions.push('Show my recent decisions');
      suggestions.push('How did my decisions perform?');
    }
    
    // Industry-specific decision suggestions
    const industrySuggestions: Record<string, string[]> = {
      real_estate: [
        'What rent adjustments did I make?',
        'Show property investment decisions',
      ],
      restaurant: [
        'What menu pricing decisions worked?',
        'Show staffing decisions impact',
      ],
      retail: [
        'What inventory decisions were made?',
        'Show pricing strategy outcomes',
      ],
      construction: [
        'What project bid decisions were made?',
        'Show equipment purchase outcomes',
      ],
    };
    
    if (industrySuggestions[this.industry]) {
      suggestions.push(...industrySuggestions[this.industry]);
    }
    
    return suggestions;
  }

  parseQuery(query: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Detect intent
    let intent: QueryIntent = 'total';
    let visualization: VisualizationType = 'kpi_card';
    let maxConfidence = 0;

    for (const pattern of QUERY_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(normalizedQuery)) {
          const confidence = this.calculatePatternConfidence(normalizedQuery, regex);
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            intent = pattern.intent;
            visualization = pattern.visualization;
          }
        }
      }
    }

    // Extract metrics
    const metrics: string[] = [];
    for (const [metric, keywords] of Object.entries(METRIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalizedQuery.includes(keyword)) {
          metrics.push(metric);
          break;
        }
      }
    }

    // Extract time frame
    let timeFrame: TimeFrame = 'current_month';
    for (const [tf, keywords] of Object.entries(TIME_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalizedQuery.includes(keyword)) {
          timeFrame = tf as TimeFrame;
          break;
        }
      }
    }

    // Extract comparison type
    let comparisonType: 'vs_budget' | 'vs_prior' | 'vs_forecast' | undefined;
    if (/budget|budgété/.test(normalizedQuery)) {
      comparisonType = 'vs_budget';
    } else if (/prior|last|previous|précédent|dernier/.test(normalizedQuery)) {
      comparisonType = 'vs_prior';
    } else if (/forecast|projection|prévision/.test(normalizedQuery)) {
      comparisonType = 'vs_forecast';
    }

    // Extract limit for ranking queries
    const limitMatch = normalizedQuery.match(/top\s+(\d+)|(\d+)\s+(?:premiers?|plus)/);
    const limit = limitMatch ? parseInt(limitMatch[1] || limitMatch[2], 10) : undefined;

    return {
      intent,
      entities: {
        metrics: metrics.length > 0 ? metrics : ['revenue'], // Default to revenue
        accounts: [],
        timeFrame,
        comparisonType,
        limit,
        sortOrder: /lowest|smallest|plus petit/.test(normalizedQuery) ? 'asc' : 'desc',
      },
      confidence: Math.max(0.5, maxConfidence),
      originalQuery: query,
    };
  }

  async executeQuery(parsedQuery: ParsedQuery): Promise<QueryResult> {
    if (!this.financialData) {
      return this.createErrorResult('No financial data available');
    }

    switch (parsedQuery.intent) {
      case 'total':
        return this.executeTotalQuery(parsedQuery);
      case 'compare':
        return this.executeCompareQuery(parsedQuery);
      case 'trend':
        return this.executeTrendQuery(parsedQuery);
      case 'breakdown':
        return this.executeBreakdownQuery(parsedQuery);
      case 'variance':
        return this.executeVarianceQuery(parsedQuery);
      case 'ratio':
        return this.executeRatioQuery(parsedQuery);
      case 'rank':
        return this.executeRankQuery(parsedQuery);
      case 'anomaly':
        return this.executeAnomalyQuery(parsedQuery);
      case 'hiring_analysis':
        return this.executeHiringAnalysisQuery(parsedQuery);
      case 'runway_analysis':
        return this.executeRunwayAnalysisQuery(parsedQuery);
      case 'decision_history':
        return this.executeDecisionHistoryQuery(parsedQuery);
      case 'decision_impact':
        return this.executeDecisionImpactQuery(parsedQuery);
      default:
        return this.executeTotalQuery(parsedQuery);
    }
  }

  // =====================================================
  // QUERY EXECUTORS
  // =====================================================

  private executeTotalQuery(query: ParsedQuery): QueryResult {
    const metric = query.entities.metrics[0];
    const data = this.getMetricValue(metric);

    return {
      success: true,
      data: { value: data.current, prior: data.prior },
      visualization: {
        type: 'kpi_card',
        title: this.getMetricLabel(metric, 'fr'),
        titleEn: this.getMetricLabel(metric, 'en'),
        config: {
          value: data.current,
          change: data.prior ? ((data.current - data.prior) / data.prior) * 100 : 0,
          format: 'currency',
        },
      },
      summary: {
        text: `${this.getMetricLabel(metric, 'fr')}: ${this.formatCurrency(data.current)}`,
        textEn: `${this.getMetricLabel(metric, 'en')}: ${this.formatCurrency(data.current)}`,
        highlights: [
          {
            label: this.getMetricLabel(metric, 'en'),
            value: this.formatCurrency(data.current),
            trend: data.current > data.prior ? 'up' : data.current < data.prior ? 'down' : 'neutral',
          },
        ],
      },
      suggestedFollowUps: [
        `How does ${metric} compare to budget?`,
        `Show ${metric} trend over last 12 months`,
        `What's the breakdown of ${metric} by category?`,
      ],
    };
  }

  private executeCompareQuery(query: ParsedQuery): QueryResult {
    const metric = query.entities.metrics[0];
    const data = this.getMetricValue(metric);
    const comparisonValue = query.entities.comparisonType === 'vs_budget' 
      ? data.budget 
      : data.prior;

    const variance = data.current - comparisonValue;
    const variancePercent = comparisonValue ? (variance / comparisonValue) * 100 : 0;

    return {
      success: true,
      data: {
        current: data.current,
        comparison: comparisonValue,
        variance,
        variancePercent,
      },
      visualization: {
        type: 'bar_chart',
        title: `${this.getMetricLabel(metric, 'fr')} vs ${query.entities.comparisonType === 'vs_budget' ? 'Budget' : 'Période précédente'}`,
        titleEn: `${this.getMetricLabel(metric, 'en')} vs ${query.entities.comparisonType === 'vs_budget' ? 'Budget' : 'Prior Period'}`,
        config: {
          data: [
            { name: 'Actuel', value: data.current },
            { name: query.entities.comparisonType === 'vs_budget' ? 'Budget' : 'Précédent', value: comparisonValue },
          ],
        },
      },
      summary: {
        text: `${this.getMetricLabel(metric, 'fr')} est ${variance >= 0 ? 'supérieur' : 'inférieur'} de ${this.formatCurrency(Math.abs(variance))} (${variancePercent.toFixed(1)}%)`,
        textEn: `${this.getMetricLabel(metric, 'en')} is ${variance >= 0 ? 'above' : 'below'} by ${this.formatCurrency(Math.abs(variance))} (${variancePercent.toFixed(1)}%)`,
        highlights: [
          { label: 'Variance', value: this.formatCurrency(variance), trend: variance >= 0 ? 'up' : 'down' },
          { label: 'Variance %', value: `${variancePercent.toFixed(1)}%`, trend: variance >= 0 ? 'up' : 'down' },
        ],
      },
      suggestedFollowUps: [
        `What caused the ${metric} variance?`,
        `Show ${metric} breakdown by account`,
        `Trend of ${metric} over time`,
      ],
    };
  }

  private executeTrendQuery(query: ParsedQuery): QueryResult {
    const metric = query.entities.metrics[0];
    const trendData = this.getTrendData(metric);

    return {
      success: true,
      data: trendData,
      visualization: {
        type: 'line_chart',
        title: `Évolution ${this.getMetricLabel(metric, 'fr')}`,
        titleEn: `${this.getMetricLabel(metric, 'en')} Trend`,
        config: {
          data: trendData,
          xKey: 'period',
          yKey: 'value',
        },
      },
      summary: {
        text: this.generateTrendSummary(trendData, 'fr'),
        textEn: this.generateTrendSummary(trendData, 'en'),
        highlights: this.calculateTrendHighlights(trendData),
      },
      suggestedFollowUps: [
        `Compare ${metric} to budget`,
        `What's driving the ${metric} trend?`,
        `Forecast ${metric} for next quarter`,
      ],
    };
  }

  private executeBreakdownQuery(query: ParsedQuery): QueryResult {
    const metric = query.entities.metrics[0];
    const breakdownData = this.getBreakdownData(metric);

    return {
      success: true,
      data: breakdownData,
      visualization: {
        type: 'pie_chart',
        title: `Répartition ${this.getMetricLabel(metric, 'fr')}`,
        titleEn: `${this.getMetricLabel(metric, 'en')} Breakdown`,
        config: {
          data: breakdownData,
          nameKey: 'name',
          valueKey: 'value',
        },
      },
      summary: {
        text: `Répartition de ${this.getMetricLabel(metric, 'fr')} par catégorie`,
        textEn: `${this.getMetricLabel(metric, 'en')} breakdown by category`,
        highlights: breakdownData.slice(0, 3).map(item => ({
          label: item.name,
          value: `${item.percentage.toFixed(1)}%`,
        })),
      },
      suggestedFollowUps: [
        `Show top ${metric} accounts`,
        `Compare breakdown to prior year`,
        `Drill into largest category`,
      ],
    };
  }

  private executeVarianceQuery(query: ParsedQuery): QueryResult {
    const accounts = this.financialData!.accounts;
    const significantVariances = accounts
      .map(a => ({
        name: a.name,
        current: a.current,
        prior: a.prior,
        variance: a.current - a.prior,
        variancePercent: a.prior ? ((a.current - a.prior) / Math.abs(a.prior)) * 100 : 0,
      }))
      .filter(a => Math.abs(a.variancePercent) > 10)
      .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))
      .slice(0, 10);

    return {
      success: true,
      data: significantVariances,
      visualization: {
        type: 'waterfall',
        title: 'Analyse des variances',
        titleEn: 'Variance Analysis',
        config: {
          data: significantVariances,
        },
      },
      summary: {
        text: `${significantVariances.length} comptes avec des variances significatives détectés`,
        textEn: `${significantVariances.length} accounts with significant variances detected`,
        highlights: significantVariances.slice(0, 3).map(v => ({
          label: v.name,
          value: `${v.variancePercent.toFixed(1)}%`,
          trend: v.variance > 0 ? 'up' : 'down',
        })),
      },
      suggestedFollowUps: [
        'Explain the largest variance',
        'Show variance trend over time',
        'Filter by account type',
      ],
    };
  }

  private executeRatioQuery(query: ParsedQuery): QueryResult {
    const metrics = this.financialData!.metrics;
    
    const ratioData = [
      { name: 'Current Ratio', nameFr: 'Ratio de liquidité', value: metrics.currentRatio, benchmark: 2.0 },
      { name: 'Quick Ratio', nameFr: 'Ratio rapide', value: metrics.quickRatio, benchmark: 1.5 },
      { name: 'Debt to Equity', nameFr: 'Endettement', value: metrics.debtToEquity, benchmark: 1.0 },
      { name: 'Gross Margin', nameFr: 'Marge brute', value: metrics.grossMargin, benchmark: 35 },
      { name: 'DSO', nameFr: 'Délai de recouvrement', value: metrics.daysReceivable, benchmark: 45 },
    ];

    return {
      success: true,
      data: ratioData,
      visualization: {
        type: 'gauge',
        title: 'Ratios financiers',
        titleEn: 'Financial Ratios',
        config: {
          data: ratioData,
        },
      },
      summary: {
        text: 'Aperçu des principaux ratios financiers',
        textEn: 'Overview of key financial ratios',
        highlights: ratioData.slice(0, 3).map(r => ({
          label: r.name,
          value: r.value.toFixed(2),
          trend: r.value >= r.benchmark ? 'up' : 'down',
        })),
      },
      suggestedFollowUps: [
        'How has the current ratio changed?',
        'Compare ratios to industry benchmarks',
        'What affects DSO?',
      ],
    };
  }

  private executeRankQuery(query: ParsedQuery): QueryResult {
    const metric = query.entities.metrics[0];
    const limit = query.entities.limit || 10;
    const sortOrder = query.entities.sortOrder || 'desc';

    const accounts = this.financialData!.accounts
      .filter(a => this.matchesMetricType(a, metric))
      .sort((a, b) => sortOrder === 'desc' ? b.current - a.current : a.current - b.current)
      .slice(0, limit);

    return {
      success: true,
      data: accounts,
      visualization: {
        type: 'bar_chart',
        title: `Top ${limit} ${this.getMetricLabel(metric, 'fr')}`,
        titleEn: `Top ${limit} ${this.getMetricLabel(metric, 'en')}`,
        config: {
          data: accounts.map(a => ({ name: a.name, value: a.current })),
          layout: 'horizontal',
        },
      },
      summary: {
        text: `Les ${limit} comptes de ${this.getMetricLabel(metric, 'fr')} les plus importants`,
        textEn: `Top ${limit} ${this.getMetricLabel(metric, 'en')} accounts`,
        highlights: accounts.slice(0, 3).map(a => ({
          label: a.name,
          value: this.formatCurrency(a.current),
        })),
      },
      suggestedFollowUps: [
        'Compare to prior period',
        'Show trend for top account',
        'Breakdown by sub-category',
      ],
    };
  }

  private executeAnomalyQuery(query: ParsedQuery): QueryResult {
    const accounts = this.financialData!.accounts;
    const anomalies = accounts
      .map(a => ({
        name: a.name,
        code: a.code,
        current: a.current,
        prior: a.prior,
        variance: a.current - a.prior,
        variancePercent: a.prior ? ((a.current - a.prior) / Math.abs(a.prior)) * 100 : 0,
      }))
      .filter(a => Math.abs(a.variancePercent) > 30)
      .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

    return {
      success: true,
      data: anomalies,
      visualization: {
        type: 'table',
        title: 'Anomalies détectées',
        titleEn: 'Detected Anomalies',
        config: {
          columns: ['name', 'current', 'prior', 'variancePercent'],
          data: anomalies,
        },
      },
      summary: {
        text: `${anomalies.length} anomalies potentielles détectées`,
        textEn: `${anomalies.length} potential anomalies detected`,
        highlights: anomalies.slice(0, 3).map(a => ({
          label: a.name,
          value: `${a.variancePercent.toFixed(1)}%`,
          trend: a.variance > 0 ? 'up' : 'down',
        })),
      },
      suggestedFollowUps: [
        'Explain the top anomaly',
        'Show historical pattern',
        'Filter by severity',
      ],
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private calculatePatternConfidence(query: string, pattern: RegExp): number {
    const match = query.match(pattern);
    if (!match) return 0;
    return 0.7 + (match[0].length / query.length) * 0.3;
  }

  private getMetricValue(metric: string): { current: number; prior: number; budget: number } {
    const summary = this.financialData!.summary;
    
    switch (metric) {
      case 'revenue':
        return { current: summary.revenue.current, prior: summary.revenue.prior, budget: summary.revenue.budget };
      case 'expenses':
        return { current: summary.expenses.current, prior: summary.expenses.prior, budget: summary.expenses.budget };
      case 'cash':
        return { current: summary.cash.current, prior: summary.cash.prior, budget: 0 };
      case 'receivables':
        return { current: summary.receivables.current, prior: summary.receivables.prior, budget: 0 };
      case 'payables':
        return { current: summary.payables.current, prior: summary.payables.prior, budget: 0 };
      default:
        return { current: summary.revenue.current, prior: summary.revenue.prior, budget: summary.revenue.budget };
    }
  }

  private getTrendData(metric: string): Array<{ period: string; value: number }> {
    const trends = this.financialData!.trends;
    
    switch (metric) {
      case 'revenue':
        return trends.revenue.data;
      case 'expenses':
        return trends.expenses.data;
      case 'cash':
        return trends.cashFlow.data;
      case 'profit':
        return trends.profit.data;
      default:
        return trends.revenue.data;
    }
  }

  private getBreakdownData(metric: string): Array<{ name: string; value: number; percentage: number }> {
    const accounts = this.financialData!.accounts;
    const filtered = accounts.filter(a => this.matchesMetricType(a, metric));
    const total = filtered.reduce((sum, a) => sum + Math.abs(a.current), 0);
    
    return filtered
      .map(a => ({
        name: a.name,
        value: Math.abs(a.current),
        percentage: total > 0 ? (Math.abs(a.current) / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  private matchesMetricType(account: AccountBalanceExtended, metric: string): boolean {
    switch (metric) {
      case 'revenue':
        return account.type === 'revenue';
      case 'expenses':
        return account.type === 'expense';
      case 'assets':
        return account.type === 'asset';
      case 'liabilities':
        return account.type === 'liability';
      case 'equity':
        return account.type === 'equity';
      case 'receivables':
        return account.code === '1100';
      case 'payables':
        return account.code === '2000';
      case 'cash':
        return account.code === '1000';
      default:
        return true;
    }
  }

  private getMetricLabel(metric: string, lang: 'en' | 'fr'): string {
    const labels: Record<string, { en: string; fr: string }> = {
      revenue: { en: 'Revenue', fr: 'Revenus' },
      expenses: { en: 'Expenses', fr: 'Dépenses' },
      profit: { en: 'Net Income', fr: 'Résultat net' },
      cash: { en: 'Cash', fr: 'Encaisse' },
      receivables: { en: 'Accounts Receivable', fr: 'Comptes clients' },
      payables: { en: 'Accounts Payable', fr: 'Comptes fournisseurs' },
      assets: { en: 'Assets', fr: 'Actifs' },
      liabilities: { en: 'Liabilities', fr: 'Passifs' },
      equity: { en: 'Equity', fr: 'Capitaux propres' },
      inventory: { en: 'Inventory', fr: 'Stocks' },
    };
    return labels[metric]?.[lang] || metric;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private generateTrendSummary(data: Array<{ period: string; value: number }>, lang: 'en' | 'fr'): string {
    if (data.length < 2) return lang === 'en' ? 'Insufficient data for trend analysis' : 'Données insuffisantes pour l\'analyse de tendance';
    
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = ((last - first) / first) * 100;
    
    if (lang === 'en') {
      return `${change >= 0 ? 'Increased' : 'Decreased'} by ${Math.abs(change).toFixed(1)}% over the period`;
    }
    return `${change >= 0 ? 'Augmentation' : 'Diminution'} de ${Math.abs(change).toFixed(1)}% sur la période`;
  }

  private calculateTrendHighlights(data: Array<{ period: string; value: number }>): Array<{ label: string; value: string; trend?: 'up' | 'down' | 'neutral' }> {
    if (data.length < 2) return [];
    
    if (data.length === 0) return [];
    
    const first = data[0]?.value ?? 0;
    const last = data[data.length - 1]?.value ?? 0;
    const avg = data.reduce((sum, d) => sum + (d?.value ?? 0), 0) / data.length;
    const values = data.map(d => d?.value ?? 0);
    const max = values.length > 0 ? Math.max(...values) : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    
    return [
      { label: 'Current', value: this.formatCurrency(last), trend: last > first ? 'up' : 'down' },
      { label: 'Average', value: this.formatCurrency(avg) },
      { label: 'High/Low', value: `${this.formatCurrency(max)} / ${this.formatCurrency(min)}` },
    ];
  }

  private executeHiringAnalysisQuery(query: ParsedQuery): QueryResult {
    const summary = this.financialData!.summary;
    const cash = summary.cash.current;
    const monthlyExpenses = summary.expenses.current;
    const monthlyRevenue = summary.revenue.current;
    const burnRate = monthlyExpenses - monthlyRevenue;
    const runwayMonths = burnRate > 0 ? cash / burnRate : Infinity;
    
    // Extract salary from query (default: $100K)
    const salaryMatch = query.originalQuery.match(/\$?(\d+)[kK]|\$(\d{1,3}),?\d{3}/);
    const annualSalary = salaryMatch 
      ? (salaryMatch[1] ? parseInt(salaryMatch[1]) * 1000 : parseInt(salaryMatch[2].replace(/,/g, '')))
      : 100000;
    
    const monthlySalaryCost = annualSalary / 12 * 1.3; // Include benefits/overhead (30%)
    const newBurnRate = burnRate + monthlySalaryCost;
    const newRunwayMonths = newBurnRate > 0 ? cash / newBurnRate : Infinity;
    const runwayImpact = runwayMonths - newRunwayMonths;
    
    const canAfford = runwayMonths > 12 && runwayImpact < runwayMonths * 0.3; // Can afford if runway > 12mo and impact < 30%
    
    return {
      success: true,
      data: {
        canAfford,
        currentRunway: runwayMonths,
        newRunway: newRunwayMonths,
        runwayImpact,
        monthlySalaryCost,
        annualSalary,
        recommendation: canAfford ? 'proceed' : 'caution',
      },
      visualization: {
        type: 'kpi_card',
        title: 'Analyse d\'embauche',
        titleEn: 'Hiring Analysis',
        config: {
          value: canAfford ? 'Yes' : 'Caution',
          change: runwayImpact,
          format: 'text',
        },
      },
      summary: {
        text: canAfford
          ? `Vous pouvez vous permettre d'embaucher. Impact sur le runway: ${runwayImpact.toFixed(1)} mois`
          : `Attention: L'embauche réduirait le runway de ${runwayImpact.toFixed(1)} mois`,
        textEn: canAfford
          ? `You can afford to hire. Runway impact: ${runwayImpact.toFixed(1)} months`
          : `Caution: Hiring would reduce runway by ${runwayImpact.toFixed(1)} months`,
        highlights: [
          { label: 'Current Runway', value: `${runwayMonths.toFixed(1)} months` },
          { label: 'New Runway', value: `${newRunwayMonths.toFixed(1)} months` },
          { label: 'Monthly Cost', value: this.formatCurrency(monthlySalaryCost) },
        ],
      },
      suggestedFollowUps: [
        'What if we hire a contractor instead?',
        'Show runway with different salary levels',
        'Compare hiring vs outsourcing',
      ],
    };
  }

  private executeRunwayAnalysisQuery(query: ParsedQuery): QueryResult {
    const summary = this.financialData!.summary;
    const cash = summary.cash.current;
    const monthlyExpenses = summary.expenses.current;
    const monthlyRevenue = summary.revenue.current;
    const burnRate = monthlyExpenses - monthlyRevenue;
    const runwayMonths = burnRate > 0 ? cash / burnRate : Infinity;
    
    // Project runway with different scenarios
    const scenarios = [
      { name: 'Current', burnRate, runway: runwayMonths },
      { name: '10% Cost Reduction', burnRate: burnRate * 0.9, runway: burnRate * 0.9 > 0 ? cash / (burnRate * 0.9) : Infinity },
      { name: '20% Cost Reduction', burnRate: burnRate * 0.8, runway: burnRate * 0.8 > 0 ? cash / (burnRate * 0.8) : Infinity },
      { name: '10% Revenue Increase', burnRate: burnRate - (monthlyRevenue * 0.1), runway: (burnRate - monthlyRevenue * 0.1) > 0 ? cash / (burnRate - monthlyRevenue * 0.1) : Infinity },
    ];
    
    return {
      success: true,
      data: scenarios,
      visualization: {
        type: 'gauge',
        title: 'Analyse du runway',
        titleEn: 'Runway Analysis',
        config: {
          value: runwayMonths,
          max: Math.max(...scenarios.map(s => s.runway).filter(r => isFinite(r))),
          format: 'months',
        },
      },
      summary: {
        text: `Runway actuel: ${runwayMonths.toFixed(1)} mois`,
        textEn: `Current runway: ${runwayMonths.toFixed(1)} months`,
        highlights: scenarios.slice(0, 3).map(s => ({
          label: s.name,
          value: `${s.runway.toFixed(1)} months`,
          trend: s.runway > runwayMonths ? 'up' : 'neutral',
        })),
      },
      suggestedFollowUps: [
        'What actions extend runway the most?',
        'Show runway with hiring scenarios',
        'Compare runway to industry benchmarks',
      ],
    };
  }

  private executeDecisionHistoryQuery(query: ParsedQuery): QueryResult {
    if (this.decisionHistory.length === 0) {
      return {
        success: true,
        data: [],
        visualization: {
          type: 'table',
          title: 'Historique des décisions',
          titleEn: 'Decision History',
          config: { data: [] },
        },
        summary: {
          text: 'Aucune décision enregistrée pour le moment. Utilisez le bouton "Décider" sur les graphiques pour capturer vos décisions.',
          textEn: 'No decisions recorded yet. Use the "Decide" button on charts to capture your decisions.',
          highlights: [],
        },
        suggestedFollowUps: [
          'Show revenue trend',
          'What anomalies were detected?',
          'Show cash flow breakdown',
        ],
      };
    }

    // Format decisions for display
    const decisionData = this.decisionHistory.slice(0, 10).map(d => ({
      date: new Date(d.timestamp).toLocaleDateString(),
      description: d.decision.description.slice(0, 50) + (d.decision.description.length > 50 ? '...' : ''),
      type: d.decision.actionType,
      expectedImpact: this.formatCurrency(d.decision.expectedImpact),
      status: d.outcome ? (d.outcome.success ? 'Success' : 'Needs Review') : 'Pending',
      metric: d.context.metricType,
    }));

    // Calculate summary stats
    const totalDecisions = this.decisionHistory.length;
    const successfulDecisions = this.decisionHistory.filter(d => d.outcome?.success).length;
    const pendingDecisions = this.decisionHistory.filter(d => !d.outcome).length;
    const totalExpectedImpact = this.decisionHistory.reduce((sum, d) => sum + d.decision.expectedImpact, 0);

    return {
      success: true,
      data: decisionData,
      visualization: {
        type: 'table',
        title: 'Historique des décisions',
        titleEn: 'Decision History',
        config: { 
          data: decisionData,
          columns: ['date', 'description', 'type', 'expectedImpact', 'status'],
        },
      },
      summary: {
        text: `${totalDecisions} décisions enregistrées. ${successfulDecisions} réussies, ${pendingDecisions} en attente d'évaluation.`,
        textEn: `${totalDecisions} decisions recorded. ${successfulDecisions} successful, ${pendingDecisions} pending evaluation.`,
        highlights: [
          { label: 'Total Decisions', value: totalDecisions.toString() },
          { label: 'Success Rate', value: totalDecisions > 0 ? `${((successfulDecisions / (totalDecisions - pendingDecisions)) * 100 || 0).toFixed(0)}%` : 'N/A', trend: 'up' },
          { label: 'Expected Impact', value: this.formatCurrency(totalExpectedImpact), trend: 'up' },
        ],
      },
      suggestedFollowUps: [
        'How did my decisions perform?',
        'Show revenue trend',
        'What anomalies were detected?',
      ],
    };
  }

  private executeDecisionImpactQuery(query: ParsedQuery): QueryResult {
    if (this.decisionHistory.length === 0) {
      return this.executeDecisionHistoryQuery(query);
    }

    // Analyze decisions with outcomes
    const completedDecisions = this.decisionHistory.filter(d => d.outcome);
    const successfulDecisions = completedDecisions.filter(d => d.outcome!.success);
    const failedDecisions = completedDecisions.filter(d => !d.outcome!.success);

    // Calculate actual vs expected impact
    const totalExpected = completedDecisions.reduce((sum, d) => sum + d.decision.expectedImpact, 0);
    const totalActual = completedDecisions.reduce((sum, d) => sum + (d.outcome!.actualImpact || 0), 0);
    const accuracyRate = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    // Group by action type
    const byActionType = this.decisionHistory.reduce((acc, d) => {
      const type = d.decision.actionType;
      if (!acc[type]) acc[type] = { count: 0, expected: 0, actual: 0, successful: 0 };
      acc[type].count++;
      acc[type].expected += d.decision.expectedImpact;
      if (d.outcome) {
        acc[type].actual += d.outcome.actualImpact || 0;
        if (d.outcome.success) acc[type].successful++;
      }
      return acc;
    }, {} as Record<string, { count: number; expected: number; actual: number; successful: number }>);

    const actionTypeData = Object.entries(byActionType).map(([type, data]) => ({
      name: type.replace(/_/g, ' '),
      value: data.actual,
      expected: data.expected,
      count: data.count,
      successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    return {
      success: true,
      data: actionTypeData,
      visualization: {
        type: 'bar_chart',
        title: 'Impact des décisions',
        titleEn: 'Decision Impact',
        config: { 
          data: actionTypeData.slice(0, 5),
        },
      },
      summary: {
        text: `${successfulDecisions.length}/${completedDecisions.length} décisions réussies. Précision des prévisions: ${accuracyRate.toFixed(0)}%.`,
        textEn: `${successfulDecisions.length}/${completedDecisions.length} decisions successful. Forecast accuracy: ${accuracyRate.toFixed(0)}%.`,
        highlights: [
          { label: 'Success Rate', value: `${completedDecisions.length > 0 ? ((successfulDecisions.length / completedDecisions.length) * 100).toFixed(0) : 0}%`, trend: 'up' },
          { label: 'Total Impact', value: this.formatCurrency(totalActual), trend: totalActual >= totalExpected ? 'up' : 'down' },
          { label: 'Forecast Accuracy', value: `${accuracyRate.toFixed(0)}%`, trend: accuracyRate >= 80 ? 'up' : 'neutral' },
        ],
      },
      suggestedFollowUps: [
        'Show recent decisions',
        'What decisions worked best?',
        'Compare to industry benchmarks',
      ],
    };
  }

  private createErrorResult(message: string): QueryResult {
    return {
      success: false,
      data: null,
      visualization: {
        type: 'kpi_card',
        title: 'Erreur',
        titleEn: 'Error',
        config: {},
      },
      summary: {
        text: message,
        textEn: message,
        highlights: [],
      },
      suggestedFollowUps: [],
    };
  }
}

// Export singleton instance
export const queryEngine = new QueryEngine();
