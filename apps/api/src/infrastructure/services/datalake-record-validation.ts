import { UnprocessableEntityException } from '@nestjs/common';
import type { DimAccount, FactAccountBalance, FactTransaction } from './datalake-data.service';

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function amount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER / 100;
}
function day(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
}
function reject(kind: string): never {
  throw new UnprocessableEntityException(`Gold ${kind} data is invalid; correct and reimport the source data`);
}

export function validateGoldAccounts(rows: DimAccount[]): DimAccount[] {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!text(row.account_key) || !text(row.account_code) || !text(row.account_name) ||
      !['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(row.account_type) || keys.has(row.account_key)) reject('account');
    keys.add(row.account_key);
  }
  return rows;
}

export function validateGoldTransactions(rows: FactTransaction[]): FactTransaction[] {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!text(row.transaction_key) || !text(row.account_key) || !day(row.transaction_date) ||
      !amount(row.amount) || !amount(row.debit_amount) || !amount(row.credit_amount) ||
      row.debit_amount < 0 || row.credit_amount < 0 || !/^[A-Z]{3}$/.test(row.currency_code) || keys.has(row.transaction_key)) reject('transaction');
    keys.add(row.transaction_key);
  }
  return rows;
}

export function validateGoldBalances(rows: FactAccountBalance[]): FactAccountBalance[] {
  for (const row of rows) {
    if (!text(row.account_key) || !day(row.as_of_date) || !amount(row.closing_balance) ||
      !['MTD', 'QTD', 'YTD', 'CUMULATIVE'].includes(row.balance_type) || !/^[A-Z]{3}$/.test(row.currency_code)) reject('balance');
  }
  return rows;
}
