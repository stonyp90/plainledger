/**
 * Reports Feature - Types
 * 
 * Type definitions for financial reports.
 */

import type { FinancialDataPoint } from '../../lib/anomalyDetection';

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

export interface AccountBalance {
  code: string;
  name: string;
  nameEn?: string;
  current: number;
  prior: number;
  budget?: number;
  priorYearBudget?: number;
  type: string;
  subType?: string;
  notes?: string;
}

// ============================================================================
// BALANCE SHEET
// ============================================================================

export interface BalanceSheetData {
  asOfDate: string;
  comparisonDate: string;
  currency: string;
  organizationId: string;
  organizationName: string;
  preparedBy?: string;
  approvedBy?: string;
  assets: {
    currentAssets: AccountBalance[];
    fixedAssets: AccountBalance[];
    otherAssets?: AccountBalance[];
  };
  liabilities: {
    currentLiabilities: AccountBalance[];
    longTermLiabilities: AccountBalance[];
  };
  equity: AccountBalance[];
}

// ============================================================================
// INCOME STATEMENT
// ============================================================================

export interface IncomeStatementData {
  periodStart: string;
  periodEnd: string;
  comparisonPeriodStart: string;
  comparisonPeriodEnd: string;
  currency: string;
  organizationId: string;
  revenue: AccountBalance[];
  costOfGoodsSold: AccountBalance[];
  operatingExpenses: AccountBalance[];
  otherIncome: AccountBalance[];
  otherExpenses: AccountBalance[];
}

// ============================================================================
// CASH FLOW
// ============================================================================

export interface CashFlowActivity {
  label: string;
  labelEn: string;
  value: number;
  category: 'inflow' | 'outflow';
}

export interface CashFlowData {
  period: string;
  periodEn: string;
  operatingActivities: CashFlowActivity[];
  investingActivities: CashFlowActivity[];
  financingActivities: CashFlowActivity[];
  openingCash: number;
  closingCash: number;
}

export interface WaterfallDataPoint {
  label: string;
  labelEn: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'subtotal' | 'end';
  category?: 'operations' | 'investing' | 'financing';
}

// ============================================================================
// TRIAL BALANCE
// ============================================================================

export interface TrialBalanceEntry {
  code: string;
  name: string;
  nameEn: string;
  debit: number;
  credit: number;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

// ============================================================================
// FINANCIAL METRICS
// ============================================================================

export interface FinancialMetrics {
  // Liquidity Ratios
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  
  // Profitability Ratios
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  
  // Leverage Ratios
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;
  
  // Efficiency Ratios
  receivablesTurnover: number;
  inventoryTurnover: number;
  assetTurnover: number;
  daysReceivable: number;
  daysInventory: number;
  daysPayable: number;
  cashConversionCycle: number;
  
  // Working Capital
  workingCapital: number;
  workingCapitalRatio: number;
}

// ============================================================================
// TREND DATA
// ============================================================================

export interface TrendDataset {
  label: string;
  labelEn: string;
  data: FinancialDataPoint[];
  budget?: number[];
  color?: string;
}

// ============================================================================
// REPORT RESPONSE
// ============================================================================

export interface ReportListItem {
  id: string;
  type: ReportType;
  name: string;
  createdAt: string;
  status: 'draft' | 'final' | 'archived';
  period: string;
}

export type ReportType = 
  | 'balance_sheet' 
  | 'income_statement' 
  | 'cash_flow' 
  | 'trial_balance'
  | 'custom';

export interface GenerateReportRequest {
  type: ReportType;
  period: string;
  options?: {
    includeComparison?: boolean;
    includeBudget?: boolean;
    format?: 'pdf' | 'xlsx' | 'csv';
  };
}
