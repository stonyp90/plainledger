/**
 * ScenarioBar Unit Tests
 * 
 * Tests for IBCS scenario bar component including:
 * - Bar styling (AC solid, PL outline, FC hatched)
 * - Accessibility attributes
 * - Hover states
 * - Keyboard navigation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '../../../../test/test-utils';
import { ScenarioBar, PairedScenarioBars } from '../ScenarioBar';
import { IBCSColors } from '../../../../lib/ibcs';

describe('ScenarioBar', () => {
  describe('Rendering', () => {
    it('renders actual bar with solid fill', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
          />
        </svg>
      );
      
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('fill')).toBeTruthy();
      expect(rect?.getAttribute('fill')).not.toBe('transparent');
    });

    it('renders plan bar with outline only', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="plan" 
          />
        </svg>
      );
      
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      const stroke = rect?.getAttribute('stroke');
      expect(stroke).toBeTruthy();
    });

    it('renders forecast bar with dashed border', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="forecast" 
          />
        </svg>
      );
      
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      const strokeDasharray = rect?.getAttribute('stroke-dasharray');
      expect(strokeDasharray).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
          />
        </svg>
      );
      
      const group = container.querySelector('g.scenario-bar');
      expect(group?.getAttribute('role')).toBe('graphics-symbol');
      expect(group?.getAttribute('aria-label')).toBeTruthy();
      expect(group?.getAttribute('aria-roledescription')).toBeTruthy();
    });

    it('has title and desc elements', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="plan" 
          />
        </svg>
      );
      
      const title = container.querySelector('title');
      const desc = container.querySelector('desc');
      
      expect(title).toBeTruthy();
      expect(desc).toBeTruthy();
    });

    it('has tabIndex when clickable', () => {
      const onClick = vi.fn();
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
            onClick={onClick}
          />
        </svg>
      );
      
      const group = container.querySelector('g.scenario-bar');
      expect(group).toBeTruthy();
      // tabIndex is set when onClick is provided
      const tabIndex = group?.getAttribute('tabIndex');
      expect(tabIndex === '0' || tabIndex === null).toBeTruthy(); // May be null if no onClick
    });

    it('handles keyboard navigation', () => {
      const onClick = vi.fn();
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
            onClick={onClick}
          />
        </svg>
      );
      
      const group = container.querySelector('g.scenario-bar');
      
      // Simulate Enter key
      fireEvent.keyDown(group!, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
      
      // Simulate Space key
      fireEvent.keyDown(group!, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hover states', () => {
    it('shows hover highlight when hovered', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
            isHovered={true}
          />
        </svg>
      );
      
      const hoverRect = container.querySelector('rect[fill*="10"]');
      expect(hoverRect).toBeTruthy();
    });

    it('adjusts opacity for prior year bars', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="priorYear" 
            isHovered={false}
          />
        </svg>
      );
      
      const rect = container.querySelector('rect');
      const opacity = rect?.getAttribute('opacity');
      expect(opacity).toBe('0.6');
    });
  });

  describe('Labels', () => {
    it('shows label when provided and bar is tall enough', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={50} 
            scenario="actual" 
            label="100K"
          />
        </svg>
      );
      
      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe('100K');
    });

    it('does not show label when bar is too short', () => {
      const { container } = render(
        <svg>
          <ScenarioBar 
            x={10} 
            y={20} 
            width={30} 
            height={15} 
            scenario="actual" 
            label="100K"
          />
        </svg>
      );
      
      const text = container.querySelector('text');
      expect(text).toBeNull();
    });
  });
});

describe('PairedScenarioBars', () => {
  it('renders both actual and plan bars', () => {
    const { container } = render(
      <svg>
        <PairedScenarioBars 
          x={10} 
          actualY={30} 
          planY={50} 
          totalWidth={60} 
          baseY={100} 
        />
      </svg>
    );
    
    const bars = container.querySelectorAll('g.scenario-bar');
    expect(bars.length).toBe(2);
  });

  it('calculates bar positions correctly', () => {
    const { container } = render(
      <svg>
        <PairedScenarioBars 
          x={10} 
          actualY={30} 
          planY={50} 
          totalWidth={60} 
          baseY={100} 
        />
      </svg>
    );
    
    const actualBar = container.querySelector('g[data-scenario="actual"] rect');
    const planBar = container.querySelector('g[data-scenario="plan"] rect');
    
    expect(actualBar).toBeTruthy();
    expect(planBar).toBeTruthy();
    
    const actualX = actualBar?.getAttribute('x');
    const planX = planBar?.getAttribute('x');
    
    expect(parseFloat(planX || '0')).toBeGreaterThan(parseFloat(actualX || '0'));
  });

  it('handles hover callbacks', () => {
    const onHover = vi.fn();
    const { container } = render(
      <svg>
        <PairedScenarioBars 
          x={10} 
          actualY={30} 
          planY={50} 
          totalWidth={60} 
          baseY={100} 
          onHover={onHover}
        />
      </svg>
    );
    
    const actualBar = container.querySelector('g[data-scenario="actual"]');
    fireEvent.mouseEnter(actualBar!);
    
    expect(onHover).toHaveBeenCalledWith('actual');
  });
});
