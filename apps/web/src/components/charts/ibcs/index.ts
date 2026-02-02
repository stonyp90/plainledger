/**
 * IBCS Chart Components
 * 
 * Reusable SVG components following IBCS (International Business Communication Standards).
 * Use these to build IBCS-compliant financial visualizations.
 * 
 * Components:
 * - VariancePin: Lollipop indicator for percentage variances
 * - ScenarioBar: Bars with correct AC/PL/FC styling
 * - IBCSLegend: Standard legend with scenario indicators
 * - IBCSHeader: Chart header with scenario column labels
 * 
 * Usage:
 * ```tsx
 * import { 
 *   VariancePin, 
 *   ScenarioBar, 
 *   IBCSLegend, 
 *   IBCSHeader 
 * } from '@/components/charts/ibcs';
 * ```
 * 
 * @see https://www.ibcs.com/standards/
 */

// Variance Pin - IBCS lollipop indicator
export { 
  VariancePin, 
  VariancePinCompact,
  type VariancePinProps,
  type VariancePinCompactProps,
} from './VariancePin';

// Scenario Bar - AC/PL/FC/PY bars with correct styling
export {
  ScenarioBar,
  PairedScenarioBars,
  HorizontalScenarioBar,
  type ScenarioBarProps,
  type PairedScenarioBarsProps,
  type HorizontalScenarioBarProps,
} from './ScenarioBar';

// IBCS Legend - Standard legend with scenario indicators
export {
  IBCSLegend,
  IBCSLegendCompact,
  type IBCSLegendProps,
  type IBCSLegendCompactProps,
} from './IBCSLegend';

// IBCS Header - Chart header with scenario column labels
export {
  IBCSHeader,
  IBCSSimpleHeader,
  IBCSColumnHeaderRow,
  type IBCSHeaderProps,
  type IBCSHeaderColumn,
  type IBCSSimpleHeaderProps,
  type IBCSColumnHeaderRowProps,
} from './IBCSHeader';
