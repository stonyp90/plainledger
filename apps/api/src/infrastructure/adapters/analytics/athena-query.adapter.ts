/**
 * Athena Query Adapter
 * 
 * Executes SQL queries against the Gold layer using AWS Athena (production)
 * or DuckDB (local development via LocalStack/MinIO).
 * 
 * Supports:
 * - Query execution with pagination
 * - Query cancellation
 * - Result caching
 * - Local development with DuckDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StopQueryExecutionCommand,
  QueryExecutionState,
} from "@aws-sdk/client-athena";
import { S3Client } from "@aws-sdk/client-s3";
import {
  IQueryExecutor,
  QueryResult,
  QueryExecutionOptions,
  QueryMetadata,
} from "@application/ports/outbound/IQueryExecutor";
import { VisualizationQuery } from "@domain/entities/visualization/VisualizationQuery";
import { CacheService } from "@infrastructure/cache/cache.service";
import { VisualizationQueryService } from "@application/services/visualization-query.service";

/**
 * Query execution state
 */
interface QueryState {
  queryId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  error?: string;
  startedAt: Date;
}

@Injectable()
export class AthenaQueryAdapter implements IQueryExecutor {
  private readonly logger = new Logger(AthenaQueryAdapter.name);
  private readonly athenaClient: AthenaClient | null;
  private readonly s3Client: S3Client;
  private readonly runningQueries = new Map<string, QueryState>();
  private readonly isLocal: boolean;

  private queryService?: VisualizationQueryService;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.isLocal = process.env.NODE_ENV !== "production" && 
                   process.env.USE_DUCKDB === "true";

    // Initialize S3 client (always needed for result storage)
    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>("S3_ENDPOINT"),
      region: this.configService.get<string>("S3_REGION") || "us-east-1",
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID") || "test",
        secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "test",
      },
      forcePathStyle: true,
    });

    // Initialize Athena client only if not using DuckDB
    if (!this.isLocal) {
      this.athenaClient = new AthenaClient({
        region: this.configService.get<string>("AWS_REGION") || "us-east-1",
      });
    } else {
      this.athenaClient = null;
      this.logger.log("Using DuckDB for local query execution");
    }
  }

  /**
   * Execute a query
   */
  async execute(
    query: VisualizationQuery,
    organizationId: string,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult> {
    // Generate SQL using VisualizationQueryService
    // In a proper setup, this would be injected, but for now we'll create it
    // TODO: Inject VisualizationQueryService via constructor
    if (!this.queryService) {
      // We can't create the service without its dependencies, so we'll throw
      throw new Error(
        "VisualizationQueryService must be injected. " +
        "Call setQueryService() or inject via constructor.",
      );
    }
    const metadata = await this.queryService.generateSqlForExecutor(query, organizationId);
    const sql = metadata.sql;

    // Check cache if enabled
    if (options?.useCache !== false) {
      const cacheKey = this.getCacheKey(sql, organizationId, options);
      const cached = await this.cacheService.get<QueryResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for query: ${cacheKey.substring(0, 20)}...`);
        return { ...cached, cached: true };
      }
    }

    const startTime = Date.now();

    if (this.isLocal) {
      return this.executeWithDuckDB(sql, organizationId, options);
    } else {
      return this.executeWithAthena(sql, organizationId, options);
    }
  }

  /**
   * Generate SQL from query
   * Note: This should delegate to VisualizationQueryService for SQL generation
   * The adapter is responsible for execution, not SQL generation
   */
  async generateSql(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<QueryMetadata> {
    // If queryService is injected, use it; otherwise throw error
    // In practice, VisualizationQueryService should handle SQL generation
    // and pass the SQL string to execute()
    if (!this.queryService) {
      throw new Error(
        "SQL generation should be done by VisualizationQueryService. " +
        "Use execute() method which handles SQL generation internally.",
      );
    }
    return this.queryService.generateSqlForExecutor(query, organizationId);
  }

  /**
   * Set query service (for dependency injection)
   */
  setQueryService(service: VisualizationQueryService): void {
    this.queryService = service;
  }

  /**
   * Validate query
   */
  async validate(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!query.sources || query.sources.length === 0) {
      errors.push("Query must have at least one data source");
    }

    if (!query.fields || query.fields.length === 0) {
      errors.push("Query must have at least one field");
    }

    // Validate joins reference valid sources
    for (const join of query.joins || []) {
      if (!query.sources.includes(join.leftSource)) {
        errors.push(`Join references unknown source: ${join.leftSource}`);
      }
      if (!query.sources.includes(join.rightSource)) {
        errors.push(`Join references unknown source: ${join.rightSource}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Cancel a running query
   */
  async cancel(queryId: string): Promise<void> {
    const state = this.runningQueries.get(queryId);
    if (!state) {
      throw new Error(`Query ${queryId} not found`);
    }

    if (state.status === "completed" || state.status === "failed") {
      this.logger.warn(`Cannot cancel query ${queryId} - already ${state.status}`);
      return;
    }

    if (this.isLocal) {
      // DuckDB doesn't support cancellation easily, just mark as cancelled
      state.status = "cancelled";
      this.runningQueries.delete(queryId);
    } else {
      if (!this.athenaClient) {
        throw new Error("Athena client not initialized");
      }

      await this.athenaClient.send(
        new StopQueryExecutionCommand({ QueryExecutionId: queryId }),
      );
      state.status = "cancelled";
    }

    this.logger.log(`Cancelled query: ${queryId}`);
  }

  /**
   * Get query status
   */
  async getStatus(queryId: string): Promise<{
    status: "running" | "completed" | "failed" | "cancelled";
    progress?: number;
    error?: string;
  }> {
    const state = this.runningQueries.get(queryId);
    if (state) {
      return {
        status: state.status,
        progress: state.progress,
        error: state.error,
      };
    }

    if (this.isLocal) {
      return { status: "failed", error: "Query not found" };
    }

    if (!this.athenaClient) {
      throw new Error("Athena client not initialized");
    }

    try {
      const response = await this.athenaClient.send(
        new GetQueryExecutionCommand({ QueryExecutionId: queryId }),
      );

      const execution = response.QueryExecution;
      if (!execution) {
        return { status: "failed", error: "Query execution not found" };
      }

      const status = execution.Status?.State as QueryExecutionState;
      const mappedStatus =
        status === "RUNNING"
          ? "running"
          : status === "SUCCEEDED"
            ? "completed"
            : status === "FAILED"
              ? "failed"
              : "cancelled";

      return {
        status: mappedStatus,
        error: execution.Status?.StateChangeReason,
      };
    } catch (error) {
      this.logger.error(`Error getting query status: ${error}`);
      return { status: "failed", error: String(error) };
    }
  }

  /**
   * Execute query with Athena (production)
   */
  private async executeWithAthena(
    sql: string,
    organizationId: string,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult> {
    if (!this.athenaClient) {
      throw new Error("Athena client not initialized");
    }

    const database = this.configService.get<string>("ATHENA_DATABASE") || "plainledger";
    const outputLocation = this.configService.get<string>("ATHENA_OUTPUT_LOCATION") ||
      `s3://${this.configService.get<string>("S3_BUCKET_GOLD")}/athena-results/`;

    const startTime = Date.now();

    try {
      // Start query execution
      const startResponse = await this.athenaClient.send(
        new StartQueryExecutionCommand({
          QueryString: sql,
          QueryExecutionContext: {
            Database: database,
          },
          ResultConfiguration: {
            OutputLocation: outputLocation,
          },
          WorkGroup: this.configService.get<string>("ATHENA_WORKGROUP") || "primary",
        }),
      );

      const queryId = startResponse.QueryExecutionId;
      if (!queryId) {
        throw new Error("Failed to start query execution");
      }

      // Track query state
      const state: QueryState = {
        queryId,
        status: "running",
        startedAt: new Date(),
      };
      this.runningQueries.set(queryId, state);

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s

        const statusResponse = await this.athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: queryId }),
        );

        const executionStatus = statusResponse.QueryExecution?.Status?.State;
        if (executionStatus === "SUCCEEDED") {
          completed = true;
          state.status = "completed";
        } else if (executionStatus === "FAILED" || executionStatus === "CANCELLED") {
          state.status = executionStatus === "FAILED" ? "failed" : "cancelled";
          state.error = statusResponse.QueryExecution?.Status?.StateChangeReason;
          throw new Error(`Query ${executionStatus}: ${state.error}`);
        }

        attempts++;
      }

      if (!completed) {
        throw new Error("Query timeout");
      }

      // Get results
      const results = await this.getAthenaResults(queryId, options);

      const executionTimeMs = Date.now() - startTime;

      // Cache result if enabled
      if (options?.useCache !== false) {
        const cacheKey = this.getCacheKey(sql, organizationId, options);
        await this.cacheService.set(
          cacheKey,
          results,
          options?.cacheTtl || 300, // Default 5 minutes
        );
      }

      this.runningQueries.delete(queryId);
      return results;
    } catch (error) {
      this.logger.error(`Athena query execution failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get Athena query results
   */
  private async getAthenaResults(
    queryId: string,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult> {
    if (!this.athenaClient) {
      throw new Error("Athena client not initialized");
    }

    const limit = options?.limit || 1000;
    let nextToken: string | undefined;
    const allRows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    do {
      const response = await this.athenaClient.send(
        new GetQueryResultsCommand({
          QueryExecutionId: queryId,
          NextToken: nextToken,
          MaxResults: Math.min(limit, 1000), // Athena max is 1000 per request
        }),
      );

      const resultSet = response.ResultSet;
      if (!resultSet) {
        break;
      }

      // Extract column names from first row (metadata)
      if (columns.length === 0 && resultSet.ResultSetMetadata?.ColumnInfo) {
        columns = resultSet.ResultSetMetadata.ColumnInfo.map((col: { Name?: string }) => col.Name || "");
      }

      // Extract data rows (skip first row which is column headers)
      const rows = resultSet.Rows || [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.Data) continue;

        const rowData: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          const cell = row.Data?.[idx];
          rowData[col] = this.parseAthenaValue(cell?.VarCharValue);
        });
        allRows.push(rowData);

        if (allRows.length >= limit) {
          break;
        }
      }

      nextToken = response.NextToken;
    } while (nextToken && allRows.length < limit);

    return {
      data: allRows,
      columns,
      rowCount: allRows.length,
      executionTimeMs: 0, // Will be set by caller
      cached: false,
      truncated: allRows.length >= limit,
      maxRows: limit,
      queryId,
    };
  }

  /**
   * Parse Athena cell value
   */
  private parseAthenaValue(value: string | undefined): unknown {
    if (!value) return null;
    // Try to parse as number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return parseFloat(value);
    }
    // Try to parse as boolean
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return value;
  }

  /**
   * Execute query with DuckDB (local development)
   * 
   * NOTE: This is a placeholder. In a real implementation, you would:
   * 1. Install DuckDB Node.js bindings
   * 2. Load Parquet files from S3/MinIO
   * 3. Execute SQL queries
   * 
   * For now, this returns a mock result to unblock development.
   */
  private async executeWithDuckDB(
    sql: string,
    organizationId: string,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult> {
    this.logger.warn(
      "DuckDB execution not fully implemented - returning mock result",
    );
    this.logger.debug(`SQL: ${sql.substring(0, 200)}...`);

    // TODO: Implement DuckDB execution
    // const duckdb = require('duckdb');
    // const db = new duckdb.Database(':memory:');
    // const conn = db.connect();
    // 
    // // Install and load httpfs extension for S3 access
    // await conn.run("INSTALL httpfs;");
    // await conn.run("LOAD httpfs;");
    // 
    // // Configure S3 endpoint
    // const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    // await conn.run(`SET s3_endpoint='${s3Endpoint}';`);
    // 
    // // Execute query
    // const result = await conn.all(sql);
    // 
    // return {
    //   data: result,
    //   columns: Object.keys(result[0] || {}),
    //   rowCount: result.length,
    //   executionTimeMs: Date.now() - startTime,
    //   cached: false,
    //   truncated: false,
    // };

    // Mock result for development
    return {
      data: [],
      columns: [],
      rowCount: 0,
      executionTimeMs: 0,
      cached: false,
      truncated: false,
    };
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(
    sql: string,
    organizationId: string,
    options?: QueryExecutionOptions,
  ): string {
    const parts = [
      "query",
      organizationId,
      Buffer.from(sql).toString("base64").substring(0, 32),
      options?.limit || "default",
      options?.offset || "0",
    ];
    return parts.join(":");
  }
}
