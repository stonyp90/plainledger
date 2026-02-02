/**
 * PlainLedger Visualization Builder Types
 * 
 * Enhanced type system for the advanced visualization builder.
 * Supports:
 * - Multiple data sources
 * - Joins between tables
 * - Calculated fields
 * - Field aliases
 * - Full metadata
 * - Bilingual labels (EN/FR)
 */

import { ChartType, TimeRange, ComparisonMode } from './chartFavorites';

// =====================================================
// DATA SOURCE TYPES
// =====================================================

export type TableType = 'DIMENSION' | 'FACT';

export type FieldType = 
  | 'STRING'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'CURRENCY';

export type AggregationType = 
  | 'SUM'
  | 'AVG'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'MIN'
  | 'MAX'
  | 'MEDIAN';

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

// =====================================================
// DATA SOURCE SCHEMA
// =====================================================

/**
 * Represents a data source (table) available for visualization
 */
export interface DataSource {
  id: string;
  name: string;                    // French name
  nameEn: string;                  // English name
  description?: string;            // French description
  descriptionEn?: string;          // English description
  tableType: TableType;
  icon?: string;                   // Emoji or icon name
  fields: DataField[];
  joinableWith: JoinableRelation[];
  recordCount?: number;
  lastUpdated?: string;
}

/**
 * Represents a field within a data source
 */
export interface DataField {
  id: string;
  name: string;                    // French field name
  nameEn: string;                  // English field name
  technicalName: string;           // Actual column name in S3
  type: FieldType;
  aggregations: AggregationType[]; // Allowed aggregations
  filterable: boolean;
  groupable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  relatedTo?: string;              // For FK relationships
  defaultFormat?: string;          // Default display format
  sampleValues?: string[];         // Example values for preview
}

/**
 * Describes how one data source can join to another
 */
export interface JoinableRelation {
  targetSource: string;            // ID of target data source
  joinType: JoinType;              // Recommended join type
  suggestedKeys: JoinKey[];        // Suggested key pairs
}

export interface JoinKey {
  sourceField: string;
  targetField: string;
}

// =====================================================
// VISUALIZATION CONFIGURATION
// =====================================================

/**
 * Reference to a data source with an alias
 */
export interface DataSourceReference {
  id: string;                      // Data source ID
  alias?: string;                  // Optional alias for queries
}

/**
 * Join configuration between two data sources
 */
export interface JoinConfig {
  leftSource: string;              // Alias or ID of left source
  rightSource: string;             // Alias or ID of right source
  leftField: string;
  rightField: string;
  type: JoinType;
}

/**
 * Field configuration with customization
 */
export interface FieldConfig {
  id: string;                      // Unique ID for this field config
  sourceId: string;                // Data source ID
  fieldId: string;                 // Field ID in the source
  
  // Custom Display (overrides source field names)
  alias?: string;                  // FR custom name
  aliasEn?: string;                // EN custom name
  
  // Aggregation & Formatting
  aggregation?: AggregationType;
  format?: 'currency' | 'percentage' | 'number' | 'date' | 'text';
  decimals?: number;
  prefix?: string;                 // e.g., "$"
  suffix?: string;                 // e.g., "%"
  
  // Visual
  color?: string;
  axis?: 'left' | 'right';
  sortOrder?: 'asc' | 'desc';
  
  // Behavior
  enabled: boolean;
}

/**
 * Calculated field definition
 */
export interface CalculatedField {
  id: string;
  name: string;                    // FR name
  nameEn: string;                  // EN name
  formula: string;                 // Expression: "[revenue] - [expenses]"
  format?: 'currency' | 'percentage' | 'number';
  decimals?: number;
  color?: string;
  
  // Validation
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  id: string;
  sourceId: string;
  fieldId: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
  enabled: boolean;
}

/**
 * Filter group with AND/OR logic
 */
export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  filters: (FilterConfig | FilterGroup)[];
}

/**
 * Full visualization configuration
 */
export interface VisualizationConfig {
  // Identity & Metadata
  id: string;
  name: string;                    // FR display name
  nameEn: string;                  // EN display name
  description?: string;            // FR description
  descriptionEn?: string;          // EN description
  tags?: string[];                 // Searchable tags
  category?: 'financial' | 'operational' | 'custom' | 'industry';
  thumbnail?: string;              // Auto-generated preview image URL
  
  // Ownership & Sharing
  organizationId?: string;
  createdBy?: string;              // User ID
  createdAt?: string;              // ISO timestamp
  updatedAt?: string;
  isPublic?: boolean;              // Shared within org
  sharedWith?: string[];           // Specific user IDs
  
  // Chart Configuration
  chartType: ChartType;
  timeRange: TimeRange;
  comparison: ComparisonMode;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  
  // Data Sources
  sources: DataSourceReference[];
  joins?: JoinConfig[];
  
  // Fields & Customization
  fields: FieldConfig[];
  calculatedFields?: CalculatedField[];
  filters?: FilterConfig[];
  filterLogic?: FilterGroup;
  
  // Display Options
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  stacked?: boolean;
  cumulative?: boolean;
}

/**
 * Saved visualization (persisted to database)
 */
export interface SavedVisualization extends VisualizationConfig {
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// CUSTOM ENTITIES
// =====================================================

/**
 * Custom entity - a reusable pre-configured join
 */
export interface CustomEntity {
  id: string;
  organizationId: string;
  
  // Metadata
  name: string;                    // FR name
  nameEn: string;                  // EN name
  description?: string;
  descriptionEn?: string;
  icon?: string;                   // Emoji or icon name
  
  // Definition
  baseSources: DataSourceReference[];
  joins: JoinConfig[];
  defaultFields: string[];         // Field IDs included by default
  calculatedFields?: CalculatedField[];
  
  // Access Control
  createdBy: string;
  isPublic: boolean;               // Available to all org members
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// QUERY TYPES
// =====================================================

/**
 * Query to execute against data sources
 */
export interface VisualizationQuery {
  organizationId: string;
  sources: DataSourceReference[];
  joins?: JoinConfig[];
  fields: FieldConfig[];
  calculatedFields?: CalculatedField[];
  filters?: FilterConfig[];
  filterLogic?: FilterGroup;
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  timeRange?: {
    field: string;
    start?: string;
    end?: string;
    range?: TimeRange;
  };
}

/**
 * Query result
 */
export interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  cached: boolean;
  truncated: boolean;
  maxRows?: number;
}

// =====================================================
// UI STATE TYPES
// =====================================================

/**
 * Builder step
 */
export type BuilderStep = 
  | 'sources'
  | 'fields'
  | 'joins'
  | 'filters'
  | 'calculated'
  | 'chart'
  | 'metadata';

/**
 * Builder state
 */
export interface BuilderState {
  currentStep: BuilderStep;
  config: Partial<VisualizationConfig>;
  previewData?: QueryResult;
  isLoading: boolean;
  errors: Record<string, string>;
  isDirty: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get operators available for a field type
 */
export function getOperatorsForFieldType(type: FieldType): FilterOperator[] {
  switch (type) {
    case 'STRING':
      return [
        'equals', 'not_equals', 'contains', 'not_contains',
        'starts_with', 'ends_with', 'in', 'not_in',
        'is_null', 'is_not_null'
      ];
    case 'NUMBER':
    case 'CURRENCY':
      return [
        'equals', 'not_equals', 'greater_than', 'less_than',
        'greater_or_equal', 'less_or_equal', 'between',
        'is_null', 'is_not_null'
      ];
    case 'DATE':
    case 'DATETIME':
      return [
        'equals', 'not_equals', 'greater_than', 'less_than',
        'greater_or_equal', 'less_or_equal', 'between',
        'is_null', 'is_not_null'
      ];
    case 'BOOLEAN':
      return ['equals', 'not_equals', 'is_null', 'is_not_null'];
    default:
      return ['equals', 'not_equals'];
  }
}

/**
 * Get aggregations available for a field type
 */
export function getAggregationsForFieldType(type: FieldType): AggregationType[] {
  switch (type) {
    case 'NUMBER':
    case 'CURRENCY':
      return ['SUM', 'AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'MEDIAN'];
    case 'DATE':
    case 'DATETIME':
      return ['COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX'];
    default:
      return ['COUNT', 'COUNT_DISTINCT'];
  }
}

/**
 * Format a field value based on its configuration
 */
export function formatFieldValue(
  value: unknown, 
  config: FieldConfig, 
  locale: 'en' | 'fr' = 'en'
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const { format, decimals = 0, prefix = '', suffix = '' } = config;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale === 'en' ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: decimals,
      }).format(Number(value));
    
    case 'percentage':
      return `${prefix}${Number(value).toFixed(decimals)}%${suffix}`;
    
    case 'number':
      return `${prefix}${Number(value).toLocaleString(locale === 'en' ? 'en-CA' : 'fr-CA', {
        maximumFractionDigits: decimals,
      })}${suffix}`;
    
    case 'date':
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-CA' : 'fr-CA', {
        dateStyle: 'medium',
      }).format(new Date(String(value)));
    
    default:
      return `${prefix}${String(value)}${suffix}`;
  }
}

/**
 * Generate a unique ID for visualization elements
 */
export function generateId(prefix: string = 'viz'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate a calculated field formula
 */
export function validateFormula(
  formula: string, 
  availableFields: string[]
): { isValid: boolean; error?: string } {
  if (!formula.trim()) {
    return { isValid: false, error: 'Formula cannot be empty' };
  }

  // Extract field references
  const fieldRefs = formula.match(/\[([^\]]+)\]/g) || [];
  const fieldIds = fieldRefs.map(ref => ref.slice(1, -1));

  // Check all referenced fields exist
  for (const fieldId of fieldIds) {
    if (!availableFields.includes(fieldId)) {
      return { isValid: false, error: `Unknown field: ${fieldId}` };
    }
  }

  // Check for dangerous patterns
  const dangerous = [/;/, /--/, /\/\*/, /\beval\b/i, /\bexec\b/i];
  for (const pattern of dangerous) {
    if (pattern.test(formula)) {
      return { isValid: false, error: 'Formula contains invalid characters' };
    }
  }

  // Basic syntax check (balanced parentheses)
  let depth = 0;
  for (const char of formula) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) {
      return { isValid: false, error: 'Unbalanced parentheses' };
    }
  }
  if (depth !== 0) {
    return { isValid: false, error: 'Unbalanced parentheses' };
  }

  return { isValid: true };
}
