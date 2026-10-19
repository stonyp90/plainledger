import { accountLookup, cashMovements, cashWaterfall, debitNet, ledgerCurrency, ledgerTrends, summarizeLedger } from '../datalake-financial-calculations';
import type { DimAccount, FactTransaction } from '../datalake-data.service';

function account(key: string, type: DimAccount['account_type'], subtype = ''): DimAccount {
  return { account_key: key, account_id: key, source_account_id: `source-${key}`, organization_key: 'tenant-a', account_code: key, account_name: key, account_type: type, account_subtype: subtype, is_active: true, hierarchy_level: 1, hierarchy_path: key, is_debit_normal: type === 'ASSET' || type === 'EXPENSE', balance_sheet_section: null, income_statement_section: null };
}
const accounts = [account('bank', 'ASSET', 'Bank'), account('savings', 'ASSET', 'Savings'), account('receivable', 'ASSET', 'AccountsReceivable'), account('equipment', 'ASSET', 'FixedAsset'), account('loan', 'LIABILITY', 'LongTermLiability'), account('capital', 'EQUITY'), account('revenue', 'REVENUE'), account('expense', 'EXPENSE')];
function line(id: string, key: string, debit: number, credit: number, date = '2026-01-10'): FactTransaction {
  return { transaction_key: `${id}-${key}`, transaction_id: id, organization_key: 'tenant-a', account_key: key, date_key: Number(date.replace(/-/g, '')), contact_key: null, transaction_type_key: 'JournalEntry', transaction_date: date, posting_date: date, debit_amount: debit, credit_amount: credit, amount: debit - credit, currency_code: 'CAD', exchange_rate: 1, amount_cad: debit - credit, reference_number: id, memo: '', source_system: 'quickbooks', source_transaction_id: id };
}
const opening = [line('opening', 'bank', 10000, 0, '2025-12-31'), line('opening', 'capital', 0, 10000, '2025-12-31')];
const january = [...opening, line('sale', 'bank', 2500, 0), line('sale', 'revenue', 0, 2500), line('payment', 'expense', 1000, 0), line('payment', 'bank', 0, 1000)];

describe('Authoritative Gold financial calculations', () => {
  it('balances assets against capital and unclosed net income', () => {
    expect(summarizeLedger(accounts, january, '2026-01-01')).toMatchObject({ totalAssets: 11500, totalEquity: 11500, totalRevenue: 2500, totalExpenses: 1000, netIncome: 1500, cashBalance: 11500 });
  });
  it('applies a P&L start date without discarding opening balance-sheet history', () => {
    const rows = [...january, line('feb-sale', 'bank', 9000, 0, '2026-02-05'), line('feb-sale', 'revenue', 0, 9000, '2026-02-05')];
    expect(summarizeLedger(accounts, rows, '2026-02-01')).toMatchObject({ totalRevenue: 9000, totalExpenses: 0, netIncome: 9000, cashBalance: 20500, totalEquity: 20500 });
  });
  it('preserves negative revenue and expense refunds', () => {
    const rows = [...opening, line('refund', 'revenue', 500, 0), line('refund', 'bank', 0, 500), line('rebate', 'bank', 100, 0), line('rebate', 'expense', 0, 100)];
    expect(summarizeLedger(accounts, rows, '2026-01-01')).toMatchObject({ totalRevenue: -500, totalExpenses: -100, netIncome: -400, cashBalance: 9600 });
    expect(ledgerTrends(accounts, rows).revenue.at(-1)?.value).toBe(-500);
  });
  it('does not turn an overdraft into positive cash', () => {
    const rows = [line('payment', 'expense', 100, 0), line('payment', 'bank', 0, 100)];
    expect(summarizeLedger(accounts, rows)).toMatchObject({ cashBalance: -100, totalAssets: -100, totalEquity: -100 });
  });
  it('never substitutes invoice revenue for collected cash', () => {
    const rows = [...opening, line('invoice', 'receivable', 1000, 0), line('invoice', 'revenue', 0, 1000), line('paid-expense', 'expense', 200, 0), line('paid-expense', 'bank', 0, 200)];
    expect(summarizeLedger(accounts, rows, '2026-01-01').netIncome).toBe(800);
    expect(cashMovements(accounts, rows, '2026-01-01')).toMatchObject({ opening: 10000, inflows: 0, outflows: 200, netCashFlow: -200, closing: 9800 });
  });
  it('excludes transfers between cash accounts from receipts and payments', () => {
    const rows = [...opening, line('transfer', 'bank', 0, 400), line('transfer', 'savings', 400, 0)];
    expect(cashMovements(accounts, rows, '2026-01-01')).toMatchObject({ inflows: 0, outflows: 0, netCashFlow: 0, closing: 10000 });
  });
  it('uses cash before the range as opening and excludes postings after the range', () => {
    const rows = [...january, line('future', 'bank', 9000, 0, '2026-02-01'), line('future', 'revenue', 0, 9000, '2026-02-01')];
    expect(cashMovements(accounts, rows, '2026-01-01', '2026-01-31')).toMatchObject({ opening: 10000, inflows: 2500, outflows: 1000, netCashFlow: 1500, closing: 11500 });
  });
  it('builds a reconciled waterfall from actual classified transactions', () => {
    const rows = [...january, line('equipment', 'equipment', 300, 0), line('equipment', 'bank', 0, 300), line('borrow', 'bank', 500, 0), line('borrow', 'loan', 0, 500)];
    expect(cashWaterfall(accounts, rows, '2026-01-01').map((entry) => [entry.category, entry.value])).toEqual([['opening', 10000], ['operating', 1500], ['investing', -300], ['financing', 500], ['closing', 11700]]);
  });
  it('reports total cash movement but refuses to invent mixed-category allocations', () => {
    const rows = [line('mixed', 'bank', 100, 0), line('mixed', 'revenue', 0, 50), line('mixed', 'loan', 0, 50)];
    expect(cashMovements(accounts, rows)).toMatchObject({ inflows: 100, classified: false });
    expect(() => cashWaterfall(accounts, rows)).toThrow(/reliable operating/);
  });
  it('excludes non-cash depreciation from payments', () => {
    const rows = [line('depreciation', 'expense', 100, 0), line('depreciation', 'equipment', 0, 100)];
    expect(cashMovements(accounts, rows)).toMatchObject({ inflows: 0, outflows: 0, netCashFlow: 0 });
  });
  it('returns empty trends and waterfall for an empty dataset', () => {
    expect(ledgerTrends([], [])).toEqual({ revenue: [], expenses: [], cashFlow: [] });
    expect(cashWaterfall([], [])).toEqual([]);
  });
  it('keeps different years separate and does not invent missing-month points', () => {
    const rows = [line('old', 'revenue', 0, 1, '2025-01-01'), line('new', 'revenue', 0, 2, '2026-01-01')];
    expect(ledgerTrends(accounts, rows).revenue).toEqual([{ period: '2025-01-01', value: 1 }, { period: '2026-01-01', value: 2 }]);
  });
  it('rejects unknown accounts instead of guessing from transaction type', () => {
    expect(() => summarizeLedger(accounts, [line('invoice', 'missing-account', 100, 0)])).toThrow(/unavailable account/);
  });
  it('rejects an unbalanced available ledger', () => {
    expect(() => summarizeLedger(accounts, [line('one-sided', 'revenue', 0, 100)])).toThrow(/does not balance/);
  });
  it('rejects individually unbalanced cash transactions even if the whole file balances', () => {
    expect(() => cashMovements(accounts, [line('a', 'bank', 100, 0), line('b', 'revenue', 0, 100)])).toThrow(/Complete balanced transaction/);
  });
  it.each([NaN, Infinity, -1, 1.001, Number.MAX_SAFE_INTEGER])('rejects invalid ledger amount %s', (amount) => {
    expect(() => debitNet(line('invalid', 'bank', amount, 0))).toThrow();
  });
  it('accumulates many small postings without floating-point drift', () => {
    const rows = Array.from({ length: 5000 }, (_, index) => [line(String(index), 'bank', 0.01, 0), line(String(index), 'revenue', 0, 0.01)]).flat();
    expect(summarizeLedger(accounts, rows).totalRevenue).toBe(50);
    expect(cashMovements(accounts, rows).netCashFlow).toBe(50);
  });
  it('rejects duplicate account identities and mixed currencies', () => {
    expect(() => accountLookup([accounts[0], accounts[0]])).toThrow(/not unique/);
    expect(() => ledgerCurrency([line('cad', 'bank', 1, 0), { ...line('usd', 'revenue', 0, 1), currency_code: 'USD' }])).toThrow(/Mixed currencies/);
  });
  it('requires a known reporting currency even for an empty dataset', () => {
    expect(ledgerCurrency([], 'USD')).toBe('USD');
    expect(() => ledgerCurrency([])).toThrow(/currency is unavailable/);
  });
});
