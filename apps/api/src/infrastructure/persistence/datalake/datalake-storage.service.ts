/**
 * Datalake Storage Service
 *
 * Handles writing data to S3/MinIO in the medallion architecture:
 * - Bronze: Raw JSON files
 * - Silver: Cleansed JSON/Parquet files
 * - Gold: Star schema Parquet files for Power BI
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { Pool, PoolClient } from "pg";

export interface DatalakeConfig {
  s3Endpoint: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  bucketName: string;
  dbConnectionString: string;
  // Medallion architecture bucket names (optional, defaults to single bucket)
  bronzeBucket?: string;
  silverBucket?: string;
  goldBucket?: string;
}

/**
 * Create a DatalakeConfig from environment variables
 */
export function createDatalakeConfigFromEnv(): DatalakeConfig {
  return {
    s3Endpoint: process.env.S3_ENDPOINT || "http://localhost:4566",
    s3Region: process.env.S3_REGION || "us-east-1",
    s3AccessKey: process.env.AWS_ACCESS_KEY_ID || "test",
    s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    bucketName: process.env.S3_BUCKET_NAME || "plainledger-datalake",
    dbConnectionString:
      process.env.DATABASE_URL ||
      `postgresql://${process.env.DB_USERNAME || "plainledger"}:${process.env.DB_PASSWORD || "plainledger_secret"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "plainledger"}`,
    bronzeBucket: process.env.S3_BUCKET_BRONZE || "plainledger-bronze",
    silverBucket: process.env.S3_BUCKET_SILVER || "plainledger-silver",
    goldBucket: process.env.S3_BUCKET_GOLD || "plainledger-gold",
  };
}

export interface WriteResult {
  success: boolean;
  s3Path: string;
  recordCount: number;
  ingestionId?: string;
  error?: string;
}

export interface PipelineRunResult {
  runId: string;
  status: "completed" | "failed";
  bronzeRecords: number;
  silverRecords: number;
  goldRecords: number;
  errorCount: number;
  durationMs: number;
  errors: string[];
}

export class DatalakeStorageService {
  private s3Client: S3Client;
  private dbPool: Pool;
  private bucketName: string;
  private bronzeBucket: string;
  private silverBucket: string;
  private goldBucket: string;

  constructor(config: DatalakeConfig) {
    this.s3Client = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
      },
      forcePathStyle: true, // Required for LocalStack/MinIO
    });

    this.dbPool = new Pool({
      connectionString: config.dbConnectionString,
    });

    this.bucketName = config.bucketName;
    this.bronzeBucket = config.bronzeBucket || config.bucketName;
    this.silverBucket = config.silverBucket || config.bucketName;
    this.goldBucket = config.goldBucket || config.bucketName;
  }

  /**
   * Create instance from environment variables
   */
  static fromEnv(): DatalakeStorageService {
    return new DatalakeStorageService(createDatalakeConfigFromEnv());
  }

  /**
   * Check if datalake storage is healthy
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    s3: boolean;
    database: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let s3Healthy = false;
    let dbHealthy = false;

    // Check S3
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bronzeBucket }),
      );
      s3Healthy = true;
    } catch (error) {
      errors.push(
        `S3 not accessible: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Check Database
    try {
      await this.dbPool.query("SELECT 1");
      dbHealthy = true;
    } catch (error) {
      errors.push(
        `Database not accessible: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return {
      healthy: s3Healthy && dbHealthy,
      s3: s3Healthy,
      database: dbHealthy,
      errors,
    };
  }

  /**
   * Initialize the datalake bucket and folder structure
   */
  async initialize(): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
    } catch {
      // Bucket doesn't exist, create it
      await this.s3Client.send(
        new CreateBucketCommand({ Bucket: this.bucketName }),
      );
    }

    // Create folder markers for each layer
    const folders = ["bronze/", "silver/", "gold/"];
    for (const folder of folders) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: folder,
          Body: "",
        }),
      );
    }
  }

  // ===========================================================================
  // BRONZE LAYER OPERATIONS
  // ===========================================================================

  /**
   * Write raw provider data to Bronze layer
   */
  async writeBronze<T>(
    organizationId: string,
    sourceSystem: string,
    entityType: string,
    data: T[],
    datasourceId?: string,
  ): Promise<WriteResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Path = `bronze/${sourceSystem}/${organizationId}/${entityType}/${timestamp}.json`;

    try {
      // Write to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Path,
          Body: JSON.stringify(data, null, 2),
          ContentType: "application/json",
        }),
      );

      // Track in database
      const result = await this.dbPool.query(
        `INSERT INTO datalake.bronze_ingestions 
         (source_system, organization_id, datasource_id, source_endpoint, 
          record_count, payload_hash, s3_path, ingestion_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')
         RETURNING ingestion_id`,
        [
          sourceSystem,
          organizationId,
          datasourceId,
          `/${entityType}`,
          data.length,
          this.hashData(JSON.stringify(data)),
          s3Path,
        ],
      );

      return {
        success: true,
        s3Path,
        recordCount: data.length,
        ingestionId: result.rows[0].ingestion_id,
      };
    } catch (error) {
      return {
        success: false,
        s3Path,
        recordCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Read data from Bronze layer
   */
  async readBronze<T>(s3Path: string): Promise<T[]> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Path,
      }),
    );

    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  }

  // ===========================================================================
  // SILVER LAYER OPERATIONS
  // ===========================================================================

  /**
   * Write cleansed data to Silver layer
   */
  async writeSilver<T>(
    organizationId: string,
    sourceSystem: string,
    entityType: string,
    data: T[],
    bronzeIngestionId: string,
    qualityMetrics: { validCount: number; invalidCount: number; avgScore: number },
  ): Promise<WriteResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Path = `silver/${sourceSystem}/${organizationId}/${entityType}/${timestamp}.json`;

    try {
      // Write to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Path,
          Body: JSON.stringify(data, null, 2),
          ContentType: "application/json",
        }),
      );

      // Track processing job
      const result = await this.dbPool.query(
        `INSERT INTO datalake.silver_processing_jobs 
         (bronze_ingestion_id, organization_id, source_system, entity_type,
          records_processed, records_valid, records_invalid, avg_quality_score,
          s3_path, status, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', NOW(), NOW())
         RETURNING job_id`,
        [
          bronzeIngestionId,
          organizationId,
          sourceSystem,
          entityType,
          data.length,
          qualityMetrics.validCount,
          qualityMetrics.invalidCount,
          qualityMetrics.avgScore,
          s3Path,
        ],
      );

      return {
        success: true,
        s3Path,
        recordCount: data.length,
        ingestionId: result.rows[0].job_id,
      };
    } catch (error) {
      return {
        success: false,
        s3Path,
        recordCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Read data from Silver layer
   */
  async readSilver<T>(s3Path: string): Promise<T[]> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Path,
      }),
    );

    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  }

  // ===========================================================================
  // GOLD LAYER OPERATIONS
  // ===========================================================================

  /**
   * Write analytics-ready data to Gold layer
   */
  async writeGold<T>(
    organizationId: string,
    datasetType: string,
    data: T[],
    silverJobId: string,
    partitionKey?: string,
  ): Promise<WriteResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const partition = partitionKey ? `/${partitionKey}` : "";
    const s3Path = `gold/${datasetType}/${organizationId}${partition}/${timestamp}.json`;

    try {
      // Write to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Path,
          Body: JSON.stringify(data, null, 2),
          ContentType: "application/json",
        }),
      );

      // Track gold dataset
      const result = await this.dbPool.query(
        `INSERT INTO datalake.gold_datasets 
         (silver_job_id, organization_id, dataset_type, record_count, 
          s3_path, partition_key, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING dataset_id`,
        [silverJobId, organizationId, datasetType, data.length, s3Path, partitionKey],
      );

      return {
        success: true,
        s3Path,
        recordCount: data.length,
        ingestionId: result.rows[0].dataset_id,
      };
    } catch (error) {
      return {
        success: false,
        s3Path,
        recordCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Read data from Gold layer
   */
  async readGold<T>(s3Path: string): Promise<T[]> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Path,
      }),
    );

    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  }

  // ===========================================================================
  // PIPELINE ORCHESTRATION
  // ===========================================================================

  /**
   * Start a new pipeline run
   */
  async startPipelineRun(
    organizationId: string,
    pipelineType: "full_sync" | "incremental" | "reprocess",
    sourceSystem: string,
  ): Promise<string> {
    const result = await this.dbPool.query(
      `INSERT INTO datalake.pipeline_runs 
       (organization_id, pipeline_type, source_system, status, started_at)
       VALUES ($1, $2, $3, 'running', NOW())
       RETURNING run_id`,
      [organizationId, pipelineType, sourceSystem],
    );
    return result.rows[0].run_id;
  }

  /**
   * Complete a pipeline run
   */
  async completePipelineRun(
    runId: string,
    metrics: {
      bronzeRecords: number;
      silverRecords: number;
      goldRecords: number;
      errorCount: number;
    },
    error?: string,
  ): Promise<void> {
    await this.dbPool.query(
      `UPDATE datalake.pipeline_runs 
       SET status = $1, 
           bronze_records = $2,
           silver_records = $3,
           gold_records = $4,
           error_count = $5,
           error_message = $6,
           completed_at = NOW(),
           duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - started_at))
       WHERE run_id = $7`,
      [
        error ? "failed" : "completed",
        metrics.bronzeRecords,
        metrics.silverRecords,
        metrics.goldRecords,
        metrics.errorCount,
        error,
        runId,
      ],
    );
  }

  /**
   * Get pipeline run status
   */
  async getPipelineRun(runId: string): Promise<PipelineRunResult | null> {
    const result = await this.dbPool.query(
      `SELECT run_id, status, bronze_records, silver_records, gold_records,
              error_count, duration_ms, error_message
       FROM datalake.pipeline_runs WHERE run_id = $1`,
      [runId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      runId: row.run_id,
      status: row.status,
      bronzeRecords: row.bronze_records,
      silverRecords: row.silver_records,
      goldRecords: row.gold_records,
      errorCount: row.error_count,
      durationMs: row.duration_ms,
      errors: row.error_message ? [row.error_message] : [],
    };
  }

  // ===========================================================================
  // QUALITY TRACKING
  // ===========================================================================

  /**
   * Record data quality issues
   */
  async recordQualityIssues(
    processingJobId: string,
    issues: Array<{
      recordId: string;
      ruleId: string;
      ruleName: string;
      severity: "ERROR" | "WARNING" | "INFO";
      field: string;
      description: string;
    }>,
  ): Promise<void> {
    const client = await this.dbPool.connect();
    try {
      await client.query("BEGIN");

      for (const issue of issues) {
        await client.query(
          `INSERT INTO datalake.quality_issues 
           (processing_job_id, record_id, rule_id, rule_name, severity, 
            field_name, issue_description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            processingJobId,
            issue.recordId,
            issue.ruleId,
            issue.ruleName,
            issue.severity,
            issue.field,
            issue.description,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * List files in a layer
   */
  async listFiles(prefix: string): Promise<string[]> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      }),
    );

    return (
      response.Contents?.map((obj: { Key?: string }) => obj.Key!).filter(
        (key: string) => !key.endsWith("/"),
      ) || []
    );
  }

  /**
   * Simple hash for deduplication
   */
  private hashData(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.dbPool.end();
  }
}
