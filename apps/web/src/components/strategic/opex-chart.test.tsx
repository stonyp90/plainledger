import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OpExCapExChart from './OpExCapExChart';
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: 'en' }) }));
const point = { month: '2026-01', categories: { salaries: 0, equipment: -50 }, total: -50 };
describe('Expense projection chart boundary states', () => {
  it('does not invent observations for an empty report', () => {
    const { container } = render(<OpExCapExChart historicalData={[]} projectedData={[]} />);
    expect(container.querySelector('[data-chart-state="empty"]')).not.toBeNull();
  });
  it('handles projected-only data without a fabricated or nonfinite monthly average', () => {
    const { container } = render(<OpExCapExChart historicalData={[]} projectedData={[point]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByText('—')).toBeVisible();
    expect(container.querySelector('svg[viewBox="0 0 100 100"]')?.innerHTML).not.toMatch(/NaN|Infinity/);
    for (const rect of container.querySelectorAll('rect')) expect(parseFloat(rect.getAttribute('height') || '0')).toBeGreaterThanOrEqual(0);
  });
  it.each([
    [{ ...point, total: NaN }],
    [{ ...point, total: 1 }],
    [point, point],
    [{ ...point, categories: { unclassified: 5 }, total: 5 }],
  ].map(data => ({ data })))('identifies corrupt, ambiguous, or unclassified amounts', ({ data }) => {
    render(<OpExCapExChart historicalData={data} projectedData={[]} />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('retains every period through bounded chart pages', () => {
    const data = Array.from({ length: 121 }, (_, index) => ({ month: `${2000 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`, categories: { salaries: index }, total: index }));
    const { container } = render(<OpExCapExChart historicalData={data} projectedData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('1–60 / 121')).toBeVisible();
    expect(container.querySelector('svg[viewBox="0 0 100 100"]')!.querySelectorAll('rect').length).toBeLessThanOrEqual(480);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('61–120 / 121')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('121–121 / 121')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
