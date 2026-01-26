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
  };
  payables: {
    current: number;
    prior: number;
    aging: AgingBucket[];
    totalOverdue: number;
    averageDaysPayable: number;
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
  lastUpdated: string;
  dataSource: string;
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

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
  asOfDate: string = new Date().toISOString().split('T')[0]
): FinancialDataResponse {
  // Calculate comparison date (prior year)
  const currentDate = new Date(asOfDate);
  const priorDate = new Date(currentDate);
  priorDate.setFullYear(priorDate.getFullYear() - 1);
  const comparisonDate = priorDate.toISOString().split('T')[0];

  // Generate balance sheet accounts
  const currentAssets: AccountBalanceExtended[] = [
    { 
      code: '1000', 
      name: 'Encaisse et équivalents', 
      nameEn: 'Cash and equivalents',
      current: 245000, 
      prior: 198000, 
      budget: 200000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1100', 
      name: 'Comptes clients', 
      nameEn: 'Accounts receivable',
      current: 185000, 
      prior: 156000, 
      budget: 170000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1200', 
      name: 'Stocks', 
      nameEn: 'Inventory',
      current: 78000, 
      prior: 82000, 
      budget: 75000,
      type: 'asset',
      subType: 'current'
    },
    { 
      code: '1300', 
      name: 'Frais payés d\'avance', 
      nameEn: 'Prepaid expenses',
      current: 12000, 
      prior: 10000, 
      budget: 12000,
      type: 'asset',
      subType: 'current'
    },
  ];

  const fixedAssets: AccountBalanceExtended[] = [
    { 
      code: '1500', 
      name: 'Immobilisations', 
      nameEn: 'Property and equipment',
      current: 450000, 
      prior: 420000, 
      budget: 430000,
      type: 'asset',
      subType: 'fixed'
    },
    { 
      code: '1600', 
      name: 'Amortissement cumulé', 
      nameEn: 'Accumulated depreciation',
      current: -125000, 
      prior: -95000, 
      budget: -110000,
      type: 'asset',
      subType: 'fixed'
    },
  ];

  const currentLiabilities: AccountBalanceExtended[] = [
    { 
      code: '2000', 
      name: 'Comptes fournisseurs', 
      nameEn: 'Accounts payable',
      current: 78000, 
      prior: 65000, 
      budget: 70000,
      type: 'liability',
      subType: 'current'
    },
    { 
      code: '2100', 
      name: 'Charges à payer', 
      nameEn: 'Accrued expenses',
      current: 45000, 
      prior: 38000, 
      budget: 42000,
      type: 'liability',
      subType: 'current'
    },
    { 
      code: '2200', 
      name: 'Portion courante dette LT', 
      nameEn: 'Current portion of LT debt',
      current: 25000, 
      prior: 25000, 
      budget: 25000,
      type: 'liability',
      subType: 'current'
    },
  ];

  const longTermLiabilities: AccountBalanceExtended[] = [
    { 
      code: '2500', 
      name: 'Dette à long terme', 
      nameEn: 'Long-term debt',
      current: 175000, 
      prior: 200000, 
      budget: 185000,
      type: 'liability',
      subType: 'longTerm'
    },
  ];

  const equity: AccountBalanceExtended[] = [
    { 
      code: '3000', 
      name: 'Capital-actions', 
      nameEn: 'Share capital',
      current: 100000, 
      prior: 100000, 
      budget: 100000,
      type: 'equity'
    },
    { 
      code: '3100', 
      name: 'Bénéfices non répartis', 
      nameEn: 'Retained earnings',
      current: 422000, 
      prior: 343000, 
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

  // Generate monthly trend data (last 12 months)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  const revenueData: FinancialDataPoint[] = months.map((month, i) => ({
    period: monthsFr[i],
    value: 125000 + (i * 6000) + Math.floor(Math.random() * 10000),
  }));

  const revenueBudget = months.map((_, i) => 120000 + (i * 5500));

  const expenseData: FinancialDataPoint[] = months.map((month, i) => ({
    period: monthsFr[i],
    value: 95000 + (i * 3000) + Math.floor(Math.random() * 5000),
  }));

  const cashFlowTrendData: FinancialDataPoint[] = months.map((month, i) => ({
    period: monthsFr[i],
    value: 45000 + Math.floor(Math.random() * 40000),
  }));

  const profitData: FinancialDataPoint[] = revenueData.map((rev, i) => ({
    period: rev.period,
    value: rev.value - expenseData[i].value,
  }));

  // Cash flow waterfall - using short, clear labels
  const cashFlowWaterfall: WaterfallDataPoint[] = [
    { label: 'Ouverture', labelEn: 'Opening', value: 198000, type: 'start' },
    { label: 'Ventes', labelEn: 'Sales', value: 195000, type: 'increase', category: 'operations' },
    { label: 'Recouvrements', labelEn: 'Collections', value: 156000, type: 'increase', category: 'operations' },
    { label: 'Salaires', labelEn: 'Payroll', value: -112000, type: 'decrease', category: 'operations' },
    { label: 'Fournisseurs', labelEn: 'Suppliers', value: -78000, type: 'decrease', category: 'operations' },
    { label: 'Loyer', labelEn: 'Rent', value: -35000, type: 'decrease', category: 'operations' },
    { label: 'Op. Total', labelEn: 'Op. Total', value: 324000, type: 'subtotal' },
    { label: 'Équipement', labelEn: 'CapEx', value: -45000, type: 'decrease', category: 'investing' },
    { label: 'Dette', labelEn: 'Debt', value: -25000, type: 'decrease', category: 'financing' },
    { label: 'Dividendes', labelEn: 'Dividends', value: -9000, type: 'decrease', category: 'financing' },
    { label: 'Clôture', labelEn: 'Closing', value: 245000, type: 'end' },
  ];

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
    { code: '4000', name: 'Ventes', nameEn: 'Sales Revenue', debit: 0, credit: annualRevenue, type: 'revenue' as const },
    { code: '5000', name: 'Coût des ventes', nameEn: 'Cost of Goods Sold', debit: annualExpenses * 0.6, credit: 0, type: 'expense' as const },
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
      },
      cashFlow: {
        label: 'Flux de trésorerie',
        labelEn: 'Cash Flow',
        data: cashFlowTrendData,
      },
      profit: {
        label: 'Résultat net',
        labelEn: 'Net Income',
        data: profitData,
      },
    },
    accounts: allAccounts,
    cashFlowWaterfall,
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
