import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IncomeStatement from '../IncomeStatement';
import BalanceSheet from '../BalanceSheet';
import type { AccountBalanceExtended, BalanceSheetData, IncomeStatementData } from '../../lib/financialData';

const state = vi.hoisted(() => ({
  income: { data: null as IncomeStatementData | null, isLoading: false, error: null as Error | null, refresh: vi.fn() },
  balance: { data: null as BalanceSheetData | null, isLoading: false, error: null as Error | null, refresh: vi.fn() },
  incomeHook: vi.fn(), balanceHook: vi.fn(), language: 'en',
}));
vi.mock('../../hooks/useFinancialData', () => ({
  useIncomeStatement: (...args: unknown[]) => { state.incomeHook(...args); return state.income; },
  useBalanceSheet: (...args: unknown[]) => { state.balanceHook(...args); return state.balance; },
}));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { name: 'Fixture Organization', settings: { currency: 'CAD' } } }) }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: state.language }) }));

const line = (code: string, current: number, type: AccountBalanceExtended['type'] = 'revenue', name = `Account ${code}`): AccountBalanceExtended => ({ code, name, current, prior: 0, type });
const income = (): IncomeStatementData => ({ periodStart: '2026-01-01', periodEnd: '2026-01-31', comparisonPeriodStart: '', comparisonPeriodEnd: '', currency: 'CAD', organizationId: 'fixture', revenue: [], costOfGoodsSold: [], operatingExpenses: [], otherIncome: [], otherExpenses: [], unclassifiedExpenses: [], hasComparison: false });
const balance = (): BalanceSheetData => ({ asOfDate: '2026-01-31', comparisonDate: '', currency: 'CAD', organizationId: 'fixture', organizationName: 'Fixture Organization', assets: { currentAssets: [], fixedAssets: [], otherAssets: [], unclassifiedAssets: [] }, liabilities: { currentLiabilities: [], longTermLiabilities: [], unclassifiedLiabilities: [] }, equity: [] });
const mount = (component: React.ReactNode) => render(<MemoryRouter>{component}</MemoryRouter>);

beforeEach(() => {
  state.income.data = income(); state.balance.data = balance(); state.language = 'en';
  for (const result of [state.income, state.balance]) { result.isLoading = false; result.error = null; result.refresh.mockReset().mockResolvedValue(undefined); }
  state.incomeHook.mockClear(); state.balanceHook.mockClear();
  Object.defineProperty(window, 'print', { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe.each([
  { name: 'income statement', key: 'income' as const, Component: IncomeStatement, empty: 'No transactions in this period', unavailable: 'Statement unavailable' },
  { name: 'balance sheet', key: 'balance' as const, Component: BalanceSheet, empty: 'No balances for this date', unavailable: 'Balance sheet unavailable' },
])('$name lifecycle', ({ key, Component, empty, unavailable }) => {
  it('distinguishes an empty report from a zero-valued account and disables export', () => {
    const view = mount(<Component />);
    expect(screen.getByRole('heading', { name: empty })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    if (key === 'income') state.income.data = { ...state.income.data!, revenue: [line('4000', 0)] };
    else state.balance.data = { ...state.balance.data!, assets: { ...state.balance.data!.assets, currentAssets: [line('1000', 0, 'asset')] } };
    view.rerender(<MemoryRouter><Component /></MemoryRouter>);
    expect(screen.queryByRole('heading', { name: empty })).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('$0.00');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });

  it('shows loading without an empty-state or usable export', () => {
    state[key].isLoading = true;
    mount(<Component />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/);
    expect(screen.queryByRole('heading', { name: empty })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('keeps server errors and failed refreshes visible and retryable', async () => {
    state[key].error = new Error('Source unavailable');
    state[key].refresh.mockRejectedValue(new Error('Still unavailable'));
    mount(<Component />);
    expect(screen.getByRole('heading', { name: unavailable })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Refresh failed. Try again.');
    expect(state[key].refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it.each([NaN, Infinity, -Infinity])('rejects invalid amount %s without displaying it as money', value => {
    if (key === 'income') state.income.data!.revenue = [line('4000', value)];
    else state.balance.data!.assets.currentAssets = [line('1000', value, 'asset')];
    mount(<Component />);
    expect(screen.getByRole('heading', { name: unavailable })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByRole('button', { name: 'Print / save PDF' })).toBeDisabled();
  });
});

describe('Income statement data, dates and complete exports', () => {
  it('preserves refunds, negative expenses, other income and unclassified expenses in the totals', () => {
    Object.assign(state.income.data!, {
      revenue: [line('4000', 100), line('4010', -20, 'revenue', 'Refunds')],
      otherIncome: [line('4900', 5)], operatingExpenses: [line('6000', 10, 'expense')],
      otherExpenses: [line('6900', -3, 'expense')], unclassifiedExpenses: [line('6999', 7, 'expense')],
    });
    mount(<IncomeStatement />);
    expect(screen.getByText('Refunds').closest('tr')).toHaveTextContent('-$20.00');
    expect(screen.getByText('Total revenue').parentElement).toHaveTextContent('$85.00');
    expect(screen.getByText('Total expenses').parentElement).toHaveTextContent('$14.00');
    expect(screen.getByText('Net income · all accounts').closest('tr')).toHaveTextContent('$71.00');
    expect(screen.getByText(/Some expense accounts have no source classification/)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Prior period' })).not.toBeInTheDocument();
  });

  it('does not fabricate a comparison when its amounts are unavailable', () => {
    state.income.data!.hasComparison = true;
    state.income.data!.revenue = [{ ...line('4000', 20), prior: NaN }];
    mount(<IncomeStatement />);
    expect(screen.getByRole('heading', { name: 'Statement unavailable' })).toBeInTheDocument();
  });

  it('validates dates before applying them to the report query', () => {
    mount(<IncomeStatement />);
    fireEvent.change(screen.getByLabelText('Period start'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('Period end'), { target: { value: '2026-01-31' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Apply dates' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('start date on or before the end date');
    expect(state.incomeHook).not.toHaveBeenCalledWith('2026-02-01', '2026-01-31');
    fireEvent.change(screen.getByLabelText('Period start'), { target: { value: '2026-01-01' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Apply dates' }).closest('form')!);
    expect(state.incomeHook).toHaveBeenLastCalledWith('2026-01-01', '2026-01-31');
  });

  it('bounds rendering to 100 of 10000 accounts but exports every account with CSV formula protection', async () => {
    state.income.data!.revenue = Array.from({ length: 10000 }, (_, index) => line(String(index), 1));
    state.income.data!.revenue[0].name = '=HYPERLINK("https://example.invalid")';
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixture');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mount(<IncomeStatement />);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(100);
    expect(screen.getByText('Page 1 of 100 · 10000 accounts')).toBeInTheDocument();
    expect(screen.getByText('Net income · all accounts').closest('tr')).toHaveTextContent('$10,000.00');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(screen.getByRole('table')).getByText('Account 100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const csv = await (create.mock.calls[0][0] as Blob).text();
    expect(csv.split('\r\n')).toHaveLength(10002);
    expect(csv).toContain('Account 9999');
    expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
  });

  it('renders all account pages before invoking print', async () => {
    state.income.data!.revenue = Array.from({ length: 101 }, (_, index) => line(String(index), 1));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      expect(document.querySelectorAll('tbody tr')).toHaveLength(101);
      window.dispatchEvent(new Event('afterprint'));
    });
    mount(<IncomeStatement />);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(100);
    fireEvent.click(screen.getByRole('button', { name: 'Print / save PDF' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelectorAll('tbody tr')).toHaveLength(100));
  });
});

describe('Balance sheet completeness and reconciliation', () => {
  it('preserves every section and warns if assets do not equal liabilities plus equity', () => {
    const data = state.balance.data!;
    data.assets.currentAssets = [line('1000', 100, 'asset')];
    data.assets.fixedAssets = [line('1500', 200, 'asset')];
    data.assets.otherAssets = [line('1800', 30, 'asset')];
    data.assets.unclassifiedAssets = [line('1999', -5, 'asset')];
    data.liabilities.currentLiabilities = [line('2000', 20, 'liability')];
    data.liabilities.longTermLiabilities = [line('2500', 50, 'liability')];
    data.liabilities.unclassifiedLiabilities = [line('2999', 5, 'liability')];
    data.equity = [line('3000', 240, 'equity')];
    mount(<BalanceSheet />);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(8);
    expect(screen.getByRole('alert')).toHaveTextContent('Assets less liabilities and equity: $10.00');
    expect(screen.getByRole('heading', { name: 'Total assets' }).parentElement).toHaveTextContent('$325.00');
    expect(screen.getByText('Account 1999').closest('tr')).toHaveTextContent('-$5.00');
  });

  it('applies an explicit statement date to its query', () => {
    mount(<BalanceSheet />);
    fireEvent.change(screen.getByLabelText('Statement date'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply date' }));
    expect(state.balanceHook).toHaveBeenLastCalledWith('2026-01-31');
  });

  it('exports and prints the complete balance sheet from any selected page', async () => {
    state.balance.data!.assets.currentAssets = Array.from({ length: 101 }, (_, index) => line(String(index), 1, 'asset'));
    state.balance.data!.equity = [line('3000', 101, 'equity')];
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixture');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      expect(document.querySelectorAll('tbody tr')).toHaveLength(102);
      window.dispatchEvent(new Event('afterprint'));
    });
    mount(<BalanceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const csv = await (create.mock.calls[0][0] as Blob).text();
    expect(csv.split('\r\n')).toHaveLength(107);
    expect(csv).toContain('Account 0');
    expect(csv).toContain('Account 100');
    fireEvent.click(screen.getByRole('button', { name: 'Print / save PDF' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelectorAll('tbody tr')).toHaveLength(2));
  });
});
