/**
 * Demo Data Provider
 * Provides realistic sample financial data for demo/test mode
 */

export interface DemoAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  balance: number;
  priorBalance?: number;
}

export interface DemoTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  type: 'debit' | 'credit';
  category?: string;
}

export interface DemoAnomaly {
  id: string;
  type: 'duplicate' | 'fraud' | 'spike' | 'timing';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  amount: number;
  date: string;
  confidence: number;
  accountId?: string;
  transactionIds?: string[];
}

export interface DemoKPI {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

// Sample Chart of Accounts
export const DEMO_ACCOUNTS: DemoAccount[] = [
  // Assets
  { id: 'acc-001', code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', category: 'Current Assets', balance: 234500, priorBalance: 198200 },
  { id: 'acc-002', code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets', balance: 156200, priorBalance: 142800 },
  { id: 'acc-003', code: '1200', name: 'Inventory', type: 'asset', category: 'Current Assets', balance: 89300, priorBalance: 78500 },
  { id: 'acc-004', code: '1500', name: 'Property, Plant & Equipment', type: 'asset', category: 'Fixed Assets', balance: 765000, priorBalance: 683000 },
  { id: 'acc-005', code: '1600', name: 'Accumulated Depreciation', type: 'asset', category: 'Fixed Assets', balance: -125000, priorBalance: -98000 },
  
  // Liabilities
  { id: 'acc-006', code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities', balance: 87500, priorBalance: 92000 },
  { id: 'acc-007', code: '2100', name: 'Accrued Expenses', type: 'liability', category: 'Current Liabilities', balance: 45200, priorBalance: 38000 },
  { id: 'acc-008', code: '2500', name: 'Long-term Debt', type: 'liability', category: 'Long-term Liabilities', balance: 320000, priorBalance: 350000 },
  
  // Equity
  { id: 'acc-009', code: '3000', name: 'Common Stock', type: 'equity', category: 'Equity', balance: 500000, priorBalance: 500000 },
  { id: 'acc-010', code: '3100', name: 'Retained Earnings', type: 'equity', category: 'Equity', balance: 234300, priorBalance: 189500 },
  
  // Revenue
  { id: 'acc-011', code: '4000', name: 'Product Sales', type: 'revenue', category: 'Revenue', balance: 1245000, priorBalance: 1120000 },
  { id: 'acc-012', code: '4100', name: 'Service Revenue', type: 'revenue', category: 'Revenue', balance: 456000, priorBalance: 420000 },
  
  // Expenses
  { id: 'acc-013', code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'Cost of Sales', balance: 680000, priorBalance: 610000 },
  { id: 'acc-014', code: '6000', name: 'Salaries and Wages', type: 'expense', category: 'Operating Expenses', balance: 124500, priorBalance: 120000 },
  { id: 'acc-015', code: '6100', name: 'Marketing', type: 'expense', category: 'Operating Expenses', balance: 45200, priorBalance: 35000 },
  { id: 'acc-016', code: '6200', name: 'Rent', type: 'expense', category: 'Operating Expenses', balance: 36000, priorBalance: 36000 },
  { id: 'acc-017', code: '6300', name: 'Software & Subscriptions', type: 'expense', category: 'Operating Expenses', balance: 18500, priorBalance: 20000 },
];

// Sample Transactions
export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { id: 'txn-001', date: '2026-01-15', description: 'Invoice #4521 - Acme Corp', amount: 12500, accountId: 'acc-011', accountName: 'Product Sales', type: 'credit', category: 'Revenue' },
  { id: 'txn-002', date: '2026-01-15', description: 'Payment received - Invoice #4521', amount: 12500, accountId: 'acc-001', accountName: 'Cash', type: 'debit', category: 'Payment' },
  { id: 'txn-003', date: '2026-01-14', description: 'Vendor Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-006', accountName: 'Accounts Payable', type: 'debit', category: 'Payment' },
  { id: 'txn-004', date: '2026-01-14', description: 'Vendor Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payment' },
  { id: 'txn-005', date: '2026-01-13', description: 'Duplicate Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-006', accountName: 'Accounts Payable', type: 'debit', category: 'Payment' },
  { id: 'txn-006', date: '2026-01-13', description: 'Duplicate Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payment' },
  { id: 'txn-007', date: '2026-01-12', description: 'Payroll - January 2026', amount: 124500, accountId: 'acc-014', accountName: 'Salaries', type: 'debit', category: 'Payroll' },
  { id: 'txn-008', date: '2026-01-12', description: 'Payroll - January 2026', amount: 124500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payroll' },
  { id: 'txn-009', date: '2026-01-10', description: 'Marketing Campaign - Q1 2026', amount: 45200, accountId: 'acc-015', accountName: 'Marketing', type: 'debit', category: 'Marketing' },
  { id: 'txn-010', date: '2026-01-10', description: 'Marketing Campaign - Q1 2026', amount: 45200, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Marketing' },
];

// Sample Anomalies
export const DEMO_ANOMALIES: DemoAnomaly[] = [
  {
    id: 'anom-001',
    type: 'duplicate',
    severity: 'critical',
    title: 'Duplicate Payment Detected',
    description: 'Invoice #4521 paid twice - AI flagged',
    amount: 12450,
    date: '2026-01-15',
    confidence: 99,
    accountId: 'acc-006',
    transactionIds: ['txn-003', 'txn-005'],
  },
  {
    id: 'anom-002',
    type: 'fraud',
    severity: 'critical',
    title: 'Fraudulent Transaction Pattern',
    description: 'Unusual vendor payment sequence detected',
    amount: 45230,
    date: '2026-01-14',
    confidence: 96,
    accountId: 'acc-006',
    transactionIds: ['txn-003', 'txn-004'],
  },
  {
    id: 'anom-003',
    type: 'spike',
    severity: 'warning',
    title: 'Expense Spike Anomaly',
    description: 'Marketing 340% above historical average',
    amount: 28500,
    date: '2026-01-10',
    confidence: 94,
    accountId: 'acc-015',
    transactionIds: ['txn-009'],
  },
  {
    id: 'anom-004',
    type: 'timing',
    severity: 'warning',
    title: 'Revenue Recognition Issue',
    description: 'Timing variance detected in Q4',
    amount: 67000,
    date: '2026-01-12',
    confidence: 91,
    accountId: 'acc-011',
    transactionIds: ['txn-001'],
  },
];

// Sample KPIs by Industry
export const DEMO_KPIS: Record<string, DemoKPI[]> = {
  // Real Estate
  realEstate: [
    { id: 'kpi-re-001', name: 'Occupancy Rate', value: 85, target: 90, unit: '%', trend: 'up', changePercent: 2.5 },
    { id: 'kpi-re-002', name: 'Cap Rate', value: 7.2, target: 7.5, unit: '%', trend: 'stable', changePercent: 0.3 },
    { id: 'kpi-re-003', name: 'NOI', value: 1200000, target: 1250000, unit: 'CAD', trend: 'up', changePercent: 5.2 },
    { id: 'kpi-re-004', name: 'Cash-on-Cash Return', value: 9.4, target: 10, unit: '%', trend: 'up', changePercent: 1.1 },
  ],
  // Restaurant
  restaurant: [
    { id: 'kpi-rest-001', name: 'Food Cost %', value: 28, target: 30, unit: '%', trend: 'down', changePercent: -2.1 },
    { id: 'kpi-rest-002', name: 'Labor Cost %', value: 32, target: 35, unit: '%', trend: 'down', changePercent: -1.8 },
    { id: 'kpi-rest-003', name: 'Prime Cost', value: 60, target: 65, unit: '%', trend: 'down', changePercent: -3.2 },
    { id: 'kpi-rest-004', name: 'Average Check', value: 45, target: 48, unit: 'CAD', trend: 'up', changePercent: 2.3 },
  ],
  // Retail
  retail: [
    { id: 'kpi-ret-001', name: 'GMROI', value: 2.8, target: 3.0, unit: 'x', trend: 'up', changePercent: 5.6 },
    { id: 'kpi-ret-002', name: 'Inventory Turnover', value: 6.2, target: 6.5, unit: 'x', trend: 'stable', changePercent: 0.5 },
    { id: 'kpi-ret-003', name: 'Shrinkage %', value: 1.2, target: 1.5, unit: '%', trend: 'down', changePercent: -0.3 },
    { id: 'kpi-ret-004', name: 'Sales per Sq Ft', value: 450, target: 500, unit: 'CAD', trend: 'up', changePercent: 8.2 },
  ],
  // General/Default
  default: [
    { id: 'kpi-gen-001', name: 'Current Ratio', value: 2.4, target: 2.0, unit: 'x', trend: 'up', changePercent: 8.5 },
    { id: 'kpi-gen-002', name: 'Quick Ratio', value: 1.8, target: 1.5, unit: 'x', trend: 'up', changePercent: 12.3 },
    { id: 'kpi-gen-003', name: 'Debt-to-Equity', value: 0.6, target: 1.0, unit: 'x', trend: 'down', changePercent: -5.2 },
    { id: 'kpi-gen-004', name: 'DSO', value: 38, target: 45, unit: 'days', trend: 'down', changePercent: -8.1 },
    { id: 'kpi-gen-005', name: 'Net Margin', value: 18.5, target: 20, unit: '%', trend: 'down', changePercent: -2.1 },
  ],
};

// Sample Balance Sheet Data
export const DEMO_BALANCE_SHEET = {
  assets: {
    current: DEMO_ACCOUNTS.filter(a => a.type === 'asset' && a.category === 'Current Assets'),
    fixed: DEMO_ACCOUNTS.filter(a => a.type === 'asset' && a.category === 'Fixed Assets'),
    total: DEMO_ACCOUNTS.filter(a => a.type === 'asset').reduce((sum, acc) => sum + acc.balance, 0),
  },
  liabilities: {
    current: DEMO_ACCOUNTS.filter(a => a.type === 'liability' && a.category === 'Current Liabilities'),
    longTerm: DEMO_ACCOUNTS.filter(a => a.type === 'liability' && a.category === 'Long-term Liabilities'),
    total: DEMO_ACCOUNTS.filter(a => a.type === 'liability').reduce((sum, acc) => sum + acc.balance, 0),
  },
  equity: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'equity').reduce((sum, acc) => sum + acc.balance, 0),
  },
};

// Sample Income Statement Data
export const DEMO_INCOME_STATEMENT = {
  revenue: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'revenue').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'revenue'),
  },
  cogs: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Cost of Sales').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Cost of Sales'),
  },
  operatingExpenses: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Operating Expenses').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Operating Expenses'),
  },
  netIncome: 0, // Calculated: revenue - cogs - operatingExpenses
};

// Calculate net income
DEMO_INCOME_STATEMENT.netIncome = 
  DEMO_INCOME_STATEMENT.revenue.total - 
  DEMO_INCOME_STATEMENT.cogs.total - 
  DEMO_INCOME_STATEMENT.operatingExpenses.total;

// Sample Cash Flow Data
export const DEMO_CASH_FLOW = {
  operating: {
    netIncome: DEMO_INCOME_STATEMENT.netIncome,
    adjustments: [
      { description: 'Depreciation', amount: 27000 },
      { description: 'Accounts Receivable Change', amount: -13400 },
      { description: 'Inventory Change', amount: -10800 },
      { description: 'Accounts Payable Change', amount: 4500 },
    ],
    total: 0, // Calculated
  },
  investing: {
    items: [
      { description: 'Purchase of Equipment', amount: -82000 },
      { description: 'Sale of Assets', amount: 15000 },
    ],
    total: -67000,
  },
  financing: {
    items: [
      { description: 'Loan Repayment', amount: -30000 },
      { description: 'Dividends Paid', amount: -15000 },
    ],
    total: -45000,
  },
};

// Calculate operating cash flow
DEMO_CASH_FLOW.operating.total = 
  DEMO_CASH_FLOW.operating.netIncome +
  DEMO_CASH_FLOW.operating.adjustments.reduce((sum, adj) => sum + adj.amount, 0);

// Helper function to get KPIs by industry
export function getKPIsByIndustry(industry: string = 'default'): DemoKPI[] {
  return DEMO_KPIS[industry] || DEMO_KPIS.default;
}

// Helper function to get demo data summary
export function getDemoDataSummary() {
  return {
    totalAccounts: DEMO_ACCOUNTS.length,
    totalTransactions: DEMO_TRANSACTIONS.length,
    totalAnomalies: DEMO_ANOMALIES.length,
    criticalAnomalies: DEMO_ANOMALIES.filter(a => a.severity === 'critical').length,
    totalRevenue: DEMO_INCOME_STATEMENT.revenue.total,
    netIncome: DEMO_INCOME_STATEMENT.netIncome,
    totalAssets: DEMO_BALANCE_SHEET.assets.total,
    totalLiabilities: DEMO_BALANCE_SHEET.liabilities.total,
    totalEquity: DEMO_BALANCE_SHEET.equity.total,
  };
}

export default {
  accounts: DEMO_ACCOUNTS,
  transactions: DEMO_TRANSACTIONS,
  anomalies: DEMO_ANOMALIES,
  kpis: DEMO_KPIS,
  balanceSheet: DEMO_BALANCE_SHEET,
  incomeStatement: DEMO_INCOME_STATEMENT,
  cashFlow: DEMO_CASH_FLOW,
  getKPIsByIndustry,
  getDemoDataSummary,
};
