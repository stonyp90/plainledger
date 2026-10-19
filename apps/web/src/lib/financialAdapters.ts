import type { AccountBalanceExtended, BalanceSheetData, DashboardSummary, IncomeStatementData } from './financialData';
import type { BalanceSheetResult, IncomeStatementResult } from './graphql/responseTypes';

export function createEmptyDashboardSummary(): DashboardSummary {
  return {
    revenue: { current: 0, prior: 0, budget: 0, ytd: 0, ytdPrior: 0, ytdBudget: 0, varianceTobudget: 0 },
    expenses: { current: 0, prior: 0, budget: 0, ytd: 0, ytdBudget: 0 },
    netIncome: { current: 0, prior: 0, ytd: 0, ytdPrior: 0 },
    cash: { current: 0, prior: 0, runway: 0, burnRate: 0 },
    cashFlow: { operating: 0, investing: 0, financing: 0, net: 0, freeCashFlow: 0 },
    receivables: { current: 0, prior: 0, aging: [], totalOverdue: 0, averageDaysOutstanding: 0, hasData: false },
    payables: { current: 0, prior: 0, aging: [], totalOverdue: 0, averageDaysPayable: 0, hasData: false },
    bankAccounts: [], budgetComparisons: [], upcomingDeadlines: [], hasBudget: false,
    trialBalance: { totalDebits: 0, totalCredits: 0, isBalanced: true, entries: [] },
  };
}

/** Keep unclassified balances distinct; account numbers do not define universal subtypes. */
export function adaptBalanceSheet(report: BalanceSheetResult, organizationId: string): BalanceSheetData {
  const lines = (items: BalanceSheetResult['assets'], type: AccountBalanceExtended['type']) =>
    items.filter(item => !item.isSubtotal).map(item => ({
      code: item.accountCode, name: item.accountName, nameEn: item.accountName,
      current: item.balance, prior: 0, type, subType: item.accountSubType || undefined,
    }));
  return {
    asOfDate: report.asOfDate, comparisonDate: '', hasComparison: false,
    organizationId, organizationName: report.organizationName, currency: report.currency,
    assets: {
      currentAssets: lines(report.assets.filter(item => item.accountSubType === 'CURRENT'), 'asset'),
      fixedAssets: lines(report.assets.filter(item => item.accountSubType === 'FIXED'), 'asset'),
      otherAssets: lines(report.assets.filter(item => item.accountSubType === 'OTHER'), 'asset'),
      unclassifiedAssets: lines(report.assets.filter(item => !['CURRENT', 'FIXED', 'OTHER'].includes(item.accountSubType || '')), 'asset'),
    },
    liabilities: {
      currentLiabilities: lines(report.liabilities.filter(item => item.accountSubType === 'CURRENT'), 'liability'),
      longTermLiabilities: lines(report.liabilities.filter(item => item.accountSubType === 'LONG_TERM'), 'liability'),
      unclassifiedLiabilities: lines(report.liabilities.filter(item => !['CURRENT', 'LONG_TERM'].includes(item.accountSubType || '')), 'liability'),
    },
    equity: lines(report.equity, 'equity'),
  };
}

export function adaptIncomeStatement(report: IncomeStatementResult, organizationId: string): IncomeStatementData {
  const lines = (items: IncomeStatementResult['revenue'], type: AccountBalanceExtended['type']) => items.map(item => ({
    code: item.accountCode, name: item.accountName, nameEn: item.accountName,
    current: item.amount, prior: 0, budget: item.budget ?? undefined, type, subType: item.accountSubType || undefined,
  }));
  return {
    periodStart: report.startDate, periodEnd: report.endDate,
    comparisonPeriodStart: '', comparisonPeriodEnd: '', hasComparison: false,
    organizationId, currency: report.currency,
    revenue: lines(report.revenue.filter(item => item.accountSubType !== 'OTHER'), 'revenue'),
    otherIncome: lines(report.revenue.filter(item => item.accountSubType === 'OTHER'), 'revenue'),
    costOfGoodsSold: lines(report.expenses.filter(item => item.accountSubType === 'COGS'), 'expense'),
    operatingExpenses: lines(report.expenses.filter(item => item.accountSubType === 'OPERATING'), 'expense'),
    otherExpenses: lines(report.expenses.filter(item => ['OTHER', 'TAX'].includes(item.accountSubType || '')), 'expense'),
    unclassifiedExpenses: lines(report.expenses.filter(item => !['COGS', 'OPERATING', 'OTHER', 'TAX'].includes(item.accountSubType || '')), 'expense'),
  };
}
