/**
 * Report Management System
 * 
 * Allows users to:
 * - Save custom reports with configurations
 * - Create new reports from templates
 * - Delete/archive reports
 * - Share reports with team members
 * - Schedule automated report generation
 */

import { ChartConfig, ChartType, DataMetric, TimeRange, ComparisonMode } from './chartFavorites';

// =====================================================
// TYPES
// =====================================================

export interface SavedReport {
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  type: ReportType;
  charts: ReportChart[];
  filters: ReportFilters;
  layout: ReportLayout;
  schedule?: ReportSchedule;
  sharing?: ReportSharing;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isTemplate: boolean;
  isFavorite: boolean;
  tags: string[];
  version: number;
}

export interface ReportChart {
  id: string;
  chartConfig: ChartConfig;
  position: { row: number; col: number };
  size: { width: number; height: number };
  title?: string;
  showTitle: boolean;
  showLegend: boolean;
}

export interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
    preset?: TimeRange;
  };
  accounts?: string[];
  departments?: string[];
  projects?: string[];
  customFilters?: Record<string, string[]>;
}

export interface ReportLayout {
  columns: number;
  pageSize: 'A4' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  headerContent?: string;
  footerContent?: string;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm format
  timezone: string;
  recipients: string[];
  format: ('pdf' | 'excel' | 'csv')[];
  lastRun?: string;
  nextRun?: string;
}

export interface ReportSharing {
  isPublic: boolean;
  sharedWith: {
    userId: string;
    email: string;
    permission: 'view' | 'edit' | 'admin';
  }[];
  publicLink?: string;
  expiresAt?: string;
}

export type ReportType = 
  | 'financial-overview'
  | 'income-statement'
  | 'balance-sheet'
  | 'cash-flow'
  | 'budget-variance'
  | 'ar-aging'
  | 'ap-aging'
  | 'custom';

export interface ReportTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  type: ReportType;
  icon: string;
  charts: Omit<ReportChart, 'id'>[];
  defaultFilters: Partial<ReportFilters>;
  defaultLayout: Partial<ReportLayout>;
  tags: string[];
}

// =====================================================
// REPORT TEMPLATES
// =====================================================

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'template-financial-overview',
    name: 'Aperçu financier',
    nameEn: 'Financial Overview',
    description: 'Vue d\'ensemble des métriques financières clés',
    descriptionEn: 'Overview of key financial metrics',
    type: 'financial-overview',
    icon: '📊',
    charts: [
      {
        chartConfig: {
          id: 'revenue-trend',
          name: 'Tendance des revenus',
          nameEn: 'Revenue Trend',
          chartType: 'area',
          metrics: ['revenue'],
          timeRange: '6M',
          comparison: 'previousYear',
          groupBy: 'month',
        },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'expense-breakdown',
          name: 'Répartition des dépenses',
          nameEn: 'Expense Breakdown',
          chartType: 'donut',
          metrics: ['expenses'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { row: 0, col: 2 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'profit-margin',
          name: 'Marge bénéficiaire',
          nameEn: 'Profit Margin',
          chartType: 'gauge',
          metrics: ['netMargin'],
          timeRange: '1M',
          comparison: 'previousPeriod',
        },
        position: { row: 1, col: 0 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: false,
      },
      {
        chartConfig: {
          id: 'cash-flow',
          name: 'Flux de trésorerie',
          nameEn: 'Cash Flow',
          chartType: 'waterfall',
          metrics: ['cashFlow'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { row: 1, col: 1 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '6M' },
    },
    defaultLayout: {
      columns: 3,
      pageSize: 'A4',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
    },
    tags: ['overview', 'executive', 'monthly'],
  },
  {
    id: 'template-income-statement',
    name: 'État des résultats',
    nameEn: 'Income Statement',
    description: 'Rapport détaillé des revenus et dépenses',
    descriptionEn: 'Detailed revenue and expense report',
    type: 'income-statement',
    icon: '📈',
    charts: [
      {
        chartConfig: {
          id: 'revenue-by-month',
          name: 'Revenus mensuels',
          nameEn: 'Monthly Revenue',
          chartType: 'bar',
          metrics: ['revenue'],
          timeRange: '1Y',
          comparison: 'previousYear',
          groupBy: 'month',
        },
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
        showTitle: true,
        showLegend: true,
      },
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
        position: { row: 1, col: 0 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'profit-trend',
          name: 'Évolution du bénéfice',
          nameEn: 'Profit Trend',
          chartType: 'area',
          metrics: ['profit'],
          timeRange: '1Y',
          comparison: 'previousYear',
          groupBy: 'month',
        },
        position: { row: 1, col: 2 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '1Y' },
    },
    defaultLayout: {
      columns: 3,
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 25, right: 20, bottom: 25, left: 20 },
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
    },
    tags: ['income', 'expenses', 'profit', 'annual'],
  },
  {
    id: 'template-cash-flow',
    name: 'Flux de trésorerie',
    nameEn: 'Cash Flow Statement',
    description: 'Analyse détaillée des flux de trésorerie',
    descriptionEn: 'Detailed cash flow analysis',
    type: 'cash-flow',
    icon: '💰',
    charts: [
      {
        chartConfig: {
          id: 'cash-waterfall',
          name: 'Cascade de trésorerie',
          nameEn: 'Cash Waterfall',
          chartType: 'waterfall',
          metrics: ['cashFlow'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'cash-trend',
          name: 'Tendance de trésorerie',
          nameEn: 'Cash Trend',
          chartType: 'area',
          metrics: ['cashFlow'],
          timeRange: '1Y',
          comparison: 'forecast',
          groupBy: 'month',
        },
        position: { row: 1, col: 0 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'working-capital',
          name: 'Fonds de roulement',
          nameEn: 'Working Capital',
          chartType: 'gauge',
          metrics: ['workingCapital'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { row: 1, col: 2 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '1Y' },
    },
    defaultLayout: {
      columns: 3,
      pageSize: 'A4',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
    },
    tags: ['cash', 'liquidity', 'treasury'],
  },
  {
    id: 'template-ar-aging',
    name: 'Vieillissement des créances',
    nameEn: 'AR Aging Report',
    description: 'Analyse des comptes à recevoir par ancienneté',
    descriptionEn: 'Accounts receivable aging analysis',
    type: 'ar-aging',
    icon: '📋',
    charts: [
      {
        chartConfig: {
          id: 'ar-aging-bars',
          name: 'Vieillissement CR',
          nameEn: 'AR Aging',
          chartType: 'bar',
          metrics: ['accountsReceivable'],
          timeRange: '1M',
          comparison: 'none',
          stacked: true,
        },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'dso-trend',
          name: 'Tendance DSO',
          nameEn: 'DSO Trend',
          chartType: 'line',
          metrics: ['dso'],
          timeRange: '1Y',
          comparison: 'previousYear',
          groupBy: 'month',
        },
        position: { row: 0, col: 2 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: false,
      },
      {
        chartConfig: {
          id: 'ar-table',
          name: 'Détails CR',
          nameEn: 'AR Details',
          chartType: 'table',
          metrics: ['accountsReceivable'],
          timeRange: '1M',
          comparison: 'none',
        },
        position: { row: 1, col: 0 },
        size: { width: 3, height: 1 },
        showTitle: true,
        showLegend: false,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: '1M' },
    },
    defaultLayout: {
      columns: 3,
      pageSize: 'Letter',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
    },
    tags: ['receivables', 'aging', 'collections'],
  },
  {
    id: 'template-budget-variance',
    name: 'Écart budgétaire',
    nameEn: 'Budget Variance',
    description: 'Comparaison réel vs budget',
    descriptionEn: 'Actual vs budget comparison',
    type: 'budget-variance',
    icon: '🎯',
    charts: [
      {
        chartConfig: {
          id: 'revenue-variance',
          name: 'Écart revenus',
          nameEn: 'Revenue Variance',
          chartType: 'bar',
          metrics: ['revenue'],
          timeRange: 'YTD',
          comparison: 'budget',
          groupBy: 'month',
        },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 },
        showTitle: true,
        showLegend: true,
      },
      {
        chartConfig: {
          id: 'expense-variance',
          name: 'Écart dépenses',
          nameEn: 'Expense Variance',
          chartType: 'bar',
          metrics: ['expenses'],
          timeRange: 'YTD',
          comparison: 'budget',
          groupBy: 'month',
        },
        position: { row: 0, col: 2 },
        size: { width: 1, height: 1 },
        showTitle: true,
        showLegend: false,
      },
      {
        chartConfig: {
          id: 'variance-radar',
          name: 'Vue d\'ensemble',
          nameEn: 'Overview',
          chartType: 'radar',
          metrics: ['revenue', 'expenses', 'profit', 'grossMargin', 'netMargin'],
          timeRange: 'YTD',
          comparison: 'budget',
        },
        position: { row: 1, col: 0 },
        size: { width: 3, height: 1 },
        showTitle: true,
        showLegend: true,
      },
    ],
    defaultFilters: {
      dateRange: { start: '', end: '', preset: 'YTD' },
    },
    defaultLayout: {
      columns: 3,
      pageSize: 'A4',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
    },
    tags: ['budget', 'variance', 'planning'],
  },
];

// =====================================================
// STORAGE SERVICE
// =====================================================

const STORAGE_KEYS = {
  SAVED_REPORTS: 'plainledger-saved-reports',
  RECENT_REPORTS: 'plainledger-recent-reports',
  REPORT_PREFERENCES: 'plainledger-report-preferences',
};

export const reportManagementService = {
  // ===== CRUD Operations =====
  
  getAllReports(): SavedReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getReport(id: string): SavedReport | null {
    const reports = this.getAllReports();
    return reports.find(r => r.id === id) || null;
  },

  saveReport(report: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt' | 'version'>): SavedReport {
    const reports = this.getAllReports();
    const now = new Date().toISOString();
    
    const newReport: SavedReport = {
      ...report,
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    
    reports.push(newReport);
    localStorage.setItem(STORAGE_KEYS.SAVED_REPORTS, JSON.stringify(reports));
    
    this.addToRecent(newReport.id);
    return newReport;
  },

  updateReport(id: string, updates: Partial<SavedReport>): SavedReport | null {
    const reports = this.getAllReports();
    const index = reports.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    const updated: SavedReport = {
      ...reports[index],
      ...updates,
      id: reports[index].id, // Prevent ID change
      createdAt: reports[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
      version: reports[index].version + 1,
    };
    
    reports[index] = updated;
    localStorage.setItem(STORAGE_KEYS.SAVED_REPORTS, JSON.stringify(reports));
    
    return updated;
  },

  deleteReport(id: string): boolean {
    const reports = this.getAllReports();
    const filtered = reports.filter(r => r.id !== id);
    
    if (filtered.length === reports.length) return false;
    
    localStorage.setItem(STORAGE_KEYS.SAVED_REPORTS, JSON.stringify(filtered));
    this.removeFromRecent(id);
    return true;
  },

  duplicateReport(id: string, newName?: string): SavedReport | null {
    const original = this.getReport(id);
    if (!original) return null;
    
    const { id: _, createdAt, updatedAt, version, ...rest } = original;
    return this.saveReport({
      ...rest,
      name: newName || `${original.name} (copie)`,
      nameEn: newName || `${original.nameEn} (copy)`,
      isTemplate: false,
    });
  },

  // ===== Template Operations =====
  
  createFromTemplate(templateId: string, name: string, nameEn: string): SavedReport | null {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;
    
    const charts: ReportChart[] = template.charts.map((chart, index) => ({
      ...chart,
      id: `chart-${Date.now()}-${index}`,
    }));
    
    return this.saveReport({
      name,
      nameEn,
      description: template.description,
      descriptionEn: template.descriptionEn,
      type: template.type,
      charts,
      filters: {
        dateRange: template.defaultFilters.dateRange || { start: '', end: '', preset: '6M' },
        ...template.defaultFilters,
      },
      layout: {
        columns: 3,
        pageSize: 'A4',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        showHeader: true,
        showFooter: true,
        showPageNumbers: true,
        ...template.defaultLayout,
      },
      createdBy: 'current-user', // Would come from auth context
      isTemplate: false,
      isFavorite: false,
      tags: [...template.tags],
    });
  },

  // ===== Favorites =====
  
  toggleFavorite(id: string): boolean {
    const report = this.getReport(id);
    if (!report) return false;
    
    this.updateReport(id, { isFavorite: !report.isFavorite });
    return !report.isFavorite;
  },

  getFavorites(): SavedReport[] {
    return this.getAllReports().filter(r => r.isFavorite);
  },

  // ===== Recent Reports =====
  
  getRecentReports(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addToRecent(id: string): void {
    let recent = this.getRecentReports();
    recent = recent.filter(r => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.RECENT_REPORTS, JSON.stringify(recent));
  },

  removeFromRecent(id: string): void {
    const recent = this.getRecentReports().filter(r => r !== id);
    localStorage.setItem(STORAGE_KEYS.RECENT_REPORTS, JSON.stringify(recent));
  },

  // ===== Search & Filter =====
  
  searchReports(query: string): SavedReport[] {
    const reports = this.getAllReports();
    const lowerQuery = query.toLowerCase();
    
    return reports.filter(r => 
      r.name.toLowerCase().includes(lowerQuery) ||
      r.nameEn.toLowerCase().includes(lowerQuery) ||
      r.description?.toLowerCase().includes(lowerQuery) ||
      r.descriptionEn?.toLowerCase().includes(lowerQuery) ||
      r.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  },

  filterByType(type: ReportType): SavedReport[] {
    return this.getAllReports().filter(r => r.type === type);
  },

  filterByTags(tags: string[]): SavedReport[] {
    return this.getAllReports().filter(r => 
      tags.some(tag => r.tags.includes(tag))
    );
  },

  // ===== Export =====
  
  exportReport(id: string, format: 'json' | 'pdf' | 'excel'): Blob | null {
    const report = this.getReport(id);
    if (!report) return null;
    
    if (format === 'json') {
      return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    }
    
    // PDF and Excel would require additional libraries
    // This is a placeholder for the actual implementation
    console.log(`Exporting report ${id} as ${format}`);
    return null;
  },

  importReport(json: string): SavedReport | null {
    try {
      const data = JSON.parse(json);
      const { id, createdAt, updatedAt, version, ...rest } = data;
      return this.saveReport(rest);
    } catch {
      return null;
    }
  },

  // ===== Charts Management =====
  
  addChartToReport(reportId: string, chart: Omit<ReportChart, 'id'>): ReportChart | null {
    const report = this.getReport(reportId);
    if (!report) return null;
    
    const newChart: ReportChart = {
      ...chart,
      id: `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.updateReport(reportId, {
      charts: [...report.charts, newChart],
    });
    
    return newChart;
  },

  removeChartFromReport(reportId: string, chartId: string): boolean {
    const report = this.getReport(reportId);
    if (!report) return false;
    
    const filtered = report.charts.filter(c => c.id !== chartId);
    if (filtered.length === report.charts.length) return false;
    
    this.updateReport(reportId, { charts: filtered });
    return true;
  },

  updateChartInReport(reportId: string, chartId: string, updates: Partial<ReportChart>): ReportChart | null {
    const report = this.getReport(reportId);
    if (!report) return null;
    
    const chartIndex = report.charts.findIndex(c => c.id === chartId);
    if (chartIndex === -1) return null;
    
    const updatedChart = { ...report.charts[chartIndex], ...updates, id: chartId };
    const updatedCharts = [...report.charts];
    updatedCharts[chartIndex] = updatedChart;
    
    this.updateReport(reportId, { charts: updatedCharts });
    return updatedChart;
  },
};

export default reportManagementService;
