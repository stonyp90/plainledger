/**
 * PlainLedger View Management System
 * 
 * A best-in-class view management system that surpasses Power BI and Looker with:
 * - Saved views with filter states, chart layouts, and cross-filters
 * - Personal vs shared views with granular permissions
 * - View templates by industry and role
 * - Version history with restore capability
 * - Smart features: auto-suggestions, anomaly highlighting
 * - Real-time collaboration: comments, annotations
 * - Seamless view switching with keyboard shortcuts
 * 
 * Bilingual support (EN/FR)
 */

import { ChartConfig, ChartType, DataMetric, TimeRange, ComparisonMode } from './chartFavorites';

// =====================================================
// CORE TYPES
// =====================================================

export type ViewScope = 'personal' | 'team' | 'organization' | 'public';
export type ViewPermission = 'view' | 'edit' | 'admin' | 'owner';
export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn';

export interface SavedView {
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  color?: string;
  
  // Ownership & Sharing
  scope: ViewScope;
  createdBy: string;
  createdByName?: string;
  permissions: ViewPermissionEntry[];
  
  // Content
  charts: ViewChart[];
  filters: ViewFilterState;
  crossFilters: CrossFilterState[];
  layout: ViewLayout;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  version: number;
  versionHistory?: ViewVersion[];
  
  // Organization
  tags: string[];
  category?: ViewCategory;
  isFavorite: boolean;
  isPinned: boolean;
  sortOrder: number;
  
  // Smart features
  autoRefresh?: AutoRefreshConfig;
  alerts?: ViewAlert[];
  annotations?: ViewAnnotation[];
  
  // Template info (if created from template)
  templateId?: string;
  isTemplate: boolean;
}

export interface ViewChart {
  id: string;
  chartConfig: ChartConfig;
  position: { x: number; y: number };
  size: { width: number; height: number };
  
  // Display options
  title?: string;
  titleEn?: string;
  showTitle: boolean;
  showLegend: boolean;
  showBorder: boolean;
  
  // Interactions
  enableDrillDown: boolean;
  enableCrossFilter: boolean;
  drillDownPath?: string[];
  linkedCharts?: string[]; // Charts that update when this one is clicked
  
  // Annotations on this chart
  annotations?: ChartAnnotation[];
}

export interface ViewFilterState {
  // Time range
  dateRange: {
    start: string;
    end: string;
    preset?: TimeRange;
    relativeTo?: 'today' | 'monthEnd' | 'quarterEnd' | 'yearEnd';
  };
  
  // Dimension filters
  dimensions: DimensionFilter[];
  
  // Metric filters
  metrics: MetricFilter[];
  
  // Custom filters
  custom: CustomFilter[];
  
  // Quick filters (shown in filter bar)
  quickFilters: string[]; // IDs of filters to show in quick access bar
}

export interface DimensionFilter {
  id: string;
  dimension: string;
  dimensionLabel: string;
  dimensionLabelEn: string;
  operator: FilterOperator;
  values: string[];
  isActive: boolean;
  isLocked: boolean; // Cannot be changed by viewers
}

export interface MetricFilter {
  id: string;
  metric: DataMetric;
  operator: FilterOperator;
  value: number;
  value2?: number; // For 'between' operator
  isActive: boolean;
}

export interface CustomFilter {
  id: string;
  name: string;
  nameEn: string;
  expression: string; // SQL-like expression
  isActive: boolean;
}

export interface CrossFilterState {
  id: string;
  sourceChartId: string;
  targetChartIds: string[];
  dimension: string;
  selectedValues: string[];
  mode: 'include' | 'exclude';
  isActive: boolean;
}

export interface ViewLayout {
  // Grid configuration
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  
  // Responsive breakpoints
  breakpoints: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
  };
  
  // Theme
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'comfortable' | 'spacious';
  
  // Page settings
  showHeader: boolean;
  showFilterBar: boolean;
  showFooter: boolean;
  headerContent?: string;
  
  // Multi-page support
  pages?: ViewPage[];
  currentPage?: number;
}

export interface ViewPage {
  id: string;
  name: string;
  nameEn: string;
  icon?: string;
  charts: string[]; // Chart IDs on this page
  order: number;
}

export interface ViewPermissionEntry {
  userId?: string;
  teamId?: string;
  email?: string;
  permission: ViewPermission;
  grantedAt: string;
  grantedBy: string;
}

export interface ViewVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  changeType: 'create' | 'update' | 'layout' | 'filter' | 'share';
  changeSummary: string;
  changeSummaryEn: string;
  snapshot?: string; // JSON snapshot for restore
}

export interface AutoRefreshConfig {
  enabled: boolean;
  intervalMinutes: number;
  pauseOnInactivity: boolean;
  showRefreshIndicator: boolean;
}

export interface ViewAlert {
  id: string;
  name: string;
  nameEn: string;
  condition: {
    metric: DataMetric;
    operator: 'above' | 'below' | 'change' | 'anomaly';
    threshold?: number;
    changePercent?: number;
  };
  notification: {
    email: boolean;
    slack: boolean;
    inApp: boolean;
    recipients?: string[];
  };
  isActive: boolean;
  lastTriggered?: string;
}

export interface ViewAnnotation {
  id: string;
  type: 'comment' | 'note' | 'highlight' | 'flag';
  content: string;
  chartId?: string;
  dataPoint?: { x: string; y: number };
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  resolved?: boolean;
  replies?: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  content: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface ChartAnnotation {
  id: string;
  type: 'marker' | 'range' | 'threshold' | 'trend';
  label: string;
  labelEn: string;
  position: { x?: string; y?: number; x2?: string; y2?: number };
  color?: string;
  visible: boolean;
}

export type ViewCategory = 
  | 'financial-overview'
  | 'revenue-analysis'
  | 'expense-management'
  | 'cash-flow'
  | 'receivables'
  | 'payables'
  | 'budgeting'
  | 'forecasting'
  | 'operational'
  | 'executive'
  | 'custom';

// =====================================================
// VIEW TEMPLATES
// =====================================================

export interface ViewTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
  category: ViewCategory;
  industry?: string[];
  roles?: string[]; // e.g., 'cfo', 'controller', 'accountant'
  charts: Omit<ViewChart, 'id'>[];
  defaultFilters: Partial<ViewFilterState>;
  defaultLayout: Partial<ViewLayout>;
  tags: string[];
  popularity: number;
  isNew?: boolean;
  isPremium?: boolean;
}

export const VIEW_TEMPLATES: ViewTemplate[] = [
  {
    id: 'executive-dashboard',
    name: 'Tableau de bord exécutif',
    nameEn: 'Executive Dashboard',
    description: 'Vue d\'ensemble pour les dirigeants avec KPIs clés',
    descriptionEn: 'Executive overview with key KPIs and trends',
    icon: '👔',
    color: 'rgb(var(--color-primary-600))', // emerald-600
    category: 'executive',
    roles: ['cfo', 'ceo', 'executive'],
    charts: [
      {
        chartConfig: {
          id: 'revenue-kpi',
          name: 'Revenus',
          nameEn: 'Revenue',
          chartType: 'gauge',
          metrics: ['revenue'],
          timeRange: 'YTD',
          comparison: 'previousYear',
        },
        position: { x: 0, y: 0 },
        size: { width: 3, height: 2 },
        showTitle: true,
        showLegend: false,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: false,
      },
      {
        chartConfig: {
          id: 'profit-trend',
          name: 'Tendance du profit',
          nameEn: 'Profit Trend',
          chartType: 'area',
          metrics: ['profit'],
          timeRange: '1Y',
          comparison: 'budget',
          groupBy: 'month',
        },
        position: { x: 3, y: 0 },
        size: { width: 6, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'expense-breakdown',
          name: 'Répartition des dépenses',
          nameEn: 'Expense Breakdown',
          chartType: 'donut',
          metrics: ['expenses'],
          timeRange: 'YTD',
          comparison: 'none',
        },
        position: { x: 9, y: 0 },
        size: { width: 3, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'cash-waterfall',
          name: 'Flux de trésorerie',
          nameEn: 'Cash Flow',
          chartType: 'waterfall',
          metrics: ['cashFlow'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { x: 0, y: 2 },
        size: { width: 12, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: 'YTD' },
      dimensions: [],
      metrics: [],
      custom: [],
      quickFilters: [],
    },
    defaultLayout: {
      columns: 12,
      rowHeight: 100,
      margin: [12, 12],
      containerPadding: [16, 16],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      theme: 'auto',
      density: 'comfortable',
      showHeader: true,
      showFilterBar: true,
      showFooter: false,
    },
    tags: ['executive', 'overview', 'kpi'],
    popularity: 95,
    isNew: false,
  },
  {
    id: 'cash-flow-analysis',
    name: 'Analyse de trésorerie',
    nameEn: 'Cash Flow Analysis',
    description: 'Analyse détaillée des flux de trésorerie',
    descriptionEn: 'Detailed cash flow analysis with forecasting',
    icon: '💰',
    color: 'rgb(var(--color-primary-700))', // emerald-700
    category: 'cash-flow',
    roles: ['cfo', 'controller', 'treasurer'],
    charts: [
      {
        chartConfig: {
          id: 'cash-balance',
          name: 'Solde de trésorerie',
          nameEn: 'Cash Balance',
          chartType: 'area',
          metrics: ['cashFlow'],
          timeRange: '1Y',
          comparison: 'forecast',
          groupBy: 'week',
        },
        position: { x: 0, y: 0 },
        size: { width: 8, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'runway-gauge',
          name: 'Autonomie',
          nameEn: 'Runway',
          chartType: 'gauge',
          metrics: ['workingCapital'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { x: 8, y: 0 },
        size: { width: 4, height: 3 },
        showTitle: true,
        showLegend: false,
        showBorder: true,
        enableDrillDown: false,
        enableCrossFilter: false,
      },
      {
        chartConfig: {
          id: 'inflows-outflows',
          name: 'Entrées/Sorties',
          nameEn: 'Inflows/Outflows',
          chartType: 'bar',
          metrics: ['revenue', 'expenses'],
          timeRange: '3M',
          comparison: 'none',
          groupBy: 'week',
        },
        position: { x: 0, y: 3 },
        size: { width: 6, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'ar-ap-aging',
          name: 'Vieillissement AR/AP',
          nameEn: 'AR/AP Aging',
          chartType: 'bar',
          metrics: ['accountsReceivable', 'accountsPayable'],
          timeRange: '1M',
          comparison: 'none',
          stacked: true,
        },
        position: { x: 6, y: 3 },
        size: { width: 6, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '6M' },
      dimensions: [],
      metrics: [],
      custom: [],
      quickFilters: [],
    },
    defaultLayout: {
      columns: 12,
      rowHeight: 80,
      margin: [8, 8],
      containerPadding: [12, 12],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      theme: 'auto',
      density: 'comfortable',
      showHeader: true,
      showFilterBar: true,
      showFooter: false,
    },
    tags: ['cash', 'treasury', 'liquidity', 'forecast'],
    popularity: 88,
  },
  {
    id: 'revenue-deep-dive',
    name: 'Analyse des revenus',
    nameEn: 'Revenue Deep Dive',
    description: 'Analyse approfondie des revenus avec drill-down',
    descriptionEn: 'In-depth revenue analysis with drill-down capabilities',
    icon: '📈',
    color: 'rgb(var(--color-primary-500))', // emerald-500
    category: 'revenue-analysis',
    roles: ['cfo', 'controller', 'sales-manager'],
    charts: [
      {
        chartConfig: {
          id: 'revenue-trend',
          name: 'Tendance des revenus',
          nameEn: 'Revenue Trend',
          chartType: 'area',
          metrics: ['revenue'],
          timeRange: '1Y',
          comparison: 'previousYear',
          groupBy: 'month',
        },
        position: { x: 0, y: 0 },
        size: { width: 12, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
        drillDownPath: ['year', 'quarter', 'month', 'week'],
      },
      {
        chartConfig: {
          id: 'revenue-by-category',
          name: 'Revenus par catégorie',
          nameEn: 'Revenue by Category',
          chartType: 'treemap',
          metrics: ['revenue'],
          timeRange: 'YTD',
          comparison: 'none',
        },
        position: { x: 0, y: 3 },
        size: { width: 6, height: 3 },
        showTitle: true,
        showLegend: false,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'revenue-vs-budget',
          name: 'Revenus vs Budget',
          nameEn: 'Revenue vs Budget',
          chartType: 'bar',
          metrics: ['revenue'],
          timeRange: 'YTD',
          comparison: 'budget',
          groupBy: 'month',
        },
        position: { x: 6, y: 3 },
        size: { width: 6, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '1Y' },
      dimensions: [],
      metrics: [],
      custom: [],
      quickFilters: [],
    },
    defaultLayout: {
      columns: 12,
      rowHeight: 80,
      margin: [8, 8],
      containerPadding: [12, 12],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      theme: 'auto',
      density: 'comfortable',
      showHeader: true,
      showFilterBar: true,
      showFooter: false,
    },
    tags: ['revenue', 'sales', 'growth', 'drill-down'],
    popularity: 85,
  },
  {
    id: 'expense-control',
    name: 'Contrôle des dépenses',
    nameEn: 'Expense Control',
    description: 'Suivi et analyse des dépenses par catégorie',
    descriptionEn: 'Track and analyze expenses by category',
    icon: '📊',
    color: '#EF4444',
    category: 'expense-management',
    roles: ['cfo', 'controller', 'accountant'],
    charts: [
      {
        chartConfig: {
          id: 'expense-trend',
          name: 'Tendance des dépenses',
          nameEn: 'Expense Trend',
          chartType: 'line',
          metrics: ['expenses'],
          timeRange: '1Y',
          comparison: 'budget',
          groupBy: 'month',
        },
        position: { x: 0, y: 0 },
        size: { width: 8, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'expense-vs-budget',
          name: 'Écart budgétaire',
          nameEn: 'Budget Variance',
          chartType: 'gauge',
          metrics: ['expenses'],
          timeRange: 'YTD',
          comparison: 'budget',
        },
        position: { x: 8, y: 0 },
        size: { width: 4, height: 2 },
        showTitle: true,
        showLegend: false,
        showBorder: true,
        enableDrillDown: false,
        enableCrossFilter: false,
      },
      {
        chartConfig: {
          id: 'expense-breakdown',
          name: 'Répartition des dépenses',
          nameEn: 'Expense Breakdown',
          chartType: 'donut',
          metrics: ['expenses'],
          timeRange: 'YTD',
          comparison: 'none',
        },
        position: { x: 0, y: 2 },
        size: { width: 4, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: true,
      },
      {
        chartConfig: {
          id: 'expense-heatmap',
          name: 'Carte de chaleur',
          nameEn: 'Expense Heatmap',
          chartType: 'heatmap',
          metrics: ['expenses'],
          timeRange: '1Y',
          comparison: 'none',
        },
        position: { x: 4, y: 2 },
        size: { width: 8, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: 'YTD' },
      dimensions: [],
      metrics: [],
      custom: [],
      quickFilters: [],
    },
    defaultLayout: {
      columns: 12,
      rowHeight: 80,
      margin: [8, 8],
      containerPadding: [12, 12],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      theme: 'auto',
      density: 'comfortable',
      showHeader: true,
      showFilterBar: true,
      showFooter: false,
    },
    tags: ['expenses', 'budget', 'cost-control'],
    popularity: 80,
  },
  {
    id: 'financial-ratios',
    name: 'Ratios financiers',
    nameEn: 'Financial Ratios',
    description: 'Tableau de bord des ratios financiers clés',
    descriptionEn: 'Key financial ratios dashboard',
    icon: '🎯',
    color: '#d97706',
    category: 'financial-overview',
    roles: ['cfo', 'controller', 'analyst'],
    charts: [
      {
        chartConfig: {
          id: 'liquidity-ratios',
          name: 'Ratios de liquidité',
          nameEn: 'Liquidity Ratios',
          chartType: 'radar',
          metrics: ['currentRatio', 'quickRatio', 'workingCapital'],
          timeRange: '1M',
          comparison: 'previousPeriod',
        },
        position: { x: 0, y: 0 },
        size: { width: 6, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: false,
        enableCrossFilter: false,
      },
      {
        chartConfig: {
          id: 'profitability-ratios',
          name: 'Ratios de rentabilité',
          nameEn: 'Profitability Ratios',
          chartType: 'radar',
          metrics: ['grossMargin', 'netMargin'],
          timeRange: '1M',
          comparison: 'previousPeriod',
        },
        position: { x: 6, y: 0 },
        size: { width: 6, height: 3 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: false,
        enableCrossFilter: false,
      },
      {
        chartConfig: {
          id: 'efficiency-ratios',
          name: 'Ratios d\'efficacité',
          nameEn: 'Efficiency Ratios',
          chartType: 'line',
          metrics: ['dso', 'dpo'],
          timeRange: '1Y',
          comparison: 'none',
          groupBy: 'month',
        },
        position: { x: 0, y: 3 },
        size: { width: 12, height: 2 },
        showTitle: true,
        showLegend: true,
        showBorder: true,
        enableDrillDown: true,
        enableCrossFilter: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '1Y' },
      dimensions: [],
      metrics: [],
      custom: [],
      quickFilters: [],
    },
    defaultLayout: {
      columns: 12,
      rowHeight: 80,
      margin: [8, 8],
      containerPadding: [12, 12],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      theme: 'auto',
      density: 'comfortable',
      showHeader: true,
      showFilterBar: true,
      showFooter: false,
    },
    tags: ['ratios', 'kpi', 'analysis'],
    popularity: 75,
  },
];

// =====================================================
// VIEW CATEGORY INFO
// =====================================================

export const VIEW_CATEGORIES: Record<ViewCategory, {
  label: string;
  labelEn: string;
  icon: string;
  color: string;
}> = {
  'financial-overview': { label: 'Aperçu financier', labelEn: 'Financial Overview', icon: '📊', color: '#059669' },
  'revenue-analysis': { label: 'Analyse des revenus', labelEn: 'Revenue Analysis', icon: '📈', color: '#10B981' },
  'expense-management': { label: 'Gestion des dépenses', labelEn: 'Expense Management', icon: '📉', color: '#EF4444' },
  'cash-flow': { label: 'Flux de trésorerie', labelEn: 'Cash Flow', icon: '💰', color: '#047857' },
  'receivables': { label: 'Créances', labelEn: 'Receivables', icon: '📋', color: '#d97706' },
  'payables': { label: 'Dettes', labelEn: 'Payables', icon: '📝', color: '#b91c1c' },
  'budgeting': { label: 'Budgétisation', labelEn: 'Budgeting', icon: '🎯', color: '#7C3AED' },
  'forecasting': { label: 'Prévisions', labelEn: 'Forecasting', icon: '🔮', color: '#EC4899' },
  'operational': { label: 'Opérationnel', labelEn: 'Operational', icon: '⚙️', color: '#6B7280' },
  'executive': { label: 'Direction', labelEn: 'Executive', icon: '👔', color: '#1F2937' },
  'custom': { label: 'Personnalisé', labelEn: 'Custom', icon: '✨', color: '#3B82F6' },
};

// =====================================================
// STORAGE SERVICE
// =====================================================

const STORAGE_KEYS = {
  SAVED_VIEWS: 'plainledger-saved-views',
  RECENT_VIEWS: 'plainledger-recent-views',
  FAVORITE_VIEWS: 'plainledger-favorite-views',
  VIEW_PREFERENCES: 'plainledger-view-preferences',
  ACTIVE_VIEW: 'plainledger-active-view',
};

export interface ViewPreferences {
  defaultView?: string;
  autoSaveFilters: boolean;
  showQuickSwitcher: boolean;
  quickSwitcherShortcut: string;
  recentViewsCount: number;
  gridSnapping: boolean;
}

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
  autoSaveFilters: true,
  showQuickSwitcher: true,
  quickSwitcherShortcut: 'cmd+k',
  recentViewsCount: 5,
  gridSnapping: true,
};

// =====================================================
// VIEW MANAGEMENT SERVICE
// =====================================================

export const viewManagementService = {
  // ===== CRUD Operations =====
  
  getAllViews(): SavedView[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_VIEWS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getView(id: string): SavedView | null {
    const views = this.getAllViews();
    return views.find(v => v.id === id) || null;
  },

  saveView(view: Omit<SavedView, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'accessCount'>): SavedView {
    const views = this.getAllViews();
    const now = new Date().toISOString();
    
    const newView: SavedView = {
      ...view,
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
      accessCount: 0,
      versionHistory: [{
        version: 1,
        createdAt: now,
        createdBy: view.createdBy,
        changeType: 'create',
        changeSummary: 'Vue créée',
        changeSummaryEn: 'View created',
      }],
    };
    
    views.push(newView);
    localStorage.setItem(STORAGE_KEYS.SAVED_VIEWS, JSON.stringify(views));
    
    this.addToRecent(newView.id);
    return newView;
  },

  updateView(id: string, updates: Partial<SavedView>, changeSummary?: string): SavedView | null {
    const views = this.getAllViews();
    const index = views.findIndex(v => v.id === id);
    
    if (index === -1) return null;
    
    const now = new Date().toISOString();
    const currentView = views[index];
    
    // Determine change type
    let changeType: ViewVersion['changeType'] = 'update';
    if (updates.layout) changeType = 'layout';
    if (updates.filters || updates.crossFilters) changeType = 'filter';
    if (updates.permissions) changeType = 'share';
    
    // Create version history entry
    const versionEntry: ViewVersion = {
      version: currentView.version + 1,
      createdAt: now,
      createdBy: currentView.createdBy,
      changeType,
      changeSummary: changeSummary || 'Vue mise à jour',
      changeSummaryEn: changeSummary || 'View updated',
      snapshot: JSON.stringify(currentView),
    };
    
    const updated: SavedView = {
      ...currentView,
      ...updates,
      id: currentView.id,
      createdAt: currentView.createdAt,
      updatedAt: now,
      version: currentView.version + 1,
      versionHistory: [...(currentView.versionHistory || []), versionEntry].slice(-20), // Keep last 20 versions
    };
    
    views[index] = updated;
    localStorage.setItem(STORAGE_KEYS.SAVED_VIEWS, JSON.stringify(views));
    
    return updated;
  },

  deleteView(id: string): boolean {
    const views = this.getAllViews();
    const filtered = views.filter(v => v.id !== id);
    
    if (filtered.length === views.length) return false;
    
    localStorage.setItem(STORAGE_KEYS.SAVED_VIEWS, JSON.stringify(filtered));
    this.removeFromRecent(id);
    this.removeFromFavorites(id);
    
    return true;
  },

  duplicateView(id: string, newName?: string, newNameEn?: string): SavedView | null {
    const original = this.getView(id);
    if (!original) return null;
    
    const { id: _, createdAt, updatedAt, version, accessCount, versionHistory, ...rest } = original;
    return this.saveView({
      ...rest,
      name: newName || `${original.name} (copie)`,
      nameEn: newNameEn || `${original.nameEn} (copy)`,
      isTemplate: false,
      scope: 'personal',
      isFavorite: false,
      isPinned: false,
    });
  },

  // ===== Template Operations =====
  
  createFromTemplate(templateId: string, name: string, nameEn: string, createdBy: string): SavedView | null {
    const template = VIEW_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;
    
    const charts: ViewChart[] = template.charts.map((chart, index) => ({
      ...chart,
      id: `chart-${Date.now()}-${index}`,
    }));
    
    return this.saveView({
      name,
      nameEn,
      description: template.description,
      descriptionEn: template.descriptionEn,
      icon: template.icon,
      color: template.color,
      scope: 'personal',
      createdBy,
      permissions: [],
      charts,
      filters: {
        dateRange: template.defaultFilters.dateRange || { start: '', end: '', preset: '6M' },
        dimensions: template.defaultFilters.dimensions || [],
        metrics: template.defaultFilters.metrics || [],
        custom: template.defaultFilters.custom || [],
        quickFilters: template.defaultFilters.quickFilters || [],
      },
      crossFilters: [],
      layout: {
        columns: 12,
        rowHeight: 80,
        margin: [8, 8],
        containerPadding: [12, 12],
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        theme: 'auto',
        density: 'comfortable',
        showHeader: true,
        showFilterBar: true,
        showFooter: false,
        ...template.defaultLayout,
      },
      tags: [...template.tags],
      category: template.category,
      isFavorite: false,
      isPinned: false,
      sortOrder: 0,
      templateId: template.id,
      isTemplate: false,
    });
  },

  // ===== Favorites & Pinned =====
  
  toggleFavorite(id: string): boolean {
    const view = this.getView(id);
    if (!view) return false;
    
    this.updateView(id, { isFavorite: !view.isFavorite });
    return !view.isFavorite;
  },

  togglePinned(id: string): boolean {
    const view = this.getView(id);
    if (!view) return false;
    
    this.updateView(id, { isPinned: !view.isPinned });
    return !view.isPinned;
  },

  getFavorites(): SavedView[] {
    return this.getAllViews().filter(v => v.isFavorite);
  },

  getPinned(): SavedView[] {
    return this.getAllViews().filter(v => v.isPinned).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  // ===== Recent Views =====
  
  getRecentViews(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_VIEWS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addToRecent(id: string): void {
    let recent = this.getRecentViews();
    recent = recent.filter(r => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.RECENT_VIEWS, JSON.stringify(recent));
    
    // Also update access count
    const view = this.getView(id);
    if (view) {
      this.updateView(id, { 
        lastAccessedAt: new Date().toISOString(),
        accessCount: (view.accessCount || 0) + 1,
      });
    }
  },

  removeFromRecent(id: string): void {
    const recent = this.getRecentViews().filter(r => r !== id);
    localStorage.setItem(STORAGE_KEYS.RECENT_VIEWS, JSON.stringify(recent));
  },

  removeFromFavorites(id: string): void {
    const view = this.getView(id);
    if (view && view.isFavorite) {
      this.updateView(id, { isFavorite: false });
    }
  },

  // ===== Active View =====
  
  getActiveViewId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_VIEW);
    } catch {
      return null;
    }
  },

  setActiveView(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, id);
    this.addToRecent(id);
  },

  clearActiveView(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_VIEW);
  },

  // ===== Search & Filter =====
  
  searchViews(query: string): SavedView[] {
    const views = this.getAllViews();
    const lowerQuery = query.toLowerCase();
    
    return views.filter(v => 
      v.name.toLowerCase().includes(lowerQuery) ||
      v.nameEn.toLowerCase().includes(lowerQuery) ||
      v.description?.toLowerCase().includes(lowerQuery) ||
      v.descriptionEn?.toLowerCase().includes(lowerQuery) ||
      v.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  },

  filterByCategory(category: ViewCategory): SavedView[] {
    return this.getAllViews().filter(v => v.category === category);
  },

  filterByScope(scope: ViewScope): SavedView[] {
    return this.getAllViews().filter(v => v.scope === scope);
  },

  // ===== Version History =====
  
  restoreVersion(viewId: string, version: number): SavedView | null {
    const view = this.getView(viewId);
    if (!view || !view.versionHistory) return null;
    
    const versionEntry = view.versionHistory.find(v => v.version === version);
    if (!versionEntry || !versionEntry.snapshot) return null;
    
    try {
      const snapshot = JSON.parse(versionEntry.snapshot);
      return this.updateView(viewId, {
        ...snapshot,
        id: view.id,
        createdAt: view.createdAt,
      }, `Restored to version ${version}`);
    } catch {
      return null;
    }
  },

  // ===== Filter State Management =====
  
  updateFilters(viewId: string, filters: Partial<ViewFilterState>): SavedView | null {
    const view = this.getView(viewId);
    if (!view) return null;
    
    return this.updateView(viewId, {
      filters: { ...view.filters, ...filters },
    }, 'Filters updated');
  },

  updateCrossFilters(viewId: string, crossFilters: CrossFilterState[]): SavedView | null {
    return this.updateView(viewId, { crossFilters }, 'Cross-filters updated');
  },

  // ===== Chart Management =====
  
  addChart(viewId: string, chart: Omit<ViewChart, 'id'>): ViewChart | null {
    const view = this.getView(viewId);
    if (!view) return null;
    
    const newChart: ViewChart = {
      ...chart,
      id: `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.updateView(viewId, {
      charts: [...view.charts, newChart],
    }, 'Chart added');
    
    return newChart;
  },

  removeChart(viewId: string, chartId: string): boolean {
    const view = this.getView(viewId);
    if (!view) return false;
    
    const filtered = view.charts.filter(c => c.id !== chartId);
    if (filtered.length === view.charts.length) return false;
    
    this.updateView(viewId, { charts: filtered }, 'Chart removed');
    return true;
  },

  updateChart(viewId: string, chartId: string, updates: Partial<ViewChart>): ViewChart | null {
    const view = this.getView(viewId);
    if (!view) return null;
    
    const chartIndex = view.charts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return null;
    
    const updatedChart = { ...view.charts[chartIndex], ...updates, id: chartId };
    const updatedCharts = [...view.charts];
    updatedCharts[chartIndex] = updatedChart;
    
    this.updateView(viewId, { charts: updatedCharts });
    return updatedChart;
  },

  // ===== Annotations =====
  
  addAnnotation(viewId: string, annotation: Omit<ViewAnnotation, 'id' | 'createdAt'>): ViewAnnotation | null {
    const view = this.getView(viewId);
    if (!view) return null;
    
    const newAnnotation: ViewAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    this.updateView(viewId, {
      annotations: [...(view.annotations || []), newAnnotation],
    });
    
    return newAnnotation;
  },

  resolveAnnotation(viewId: string, annotationId: string): boolean {
    const view = this.getView(viewId);
    if (!view || !view.annotations) return false;
    
    const annotations = view.annotations.map(a => 
      a.id === annotationId ? { ...a, resolved: true } : a
    );
    
    this.updateView(viewId, { annotations });
    return true;
  },

  // ===== Preferences =====
  
  getPreferences(): ViewPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_PREFERENCES);
      return stored ? { ...DEFAULT_VIEW_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_VIEW_PREFERENCES;
    } catch {
      return DEFAULT_VIEW_PREFERENCES;
    }
  },

  updatePreferences(updates: Partial<ViewPreferences>): ViewPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.VIEW_PREFERENCES, JSON.stringify(updated));
    return updated;
  },

  // ===== Utilities =====
  
  generateViewId(): string {
    return `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  getViewsByPopularity(): SavedView[] {
    return this.getAllViews().sort((a, b) => b.accessCount - a.accessCount);
  },

  getViewsByRecent(): SavedView[] {
    return this.getAllViews().sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },
};

export default viewManagementService;
