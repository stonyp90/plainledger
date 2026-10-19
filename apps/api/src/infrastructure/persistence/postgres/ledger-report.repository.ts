import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountType } from '@domain/entities/Account';
import { ILedgerReportRepository, LedgerTotals } from '@application/ports/outbound/ILedgerReportRepository';

interface LedgerRow {
  id: string;
  code: string;
  name: string;
  name_fr?: string;
  account_type: AccountType;
  account_subtype?: string;
  debit_total: string;
  credit_total: string;
  has_posted_entries: boolean;
  has_invalid_entries: boolean;
}

function cents(value: string): number {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) throw new UnprocessableEntityException('Invalid posted ledger amount');
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount)) throw new UnprocessableEntityException('Posted ledger amount exceeds supported precision');
  return amount;
}

@Injectable()
export class LedgerReportRepository implements ILedgerReportRepository {
  constructor(private readonly database: DataSource) {}

  async getTotals(organizationId: string, endDate: Date, startDate?: Date): Promise<LedgerTotals> {
    const rows = await this.database.query<LedgerRow[]>(`
      WITH eligible_entries AS (
        SELECT id FROM accounting.journal_entries
        WHERE organization_id = $1 AND status = 'POSTED'
          AND entry_date <= $2::date AND ($3::date IS NULL OR entry_date >= $3::date)
      ), invalid_entries AS (
        SELECT e.id FROM eligible_entries e
        LEFT JOIN accounting.journal_entry_lines l ON l.journal_entry_id = e.id
        LEFT JOIN accounting.accounts a ON a.id = l.account_id
        GROUP BY e.id
        HAVING COUNT(l.id) = 0 OR SUM(l.debit_amount) <> SUM(l.credit_amount)
          OR BOOL_OR(a.organization_id <> $1 OR l.debit_amount IS NULL OR l.credit_amount IS NULL
            OR l.debit_amount < 0 OR l.credit_amount < 0
            OR (l.debit_amount > 0 AND l.credit_amount > 0))
      ), totals AS (
        SELECT l.account_id, SUM(l.debit_amount) AS debit_total, SUM(l.credit_amount) AS credit_total
        FROM accounting.journal_entry_lines l
        JOIN eligible_entries e ON e.id = l.journal_entry_id GROUP BY l.account_id
      )
      SELECT a.id, a.code, a.name, a.name_fr, a.account_type, a.account_subtype,
        COALESCE(t.debit_total, 0)::text AS debit_total, COALESCE(t.credit_total, 0)::text AS credit_total,
        EXISTS(SELECT 1 FROM accounting.journal_entries WHERE organization_id = $1 AND status = 'POSTED') AS has_posted_entries,
        EXISTS(SELECT 1 FROM invalid_entries) AS has_invalid_entries
      FROM accounting.accounts a LEFT JOIN totals t ON t.account_id = a.id
      WHERE a.organization_id = $1 ORDER BY a.display_order, a.code
    `, [organizationId, endDate.toISOString().slice(0, 10), startDate?.toISOString().slice(0, 10) ?? null]);
    if (rows.some((row) => row.has_invalid_entries)) {
      throw new UnprocessableEntityException('Posted journal entries must balance and reference accounts in this organization');
    }
    return {
      hasPostedEntries: rows.some((row) => row.has_posted_entries),
      accounts: rows.map((row) => ({
        accountId: row.id, accountCode: row.code, accountName: row.name, accountNameFr: row.name_fr,
        accountType: row.account_type, accountSubtype: row.account_subtype,
        debitCents: cents(row.debit_total), creditCents: cents(row.credit_total),
      })),
    };
  }
}
