/**
 * Shared Visualization Types
 * 
 * Types shared between API and Web for visualization functionality.
 * These types mirror the web types but are defined in the API domain layer.
 */

// Re-export domain types
export type {
  FieldType,
  AggregationType,
  JoinType,
  DataSourceType,
} from "./DataSource";

import type { JoinType } from "./DataSource";

export type {
  FilterOperator,
  SortDirection,
} from "./VisualizationQuery";

// Visualization Config (simplified for API use)
export interface VisualizationConfig {
  chartType: string;
  query: unknown; // VisualizationQuery JSON
  category?: string;
  tags?: string[];
  [key: string]: unknown; // Index signature for JSONB storage
}

// Custom Entity (simplified for API use)
export interface CustomEntity {
  id: string;
  organizationId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  definition: {
    baseSources: Array<{ id: string; alias?: string }>;
    joins: Array<{
      leftSource: string;
      rightSource: string;
      leftField: string;
      rightField: string;
      type: JoinType;
    }>;
    defaultFields: string[];
    calculatedFields?: unknown[];
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}
