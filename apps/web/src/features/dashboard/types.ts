/**
 * Dashboard Feature - Types
 * 
 * Type definitions for dashboard data.
 */

import type { FinancialMetrics, TrendDataset, WaterfallDataPoint } from '../reports/types';

// ============================================================================
// AGING DATA
// ============================================================================

export interface AgingBucket {
  label: string;
  labelEn: string;
  amount: number;
  count: number;
  percentage: number;
}

// ============================================================================
// BANK RECONCILIATION
// ============================================================================

export interface BankReconciliation {
  accountName: string;
  accountNumber: string;
  bookBalance: number;
  bankBalance: number;
  difference: number;
  outstandingDeposits: number;
  outstandingChecks: number;
  lastReconciled: string;
  status: 'reconciled' | 'pending' | 'discrepancy';
}

// ============================================================================
// BUDGET
// ============================================================================

export interface BudgetComparison {
  category: string;
  categoryEn: string;
  actual: number;
  budget: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
}

// ============================================================================
// DEADLINES
// ============================================================================

export interface AccountingDeadline {
  id: string;
  title: string;
  titleEn: string;
  dueDate: string;
  type: 'tax' | 'filing' | 'payment' | 'audit' | 'report';
  status: 'upcoming' | 'overdue' | 'completed';
  description?: string;
}

// ============================================================================
// TRIAL BALANCE
// ============================================================================

export interface TrialBalanceSummary {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  entries: {
    code: string;
    name: string;
    nameEn: string;
    debit: number;
    credit: number;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  }[];
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

export interface DashboardSummary {
  revenue: {
    current: number;
    prior: number;
    budget: number;
    ytd: number;
    ytdPrior: number;
    ytdBudget: number;
    varianceTobudget: number;
  };
  expenses: {
    current: number;
    prior: number;
    budget: number;
    ytd: number;
    ytdBudget: number;
  };
  netIncome: {
    current: number;
    prior: number;
    ytd: number;
    ytdPrior: number;
  };
  cash: {
    current: number;
    prior: number;
    runway: number;
    burnRate: number;
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    net: number;
    freeCashFlow: number;
  };
  receivables: {
    current: number;
    prior: number;
    aging: AgingBucket[];
    totalOverdue: number;
    averageDaysOutstanding: number;
  };
  payables: {
    current: number;
    prior: number;
    aging: AgingBucket[];
    totalOverdue: number;
    averageDaysPayable: number;
  };
  bankAccounts: BankReconciliation[];
  budgetComparisons: BudgetComparison[];
  upcomingDeadlines: AccountingDeadline[];
  trialBalance: TrialBalanceSummary;
}

// ============================================================================
// DASHBOARD DATA RESPONSE
// ============================================================================

export interface DashboardData {
  summary: DashboardSummary;
  metrics: FinancialMetrics;
  trends: {
    revenue: TrendDataset;
    expenses: TrendDataset;
    cashFlow: TrendDataset;
    profit: TrendDataset;
  };
  cashFlowWaterfall: WaterfallDataPoint[];
  lastUpdated: string;
  dataSource: string;
}
