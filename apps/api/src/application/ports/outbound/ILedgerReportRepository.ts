import { AccountType } from '@domain/entities/Account';

export interface LedgerAccountTotal {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameFr?: string;
  accountType: AccountType;
  accountSubtype?: string;
  debitCents: number;
  creditCents: number;
}

export interface LedgerTotals {
  accounts: LedgerAccountTotal[];
  hasPostedEntries: boolean;
}

/** Posted journal lines are the dated source of record, not undated monthly caches. */
export interface ILedgerReportRepository {
  getTotals(organizationId: string, endDate: Date, startDate?: Date): Promise<LedgerTotals>;
}
