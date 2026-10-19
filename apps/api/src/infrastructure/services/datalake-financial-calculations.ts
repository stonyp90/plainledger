import { UnprocessableEntityException } from '@nestjs/common';
import type { DashboardData, DimAccount, FactTransaction, WaterfallItem } from './datalake-data.service';

type Category = 'operating' | 'investing' | 'financing';
function invalid(message: string): never { throw new UnprocessableEntityException(message); }
const normalized = (value: string | undefined) => (value || '').replace(/[^a-z]/gi, '').toLowerCase();
export function isCashAccount(account: DimAccount): boolean {
  return account.account_type === 'ASSET' && (['bank', 'cash', 'cashandcashequivalents', 'cashequivalents', 'cashonhand', 'checking', 'savings'].includes(normalized(account.account_subtype)) || /^(cash|bank|checking|savings)(\b|$)/i.test(account.account_name));
}
export function debitNet(transaction: FactTransaction): number {
  for (const value of [transaction.debit_amount, transaction.credit_amount]) {
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) invalid('Ledger amounts must be finite nonnegative amounts in currency cents');
  }
  return Math.round(transaction.debit_amount * 100) - Math.round(transaction.credit_amount * 100);
}
export function accountLookup(accounts: DimAccount[]) {
  const lookup = new Map<string, DimAccount>();
  for (const account of accounts) {
    if (lookup.has(account.account_key)) invalid('Account identifiers are not unique');
    lookup.set(account.account_key, account);
  }
  for (const account of accounts) if (account.source_account_id && !lookup.has(account.source_account_id)) lookup.set(account.source_account_id, account);
  return (transaction: FactTransaction) => lookup.get(transaction.account_key) || invalid('A ledger posting references an unavailable account');
}
export function ledgerCurrency(transactions: FactTransaction[], fallback?: string): string {
  const currencies = new Set(transactions.map((transaction) => transaction.currency_code));
  if (currencies.size > 1) invalid('Mixed currencies require an authoritative conversion before aggregation');
  const currency = currencies.values().next().value || fallback;
  if (!currency || !/^[A-Z]{3}$/.test(currency)) invalid('The reporting currency is unavailable');
  return currency;
}
const money = (cents: number) => {
  if (!Number.isSafeInteger(cents)) invalid('Ledger totals exceed supported monetary precision');
  return cents / 100;
};

export function summarizeLedger(accounts: DimAccount[], transactions: FactTransaction[], startDate?: string): DashboardData['summary'] {
  const accountFor = accountLookup(accounts);
  const sums = { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalRevenue: 0, totalExpenses: 0, netIncome: 0, cashBalance: 0, accountsReceivable: 0, accountsPayable: 0 };
  let retainedIncome = 0;
  let balance = 0;
  for (const transaction of transactions) {
    const account = accountFor(transaction), net = debitNet(transaction), inPeriod = !startDate || transaction.transaction_date.slice(0, 10) >= startDate;
    balance += net;
    switch (account.account_type) {
      case 'ASSET':
        sums.totalAssets += net;
        if (isCashAccount(account)) sums.cashBalance += net;
        if (normalized(account.account_subtype).includes('receivable') || /receivable|a\/r/i.test(account.account_name)) sums.accountsReceivable += net;
        break;
      case 'LIABILITY':
        sums.totalLiabilities -= net;
        if (normalized(account.account_subtype).includes('payable') || /payable|a\/p/i.test(account.account_name)) sums.accountsPayable -= net;
        break;
      case 'EQUITY': sums.totalEquity -= net; break;
      case 'REVENUE': retainedIncome -= net; if (inPeriod) sums.totalRevenue -= net; break;
      case 'EXPENSE': retainedIncome -= net; if (inPeriod) sums.totalExpenses += net; break;
      default: invalid('An account has an unsupported accounting type');
    }
  }
  if (balance !== 0) invalid('The available ledger does not balance; summary figures are unavailable');
  sums.totalEquity += retainedIncome;
  sums.netIncome = sums.totalRevenue - sums.totalExpenses;
  return Object.fromEntries(Object.entries(sums).map(([key, value]) => [key, money(value)])) as unknown as DashboardData['summary'];
}

export function ledgerTrends(accounts: DimAccount[], transactions: FactTransaction[]): DashboardData['trends'] {
  const accountFor = accountLookup(accounts), months = new Map<string, { revenue: number; expenses: number; cashFlow: number }>();
  for (const transaction of transactions) {
    const account = accountFor(transaction), month = transaction.transaction_date.slice(0, 7);
    const totals = months.get(month) || { revenue: 0, expenses: 0, cashFlow: 0 };
    const net = debitNet(transaction);
    if (account.account_type === 'REVENUE') totals.revenue -= net;
    if (account.account_type === 'EXPENSE') totals.expenses += net;
    if (isCashAccount(account)) totals.cashFlow += net;
    months.set(month, totals);
  }
  const sorted = [...months].sort(([left], [right]) => left.localeCompare(right));
  return {
    revenue: sorted.map(([period, value]) => ({ period: `${period}-01`, value: money(value.revenue) })),
    expenses: sorted.map(([period, value]) => ({ period: `${period}-01`, value: money(value.expenses) })),
    cashFlow: sorted.map(([period, value]) => ({ period: `${period}-01`, value: money(value.cashFlow) })),
  };
}

export function cashMovements(accounts: DimAccount[], transactions: FactTransaction[], startDate?: string, endDate?: string) {
  const accountFor = accountLookup(accounts), groups = new Map<string, FactTransaction[]>();
  let opening = 0, inflows = 0, outflows = 0;
  const categories = { operating: 0, investing: 0, financing: 0 };
  let classified = true;
  for (const transaction of transactions) {
    if (endDate && transaction.transaction_date.slice(0, 10) > endDate) continue;
    const account = accountFor(transaction);
    if (startDate && transaction.transaction_date.slice(0, 10) < startDate) {
      if (isCashAccount(account)) opening += debitNet(transaction);
      continue;
    }
    const identity = transaction.transaction_id || transaction.source_transaction_id;
    if (!identity) invalid('Source transaction identities are required for cash flow');
    const key = `${transaction.source_system}:${identity}:${transaction.transaction_date.slice(0, 10)}`;
    const group = groups.get(key);
    if (group) group.push(transaction); else groups.set(key, [transaction]);
  }
  for (const lines of groups.values()) {
    let cash = 0, balance = 0;
    const kinds = new Set<Category | null>();
    for (const transaction of lines) {
      const account = accountFor(transaction), net = debitNet(transaction);
      balance += net;
      if (isCashAccount(account)) cash += net;
      else if (net) kinds.add(cashCategory(account));
    }
    if (balance !== 0) invalid('Complete balanced transaction postings are required for cash flow');
    if (!cash) continue; // Transfers between cash accounts do not create receipts/payments.
    if (cash > 0) inflows += cash; else outflows -= cash;
    if (kinds.size === 1 && !kinds.has(null)) categories[[...kinds][0] as Category] += cash;
    else classified = false;
  }
  return { opening: money(opening), closing: money(opening + inflows - outflows), inflows: money(inflows), outflows: money(outflows), netCashFlow: money(inflows - outflows), classified,
    categories: { operating: money(categories.operating), investing: money(categories.investing), financing: money(categories.financing) } };
}
function cashCategory(account: DimAccount): Category | null {
  const subtype = normalized(account.account_subtype);
  if (account.account_type === 'EQUITY') return 'financing';
  if (account.account_type === 'REVENUE' || account.account_type === 'EXPENSE') return 'operating';
  if (account.account_type === 'ASSET') {
    if (/fixed|intangible|investment/.test(subtype)) return 'investing';
    if (/receivable|inventory|currentasset|prepaid/.test(subtype)) return 'operating';
  }
  if (account.account_type === 'LIABILITY') {
    if (/loan|debt|mortgage|longterm/.test(subtype)) return 'financing';
    if (/payable|tax|accrued|deferredrevenue/.test(subtype)) return 'operating';
  }
  return null;
}
export function cashWaterfall(accounts: DimAccount[], transactions: FactTransaction[], startDate?: string, endDate?: string): WaterfallItem[] {
  if (!transactions.length) return [];
  const flow = cashMovements(accounts, transactions, startDate, endDate);
  if (!flow.classified) invalid('Cash movements are available, but some source transactions do not support a reliable operating, investing, or financing split');
  return [
    { label: 'Ouverture', labelEn: 'Opening Cash', value: flow.opening, type: 'start', category: 'opening' },
    ...(['operating', 'investing', 'financing'] as const).map((category): WaterfallItem => ({ label: category, labelEn: `${category[0].toUpperCase()}${category.slice(1)} Cash Flow`, value: flow.categories[category], type: flow.categories[category] < 0 ? 'decrease' : 'increase', category })),
    { label: 'Clôture', labelEn: 'Closing Cash', value: flow.closing, type: 'end', category: 'closing' },
  ];
}
