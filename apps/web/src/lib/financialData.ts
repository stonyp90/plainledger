/**
 * PlainLedger Financial Data Service
 * 
 * This module provides a centralized data layer for all financial information.
 * Currently uses mock data for development, but is designed to be easily
 * connected to real accounting systems (QuickBooks, Xero, Sage, etc.)
 * 
 * For accountants, this ensures:
 * - Consistent data structure across all reports
 * - Proper account coding following standard chart of accounts
 * - Period-over-period comparisons
 * - Multi-currency support
 * - Audit trail capability
 */

import { AccountBalance, FinancialDataPoint } from './anomalyDetection';
import { getAnomaliesByIndustry } from './demoData';

// =====================================================
// TYPES
// =====================================================

export interface ChartOfAccount {
  code: string;
  name: string;
  nameEn: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType?: 'current' | 'fixed' | 'longTerm' | 'operating' | 'nonOperating';
  normalBalance: 'debit' | 'credit';
  isActive: boolean;
}

export interface AccountBalanceExtended extends AccountBalance {
  nameEn?: string;
  subType?: string;
  budget?: number;
  priorYearBudget?: number;
  notes?: string;
}

export interface BalanceSheetData {
  asOfDate: string;
  comparisonDate: string;
  currency: string;
  organizationId: string;
  organizationName: string;
  preparedBy?: string;
  approvedBy?: string;
  assets: {
    currentAssets: AccountBalanceExtended[];
    fixedAssets: AccountBalanceExtended[];
    otherAssets?: AccountBalanceExtended[];
  };
  liabilities: {
    currentLiabilities: AccountBalanceExtended[];
    longTermLiabilities: AccountBalanceExtended[];
  };
  equity: AccountBalanceExtended[];
}

export interface IncomeStatementData {
  periodStart: string;
  periodEnd: string;
  comparisonPeriodStart: string;
  comparisonPeriodEnd: string;
  currency: string;
  organizationId: string;
  revenue: AccountBalanceExtended[];
  costOfGoodsSold: AccountBalanceExtended[];
  operatingExpenses: AccountBalanceExtended[];
  otherIncome: AccountBalanceExtended[];
  otherExpenses: AccountBalanceExtended[];
}

export interface CashFlowData {
  period: string;
  periodEn: string;
  operatingActivities: {
    label: string;
    labelEn: string;
    value: number;
    category: 'inflow' | 'outflow';
  }[];
  investingActivities: {
    label: string;
    labelEn: string;
    value: number;
    category: 'inflow' | 'outflow';
  }[];
  financingActivities: {
    label: string;
    labelEn: string;
    value: number;
    category: 'inflow' | 'outflow';
  }[];
  openingCash: number;
  closingCash: number;
}

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
  daysReceivable: number; // DSO
  daysInventory: number;
  daysPayable: number;
  cashConversionCycle: number;
  
  // Working Capital
  workingCapital: number;
  workingCapitalRatio: number;
}

export interface AgingBucket {
  label: string;
  labelEn: string;
  amount: number;
  count: number; // Number of invoices/bills
  percentage: number;
}

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

export interface BudgetComparison {
  category: string;
  categoryEn: string;
  actual: number;
  budget: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
}

export interface AccountingDeadline {
  id: string;
  title: string;
  titleEn: string;
  dueDate: string;
  type: 'tax' | 'filing' | 'payment' | 'audit' | 'report';
  status: 'upcoming' | 'overdue' | 'completed';
  description?: string;
}

export interface TrialBalanceEntry {
  code: string;
  name: string;
  nameEn: string;
  debit: number;
  credit: number;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

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
    runway: number; // months
    burnRate: number; // monthly average
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
    hasData?: boolean; // True if real invoice data exists
  };
  payables: {
    current: number;
    prior: number;
    aging: AgingBucket[];
    totalOverdue: number;
    averageDaysPayable: number;
    hasData?: boolean; // True if real bill data exists (many businesses don't track bills)
  };
  // Bank & reconciliation
  bankAccounts: BankReconciliation[];
  // Budget tracking
  budgetComparisons: BudgetComparison[];
  // Important dates
  upcomingDeadlines: AccountingDeadline[];
  // Trial balance summary
  trialBalance: {
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
    entries: TrialBalanceEntry[];
  };
}

export interface TrendDataset {
  label: string;
  labelEn: string;
  data: FinancialDataPoint[];
  budget?: number[];
  color?: string;
}

export interface WaterfallDataPoint {
  label: string;
  labelEn: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'subtotal' | 'end';
  category?: 'operations' | 'investing' | 'financing';
}

export interface DemoAnomalyData {
  id: string;
  type: 'duplicate' | 'fraud' | 'spike' | 'timing';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  amount: number;
  date: string;
  confidence: number;
  accountId?: string;
}

export interface FinancialDataResponse {
  balanceSheet: BalanceSheetData;
  incomeStatement?: IncomeStatementData;
  cashFlow?: CashFlowData;
  metrics: FinancialMetrics;
  summary: DashboardSummary;
  trends: {
    revenue: TrendDataset;
    expenses: TrendDataset;
    cashFlow: TrendDataset;
    profit: TrendDataset;
  };
  accounts: AccountBalanceExtended[];
  cashFlowWaterfall: WaterfallDataPoint[];
  demoAnomalies: DemoAnomalyData[];
  industry: string;
  lastUpdated: string;
  dataSource: string;
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

/**
 * Generates a deterministic seed from a date string for consistent random values
 */
function getDateSeed(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Seeded random number generator for deterministic values
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Apply date-based variation to a base value
 * More recent dates have higher values (simulating growth)
 */
function applyDateVariation(baseValue: number, asOfDate: string, variationPercent: number = 15): number {
  const seed = getDateSeed(asOfDate);
  const random = seededRandom(seed);
  
  // Reference date (latest expected date - end of 2025)
  const referenceDate = new Date('2025-12-31');
  const targetDate = new Date(asOfDate);
  
  // Calculate months from reference (negative means earlier date)
  const monthsDiff = (referenceDate.getFullYear() - targetDate.getFullYear()) * 12 
                   + (referenceDate.getMonth() - targetDate.getMonth());
  
  // Apply growth rate (about 0.5% per month decline for older dates)
  const growthFactor = Math.pow(0.995, monthsDiff);
  
  // Add some random variation based on date seed (±variationPercent%)
  const randomVariation = 1 + (random() - 0.5) * 2 * (variationPercent / 100);
  
  return Math.round(baseValue * growthFactor * randomVariation);
}

/**
 * Generates realistic mock financial data based on organization settings.
 * In production, this would be replaced with actual API calls to:
 * - QuickBooks Online API
 * - Xero API
 * - Sage API
 * - Direct database connections
 * - Data lake queries
 */
export function generateMockFinancialData(
  organizationId: string,
  organizationName: string,
  currency: string = 'CAD',
  asOfDate: string = new Date().toISOString().split('T')[0],
  industry: string = 'real_estate'
): FinancialDataResponse {
  // Calculate comparison date (prior year)
  const currentDate = new Date(asOfDate);
  const priorDate = new Date(currentDate);
  priorDate.setFullYear(priorDate.getFullYear() - 1);
  const comparisonDate = priorDate.toISOString().split('T')[0];

  // Base values - these will be modified based on asOfDate
  const baseValues = {
    cash: 245000,
    receivables: 185000,
    inventory: 78000,
    prepaid: 12000,
    fixedAssets: 450000,
    depreciation: -125000,
    payables: 78000,
    accrued: 45000,
    currentDebt: 25000,
    longTermDebt: 175000,
    shareCapital: 100000,
    retainedEarnings: 422000,
  };

  // Prior year base values
  const priorBaseValues = {
    cash: 198000,
    receivables: 156000,
    inventory: 82000,
    prepaid: 10000,
    fixedAssets: 420000,
    depreciation: -95000,
    payables: 65000,
    accrued: 38000,
    currentDebt: 25000,
    longTermDebt: 200000,
    shareCapital: 100000,
    retainedEarnings: 343000,
  };

  // Generate balance sheet accounts with date-based variations
  const currentAssets: AccountBalanceExtended[] = [
    { 
      code: '1000', 
      name: 'Encaisse et équivalents', 
      nameEn: 'Cash and equivalents',
      current: applyDateVariation(baseValues.cash, asOfDate, 12), 
      prior: applyDateVariation(priorBaseValues.cash, comparisonDate, 10), 
      budget: 200000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1100', 
      name: 'Créances locatives', 
      nameEn: 'Rent Receivable',
      current: applyDateVariation(baseValues.receivables, asOfDate, 15), 
      prior: applyDateVariation(priorBaseValues.receivables, comparisonDate, 12), 
      budget: 170000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1200', 
      name: 'Dépôts de garantie', 
      nameEn: 'Security Deposits',
      current: applyDateVariation(baseValues.inventory, asOfDate, 10), 
      prior: applyDateVariation(priorBaseValues.inventory, comparisonDate, 8), 
      budget: 75000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1300', 
      name: 'Frais payés d\'avance', 
      nameEn: 'Prepaid expenses',
      current: applyDateVariation(baseValues.prepaid, asOfDate, 5), 
      prior: applyDateVariation(priorBaseValues.prepaid, comparisonDate, 5), 
      budget: 12000,
      type: 'asset',
      subType: 'current'
    },
  ];

  const fixedAssets: AccountBalanceExtended[] = [
    { 
      code: '1500', 
      name: 'Propriétés immobilières', 
      nameEn: 'Investment Properties',
      current: applyDateVariation(baseValues.fixedAssets, asOfDate, 5), 
      prior: applyDateVariation(priorBaseValues.fixedAssets, comparisonDate, 5), 
      budget: 430000,
      type: 'asset',
      subType: 'fixed'
    },
    { 
      code: '1600', 
      name: 'Amortissement cumulé', 
      nameEn: 'Accumulated depreciation',
      current: applyDateVariation(baseValues.depreciation, asOfDate, 8), 
      prior: applyDateVariation(priorBaseValues.depreciation, comparisonDate, 8), 
      budget: -110000,
      type: 'asset',
      subType: 'fixed'
    },
  ];

  const currentLiabilities: AccountBalanceExtended[] = [
    { 
      code: '2000', 
      name: 'Comptes fournisseurs', 
      nameEn: 'Accounts Payable',
      current: applyDateVariation(baseValues.payables, asOfDate, 18), 
      prior: applyDateVariation(priorBaseValues.payables, comparisonDate, 15), 
      budget: 70000,
      type: 'liability',
      subType: 'current'
    },
    { 
      code: '2100', 
      name: 'Charges à payer', 
      nameEn: 'Accrued expenses',
      current: applyDateVariation(baseValues.accrued, asOfDate, 12), 
      prior: applyDateVariation(priorBaseValues.accrued, comparisonDate, 10), 
      budget: 42000,
      type: 'liability',
      subType: 'current'
    },
    { 
      code: '2200', 
      name: 'Portion courante dette LT', 
      nameEn: 'Current portion of LT debt',
      current: baseValues.currentDebt, // Fixed amount
      prior: priorBaseValues.currentDebt, 
      budget: 25000,
      type: 'liability',
      subType: 'current'
    },
  ];

  const longTermLiabilities: AccountBalanceExtended[] = [
    { 
      code: '2500', 
      name: 'Hypothèques', 
      nameEn: 'Mortgages Payable',
      current: applyDateVariation(baseValues.longTermDebt, asOfDate, 3), 
      prior: applyDateVariation(priorBaseValues.longTermDebt, comparisonDate, 3), 
      budget: 185000,
      type: 'liability',
      subType: 'longTerm'
    },
  ];

  // Calculate retained earnings to balance the sheet
  const totalAssetsRaw = currentAssets.reduce((sum, a) => sum + a.current, 0)
                       + fixedAssets.reduce((sum, a) => sum + a.current, 0);
  const totalLiabilitiesRaw = currentLiabilities.reduce((sum, a) => sum + a.current, 0)
                            + longTermLiabilities.reduce((sum, a) => sum + a.current, 0);
  const balancingRetainedEarnings = totalAssetsRaw - totalLiabilitiesRaw - baseValues.shareCapital;

  const totalAssetsPrior = currentAssets.reduce((sum, a) => sum + a.prior, 0)
                         + fixedAssets.reduce((sum, a) => sum + a.prior, 0);
  const totalLiabilitiesPrior = currentLiabilities.reduce((sum, a) => sum + a.prior, 0)
                              + longTermLiabilities.reduce((sum, a) => sum + a.prior, 0);
  const balancingRetainedEarningsPrior = totalAssetsPrior - totalLiabilitiesPrior - priorBaseValues.shareCapital;

  const equity: AccountBalanceExtended[] = [
    { 
      code: '3000', 
      name: 'Capital-actions', 
      nameEn: 'Share capital',
      current: baseValues.shareCapital, 
      prior: priorBaseValues.shareCapital, 
      budget: 100000,
      type: 'equity'
    },
    { 
      code: '3100', 
      name: 'Bénéfices non répartis', 
      nameEn: 'Retained earnings',
      current: balancingRetainedEarnings, 
      prior: balancingRetainedEarningsPrior, 
      budget: 400000,
      type: 'equity'
    },
  ];

  // Calculate totals
  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.current, 0);
  const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.current, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.current, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + a.current, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  
  const totalEquity = equity.reduce((sum, a) => sum + a.current, 0);

  // Generate monthly trend data (last 12 months based on asOfDate)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  // Use date seed for consistent random variations
  const dateSeed = getDateSeed(asOfDate);
  const random = seededRandom(dateSeed);
  
  // Calculate base revenue factor based on date (more recent = higher)
  const referenceDate = new Date('2025-12-31');
  const targetDate = new Date(asOfDate);
  const monthsDiff = (referenceDate.getFullYear() - targetDate.getFullYear()) * 12 
                   + (referenceDate.getMonth() - targetDate.getMonth());
  const dateGrowthFactor = Math.pow(0.992, monthsDiff);
  
  // More varied seasonal patterns for clearer period-to-period differences
  const seasonalFactors = [0.85, 0.80, 0.90, 1.05, 1.10, 1.15, 1.08, 0.95, 1.00, 1.12, 1.20, 1.25];
  
  const revenueData: FinancialDataPoint[] = months.map((month, i) => {
    const baseRevenue = 120000;
    const seasonalRevenue = baseRevenue * seasonalFactors[i];
    const growthFactor = 1 + (i * 0.02); // 2% growth per month
    const variation = (random() - 0.5) * 15000; // Random variation ±7500
    return {
      period: monthsFr[i],
      value: Math.round((seasonalRevenue * growthFactor + variation) * dateGrowthFactor),
    };
  });

  const revenueBudget = months.map((_, i) => {
    const baseBudget = 115000;
    const seasonalBudget = baseBudget * seasonalFactors[i];
    const growthFactor = 1 + (i * 0.018); // Slightly lower growth target
    return Math.round((seasonalBudget * growthFactor) * dateGrowthFactor);
  });

  const expenseData: FinancialDataPoint[] = months.map((month, i) => {
    const baseExpense = 85000;
    // Expenses have inverse seasonality (higher in slow months due to fixed costs ratio)
    const expenseSeasonalFactors = [1.05, 1.08, 1.02, 0.95, 0.92, 0.90, 0.92, 0.98, 0.96, 0.94, 0.93, 0.95];
    const seasonalExpense = baseExpense * expenseSeasonalFactors[i];
    const growthFactor = 1 + (i * 0.015); // 1.5% expense growth per month
    const variation = (random() - 0.5) * 8000;
    return {
      period: monthsFr[i],
      value: Math.round((seasonalExpense * growthFactor + variation) * dateGrowthFactor),
    };
  });

  const cashFlowTrendData: FinancialDataPoint[] = months.map((month, i) => {
    // Cash flow = revenue - expenses, with additional timing variations
    const revenue = revenueData[i].value;
    const expense = expenseData[i].value;
    const baseCashFlow = revenue - expense;
    // Add timing variations (collections lag, prepayments, etc.)
    const timingVariation = (random() - 0.5) * 25000;
    return {
      period: monthsFr[i],
      value: Math.round(baseCashFlow + timingVariation),
    };
  });

  const profitData: FinancialDataPoint[] = revenueData.map((rev, i) => ({
    period: rev.period,
    value: rev.value - expenseData[i].value,
  }));

  // Cash flow waterfall - using short, clear labels with date-based values
  const currentCash = currentAssets.find(a => a.code === '1000')?.current || 245000;
  const priorCash = currentAssets.find(a => a.code === '1000')?.prior || 198000;
  const salesInflow = Math.round(applyDateVariation(195000, asOfDate, 12));
  const collectionsInflow = Math.round(applyDateVariation(156000, asOfDate, 15));
  const payrollOutflow = Math.round(applyDateVariation(-112000, asOfDate, 8));
  const suppliersOutflow = Math.round(applyDateVariation(-78000, asOfDate, 12));
  const rentOutflow = Math.round(applyDateVariation(-35000, asOfDate, 3));
  const opTotal = priorCash + salesInflow + collectionsInflow + payrollOutflow + suppliersOutflow + rentOutflow;
  const capexOutflow = Math.round(applyDateVariation(-45000, asOfDate, 20));
  const debtOutflow = -25000;
  const dividendsOutflow = Math.round(applyDateVariation(-9000, asOfDate, 15));
  
  // Industry-specific waterfall labels
  const waterfallLabels: Record<string, WaterfallDataPoint[]> = {
    real_estate: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Loyers perçus', labelEn: 'Rent Collected', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Gestion immobilière', labelEn: 'Property Management', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Entretien & réparations', labelEn: 'Maintenance & Repairs', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Paiement hypothécaire', labelEn: 'Mortgage Payment', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Améliorations', labelEn: 'Property Improvements', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    restaurant: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes alimentaires', labelEn: 'Food Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Ventes boissons', labelEn: 'Beverage Sales', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Coûts nourriture', labelEn: 'Food Costs', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    hospitality: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus chambres', labelEn: 'Room Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Revenus services', labelEn: 'Service Revenue', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Entretien', labelEn: 'Maintenance', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Services publics', labelEn: 'Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Améliorations', labelEn: 'Property Improvements', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    retail: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes', labelEn: 'Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Coût marchandises', labelEn: 'COGS', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Inventaire', labelEn: 'Inventory', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    construction: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus projets', labelEn: 'Project Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Matériaux', labelEn: 'Materials', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Sous-traitants', labelEn: 'Subcontractors', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    professional_services: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus facturables', labelEn: 'Billable Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Salaries', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Frais professionnels', labelEn: 'Professional Fees', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    manufacturing: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes produits', labelEn: 'Product Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Matériaux', labelEn: 'Raw Materials', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Services publics', labelEn: 'Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Machinerie', labelEn: 'Machinery', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    agriculture: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes récolte', labelEn: 'Crop Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Subventions', labelEn: 'Grants', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Main-d\'œuvre', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Intrants', labelEn: 'Inputs', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Équipement agricole', labelEn: 'Farm Equipment', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Machinerie', labelEn: 'Machinery', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    transport: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus transport', labelEn: 'Transport Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Driver Wages', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Carburant', labelEn: 'Fuel', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Entretien véhicules', labelEn: 'Vehicle Maintenance', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Véhicules', labelEn: 'Vehicles', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    healthcare: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus patients', labelEn: 'Patient Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Assurances', labelEn: 'Insurance', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Staff Salaries', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Fournitures médicales', labelEn: 'Medical Supplies', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement médical', labelEn: 'Medical Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    education: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Frais scolarité', labelEn: 'Tuition', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Faculty Salaries', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Fournitures', labelEn: 'Supplies', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    wholesale: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes gros', labelEn: 'Wholesale Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Recouvrements', labelEn: 'Collections', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Coût marchandises', labelEn: 'COGS', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Entrepôt', labelEn: 'Warehouse', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Inventaire', labelEn: 'Inventory', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    automotive: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Ventes véhicules', labelEn: 'Vehicle Sales', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Revenus service', labelEn: 'Service Revenue', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Labor', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Pièces', labelEn: 'Parts', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
    beauty_wellness: [
      { label: 'Ouverture', labelEn: 'Opening', value: priorCash, type: 'start' },
      { label: 'Revenus services', labelEn: 'Service Revenue', value: salesInflow, type: 'increase', category: 'operations' },
      { label: 'Ventes produits', labelEn: 'Product Sales', value: collectionsInflow, type: 'increase', category: 'operations' },
      { label: 'Salaires', labelEn: 'Staff Salaries', value: payrollOutflow, type: 'decrease', category: 'operations' },
      { label: 'Fournitures', labelEn: 'Supplies', value: suppliersOutflow, type: 'decrease', category: 'operations' },
      { label: 'Loyer & services', labelEn: 'Rent & Utilities', value: rentOutflow, type: 'decrease', category: 'operations' },
      { label: 'Op. Total', labelEn: 'Op. Total', value: opTotal, type: 'subtotal' },
      { label: 'Équipement', labelEn: 'Equipment', value: capexOutflow, type: 'decrease', category: 'investing' },
      { label: 'Remboursement dette', labelEn: 'Debt Repayment', value: debtOutflow, type: 'decrease', category: 'financing' },
      { label: 'Distributions', labelEn: 'Distributions', value: dividendsOutflow, type: 'decrease', category: 'financing' },
      { label: 'Clôture', labelEn: 'Closing', value: currentCash, type: 'end' },
    ],
  };

  const cashFlowWaterfall = waterfallLabels[industry] || waterfallLabels.real_estate;

  // Calculate financial metrics
  const cash = currentAssets.find(a => a.code === '1000')?.current || 0;
  const receivables = currentAssets.find(a => a.code === '1100')?.current || 0;
  const inventory = currentAssets.find(a => a.code === '1200')?.current || 0;
  
  const currentRatio = totalCurrentAssets / totalCurrentLiabilities;
  const quickRatio = (totalCurrentAssets - inventory) / totalCurrentLiabilities;
  const cashRatio = cash / totalCurrentLiabilities;
  
  const annualRevenue = revenueData.reduce((sum, d) => sum + d.value, 0);
  const annualExpenses = expenseData.reduce((sum, d) => sum + d.value, 0);
  const grossProfit = annualRevenue - (annualExpenses * 0.6); // Assume 60% is COGS
  const netProfit = annualRevenue - annualExpenses;
  
  const grossMargin = (grossProfit / annualRevenue) * 100;
  const netMargin = (netProfit / annualRevenue) * 100;
  
  const dso = (receivables / (annualRevenue / 365));
  const monthlyBurn = annualExpenses / 12;
  const runway = cash / monthlyBurn;

  const metrics: FinancialMetrics = {
    currentRatio,
    quickRatio,
    cashRatio,
    grossMargin,
    operatingMargin: netMargin * 1.1,
    netMargin,
    returnOnAssets: (netProfit / totalAssets) * 100,
    returnOnEquity: (netProfit / totalEquity) * 100,
    debtToEquity: totalLiabilities / totalEquity,
    debtToAssets: totalLiabilities / totalAssets,
    interestCoverage: netProfit / 15000, // Assume 15k interest
    receivablesTurnover: annualRevenue / receivables,
    inventoryTurnover: (annualExpenses * 0.6) / inventory,
    assetTurnover: annualRevenue / totalAssets,
    daysReceivable: Math.round(dso),
    daysInventory: Math.round(inventory / ((annualExpenses * 0.6) / 365)),
    daysPayable: Math.round(currentLiabilities[0].current / (annualExpenses / 365)),
    cashConversionCycle: Math.round(dso + (inventory / ((annualExpenses * 0.6) / 365)) - (currentLiabilities[0].current / (annualExpenses / 365))),
    workingCapital: totalCurrentAssets - totalCurrentLiabilities,
    workingCapitalRatio: totalCurrentAssets / totalCurrentLiabilities,
  };

  // AR Aging buckets
  const arAging: AgingBucket[] = [
    { label: 'À jour (0-30 jours)', labelEn: 'Current (0-30 days)', amount: receivables * 0.65, count: 42, percentage: 65 },
    { label: '31-60 jours', labelEn: '31-60 days', amount: receivables * 0.20, count: 15, percentage: 20 },
    { label: '61-90 jours', labelEn: '61-90 days', amount: receivables * 0.10, count: 8, percentage: 10 },
    { label: '90+ jours', labelEn: '90+ days', amount: receivables * 0.05, count: 3, percentage: 5 },
  ];

  // AP Aging buckets
  const apAmount = currentLiabilities[0].current;
  const apAging: AgingBucket[] = [
    { label: 'À jour (0-30 jours)', labelEn: 'Current (0-30 days)', amount: apAmount * 0.70, count: 28, percentage: 70 },
    { label: '31-60 jours', labelEn: '31-60 days', amount: apAmount * 0.18, count: 8, percentage: 18 },
    { label: '61-90 jours', labelEn: '61-90 days', amount: apAmount * 0.08, count: 4, percentage: 8 },
    { label: '90+ jours', labelEn: '90+ days', amount: apAmount * 0.04, count: 2, percentage: 4 },
  ];

  // Bank reconciliation
  const bankAccounts: BankReconciliation[] = [
    {
      accountName: 'Compte principal',
      accountNumber: '****4521',
      bookBalance: 245000,
      bankBalance: 248500,
      difference: -3500,
      outstandingDeposits: 8500,
      outstandingChecks: 12000,
      lastReconciled: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'reconciled',
    },
    {
      accountName: 'Compte opérations',
      accountNumber: '****7832',
      bookBalance: 45000,
      bankBalance: 45000,
      difference: 0,
      outstandingDeposits: 0,
      outstandingChecks: 0,
      lastReconciled: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'reconciled',
    },
  ];

  // Budget comparisons by category
  const budgetComparisons: BudgetComparison[] = [
    { category: 'Salaires', categoryEn: 'Payroll', actual: 485000, budget: 500000, variance: 15000, variancePercent: 3.0, status: 'under' },
    { category: 'Marketing', categoryEn: 'Marketing', actual: 78000, budget: 70000, variance: -8000, variancePercent: -11.4, status: 'over' },
    { category: 'Loyer & Services', categoryEn: 'Rent & Utilities', actual: 96000, budget: 96000, variance: 0, variancePercent: 0, status: 'on_track' },
    { category: 'Fournitures', categoryEn: 'Supplies', actual: 23000, budget: 25000, variance: 2000, variancePercent: 8.0, status: 'under' },
    { category: 'Services prof.', categoryEn: 'Professional Services', actual: 45000, budget: 40000, variance: -5000, variancePercent: -12.5, status: 'over' },
    { category: 'Assurances', categoryEn: 'Insurance', actual: 18000, budget: 18000, variance: 0, variancePercent: 0, status: 'on_track' },
  ];

  // Upcoming deadlines
  const today = new Date();
  const upcomingDeadlines: AccountingDeadline[] = [
    {
      id: 'gst-q4',
      title: 'Déclaration TPS/TVQ T4',
      titleEn: 'GST/QST Q4 Filing',
      dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0],
      type: 'tax',
      status: 'upcoming',
      description: 'Déclaration trimestrielle TPS/TVQ',
    },
    {
      id: 'payroll',
      title: 'Remise DAS',
      titleEn: 'Payroll Remittance',
      dueDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
      type: 'payment',
      status: today.getDate() > 15 ? 'overdue' : 'upcoming',
    },
    {
      id: 'year-end',
      title: 'Clôture exercice',
      titleEn: 'Year-End Close',
      dueDate: new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0],
      type: 'report',
      status: 'upcoming',
    },
    {
      id: 't4-slips',
      title: 'Feuillets T4',
      titleEn: 'T4 Slips',
      dueDate: new Date(today.getFullYear() + 1, 1, 28).toISOString().split('T')[0],
      type: 'filing',
      status: 'upcoming',
    },
  ];

  // Trial balance entries
  const trialBalanceEntries: TrialBalanceEntry[] = [
    ...currentAssets.map(a => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn || a.name,
      debit: a.current > 0 ? a.current : 0,
      credit: a.current < 0 ? Math.abs(a.current) : 0,
      type: 'asset' as const,
    })),
    ...fixedAssets.map(a => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn || a.name,
      debit: a.current > 0 ? a.current : 0,
      credit: a.current < 0 ? Math.abs(a.current) : 0,
      type: 'asset' as const,
    })),
    ...currentLiabilities.map(a => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn || a.name,
      debit: 0,
      credit: a.current,
      type: 'liability' as const,
    })),
    ...longTermLiabilities.map(a => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn || a.name,
      debit: 0,
      credit: a.current,
      type: 'liability' as const,
    })),
    ...equity.map(a => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn || a.name,
      debit: 0,
      credit: a.current,
      type: 'equity' as const,
    })),
    // Add revenue and expense accounts
    { code: '4000', name: 'Revenus locatifs', nameEn: 'Rental Income', debit: 0, credit: annualRevenue, type: 'revenue' as const },
    { code: '5000', name: 'Frais de propriété', nameEn: 'Property Expenses', debit: annualExpenses * 0.6, credit: 0, type: 'expense' as const },
    { code: '6000', name: 'Frais d\'exploitation', nameEn: 'Operating Expenses', debit: annualExpenses * 0.4, credit: 0, type: 'expense' as const },
  ];

  const totalDebits = trialBalanceEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = trialBalanceEntries.reduce((sum, e) => sum + e.credit, 0);

  const summary: DashboardSummary = {
    revenue: {
      current: revenueData[revenueData.length - 1].value,
      prior: revenueData[revenueData.length - 2].value,
      budget: revenueBudget[revenueBudget.length - 1],
      ytd: annualRevenue,
      ytdPrior: annualRevenue * 0.92,
      ytdBudget: revenueBudget.reduce((sum, b) => sum + b, 0),
      varianceTobudget: ((annualRevenue - revenueBudget.reduce((sum, b) => sum + b, 0)) / revenueBudget.reduce((sum, b) => sum + b, 0)) * 100,
    },
    expenses: {
      current: expenseData[expenseData.length - 1].value,
      prior: expenseData[expenseData.length - 2].value,
      budget: 130000,
      ytd: annualExpenses,
      ytdBudget: 1500000,
    },
    netIncome: {
      current: revenueData[revenueData.length - 1].value - expenseData[expenseData.length - 1].value,
      prior: revenueData[revenueData.length - 2].value - expenseData[expenseData.length - 2].value,
      ytd: netProfit,
      ytdPrior: netProfit * 0.88,
    },
    cash: {
      current: cash,
      prior: currentAssets.find(a => a.code === '1000')?.prior || 0,
      runway: Math.round(runway * 10) / 10,
      burnRate: monthlyBurn,
    },
    cashFlow: {
      operating: 126000,
      investing: -45000,
      financing: -34000,
      net: 47000,
      freeCashFlow: 126000 - 45000, // Operating - CapEx
    },
    receivables: {
      current: receivables,
      prior: currentAssets.find(a => a.code === '1100')?.prior || 0,
      aging: arAging,
      totalOverdue: arAging.slice(1).reduce((sum, b) => sum + b.amount, 0),
      averageDaysOutstanding: Math.round(dso),
    },
    payables: {
      current: apAmount,
      prior: currentLiabilities[0].prior,
      aging: apAging,
      totalOverdue: apAging.slice(1).reduce((sum, b) => sum + b.amount, 0),
      averageDaysPayable: Math.round(metrics.daysPayable),
    },
    bankAccounts,
    budgetComparisons,
    upcomingDeadlines,
    trialBalance: {
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      entries: trialBalanceEntries,
    },
  };

  // Combine all accounts for analysis
  const allAccounts: AccountBalanceExtended[] = [
    ...currentAssets,
    ...fixedAssets,
    ...currentLiabilities.map(a => ({ ...a, current: -a.current, prior: -a.prior })),
    ...longTermLiabilities.map(a => ({ ...a, current: -a.current, prior: -a.prior })),
    ...equity.map(a => ({ ...a, current: -a.current, prior: -a.prior })),
  ];

  return {
    balanceSheet: {
      asOfDate,
      comparisonDate,
      currency,
      organizationId,
      organizationName,
      assets: {
        currentAssets,
        fixedAssets,
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
      },
      equity,
    },
    metrics,
    summary,
    trends: {
      revenue: {
        label: 'Revenus',
        labelEn: 'Revenue',
        data: revenueData,
        budget: revenueBudget,
      },
      expenses: {
        label: 'Dépenses',
        labelEn: 'Expenses',
        data: expenseData,
        budget: expenseData.map((_, i) => {
          // Generate expense budget (slightly lower than actual for variance)
          const baseBudget = 80000;
          const expenseSeasonalFactors = [1.05, 1.08, 1.02, 0.95, 0.92, 0.90, 0.92, 0.98, 0.96, 0.94, 0.93, 0.95];
          const seasonalBudget = baseBudget * expenseSeasonalFactors[i];
          const growthFactor = 1 + (i * 0.014); // Slightly lower growth target
          return Math.round((seasonalBudget * growthFactor) * dateGrowthFactor);
        }),
      },
      cashFlow: {
        label: 'Flux de trésorerie',
        labelEn: 'Cash Flow',
        data: cashFlowTrendData,
        budget: cashFlowTrendData.map((_, i) => {
          // Cash flow budget = revenue budget - expense budget
          const revBudget = revenueBudget[i] || 0;
          const expBudget = expenseData[i] ? (expenseData[i].value * 0.95) : 0; // 95% of actual expense
          return Math.round(revBudget - expBudget);
        }),
      },
      profit: {
        label: 'Résultat net',
        labelEn: 'Net Income',
        data: profitData,
      },
    },
    accounts: allAccounts,
    cashFlowWaterfall,
    // Industry-specific demo anomalies
    demoAnomalies: getAnomaliesByIndustry(industry).map(a => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      titleFr: a.titleFr,
      description: a.description,
      descriptionFr: a.descriptionFr,
      amount: a.amount,
      date: a.date,
      confidence: a.confidence,
      accountId: a.accountId,
    })),
    industry,
    lastUpdated: new Date().toISOString(),
    dataSource: 'mock', // Would be 'quickbooks', 'xero', etc. in production
  };
}

// =====================================================
// DATA FETCHING SERVICE
// =====================================================

/**
 * Fetches financial data for an organization.
 * In production, this would:
 * 1. Check cache for recent data
 * 2. Call the appropriate accounting system API
 * 3. Transform data to our standard format
 * 4. Cache the results
 * 5. Return the data
 */
export async function fetchFinancialData(
  organizationId: string,
  organizationName: string,
  options: {
    asOfDate?: string;
    forceRefresh?: boolean;
    currency?: string;
  } = {}
): Promise<FinancialDataResponse> {
  const { 
    asOfDate = new Date().toISOString().split('T')[0],
    forceRefresh = false,
    currency = 'CAD'
  } = options;

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // In production, this would:
  // 1. Check if we have a connected data source
  // 2. Call the appropriate API
  // 3. Transform and return the data
  
  return generateMockFinancialData(organizationId, organizationName, currency, asOfDate);
}

/**
 * Fetches just the balance sheet data
 */
export async function fetchBalanceSheet(
  organizationId: string,
  organizationName: string,
  asOfDate: string
): Promise<BalanceSheetData> {
  const data = await fetchFinancialData(organizationId, organizationName, { asOfDate });
  return data.balanceSheet;
}

/**
 * Fetches dashboard summary data
 */
export async function fetchDashboardSummary(
  organizationId: string,
  organizationName: string
): Promise<{ summary: DashboardSummary; metrics: FinancialMetrics; trends: FinancialDataResponse['trends'] }> {
  const data = await fetchFinancialData(organizationId, organizationName);
  return {
    summary: data.summary,
    metrics: data.metrics,
    trends: data.trends,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatAccountingNumber(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateVariance(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return ((current - prior) / Math.abs(prior)) * 100;
}

export function calculateVarianceAmount(current: number, prior: number): number {
  return current - prior;
}

export function formatVariance(variance: number): string {
  const sign = variance >= 0 ? '+' : '';
  return `${sign}${variance.toFixed(1)}%`;
}
