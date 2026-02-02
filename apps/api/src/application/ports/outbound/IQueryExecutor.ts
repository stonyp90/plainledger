/**
 * Port (Interface) for Query Executor
 * 
 * Executes VisualizationQuery domain objects against the Gold layer data lake.
 * Supports SQL generation, query optimization, and result caching.
 */

import { VisualizationQuery } from "@domain/entities/visualization/VisualizationQuery";

/**
 * Query execution result
 */
export interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  cached: boolean;
  truncated: boolean;
  maxRows?: number;
  queryId?: string;
}

/**
 * Query execution options
 */
export interface QueryExecutionOptions {
  /**
   * Maximum number of rows to return
   */
  limit?: number;
  
  /**
   * Offset for pagination
   */
  offset?: number;
  
  /**
   * Whether to use cached results if available
   */
  useCache?: boolean;
  
  /**
   * Cache TTL in seconds
   */
  cacheTtl?: number;
  
  /**
   * Additional filters to apply (for cross-filtering)
   */
  additionalFilters?: Array<{
    sourceId: string;
    fieldId: string;
    operator: string;
    value: unknown;
  }>;
  
  /**
   * Query timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Query execution metadata
 */
export interface QueryMetadata {
  /**
   * Generated SQL query
   */
  sql: string;
  
  /**
   * Query execution plan (if available)
   */
  executionPlan?: string;
  
  /**
   * Estimated cost (if available)
   */
  estimatedCost?: number;
  
  /**
   * Data scanned (bytes)
   */
  dataScanned?: number;
}

export interface IQueryExecutor {
  /**
   * Execute a VisualizationQuery against the Gold layer
   * 
   * @param query - The visualization query to execute
   * @param organizationId - Organization ID for tenant isolation
   * @param options - Execution options
   * @returns Query result with data and metadata
   */
  execute(
    query: VisualizationQuery,
    organizationId: string,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult>;

  /**
   * Generate SQL from a VisualizationQuery without executing
   * Useful for preview, validation, or debugging
   * 
   * @param query - The visualization query
   * @param organizationId - Organization ID
   * @returns Generated SQL and metadata
   */
  generateSql(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<QueryMetadata>;

  /**
   * Validate a query before execution
   * Checks for syntax errors, invalid references, etc.
   * 
   * @param query - The visualization query to validate
   * @param organizationId - Organization ID
   * @returns Validation result with errors if any
   */
  validate(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings?: string[];
  }>;

  /**
   * Cancel a running query
   * 
   * @param queryId - Query ID returned from execute()
   */
  cancel(queryId: string): Promise<void>;

  /**
   * Get query execution status
   * 
   * @param queryId - Query ID
   * @returns Current status (running, completed, failed, cancelled)
   */
  getStatus(queryId: string): Promise<{
    status: "running" | "completed" | "failed" | "cancelled";
    progress?: number;
    error?: string;
  }>;
}
