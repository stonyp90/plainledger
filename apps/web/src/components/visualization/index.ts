/**
 * Visualization Components
 * 
 * Advanced visualization builder system for PlainLedger.
 * Provides Looker/Power BI-like capabilities with:
 * - Data source selection
 * - Field configuration with drag-and-drop
 * - Multiple chart types
 * - Calculated fields
 * - Bilingual support (EN/FR)
 */

// Main builder
export { VisualizationBuilder } from './VisualizationBuilder';

// Sub-components
export { DataSourceSelector } from './DataSourceSelector';
export { FieldPicker } from './FieldPicker';
export { MetadataEditor } from './MetadataEditor';
export { JoinBuilder } from './JoinBuilder';
export { FilterBuilder } from './FilterBuilder';
export { ChartPreview } from './ChartPreview';
export { CalculatedFieldBuilder } from './CalculatedFieldBuilder';

// Error handling
export { ChartErrorBoundary, withChartErrorBoundary } from './ChartErrorBoundary';
