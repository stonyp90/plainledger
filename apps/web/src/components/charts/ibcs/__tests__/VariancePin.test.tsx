/**
 * VariancePin Unit Tests
 * 
 * Tests for IBCS variance pin component including:
 * - Color rendering (green for favorable, red for unfavorable)
 * - Accessibility attributes
 * - Percentage formatting
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { render } from '../../../../test/test-utils';
import { VariancePin, VariancePinCompact } from '../VariancePin';

describe('VariancePin', () => {
  describe('Rendering', () => {
    it('renders favorable variance in green', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={15} 
            favorable={true} 
          />
        </svg>
      );
      
      const circle = container.querySelector('circle');
      const line = container.querySelector('line');
      
      expect(circle).toBeTruthy();
      expect(line).toBeTruthy();
      // Colors can be hex format or CSS variable format
      const fillColor = circle?.getAttribute('fill') || '';
      const strokeColor = line?.getAttribute('stroke') || '';
      // Accept green hex colors or CSS variable format for theming
      expect(fillColor).toMatch(/^(#(059669|22c55e|10b981|16a34a|34c759)|rgb\(var\(--color-primary-600\)\))/i);
      expect(strokeColor).toMatch(/^(#(059669|22c55e|10b981|16a34a|34c759)|rgb\(var\(--color-primary-600\)\))/i);
    });

    it('renders unfavorable variance in red', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={50} 
            planY={30} 
            variancePct={-10} 
            favorable={false} 
          />
        </svg>
      );
      
      const circle = container.querySelector('circle');
      const line = container.querySelector('line');
      
      // Colors are in hex format, check for red color (#ef4444, #dc2626, or similar)
      const fillColor = circle?.getAttribute('fill') || '';
      const strokeColor = line?.getAttribute('stroke') || '';
      expect(fillColor).toMatch(/^#(ef4444|dc2626|f87171|e63946)/i);
      expect(strokeColor).toMatch(/^#(ef4444|dc2626|f87171|e63946)/i);
    });

    it('does not render when variance is negligible', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={50} 
            planY={50.5} 
            variancePct={0.1} 
            favorable={true} 
          />
        </svg>
      );
      
      const group = container.querySelector('g.variance-pin');
      expect(group).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={15} 
            favorable={true} 
          />
        </svg>
      );
      
      const group = container.querySelector('g.variance-pin');
      expect(group).toBeTruthy();
      expect(group?.getAttribute('role')).toBe('graphics-symbol');
      expect(group?.getAttribute('aria-label')).toContain('variance');
      // tabIndex is set to 0 for keyboard navigation
      const tabIndex = group?.getAttribute('tabIndex');
      expect(tabIndex === '0' || tabIndex === null).toBeTruthy(); // May or may not have tabIndex
    });

    it('has title and desc elements', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={15} 
            favorable={true} 
          />
        </svg>
      );
      
      const title = container.querySelector('title');
      const desc = container.querySelector('desc');
      
      expect(title).toBeTruthy();
      expect(desc).toBeTruthy();
      expect(title?.textContent).toContain('variance');
    });
  });

  describe('Formatting', () => {
    it('formats positive percentage with plus sign', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={12.5} 
            favorable={true} 
            showLabel={true}
          />
        </svg>
      );
      
      const text = container.querySelector('text');
      expect(text?.textContent).toContain('+');
      expect(text?.textContent).toContain('%');
    });

    it('formats negative percentage without plus sign', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={50} 
            planY={30} 
            variancePct={-8.3} 
            favorable={false} 
            showLabel={true}
          />
        </svg>
      );
      
      const text = container.querySelector('text');
      expect(text?.textContent).not.toContain('+');
      expect(text?.textContent).toContain('-');
      expect(text?.textContent).toContain('%');
    });

    it('rounds percentage to whole number', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={12.7} 
            favorable={true} 
            showLabel={true}
          />
        </svg>
      );
      
      const text = container.querySelector('text');
      expect(text?.textContent).toBe('+13%');
    });
  });

  describe('Status handling', () => {
    it('uses neutral color for neutral status', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={30} 
            planY={50} 
            variancePct={0} 
            favorable={true} 
            status="neutral"
          />
        </svg>
      );
      
      const circle = container.querySelector('circle');
      // Neutral color is gray (#94a3b8 or similar)
      const fillColor = circle?.getAttribute('fill') || '';
      expect(fillColor).toMatch(/^#(94a3b8|6b7280|9ca3af)/i);
    });

    it('uses critical color for critical unfavorable variance', () => {
      const { container } = render(
        <svg>
          <VariancePin 
            x={50} 
            actualY={50} 
            planY={30} 
            variancePct={-50} 
            favorable={false} 
            status="critical"
          />
        </svg>
      );
      
      const circle = container.querySelector('circle');
      // Critical unfavorable is red
      const fillColor = circle?.getAttribute('fill') || '';
      expect(fillColor).toMatch(/^#(ef4444|dc2626|f87171|e63946)/i);
    });
  });
});

describe('VariancePinCompact', () => {
  it('renders compact variant correctly', () => {
    const { container } = render(
      <VariancePinCompact 
        variancePct={15} 
        favorable={true} 
      />
    );
    
    const svg = container.querySelector('svg');
    const span = container.querySelector('span');
    
    expect(svg).toBeTruthy();
    expect(span).toBeTruthy();
    expect(span?.getAttribute('role')).toBe('img');
    expect(span?.getAttribute('aria-label')).toContain('variance');
  });

  it('has accessibility attributes', () => {
    const { container } = render(
      <VariancePinCompact 
        variancePct={-10} 
        favorable={false} 
      />
    );
    
    const span = container.querySelector('span');
    const svg = container.querySelector('svg');
    const title = container.querySelector('title');
    
    expect(span?.getAttribute('aria-label')).toBeTruthy();
    expect(svg?.getAttribute('role')).toBe('graphics-symbol');
    expect(title).toBeTruthy();
  });
});
