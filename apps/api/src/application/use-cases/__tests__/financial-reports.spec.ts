import { GenerateBalanceSheetUseCase } from '../generate-balance-sheet.use-case';
import { GenerateIncomeStatementUseCase } from '../generate-income-statement.use-case';
import { IOrganizationRepository } from '@application/ports/outbound/IOrganizationRepository';
import { ILedgerReportRepository, LedgerAccountTotal } from '@application/ports/outbound/ILedgerReportRepository';
import { AccountType } from '@domain/entities/Account';

describe('Reports from posted ledger balances', () => {
  const organizations = { findByTenantId: jest.fn() };
  const ledger = { getTotals: jest.fn() };
  const balanceSheet = new GenerateBalanceSheetUseCase(organizations as unknown as IOrganizationRepository, ledger as ILedgerReportRepository);
  const income = new GenerateIncomeStatementUseCase(organizations as unknown as IOrganizationRepository, ledger as ILedgerReportRepository);
  const account = (accountId: string, accountType: AccountType, debitCents: number, creditCents: number, accountSubtype?: string): LedgerAccountTotal => ({
    accountId, accountCode: accountId, accountName: accountId, accountType, debitCents, creditCents, accountSubtype,
  });
  const rows = [
    account('cash', AccountType.ASSET, 1000000, 0, 'CURRENT'),
    account('intangible', AccountType.ASSET, 100000, 0, 'INTANGIBLE'),
    account('payable', AccountType.LIABILITY, 0, 100000, 'CURRENT'),
    account('capital', AccountType.EQUITY, 0, 700000, 'CAPITAL'),
    account('sales', AccountType.REVENUE, 0, 500000, 'OPERATING'),
    account('materials', AccountType.EXPENSE, 200000, 0, 'COGS'),
  ];
  const endDate = new Date('2026-02-28T00:00:00.000Z');
  const startDate = new Date('2026-02-01T00:00:00.000Z');

  beforeEach(() => {
    organizations.findByTenantId.mockReset().mockResolvedValue({ id: 'org-uuid', name: 'Real Ledger Company', currency: 'CAD' });
    ledger.getTotals.mockReset().mockResolvedValue({ accounts: rows, hasPostedEntries: true });
  });

  it('uses actual amounts, retains uncategorized assets and balances unclosed earnings in equity', async () => {
    const report = await balanceSheet.execute({ tenantId: 'our-company', asOfDate: endDate });
    expect(ledger.getTotals).toHaveBeenCalledWith('org-uuid', endDate);
    expect(report.assets.currentAssets.items[0].currentBalance).toBe(10000);
    expect(report.assets.otherAssets?.items[0]).toMatchObject({ accountSubtype: 'INTANGIBLE', currentBalance: 1000 });
    expect(report.assets.totalAssets).toBe(11000);
    expect(report.liabilities.totalLiabilities).toBe(1000);
    expect(report.equity.totalEquity).toBe(10000);
    expect(report.equity.items.find((line) => line.accountId === 'unclosed-earnings')?.currentBalance).toBe(3000);
    expect(report.isBalanced).toBe(true);
  });

  it('uses separate dated totals for comparison rather than reusing current balances', async () => {
    const priorDate = new Date('2026-01-31');
    ledger.getTotals.mockImplementation(async (_organization: string, date: Date) => ({
      accounts: date.getTime() === priorDate.getTime() ? rows.map((row) => ({ ...row, debitCents: row.debitCents / 2, creditCents: row.creditCents / 2 })) : rows,
      hasPostedEntries: true,
    }));
    const report = await balanceSheet.execute({ tenantId: 'our-company', asOfDate: endDate, comparisonDate: priorDate });
    expect(ledger.getTotals).toHaveBeenCalledWith('org-uuid', priorDate);
    expect(report.assets.currentAssets.items[0]).toMatchObject({ currentBalance: 10000, priorBalance: 5000, variance: 5000, variancePercent: 100 });
    expect(report.assets.priorTotalAssets).toBe(5500);
    expect(report.equity.priorTotalEquity).toBe(5000);
  });

  it('queries the selected income period and returns source account categories', async () => {
    const report = await income.execute({ tenantId: 'our-company', startDate, endDate });
    expect(ledger.getTotals).toHaveBeenCalledWith('org-uuid', endDate, startDate);
    expect(report).toMatchObject({ grossRevenue: 5000, totalExpenses: 2000, netIncome: 3000, currency: 'CAD' });
    expect(report.expenses).toEqual([expect.objectContaining({ accountCode: 'materials', accountSubType: 'COGS', amount: 2000 })]);
  });

  it('preserves refunds and losses instead of taking absolute values', async () => {
    ledger.getTotals.mockResolvedValue({ hasPostedEntries: true, accounts: [
      account('refunds', AccountType.REVENUE, 5000, 0), account('costs', AccountType.EXPENSE, 10000, 0),
    ] });
    const report = await income.execute({ tenantId: 'our-company', startDate, endDate });
    expect(report).toMatchObject({ grossRevenue: -50, totalExpenses: 100, netIncome: -150 });
  });

  it('returns a zero-activity period only when a posted ledger actually exists', async () => {
    ledger.getTotals.mockResolvedValue({ accounts: [], hasPostedEntries: true });
    await expect(income.execute({ tenantId: 'our-company', startDate, endDate })).resolves.toMatchObject({ revenue: [], expenses: [], netIncome: 0 });
  });

  it('reports unavailable instead of manufacturing a zero report for a new tenant', async () => {
    ledger.getTotals.mockResolvedValue({ accounts: [], hasPostedEntries: false });
    await expect(balanceSheet.execute({ tenantId: 'our-company', asOfDate: endDate })).rejects.toMatchObject({ status: 422 });
    await expect(income.execute({ tenantId: 'our-company', startDate, endDate })).rejects.toMatchObject({ status: 422 });
  });

  it('rejects reversed or malformed dates before reading the ledger', async () => {
    await expect(income.execute({ tenantId: 'our-company', startDate: endDate, endDate: startDate })).rejects.toMatchObject({ status: 400 });
    await expect(balanceSheet.execute({ tenantId: 'our-company', asOfDate: new Date('bad') })).rejects.toMatchObject({ status: 400 });
    expect(ledger.getTotals).not.toHaveBeenCalled();
  });

  it('propagates data-source failures rather than returning empty financial results', async () => {
    ledger.getTotals.mockRejectedValue(new Error('Database unavailable'));
    await expect(balanceSheet.execute({ tenantId: 'our-company', asOfDate: endDate })).rejects.toThrow('Database unavailable');
  });
});
