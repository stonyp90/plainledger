import { QuickBooksAccount } from '@domain/datalake/provider-types';
import { QuickBooksRawReportResponse, QuickBooksRawRow } from '@domain/datalake/bronze-quickbooks-reports';
import { LedgerReportPart, LedgerScope } from '@infrastructure/adapters/accounting/quickbooks/quickbooks-ledger';

/** Isolated synthetic double-entry data. No customer records or provider calls. */
export function ledgerFixture() {
  const scope: LedgerScope = { startDate: '1900-01-01', endDate: '2026-10-19', fiscalYearStart: '2026-01-01', currency: 'CAD', multiCurrency: false };
  const definitions = [
    ['1', 'Cash', 'Bank', 'CashOnHand', 'Asset'],
    ['2', 'Revenue', 'Income', 'ServiceFeeIncome', 'Revenue'],
    ['3', 'Expense', 'Expense', 'OfficeGeneralAdministrativeExpenses', 'Expense'],
    ['4', 'Accounts payable', 'Accounts Payable', 'AccountsPayable', 'Liability'],
    ['5', 'Retained earnings', 'Equity', 'RetainedEarnings', 'Equity'],
    ['6', 'Accounts receivable', 'Accounts Receivable', 'AccountsReceivable', 'Asset'],
  ];
  const accounts = definitions.map(([Id, Name, AccountType, AccountSubType, Classification]): QuickBooksAccount => ({
    Id, Name, AccountType, AccountSubType, Classification: Classification as QuickBooksAccount['Classification'], Active: Id !== '3',
    AcctNum: `${Id}000`, CurrentBalance: 0, FullyQualifiedName: Name, CurrencyRef: { value: 'CAD', name: 'Canadian Dollar' },
    MetaData: { CreateTime: '2020-01-01T00:00:00Z', LastUpdatedTime: '2026-01-01T00:00:00Z' },
  }));
  // Each line is a posting to the section's own account. The split/counterparty
  // account column is deliberately absent and must never supply this identity.
  const posting = (date: string, type: string, id: string, debit: string, credit: string, memo = ''): QuickBooksRawRow => ({
    type: 'Data', ColData: [{ value: date }, { value: type, id }, { value: `DOC-${id}` }, { value: memo }, { value: debit }, { value: credit }],
  });
  const sections: Record<string, QuickBooksRawRow[]> = {
    '1': [posting('2026-01-06', 'Payment', '11', '100.00', ''), posting('2026-01-08', 'Bill Payment (Cheque)', '13', '', '65.00')],
    '2': [posting('2026-01-05', 'Invoice', '10', '', '50.00', 'equal invoice line'), posting('2026-01-05', 'Invoice', '10', '', '50.00', 'equal invoice line'), posting('2026-01-09', 'Credit Memo', '14', '20.00', '')],
    '3': [posting('2026-01-07', 'Bill', '12', '65.00', '')],
    '4': [posting('2026-01-07', 'Bill', '12', '', '65.00'), posting('2026-01-08', 'Bill Payment (Cheque)', '13', '65.00', '')],
    '6': [posting('2026-01-05', 'Invoice', '10', '100.00', ''), posting('2026-01-06', 'Payment', '11', '', '100.00'), posting('2026-01-09', 'Credit Memo', '14', '', '20.00')],
  };
  const header = (name: string) => ({ ReportName: name, ReportBasis: 'Accrual', StartPeriod: scope.startDate, EndPeriod: scope.endDate, Currency: scope.currency, Option: [{ Name: 'NoReportData', Value: 'false' }] });
  const generalLedger: QuickBooksRawReportResponse = {
    Header: header('GeneralLedger'),
    Columns: { Column: ['tx_date', 'txn_type', 'doc_num', 'memo', 'debt_amt', 'credit_amt'].map((key) => ({ ColTitle: key, ColType: 'String', MetaData: [{ Name: 'ColKey', Value: key }] })) },
    Rows: { Row: Object.entries(sections).map(([id, rows]) => ({ type: 'Section', Header: { ColData: [{ value: accounts.find((account) => account.Id === id)!.Name, id }] }, Rows: { Row: rows }, Summary: { ColData: [{ value: 'ignored section total' }] } })) },
  };
  const trial: QuickBooksRawReportResponse = {
    Header: header('TrialBalance'),
    Columns: { Column: [{ ColTitle: '', ColType: 'Account' }, { ColTitle: 'Debit', ColType: 'Money' }, { ColTitle: 'Credit', ColType: 'Money' }] },
    Rows: { Row: [
      { ColData: [{ value: 'Cash', id: '1' }, { value: '35.00' }, { value: '' }] },
      { ColData: [{ value: 'Revenue', id: '2' }, { value: '' }, { value: '80.00' }] },
      { ColData: [{ value: 'Expense', id: '3' }, { value: '65.00' }, { value: '' }] },
      { ColData: [{ value: 'Accounts receivable', id: '6' }, { value: '' }, { value: '20.00' }] },
      { type: 'Section', Summary: { ColData: [{ value: 'TOTAL' }, { value: '100.00' }, { value: '100.00' }] } },
    ] },
  };
  const parts: LedgerReportPart[] = [{ report: generalLedger, startDate: scope.startDate, endDate: scope.endDate }];
  return { scope, accounts, generalLedger, trial, parts, posting, sections };
}
