import { ledgerFixture } from '@__fixtures__/providers/quickbooks/ledger-fixture';
import { normalizeLedgerAccounts, reconcileQuickBooksLedger, reportCents, QuickBooksReportLimitError } from '../quickbooks-ledger';
import { QuickBooksRawRow } from '@domain/datalake/bronze-quickbooks-reports';

describe('reconciled QuickBooks ledger', () => {
  const run = (fixture: ReturnType<typeof ledgerFixture>) => reconcileQuickBooksLedger(fixture.accounts, fixture.parts, fixture.trial, fixture.scope);
  it('imports invoices, payments, bills, bill payments and credit memos as balanced postings', () => {
    const result = run(ledgerFixture());
    expect(result.transactions).toHaveLength(5);
    expect(result.postingCount).toBe(11);
    expect(result.transactions.map((entry) => entry.type)).toEqual(['Invoice', 'Payment', 'Bill', 'Bill Payment (Cheque)', 'Credit Memo']);
    expect(result.accounts.find((account) => account.sourceId === '3')?.active).toBe(false);
    for (const entry of result.transactions) expect(entry.postings.reduce((sum, row) => sum + row.debitCents - row.creditCents, 0)).toBe(0);
  });
  it('retains distinct identical posting lines and stable keys on repeated sync', () => {
    const first = run(ledgerFixture()), second = run(ledgerFixture());
    expect(first).toEqual(second);
    const invoice = first.transactions.find((transaction) => transaction.type === 'Invoice')!;
    const credits = invoice.postings.filter((posting) => posting.creditCents > 0);
    expect(credits).toHaveLength(2);
    expect(credits[0].key).not.toBe(credits[1].key);
    expect(credits.map((row) => row.creditCents)).toEqual([5000, 5000]);
  });
  it('does not count payment receipts again as revenue', () => {
    const result = run(ledgerFixture());
    const revenue = result.transactions.flatMap((row) => row.postings).filter((row) => row.sourceAccountId === '2').reduce((sum, row) => sum + row.creditCents - row.debitCents, 0);
    expect(revenue).toBe(8000);
  });
  it('keeps transactions distinct when two provider types reuse an ID', () => {
    const fixture = ledgerFixture();
    for (const section of fixture.generalLedger.Rows.Row!) for (const row of section.Rows!.Row!) if (row.ColData![1].value === 'Payment') row.ColData![1].id = '10';
    expect(run(fixture).transactions).toHaveLength(5);
  });
  it('resolves metadata columns after the provider reorders them', () => {
    const fixture = ledgerFixture(), order = [5, 3, 0, 4, 1, 2];
    fixture.generalLedger.Columns.Column = order.map((index) => fixture.generalLedger.Columns.Column[index]);
    for (const section of fixture.generalLedger.Rows.Row!) for (const row of section.Rows!.Row!) row.ColData = order.map((index) => row.ColData![index]);
    expect(run(fixture).postingCount).toBe(11);
  });
  it('accepts explicit standard column labels when modern reports omit ColKey', () => {
    const fixture = ledgerFixture(), titles = ['Date', 'Transaction Type', 'Num', 'Memo/Description', 'Debit', 'Credit'];
    fixture.generalLedger.Columns.Column = titles.map((title) => ({ ColTitle: title, ColType: '' }));
    expect(run(fixture).postingCount).toBe(11);
  });
  it('normalizes an explicit negative credit as a debit reversal', () => {
    const fixture = ledgerFixture();
    const row = fixture.generalLedger.Rows.Row!.find((section) => section.Header!.ColData[0].id === '2')!.Rows!.Row!.find((row) => row.ColData![1].value === 'Credit Memo')!;
    row.ColData![4].value = ''; row.ColData![5].value = '-20.00';
    expect(run(fixture).transactions.find((entry) => entry.type === 'Credit Memo')!.postings.find((line) => line.sourceAccountId === '2')?.debitCents).toBe(2000);
  });
  it('reconciles prior-year net income into provider retained earnings without posting fictitious closing entries', () => {
    const fixture = ledgerFixture();
    fixture.generalLedger.Rows.Row!.find((section) => section.Header!.ColData[0].id === '2')!.Rows!.Row!.push(fixture.posting('2025-12-31', 'Invoice', '99', '', '30.00'));
    fixture.generalLedger.Rows.Row!.find((section) => section.Header!.ColData[0].id === '6')!.Rows!.Row!.push(fixture.posting('2025-12-31', 'Invoice', '99', '30.00', ''));
    const receivable = fixture.trial.Rows.Row!.find((row) => row.ColData?.[0].id === '6')!;
    receivable.ColData![1].value = '10.00'; receivable.ColData![2].value = '';
    fixture.trial.Rows.Row!.push({ ColData: [{ value: 'Retained earnings', id: '5' }, { value: '' }, { value: '30.00' }] });
    const result = run(fixture);
    expect(result.transactions).toHaveLength(6);
    expect(result.transactions.flatMap((entry) => entry.postings).filter((line) => line.sourceAccountId === '5')).toHaveLength(0);
  });
  it('rejects historical profit when the retained-earnings identity is unavailable', () => {
    const fixture = ledgerFixture();
    fixture.generalLedger.Rows.Row!.find((section) => section.Header!.ColData[0].id === '2')!.Rows!.Row!.push(fixture.posting('2025-12-31', 'Invoice', '99', '', '30.00'));
    fixture.generalLedger.Rows.Row!.find((section) => section.Header!.ColData[0].id === '6')!.Rows!.Row!.push(fixture.posting('2025-12-31', 'Invoice', '99', '30.00', ''));
    fixture.accounts = fixture.accounts.filter((account) => account.Id !== '5');
    expect(() => run(fixture)).toThrow('retained-earnings');
  });
  it('requires explicit home-currency columns for multicurrency companies', () => {
    const fixture = ledgerFixture(); fixture.scope.multiCurrency = true;
    expect(() => run(fixture)).toThrow('debt_home_amt');
    fixture.generalLedger.Columns.Column[4].MetaData![0].Value = 'debt_home_amt';
    fixture.generalLedger.Columns.Column[5].MetaData![0].Value = 'credit_home_amt';
    expect(run(fixture).postingCount).toBe(11);
  });
  it('accepts a provider-confirmed empty ledger and trial balance', () => {
    const fixture = ledgerFixture();
    for (const report of [fixture.generalLedger, fixture.trial]) { report.Rows = {}; report.Header.Option![0].Value = 'true'; }
    const result = run(fixture); expect(result.transactions).toEqual([]); expect(result.postingCount).toBe(0);
  });
  it('rejects an unexplained empty report', () => {
    const fixture = ledgerFixture(); fixture.generalLedger.Rows = {};
    expect(() => run(fixture)).toThrow('empty report');
  });
  it('does not trust a no-data marker when postings are present', () => {
    const fixture = ledgerFixture(); fixture.generalLedger.Header.Option![0].Value = 'true';
    expect(() => run(fixture)).toThrow('empty report');
  });
  it('accepts nonoverlapping date segments and rejects gaps or overlaps', () => {
    const fixture = ledgerFixture();
    const split = '2026-01-06';
    const first = structuredClone(fixture.generalLedger), second = structuredClone(fixture.generalLedger);
    first.Header.EndPeriod = split; second.Header.StartPeriod = '2026-01-07';
    for (const section of first.Rows.Row!) section.Rows!.Row = section.Rows!.Row!.filter((row) => row.ColData![0].value <= split);
    for (const section of second.Rows.Row!) section.Rows!.Row = section.Rows!.Row!.filter((row) => row.ColData![0].value > split);
    fixture.parts = [{ report: first, startDate: fixture.scope.startDate, endDate: split }, { report: second, startDate: '2026-01-07', endDate: fixture.scope.endDate }];
    expect(run(fixture).postingCount).toBe(11);
    fixture.parts[1].startDate = '2026-01-08';
    expect(() => run(fixture)).toThrow('date range');
  });
  it('rejects missing posting account IDs even when a counterparty column is present', () => {
    const fixture = ledgerFixture();
    const parent = fixture.generalLedger.Rows.Row![0]; delete parent.Header!.ColData[0].id;
    fixture.generalLedger.Columns.Column.push({ ColTitle: 'Account', ColType: 'account_name' });
    for (const section of fixture.generalLedger.Rows.Row!) for (const row of section.Rows!.Row!) row.ColData!.push({ value: 'Counterparty', id: '2' });
    expect(() => run(fixture)).toThrow('own account ID');
  });
  it('does not inherit a parent ID into a subaccount section with a missing ID', () => {
    const fixture = ledgerFixture();
    const inner = fixture.generalLedger.Rows.Row![0]; delete inner.Header!.ColData[0].id;
    fixture.generalLedger.Rows.Row![0] = { type: 'Section', Header: { ColData: [{ value: 'Parent', id: '1' }] }, Rows: { Row: [inner] } };
    expect(() => run(fixture)).toThrow('own account ID');
  });
  it.each([
    ['Currency', 'USD'], ['ReportBasis', 'Cash'], ['StartPeriod', '2026-01-01'], ['EndPeriod', '2026-10-20'], ['ReportName', 'TransactionList'],
  ])('rejects provider header mismatch for %s', (key, value) => {
    const fixture = ledgerFixture(); (fixture.generalLedger.Header as Record<string, unknown>)[key] = value;
    expect(() => run(fixture)).toThrow('does not match');
  });
  it.each([
    ['missing ID', (row: QuickBooksRawRow) => { delete row.ColData![1].id; }],
    ['bad date', (row: QuickBooksRawRow) => { row.ColData![0].value = '2026-02-30'; }],
    ['outside date', (row: QuickBooksRawRow) => { row.ColData![0].value = '2027-01-01'; }],
    ['both sides', (row: QuickBooksRawRow) => { row.ColData![5].value = '3.00'; }],
    ['unbalanced', (row: QuickBooksRawRow) => { row.ColData![4].value = '99.99'; }],
    ['short row', (row: QuickBooksRawRow) => { row.ColData!.pop(); }],
  ])('rejects %s posting data before any persistence', (_, change) => {
    const fixture = ledgerFixture(); (change as (row: QuickBooksRawRow) => void)(fixture.generalLedger.Rows.Row![0].Rows!.Row![0]);
    expect(() => run(fixture)).toThrow('QuickBooks ledger validation failed');
  });
  it('rejects whole balanced transactions missing from the ledger by independent reconciliation', () => {
    const fixture = ledgerFixture();
    for (const section of fixture.generalLedger.Rows.Row!) section.Rows!.Row = section.Rows!.Row!.filter((row) => row.ColData![1].value !== 'Bill');
    expect(() => run(fixture)).toThrow('independent trial balance');
  });
  it('rejects balanced but incorrect trial-balance account totals', () => {
    const fixture = ledgerFixture();
    fixture.trial.Rows.Row![0].ColData![1].value = '34.99'; fixture.trial.Rows.Row![1].ColData![2].value = '79.99';
    expect(() => run(fixture)).toThrow('independent trial balance');
  });
  it('rejects an unknown trial-balance account instead of dropping it', () => {
    const fixture = ledgerFixture(); fixture.trial.Rows.Row![0].ColData![0].id = 'foreign';
    expect(() => run(fixture)).toThrow('unknown');
  });
  it('rejects duplicate report columns', () => {
    const fixture = ledgerFixture(); fixture.generalLedger.Columns.Column[3].MetaData![0].Value = 'debt_amt';
    expect(() => run(fixture)).toThrow('duplicate report');
  });
  it('rejects explicit truncation metadata', () => {
    const fixture = ledgerFixture(); fixture.generalLedger.Header.Option!.push({ Name: 'Truncated', Value: 'true' });
    expect(() => run(fixture)).toThrow(QuickBooksReportLimitError);
  });
  it('rejects oversized report row counts', () => {
    const fixture = ledgerFixture();
    fixture.generalLedger.Rows.Row![0].Rows!.Row = Array.from({ length: 60_000 }, () => ({ type: 'Data', ColData: [{ value: 'Beginning Balance' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' }] }));
    expect(() => run(fixture)).toThrow(QuickBooksReportLimitError);
  });
  it.each(['1.234', '1e3', '1,000.00', '$1.00', 'NaN', 'Infinity', ' 1.00 ', '10000000000000.00', null, 0])('rejects invalid or excessive decimal value %p', (value) => {
    expect(() => reportCents(value)).toThrow();
  });
  it('parses exact cents without binary float rounding', () => {
    expect(reportCents('0.29')).toBe(29); expect(reportCents('-0.01')).toBe(-1); expect(reportCents('9999999999999.99')).toBe(999_999_999_999_999);
  });
  it('rejects duplicate, unknown and cyclic chart-of-account records', () => {
    const fixture = ledgerFixture();
    expect(() => normalizeLedgerAccounts([...fixture.accounts, fixture.accounts[0]])).toThrow('duplicate account');
    fixture.accounts[0].AccountType = 'Unsupported'; expect(() => normalizeLedgerAccounts(fixture.accounts)).toThrow('classification');
    fixture.accounts[0].AccountType = 'Bank'; fixture.accounts[0].ParentRef = { value: '1', name: 'Cash' };
    expect(() => normalizeLedgerAccounts(fixture.accounts)).toThrow('cyclic');
  });
});
