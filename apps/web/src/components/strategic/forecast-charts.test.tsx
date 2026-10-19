import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test/test-utils';
import BurnRateChart from './BurnRateChart';
import CashForecastChart from './CashForecastChart';

const point = { date: '2026-01-01', cash: 100, revenue: 200, expenses: 50, confidence: 0.8 };

function expectFinitePlot(container: HTMLElement) {
  const svg = container.querySelector('svg[viewBox="0 0 800 200"]');
  expect(svg).toBeTruthy();
  expect(svg!.innerHTML).not.toMatch(/NaN|Infinity/);
}

describe('Cash and burn chart boundary states', () => {
  it('retains an empty state for an empty forecast', () => {
    render(<CashForecastChart forecast={{ historical: [], projected: [] }} currentCash={0} />);
    expect(screen.getByRole('status')).toBeVisible();
  });
  it('centers one cash observation with finite coordinates', () => {
    const { container } = render(<CashForecastChart forecast={{ historical: [point], projected: [] }} currentCash={100} />);
    expectFinitePlot(container);
    expect(container.querySelector('circle')).toHaveAttribute('cx', '400');
  });
  it.each([NaN, Infinity, 'invalid' as unknown as number])('rejects invalid cash %s', cash => {
    render(<CashForecastChart forecast={{ historical: [], projected: [{ ...point, cash }] }} currentCash={100} />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('keeps negative cash and confidence bands within the plot', () => {
    const { container } = render(<CashForecastChart forecast={{ historical: [], projected: [{ ...point, cash: -100 }, { ...point, date: '2026-02-01', cash: 1000 }] }} currentCash={0} />);
    expectFinitePlot(container);
    const lines = container.querySelectorAll('svg[viewBox="0 0 800 200"] line');
    for (const line of lines) {
      for (const attr of ['y1', 'y2']) {
        const value = Number(line.getAttribute(attr));
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(200);
      }
    }
  });
  it('centers a single burn observation', () => {
    const { container } = render(<BurnRateChart historical={[{ ...point, netBurn: 0, grossBurn: 50 }]} projected={[]} />);
    expectFinitePlot(container);
    expect(container.querySelector('circle')).toHaveAttribute('cx', '400');
  });
  it('keeps profitable negative burn distinct from cash consumption', () => {
    const { container } = render(<BurnRateChart historical={[{ ...point, netBurn: -50, grossBurn: 50 }, { ...point, date: '2026-02-01', netBurn: 50, grossBurn: 50 }]} projected={[]} />);
    expectFinitePlot(container);
    const dots = container.querySelectorAll('svg[viewBox="0 0 800 200"] circle[fill="transparent"]');
    expect(Number(dots[0].getAttribute('cy'))).toBeGreaterThan(Number(dots[1].getAttribute('cy')));
  });
  it('rejects corrupt burn dates', () => {
    render(<BurnRateChart historical={[{ ...point, date: 'wrong', netBurn: 50, grossBurn: 50 }]} projected={[]} />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
});
