/**
 * Chart Favorites & Pinning System
 * 
 * Allows users to pin favorite charts to their dashboard
 * and customize their data visualization preferences.
 */

// =====================================================
// TYPES
// =====================================================

export type ChartType = 
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'treemap'
  | 'heatmap'
  | 'waterfall'
  | 'gauge'
  | 'sparkline'
  | 'table'
  | 'gantt'
  | 'runway'
  | 'scenario'
  | 'burnRate'
  | 'cashForecast';

export type DataMetric = 
  | 'revenue'
  | 'expenses'
  | 'profit'
  | 'cashFlow'
  | 'accountsReceivable'
  | 'accountsPayable'
  | 'inventory'
  | 'equity'
  | 'assets'
  | 'liabilities'
  | 'currentRatio'
  | 'quickRatio'
  | 'debtToEquity'
  | 'grossMargin'
  | 'netMargin'
  | 'dso'
  | 'dpo'
  | 'workingCapital'
  | 'customQuery';

export type TimeRange = 
  | '1W'
  | '1M'
  | '3M'
  | '6M'
  | 'YTD'
  | '1Y'
  | '2Y'
  | 'ALL'
  | 'custom';

export type ComparisonMode = 
  | 'none'
  | 'previousPeriod'
  | 'previousYear'
  | 'budget'
  | 'forecast';

export interface ChartConfig {
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  chartType: ChartType;
  metrics: DataMetric[];
  timeRange: TimeRange;
  comparison: ComparisonMode;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: Record<string, string[]>;
  customQuery?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  stacked?: boolean;
  cumulative?: boolean;
}

export interface PinnedChart {
  chartId: string;
  config: ChartConfig;
  position: number;
  size: 'small' | 'medium' | 'large' | 'full';
  pinnedAt: string;
  lastViewed?: string;
}

export interface ChartPreferences {
  defaultChartType: ChartType;
  defaultTimeRange: TimeRange;
  showAnimations: boolean;
  colorScheme: 'default' | 'colorblind' | 'monochrome' | 'vibrant';
  gridDensity: 'compact' | 'normal' | 'spacious';
}

// =====================================================
// DEFAULT CONFIGURATIONS
// =====================================================

export const DEFAULT_PREFERENCES: ChartPreferences = {
  defaultChartType: 'line',
  defaultTimeRange: '1Y',
  showAnimations: true,
  colorScheme: 'default',
  gridDensity: 'normal',
};

export const CHART_TYPE_INFO: Record<ChartType, { 
  label: string; 
  labelEn: string; 
  icon: string;
  description: string;
  descriptionEn: string;
  bestFor: string[];
}> = {
  line: {
    label: 'Ligne',
    labelEn: 'Line',
    icon: '📈',
    description: 'Idéal pour montrer les tendances dans le temps',
    descriptionEn: 'Ideal for showing trends over time',
    bestFor: ['revenue', 'expenses', 'profit', 'cashFlow'],
  },
  bar: {
    label: 'Barres',
    labelEn: 'Bar',
    icon: '📊',
    description: 'Comparez des valeurs entre catégories',
    descriptionEn: 'Compare values across categories',
    bestFor: ['revenue', 'expenses', 'assets', 'liabilities'],
  },
  area: {
    label: 'Aire',
    labelEn: 'Area',
    icon: '📉',
    description: 'Montrez le volume et les tendances cumulatives',
    descriptionEn: 'Show volume and cumulative trends',
    bestFor: ['cashFlow', 'revenue', 'inventory'],
  },
  pie: {
    label: 'Secteurs',
    labelEn: 'Pie',
    icon: '🥧',
    description: 'Visualisez les proportions d\'un tout',
    descriptionEn: 'Visualize proportions of a whole',
    bestFor: ['expenses', 'assets', 'revenue'],
  },
  donut: {
    label: 'Anneau',
    labelEn: 'Donut',
    icon: '🍩',
    description: 'Comme secteurs avec un centre vide pour les KPIs',
    descriptionEn: 'Like pie with empty center for KPIs',
    bestFor: ['expenses', 'assets', 'liabilities'],
  },
  scatter: {
    label: 'Nuage de points',
    labelEn: 'Scatter',
    icon: '⚬',
    description: 'Identifiez les corrélations entre variables',
    descriptionEn: 'Identify correlations between variables',
    bestFor: ['customQuery'],
  },
  radar: {
    label: 'Radar',
    labelEn: 'Radar',
    icon: '🕸️',
    description: 'Comparez plusieurs dimensions simultanément',
    descriptionEn: 'Compare multiple dimensions simultaneously',
    bestFor: ['currentRatio', 'quickRatio', 'debtToEquity', 'grossMargin'],
  },
  treemap: {
    label: 'Treemap',
    labelEn: 'Treemap',
    icon: '🗺️',
    description: 'Visualisez les hiérarchies et proportions',
    descriptionEn: 'Visualize hierarchies and proportions',
    bestFor: ['expenses', 'assets', 'revenue'],
  },
  heatmap: {
    label: 'Carte de chaleur',
    labelEn: 'Heatmap',
    icon: '🔥',
    description: 'Identifiez les patterns par intensité de couleur',
    descriptionEn: 'Identify patterns by color intensity',
    bestFor: ['cashFlow', 'revenue', 'expenses'],
  },
  waterfall: {
    label: 'Cascade',
    labelEn: 'Waterfall',
    icon: '🌊',
    description: 'Montrez comment une valeur initiale évolue',
    descriptionEn: 'Show how an initial value changes',
    bestFor: ['profit', 'cashFlow', 'equity'],
  },
  gauge: {
    label: 'Jauge',
    labelEn: 'Gauge',
    icon: '🎯',
    description: 'Montrez la progression vers un objectif',
    descriptionEn: 'Show progress towards a goal',
    bestFor: ['currentRatio', 'quickRatio', 'grossMargin', 'netMargin'],
  },
  sparkline: {
    label: 'Sparkline',
    labelEn: 'Sparkline',
    icon: '〰️',
    description: 'Mini graphique compact pour les tableaux',
    descriptionEn: 'Compact mini chart for tables',
    bestFor: ['revenue', 'expenses', 'profit'],
  },
  table: {
    label: 'Tableau',
    labelEn: 'Table',
    icon: '📋',
    description: 'Données détaillées en format tabulaire',
    descriptionEn: 'Detailed data in tabular format',
    bestFor: ['accountsReceivable', 'accountsPayable', 'inventory'],
  },
  gantt: {
    label: 'Gantt',
    labelEn: 'Gantt',
    icon: '📅',
    description: 'Timeline des initiatives stratégiques',
    descriptionEn: 'Strategic initiative timeline',
    bestFor: ['cashFlow'],
  },
  runway: {
    label: 'Autonomie',
    labelEn: 'Runway',
    icon: '⏱️',
    description: 'Visualisation du compte à rebours de trésorerie',
    descriptionEn: 'Cash runway countdown visualization',
    bestFor: ['cashFlow'],
  },
  scenario: {
    label: 'Scénario',
    labelEn: 'Scenario',
    icon: '🔮',
    description: 'Comparaison de scénarios multiples',
    descriptionEn: 'Multiple scenario comparison',
    bestFor: ['cashFlow'],
  },
  burnRate: {
    label: 'Taux de brûlage',
    labelEn: 'Burn Rate',
    icon: '📉',
    description: 'Tendances du taux de brûlage avec projections',
    descriptionEn: 'Burn rate trends with projections',
    bestFor: ['cashFlow', 'expenses'],
  },
  cashForecast: {
    label: 'Prévision de trésorerie',
    labelEn: 'Cash Forecast',
    icon: '🔮',
    description: 'Projection de trésorerie prospective',
    descriptionEn: 'Forward-looking cash projection',
    bestFor: ['cashFlow'],
  },
};

// Chart colors aligned with design system (using CSS variables):
// - Primary green (emerald-600/500) for positive financial metrics
// - Accent gold (amber-600/500) for secondary/operational metrics  
// - Red for expenses/liabilities (semantic)
// - Teal for neutral operational metrics
export const METRIC_INFO: Record<DataMetric, {
  label: string;
  labelEn: string;
  category: 'financial' | 'ratio' | 'operational';
  unit: 'currency' | 'percentage' | 'days' | 'number';
  color: string;
}> = {
  revenue: { label: 'Revenus', labelEn: 'Revenue', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-600))' },
  expenses: { label: 'Dépenses', labelEn: 'Expenses', category: 'financial', unit: 'currency', color: '#EF4444' },
  profit: { label: 'Bénéfice', labelEn: 'Profit', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-500))' },
  cashFlow: { label: 'Flux de trésorerie', labelEn: 'Cash Flow', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-700))' },
  accountsReceivable: { label: 'Comptes à recevoir', labelEn: 'Accounts Receivable', category: 'operational', unit: 'currency', color: 'rgb(var(--color-accent-600))' },
  accountsPayable: { label: 'Comptes à payer', labelEn: 'Accounts Payable', category: 'operational', unit: 'currency', color: '#b91c1c' },
  inventory: { label: 'Stocks', labelEn: 'Inventory', category: 'operational', unit: 'currency', color: '#14B8A6' },
  equity: { label: 'Capitaux propres', labelEn: 'Equity', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-600))' },
  assets: { label: 'Actifs', labelEn: 'Assets', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-500))' },
  liabilities: { label: 'Passifs', labelEn: 'Liabilities', category: 'financial', unit: 'currency', color: '#dc2626' },
  currentRatio: { label: 'Ratio de liquidité', labelEn: 'Current Ratio', category: 'ratio', unit: 'number', color: 'rgb(var(--color-primary-600))' },
  quickRatio: { label: 'Ratio rapide', labelEn: 'Quick Ratio', category: 'ratio', unit: 'number', color: 'rgb(var(--color-primary-500))' },
  debtToEquity: { label: 'Dette/Capitaux', labelEn: 'Debt to Equity', category: 'ratio', unit: 'number', color: 'rgb(var(--color-accent-600))' },
  grossMargin: { label: 'Marge brute', labelEn: 'Gross Margin', category: 'ratio', unit: 'percentage', color: 'rgb(var(--color-primary-500))' },
  netMargin: { label: 'Marge nette', labelEn: 'Net Margin', category: 'ratio', unit: 'percentage', color: 'rgb(var(--color-primary-600))' },
  dso: { label: 'DSO', labelEn: 'DSO', category: 'operational', unit: 'days', color: 'rgb(var(--color-accent-600))' },
  dpo: { label: 'DPO', labelEn: 'DPO', category: 'operational', unit: 'days', color: 'rgb(var(--color-accent-500))' },
  workingCapital: { label: 'Fonds de roulement', labelEn: 'Working Capital', category: 'financial', unit: 'currency', color: 'rgb(var(--color-primary-700))' },
  customQuery: { label: 'Requête personnalisée', labelEn: 'Custom Query', category: 'financial', unit: 'number', color: '#6B7280' },
};

export const TIME_RANGE_INFO: Record<TimeRange, { label: string; labelEn: string; days: number }> = {
  '1W': { label: '1 semaine', labelEn: '1 Week', days: 7 },
  '1M': { label: '1 mois', labelEn: '1 Month', days: 30 },
  '3M': { label: '3 mois', labelEn: '3 Months', days: 90 },
  '6M': { label: '6 mois', labelEn: '6 Months', days: 180 },
  'YTD': { label: 'Année en cours', labelEn: 'Year to Date', days: 0 },
  '1Y': { label: '1 an', labelEn: '1 Year', days: 365 },
  '2Y': { label: '2 ans', labelEn: '2 Years', days: 730 },
  'ALL': { label: 'Tout', labelEn: 'All Time', days: -1 },
  'custom': { label: 'Personnalisé', labelEn: 'Custom', days: 0 },
};

// =====================================================
// PRESET CHART CONFIGURATIONS
// =====================================================

export const PRESET_CHARTS: ChartConfig[] = [
  {
    id: 'revenue-trend',
    name: 'Tendance des revenus',
    nameEn: 'Revenue Trend',
    description: 'Évolution des revenus sur la période sélectionnée',
    descriptionEn: 'Revenue evolution over the selected period',
    chartType: 'area',
    metrics: ['revenue'],
    timeRange: '1Y',
    comparison: 'previousYear',
    groupBy: 'month',
    showLegend: true,
    showGrid: true,
    animate: true,
  },
  {
    id: 'profit-loss',
    name: 'Revenus vs Dépenses',
    nameEn: 'Revenue vs Expenses',
    description: 'Comparaison des revenus et dépenses',
    descriptionEn: 'Revenue and expenses comparison',
    chartType: 'bar',
    metrics: ['revenue', 'expenses'],
    timeRange: '1Y',
    comparison: 'none',
    groupBy: 'month',
    showLegend: true,
    stacked: false,
  },
  {
    id: 'expense-breakdown',
    name: 'Répartition des dépenses',
    nameEn: 'Expense Breakdown',
    description: 'Distribution des dépenses par catégorie',
    descriptionEn: 'Expense distribution by category',
    chartType: 'donut',
    metrics: ['expenses'],
    timeRange: '1M',
    comparison: 'none',
    showLegend: true,
  },
  {
    id: 'cash-flow-waterfall',
    name: 'Flux de trésorerie',
    nameEn: 'Cash Flow Waterfall',
    description: 'Évolution du flux de trésorerie',
    descriptionEn: 'Cash flow evolution',
    chartType: 'waterfall',
    metrics: ['cashFlow'],
    timeRange: '1M',
    comparison: 'none',
  },
  {
    id: 'financial-ratios',
    name: 'Ratios financiers',
    nameEn: 'Financial Ratios',
    description: 'Vue d\'ensemble des ratios clés',
    descriptionEn: 'Overview of key financial ratios',
    chartType: 'radar',
    metrics: ['currentRatio', 'quickRatio', 'debtToEquity', 'grossMargin', 'netMargin'],
    timeRange: '1M',
    comparison: 'previousPeriod',
  },
  {
    id: 'liquidity-gauge',
    name: 'Jauge de liquidité',
    nameEn: 'Liquidity Gauge',
    description: 'Ratio de liquidité actuel',
    descriptionEn: 'Current liquidity ratio',
    chartType: 'gauge',
    metrics: ['currentRatio'],
    timeRange: '1M',
    comparison: 'none',
  },
  {
    id: 'monthly-heatmap',
    name: 'Carte de chaleur mensuelle',
    nameEn: 'Monthly Heatmap',
    description: 'Pattern de revenus par jour du mois',
    descriptionEn: 'Revenue pattern by day of month',
    chartType: 'heatmap',
    metrics: ['revenue'],
    timeRange: '1Y',
    comparison: 'none',
  },
  {
    id: 'ar-aging',
    name: 'Vieillissement des créances',
    nameEn: 'AR Aging',
    description: 'Analyse des comptes à recevoir par ancienneté',
    descriptionEn: 'Accounts receivable analysis by age',
    chartType: 'bar',
    metrics: ['accountsReceivable'],
    timeRange: '1M',
    comparison: 'none',
    stacked: true,
  },
  {
    id: 'working-capital-trend',
    name: 'Fonds de roulement',
    nameEn: 'Working Capital',
    description: 'Évolution du fonds de roulement',
    descriptionEn: 'Working capital evolution',
    chartType: 'line',
    metrics: ['workingCapital'],
    timeRange: '1Y',
    comparison: 'budget',
    groupBy: 'month',
  },
  {
    id: 'dso-dpo-comparison',
    name: 'DSO vs DPO',
    nameEn: 'DSO vs DPO',
    description: 'Comparaison des délais de paiement',
    descriptionEn: 'Payment delay comparison',
    chartType: 'line',
    metrics: ['dso', 'dpo'],
    timeRange: '1Y',
    comparison: 'none',
    groupBy: 'month',
  },
];

// =====================================================
// LOCAL STORAGE SERVICE
// =====================================================

const STORAGE_KEYS = {
  PINNED_CHARTS: 'plainledger-pinned-charts',
  PREFERENCES: 'plainledger-chart-preferences',
  RECENT_CHARTS: 'plainledger-recent-charts',
};

export const chartFavoritesService = {
  // Pinned Charts
  getPinnedCharts(): PinnedChart[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PINNED_CHARTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  pinChart(config: ChartConfig, size: PinnedChart['size'] = 'medium'): PinnedChart {
    const pinned = this.getPinnedCharts();
    const existing = pinned.find(p => p.chartId === config.id);
    
    if (existing) {
      return existing;
    }
    
    const newPinned: PinnedChart = {
      chartId: config.id,
      config,
      position: pinned.length,
      size,
      pinnedAt: new Date().toISOString(),
    };
    
    pinned.push(newPinned);
    localStorage.setItem(STORAGE_KEYS.PINNED_CHARTS, JSON.stringify(pinned));
    
    return newPinned;
  },

  unpinChart(chartId: string): void {
    const pinned = this.getPinnedCharts().filter(p => p.chartId !== chartId);
    // Reorder positions
    pinned.forEach((p, i) => p.position = i);
    localStorage.setItem(STORAGE_KEYS.PINNED_CHARTS, JSON.stringify(pinned));
  },

  isPinned(chartId: string): boolean {
    return this.getPinnedCharts().some(p => p.chartId === chartId);
  },

  updatePinnedChart(chartId: string, updates: Partial<PinnedChart>): void {
    const pinned = this.getPinnedCharts();
    const index = pinned.findIndex(p => p.chartId === chartId);
    if (index !== -1) {
      pinned[index] = { ...pinned[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.PINNED_CHARTS, JSON.stringify(pinned));
    }
  },

  reorderPinnedCharts(chartIds: string[]): void {
    const pinned = this.getPinnedCharts();
    const reordered = chartIds.map((id, index) => {
      const chart = pinned.find(p => p.chartId === id);
      if (chart) {
        return { ...chart, position: index };
      }
      return null;
    }).filter(Boolean) as PinnedChart[];
    
    localStorage.setItem(STORAGE_KEYS.PINNED_CHARTS, JSON.stringify(reordered));
  },

  // Preferences
  getPreferences(): ChartPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  updatePreferences(updates: Partial<ChartPreferences>): ChartPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  },

  // Recent Charts
  getRecentCharts(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_CHARTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addRecentChart(chartId: string): void {
    let recent = this.getRecentCharts();
    recent = recent.filter(id => id !== chartId);
    recent.unshift(chartId);
    recent = recent.slice(0, 10); // Keep last 10
    localStorage.setItem(STORAGE_KEYS.RECENT_CHARTS, JSON.stringify(recent));
  },

  // Utility
  generateChartId(): string {
    return `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  createCustomChart(
    name: string,
    nameEn: string,
    chartType: ChartType,
    metrics: DataMetric[],
    options: Partial<ChartConfig> = {}
  ): ChartConfig {
    return {
      id: this.generateChartId(),
      name,
      nameEn,
      chartType,
      metrics,
      timeRange: options.timeRange || '1Y',
      comparison: options.comparison || 'none',
      ...options,
    };
  },
};

export default chartFavoritesService;
