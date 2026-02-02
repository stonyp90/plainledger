/**
 * Visual Snapshot Tests for IBCS Components
 * 
 * Tests visual rendering accuracy using snapshots.
 * These tests ensure that visual changes are intentional.
 */

import { describe, it, expect } from 'vitest';
import { render } from '../../../../test/test-utils';
import { VariancePin } from '../VariancePin';
import { ScenarioBar } from '../ScenarioBar';
import { IBCSLegend } from '../IBCSLegend';
import { IBCSHeader } from '../IBCSHeader';

describe('IBCS Visual Snapshot Tests', () => {
  describe('VariancePin', () => {
    it('matches snapshot for favorable variance', () => {
      const { container } = render(
        <svg width="200" height="200">
          <VariancePin 
            x={100} 
            actualY={50} 
            planY={80} 
            variancePct={15} 
            favorable={true} 
          />
        </svg>
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for unfavorable variance', () => {
      const { container } = render(
        <svg width="200" height="200">
          <VariancePin 
            x={100} 
            actualY={80} 
            planY={50} 
            variancePct={-10} 
            favorable={false} 
          />
        </svg>
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('ScenarioBar', () => {
    it('matches snapshot for actual bar (AC)', () => {
      const { container } = render(
        <svg width="200" height="200">
          <ScenarioBar 
            x={50} 
            y={50} 
            width={40} 
            height={100} 
            scenario="actual" 
          />
        </svg>
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for plan bar (PL)', () => {
      const { container } = render(
        <svg width="200" height="200">
          <ScenarioBar 
            x={50} 
            y={50} 
            width={40} 
            height={100} 
            scenario="plan" 
          />
        </svg>
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for forecast bar (FC)', () => {
      const { container } = render(
        <svg width="200" height="200">
          <ScenarioBar 
            x={50} 
            y={50} 
            width={40} 
            height={100} 
            scenario="forecast" 
          />
        </svg>
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('IBCSLegend', () => {
    it('matches snapshot for standard legend', () => {
      const { container } = render(
        <IBCSLegend 
          showScenarios={['actual', 'plan']}
          showVariance={true}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for full legend', () => {
      const { container } = render(
        <IBCSLegend 
          showScenarios={['actual', 'plan', 'forecast', 'priorYear']}
          showVariance={true}
          showBenchmark={true}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('IBCSHeader', () => {
    it('matches snapshot for standard header', () => {
      const { container } = render(
        <IBCSHeader 
          title="Revenus"
          titleEn="Revenue"
          showStandardColumns={true}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for header with prior year', () => {
      const { container } = render(
        <IBCSHeader 
          title="Revenus"
          titleEn="Revenue"
          showStandardColumns={true}
          showPriorYear={true}
        />
      );
      
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
