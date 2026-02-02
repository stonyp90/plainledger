/**
 * Port (Interface) for Data Source Metadata Service
 * 
 * Provides schema discovery and metadata for Gold layer data sources.
 * Supports dynamic field discovery, relationship detection, and sample data.
 */

import { DataSource, DataField } from "@domain/entities/visualization/DataSource";

/**
 * Field metadata with sample values
 */
export interface FieldMetadata extends DataField {
  sampleValues?: unknown[];
  distinctCount?: number;
  nullCount?: number;
  minValue?: unknown;
  maxValue?: unknown;
}

/**
 * Data source metadata with enhanced information
 */
export interface DataSourceMetadata extends DataSource {
  recordCount?: number;
  lastUpdated?: Date;
  fields: FieldMetadata[];
  estimatedSize?: number; // bytes
}

/**
 * Relationship suggestion
 */
export interface RelationshipSuggestion {
  targetSource: string;
  confidence: number; // 0-1
  suggestedKeys: Array<{
    sourceField: string;
    targetField: string;
    matchType: "exact" | "similar" | "inferred";
  }>;
  joinType: "inner" | "left" | "right" | "full";
}

export interface IDataSourceMetadataService {
  /**
   * Discover all available data sources for an organization
   * Scans Gold layer S3 bucket for Parquet files and extracts schemas
   */
  discoverSources(organizationId: string): Promise<DataSourceMetadata[]>;

  /**
   * Get metadata for a specific data source
   */
  getSourceMetadata(
    sourceId: string,
    organizationId: string,
  ): Promise<DataSourceMetadata | null>;

  /**
   * Get field metadata with sample values
   */
  getFieldMetadata(
    sourceId: string,
    fieldId: string,
    organizationId: string,
    options?: {
      sampleSize?: number;
      includeStats?: boolean;
    },
  ): Promise<FieldMetadata | null>;

  /**
   * Suggest relationships between data sources
   * Uses foreign key naming conventions and data analysis
   */
  suggestRelationships(
    sourceId: string,
    organizationId: string,
  ): Promise<RelationshipSuggestion[]>;

  /**
   * Get sample data for a data source
   */
  getSampleData(
    sourceId: string,
    organizationId: string,
    options?: {
      limit?: number;
      fields?: string[];
    },
  ): Promise<Record<string, unknown>[]>;

  /**
   * Refresh metadata cache for a data source
   */
  refreshMetadata(
    sourceId: string,
    organizationId: string,
  ): Promise<void>;

  /**
   * Validate that a data source exists and is accessible
   */
  validateSource(
    sourceId: string,
    organizationId: string,
  ): Promise<{
    valid: boolean;
    error?: string;
  }>;
}
