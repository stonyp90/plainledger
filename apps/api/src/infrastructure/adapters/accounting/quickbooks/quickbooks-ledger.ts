import { UnprocessableEntityException, PayloadTooLargeException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QuickBooksAccount } from '@domain/datalake/provider-types';
import { QuickBooksRawReportResponse, QuickBooksRawRow } from '@domain/datalake/bronze-quickbooks-reports';

export const LEDGER_START_DATE = '1900-01-01';
export const MAX_LEDGER_ROWS = 500_000;
export const MAX_REPORT_CELLS = 350_000;
export class QuickBooksReportLimitError extends PayloadTooLargeException {
  constructor() { super('The accounting report exceeds the supported size; the previous snapshot is unchanged'); }
}
export interface LedgerScope {
  startDate: string; endDate: string; currency: string; fiscalYearStart: string; multiCurrency: boolean;
}
export interface LedgerReportPart { report: QuickBooksRawReportResponse; startDate: string; endDate: string }
export interface LedgerAccount {
  sourceId: string; code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subtype: string; sourceType: string; sourceSubtype: string; parentSourceId?: string; active: boolean;
}
export interface LedgerPosting {
  sourceAccountId: string; debitCents: number; creditCents: number; memo: string; key: string;
}
export interface LedgerTransaction {
  sourceId: string; type: string; key: string; date: string; reference: string; postings: LedgerPosting[];
}
export interface ReconciledLedger {
  accounts: LedgerAccount[]; transactions: LedgerTransaction[]; postingCount: number; scope: LedgerScope;
}
function reject(reason: string): never {
  throw new UnprocessableEntityException(`QuickBooks ledger validation failed: ${reason}. The previous snapshot is unchanged`);
}
export function validAccountingDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function ledgerHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
/** Decimal(15,2) bound. Never parseFloat or round provider money. */
export function reportCents(value: unknown): number {
  if (value === '') return 0;
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) reject('invalid decimal amount');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > 999_999_999_999_999n) reject('amount exceeds database precision');
  return Number(negative ? -cents : cents);
}
function add(left: number, right: number): number {
  const value = left + right;
  if (!Number.isSafeInteger(value)) reject('aggregate amount exceeds supported precision');
  return value;
}
function text(value: unknown, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (!allowEmpty && !value.trim())) reject('invalid source identifier or text');
  return value;
}
export function normalizeLedgerAccounts(raw: QuickBooksAccount[]): LedgerAccount[] {
  if (!Array.isArray(raw) || raw.length > 20_000) reject('invalid chart of accounts size');
  const ids = new Set<string>();
  const known: Record<string, LedgerAccount['type']> = {
    Bank: 'ASSET', 'Accounts Receivable': 'ASSET', 'Other Current Asset': 'ASSET', 'Fixed Asset': 'ASSET', 'Other Asset': 'ASSET',
    'Accounts Payable': 'LIABILITY', 'Credit Card': 'LIABILITY', 'Other Current Liability': 'LIABILITY', 'Long Term Liability': 'LIABILITY',
    Equity: 'EQUITY', Income: 'REVENUE', 'Other Income': 'REVENUE', Expense: 'EXPENSE', 'Other Expense': 'EXPENSE', 'Cost of Goods Sold': 'EXPENSE',
  };
  const subtypes: Record<string, string> = {
    Bank: 'CURRENT', 'Accounts Receivable': 'CURRENT', 'Other Current Asset': 'CURRENT', 'Fixed Asset': 'FIXED',
    'Accounts Payable': 'CURRENT', 'Credit Card': 'CURRENT', 'Other Current Liability': 'CURRENT', 'Long Term Liability': 'LONG_TERM',
    Income: 'OPERATING', 'Other Income': 'OTHER', 'Cost of Goods Sold': 'COGS',
  };
  const accounts = raw.map((account): LedgerAccount => {
    if (!account || typeof account !== 'object') reject('invalid account');
    const sourceId = text(account.Id, 100);
    if (ids.has(sourceId)) reject('duplicate account identifier');
    ids.add(sourceId);
    const type = known[account.AccountType];
    if (!type || account.Classification?.toUpperCase() !== type || typeof account.Active !== 'boolean') reject('unsupported or inconsistent account classification');
    const sourceSubtype = text(account.AccountSubType, 100, true);
    return {
      sourceId, code: account.AcctNum === undefined ? sourceId : text(account.AcctNum, 100, true),
      name: text(account.Name, 255), type,
      subtype: sourceSubtype === 'RetainedEarnings' ? 'RETAINED' : subtypes[account.AccountType] || '',
      sourceType: account.AccountType, sourceSubtype, active: account.Active,
      ...(account.ParentRef ? { parentSourceId: text(account.ParentRef.value, 100) } : {}),
    };
  });
  const byId = new Map(accounts.map((account) => [account.sourceId, account]));
  for (const account of accounts) {
    const seen = new Set<string>([account.sourceId]);
    let parent = account.parentSourceId;
    while (parent) {
      if (!byId.has(parent) || seen.has(parent) || seen.size > 20) reject('missing or cyclic account parent');
      seen.add(parent); parent = byId.get(parent)!.parentSourceId;
    }
  }
  return accounts.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

type Column = QuickBooksRawReportResponse['Columns']['Column'][number];
function columnKey(column: Column): string | undefined {
  if (!column || typeof column !== 'object') reject('invalid report column');
  const metadata = column.MetaData?.filter((item) => item.Name === 'ColKey') || [];
  if (metadata.length > 1) reject('ambiguous report column metadata');
  if (metadata[0]?.Value) return metadata[0].Value;
  if (['tx_date', 'txn_type', 'doc_num', 'memo', 'debt_amt', 'credit_amt', 'debt_home_amt', 'credit_home_amt', 'account_name'].includes(column.ColType)) return column.ColType;
  // Current report variants omit ColKey. Only explicit, unambiguous standard labels
  // are accepted; every actual posting is still checked against dates/account IDs.
  return ({ Date: 'tx_date', 'Transaction Type': 'txn_type', Num: 'doc_num', 'Memo/Description': 'memo', Debit: 'debt_amt', Credit: 'credit_amt', 'Debit (Home)': 'debt_home_amt', 'Credit (Home)': 'credit_home_amt' } as Record<string, string>)[column.ColTitle] ||
    (column.ColType === 'Account' ? 'account_name' : undefined);
}
function reportShape(report: QuickBooksRawReportResponse, name: string, scope: Pick<LedgerScope, 'startDate' | 'endDate' | 'currency'>): Map<string, number> {
  if (!report || typeof report !== 'object' || 'Fault' in report || !report.Header || report.Header.ReportName !== name ||
    report.Header.ReportBasis !== 'Accrual' || report.Header.StartPeriod !== scope.startDate || report.Header.EndPeriod !== scope.endDate ||
    report.Header.Currency !== scope.currency || !Array.isArray(report.Columns?.Column) || !report.Rows ||
    (report.Rows.Row !== undefined && !Array.isArray(report.Rows.Row))) reject('report identity, dates, basis, currency or structure does not match the request');
  for (const option of report.Header.Option || []) {
    if (/truncat|limit|incomplete/i.test(option.Name) && !['false', '0', ''].includes(option.Value)) throw new QuickBooksReportLimitError();
  }
  const columns = new Map<string, number>();
  report.Columns.Column.forEach((column, index) => {
    const key = columnKey(column);
    if (key) { if (columns.has(key)) reject('duplicate report columns'); columns.set(key, index); }
  });
  if (report.Columns.Column.length > 50 || report.Columns.Column.length === 0) reject('invalid report column count');
  return columns;
}
function requiredColumn(columns: Map<string, number>, name: string): number {
  const index = columns.get(name); if (index === undefined) reject(`missing required ${name} column`); return index;
}
function cells(row: QuickBooksRawRow, width: number) {
  if (!Array.isArray(row.ColData) || row.ColData.length !== width || row.ColData.some((cell) => !cell || typeof cell.value !== 'string')) reject('report row does not match its columns');
  return row.ColData;
}
function walkRows(rows: QuickBooksRawRow[], visit: (row: QuickBooksRawRow, accountId?: string) => void, width: number): void {
  let count = 0;
  function walk(items: QuickBooksRawRow[], inheritedAccount?: string, depth = 0) {
    if (depth > 20 || !Array.isArray(items)) reject('invalid report hierarchy');
    for (const row of items) {
      count += width;
      if (count > MAX_REPORT_CELLS) throw new QuickBooksReportLimitError();
      if (!row || typeof row !== 'object' || (row.type !== undefined && !['Data', 'Section'].includes(row.type))) reject('unsupported report row type');
      // A new header without its own ID must never inherit the parent's ID: modern
      // provider variants otherwise misclassify child-account postings as parent data.
      const accountId = row.Header ? row.Header.ColData?.[0]?.id || undefined : inheritedAccount;
      if (row.ColData) visit(row, accountId);
      if (row.Rows) walk(row.Rows.Row || [], accountId, depth + 1);
      if (!row.ColData && !row.Rows && !row.Header && !row.Summary) reject('empty report row');
    }
  }
  walk(rows);
}

export function reconcileQuickBooksLedger(rawAccounts: QuickBooksAccount[], parts: LedgerReportPart[], trial: QuickBooksRawReportResponse, scope: LedgerScope): ReconciledLedger {
  if (!validAccountingDate(scope.startDate) || !validAccountingDate(scope.endDate) || !validAccountingDate(scope.fiscalYearStart) || scope.startDate !== LEDGER_START_DATE ||
    scope.endDate < scope.startDate || scope.fiscalYearStart > scope.endDate || !/^[A-Z]{3}$/.test(scope.currency) || typeof scope.multiCurrency !== 'boolean') reject('invalid ledger scope');
  const accounts = normalizeLedgerAccounts(rawAccounts);
  const byAccount = new Map(accounts.map((account) => [account.sourceId, account]));
  const entries = new Map<string, LedgerTransaction>();
  let postingCount = 0;
  let expectedStart = scope.startDate;
  for (const part of parts) {
    if (part.startDate !== expectedStart || !validAccountingDate(part.endDate) || part.endDate < part.startDate || part.endDate > scope.endDate) reject('overlapping, missing or unordered report date range');
    expectedStart = new Date(Date.parse(part.endDate) + 86_400_000).toISOString().slice(0, 10);
    const report = part.report;
    const columns = reportShape(report, 'GeneralLedger', { ...scope, startDate: part.startDate, endDate: part.endDate });
    const dateIndex = requiredColumn(columns, 'tx_date');
    const typeIndex = requiredColumn(columns, 'txn_type');
    const debitIndex = requiredColumn(columns, scope.multiCurrency ? 'debt_home_amt' : 'debt_amt');
    const creditIndex = requiredColumn(columns, scope.multiCurrency ? 'credit_home_amt' : 'credit_amt');
    const memoIndex = columns.get('memo'), referenceIndex = columns.get('doc_num');
    let partRows = 0;
    walkRows(report.Rows.Row || [], (row, sourceAccountId) => {
      const data = cells(row, report.Columns.Column.length);
      const date = data[dateIndex].value;
      if (!date || date === 'Beginning Balance') {
        if (data[typeIndex].id || data[typeIndex].value || reportCents(data[debitIndex].value) !== 0 || reportCents(data[creditIndex].value) !== 0) reject('undated ledger posting');
        return; // Report opening/running balances are never imported as transactions.
      }
      if (!validAccountingDate(date) || date < part.startDate || date > part.endDate || !sourceAccountId || !byAccount.has(sourceAccountId)) reject('posting date or own account ID is missing or outside scope');
      const type = text(data[typeIndex].value, 100), sourceId = text(data[typeIndex].id, 100);
      const key = ledgerHash(JSON.stringify([type, sourceId]));
      const reference = referenceIndex === undefined ? '' : text(data[referenceIndex].value, 500, true);
      const memo = memoIndex === undefined ? '' : text(data[memoIndex].value, 10_000, true);
      const debit = reportCents(data[debitIndex].value), credit = reportCents(data[creditIndex].value);
      if (debit !== 0 && credit !== 0) reject('a posting has both debit and credit amounts');
      const net = add(debit, -credit);
      const entry = entries.get(key) || { sourceId, type, key, date, reference, postings: [] };
      if (entry.date !== date || (reference && entry.reference && entry.reference !== reference)) reject('transaction identifier has conflicting dates or references');
      entry.reference ||= reference;
      entry.postings.push({ sourceAccountId, debitCents: Math.max(net, 0), creditCents: Math.max(-net, 0), memo, key: '' });
      entries.set(key, entry); postingCount++; partRows++;
      if (postingCount > MAX_LEDGER_ROWS) throw new QuickBooksReportLimitError();
    }, report.Columns.Column.length);
    const noData = report.Header.Option?.find((option) => option.Name === 'NoReportData')?.Value;
    if ((noData === 'true' && partRows > 0) || (partRows === 0 && noData !== 'true')) reject('empty report was not explicitly confirmed by the provider');
  }
  if (parts.length === 0 || expectedStart !== new Date(Date.parse(scope.endDate) + 86_400_000).toISOString().slice(0, 10)) reject('incomplete report date coverage');
  const allBalances = new Map<string, number>();
  const currentBalances = new Map<string, number>();
  let previousProfitAndLoss = 0;
  for (const entry of entries.values()) {
    let totalDebit = 0, totalCredit = 0;
    entry.postings.sort((a, b) => JSON.stringify([a.sourceAccountId, a.debitCents, a.creditCents, a.memo]).localeCompare(JSON.stringify([b.sourceAccountId, b.debitCents, b.creditCents, b.memo])));
    const occurrences = new Map<string, number>();
    for (const posting of entry.postings) {
      totalDebit = add(totalDebit, posting.debitCents); totalCredit = add(totalCredit, posting.creditCents);
      const net = posting.debitCents - posting.creditCents;
      const id = posting.sourceAccountId;
      allBalances.set(id, add(allBalances.get(id) || 0, net));
      if (entry.date >= scope.fiscalYearStart) currentBalances.set(id, add(currentBalances.get(id) || 0, net));
      else if (['REVENUE', 'EXPENSE'].includes(byAccount.get(id)!.type)) previousProfitAndLoss = add(previousProfitAndLoss, net);
      const fingerprint = ledgerHash(JSON.stringify([entry.key, id, posting.debitCents, posting.creditCents, posting.memo]));
      const occurrence = occurrences.get(fingerprint) || 0; occurrences.set(fingerprint, occurrence + 1);
      posting.key = `${fingerprint}:${occurrence}`; // Repeated equal lines remain distinct; no invented provider line IDs.
    }
    if (totalDebit !== totalCredit || (totalDebit > 0 && entry.postings.length < 2)) reject('a transaction is not balanced');
  }

  // Intuit TrialBalance uses fiscal-year-to-date P&L and carries earlier net income
  // into Retained Earnings even when start_date is earlier. Do not compare all-time
  // revenue against fiscal YTD, or post a second fabricated closing journal.
  const retained = accounts.filter((account) => account.sourceSubtype === 'RetainedEarnings');
  if (previousProfitAndLoss !== 0 && (retained.length !== 1 || retained[0].type !== 'EQUITY')) reject('prior-year earnings cannot be reconciled to a unique retained-earnings account');
  const expected = new Map(accounts.map((account) => [account.sourceId,
    ['REVENUE', 'EXPENSE'].includes(account.type) ? currentBalances.get(account.sourceId) || 0 : allBalances.get(account.sourceId) || 0]));
  if (previousProfitAndLoss !== 0) expected.set(retained[0].sourceId, add(expected.get(retained[0].sourceId) || 0, previousProfitAndLoss));
  const trialColumns = reportShape(trial, 'TrialBalance', scope);
  const accountIndex = requiredColumn(trialColumns, 'account_name');
  const debitIndex = requiredColumn(trialColumns, 'debt_amt'), creditIndex = requiredColumn(trialColumns, 'credit_amt');
  const actual = new Map<string, number>();
  let trialDebit = 0, trialCredit = 0;
  walkRows(trial.Rows.Row || [], (row) => {
    const data = cells(row, trial.Columns.Column.length), id = data[accountIndex].id;
    if (!id || !byAccount.has(id) || actual.has(id)) reject('trial balance contains missing, unknown or duplicate account IDs');
    const debit = reportCents(data[debitIndex].value), credit = reportCents(data[creditIndex].value);
    if (debit < 0 || credit < 0 || (debit && credit)) reject('invalid trial-balance debit or credit');
    trialDebit = add(trialDebit, debit); trialCredit = add(trialCredit, credit); actual.set(id, debit - credit);
  }, trial.Columns.Column.length);
  if (trialDebit !== trialCredit) reject('trial balance is not balanced');
  if (actual.size === 0 && trial.Header.Option?.find((option) => option.Name === 'NoReportData')?.Value !== 'true') reject('empty trial balance was not confirmed');
  for (const [id, balance] of expected) if ((actual.get(id) || 0) !== balance) reject('general ledger does not reconcile to the independent trial balance');
  return { accounts, transactions: [...entries.values()].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key)), postingCount, scope };
}
