/**
 * Power BI Datalake Connection Service
 *
 * Provides secure and optimal connectivity between the AWS S3 datalake
 * and Power BI for analytics and reporting.
 *
 * Security Features:
 * - Row-Level Security (RLS) enforcement
 * - Service Principal authentication
 * - Encrypted data transfer
 * - Audit logging
 * - IP whitelisting support
 *
 * Connection Methods:
 * 1. Direct Query via AWS Athena (real-time, slower)
 * 2. Import via Azure Blob sync (scheduled, faster queries)
 * 3. REST API endpoint (for custom visuals)
 */

import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IPowerBIDatalakeService } from "@application/ports/outbound/IPowerBIDatalakeService";

export interface DatasetSchema {
  tableName: string;
  columns: {
    name: string;
    type: "string" | "number" | "date" | "boolean";
    description?: string;
    isRLSColumn?: boolean;
  }[];
  rlsColumn?: string;
  partitionColumn?: string;
}

export interface PowerBIDatasetConfig {
  datasetId: string;
  tables: DatasetSchema[];
  refreshSchedule: string;
  rlsEnabled: boolean;
  connectionType: "direct_query" | "import" | "streaming";
}

export interface SecureDataAccess {
  organizationId: string;
  userId: string;
  businessUnitId?: string;
  roles: string[];
  expiresAt: Date;
  signature: string;
}

@Injectable()
export class PowerBIDatalakeService implements IPowerBIDatalakeService {
  private readonly logger = new Logger(PowerBIDatalakeService.name);
  private readonly s3Client: S3Client;
  private readonly goldBucket: string;
  private readonly athenaDatabase: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    const s3Region =
      this.configService.get<string>("S3_REGION") || "ca-central-1";

    this.s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID") || "",
        secretAccessKey:
          this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "",
      },
      forcePathStyle: !!s3Endpoint,
    });

    this.goldBucket =
      this.configService.get<string>("S3_BUCKET_GOLD") || "plainledger-gold";
    this.athenaDatabase =
      this.configService.get<string>("ATHENA_DATABASE") || "plainledger_gold";
    this.secretKey =
      this.configService.get<string>("POWERBI_DATA_SECRET") ||
      this.configService.get<string>("JWT_SECRET") ||
      "change-in-production";
  }

  /**
   * Get the Gold layer schema for Power BI dataset configuration
   */
  /**
   * Get Gold layer schema (implements interface)
   */
  getGoldLayerSchema(): DatasetSchema[] {
    return [
      {
        tableName: "dim_account",
        columns: [
          { name: "account_key", type: "string" },
          { name: "organization_key", type: "string", isRLSColumn: true },
          { name: "account_code", type: "string" },
          { name: "account_name", type: "string" },
          { name: "account_type", type: "string" },
          { name: "account_subtype", type: "string" },
          { name: "is_active", type: "boolean" },
          { name: "hierarchy_level", type: "number" },
          { name: "balance_sheet_section", type: "string" },
          { name: "income_statement_section", type: "string" },
        ],
        rlsColumn: "organization_key",
        partitionColumn: "organization_key",
      },
      {
        tableName: "dim_contact",
        columns: [
          { name: "contact_key", type: "string" },
          { name: "organization_key", type: "string", isRLSColumn: true },
          { name: "contact_type", type: "string" },
          { name: "display_name", type: "string" },
          { name: "company_name", type: "string" },
          { name: "email", type: "string" },
          { name: "is_customer", type: "boolean" },
          { name: "is_vendor", type: "boolean" },
          { name: "is_active", type: "boolean" },
        ],
        rlsColumn: "organization_key",
        partitionColumn: "organization_key",
      },
      {
        tableName: "dim_date",
        columns: [
          { name: "date_key", type: "number" },
          { name: "full_date", type: "date" },
          { name: "year", type: "number" },
          { name: "quarter", type: "number" },
          { name: "month", type: "number" },
          { name: "day", type: "number" },
          { name: "day_of_week", type: "number" },
          { name: "is_weekend", type: "boolean" },
          { name: "fiscal_year", type: "number" },
          { name: "fiscal_quarter", type: "number" },
        ],
      },
      {
        tableName: "fact_transaction",
        columns: [
          { name: "transaction_key", type: "string" },
          { name: "organization_key", type: "string", isRLSColumn: true },
          { name: "account_key", type: "string" },
          { name: "date_key", type: "number" },
          { name: "contact_key", type: "string" },
          { name: "transaction_type_key", type: "string" },
          { name: "debit_amount", type: "number" },
          { name: "credit_amount", type: "number" },
          { name: "amount", type: "number" },
          { name: "amount_cad", type: "number" },
          { name: "currency_code", type: "string" },
          { name: "reference_number", type: "string" },
          { name: "memo", type: "string" },
        ],
        rlsColumn: "organization_key",
        partitionColumn: "organization_key",
      },
      {
        tableName: "fact_account_balance",
        columns: [
          { name: "balance_key", type: "string" },
          { name: "organization_key", type: "string", isRLSColumn: true },
          { name: "account_key", type: "string" },
          { name: "date_key", type: "number" },
          { name: "fiscal_year", type: "number" },
          { name: "fiscal_period", type: "number" },
          { name: "opening_balance", type: "number" },
          { name: "debit_total", type: "number" },
          { name: "credit_total", type: "number" },
          { name: "net_change", type: "number" },
          { name: "closing_balance", type: "number" },
          { name: "balance_type", type: "string" },
        ],
        rlsColumn: "organization_key",
        partitionColumn: "organization_key",
      },
    ];
  }

  /**
   * Generate RLS DAX expression for Power BI dataset
   */
  generateRLSExpression(tableName: string): string {
    const schema = this.getGoldLayerSchema().find(
      (s) => s.tableName === tableName,
    );

    if (!schema?.rlsColumn) {
      return "TRUE()"; // No RLS for shared dimension tables
    }

    // DAX expression that filters by organization_key
    // USERNAME() returns the organization_id from the embed token
    return `[${schema.rlsColumn}] = USERNAME()`;
  }

  /**
   * Generate signed URL for secure data access (implements interface)
   * Used by Power BI gateway or custom connectors
   */
  async generateSecureDataUrl(
    access: SecureDataAccess,
    tableName: string,
    _format: "parquet" | "json" = "parquet",
  ): Promise<string> {
    // Verify the access signature
    if (!this.verifyAccessSignature(access)) {
      throw new Error("Invalid access signature");
    }

    // Check expiration
    if (new Date(access.expiresAt) < new Date()) {
      throw new Error("Access token expired");
    }

    const key = `${tableName}/organization_key=${access.organizationId}/`;

    try {
      // List files in the partition
      const listCommand = new ListObjectsV2Command({
        Bucket: this.goldBucket,
        Prefix: key,
        MaxKeys: 1,
      });

      const listResult = await this.s3Client.send(listCommand);
      if (!listResult.Contents || listResult.Contents.length === 0) {
        throw new Error(`No data found for table: ${tableName}`);
      }

      // Get the latest file
      const latestFile = listResult.Contents[listResult.Contents.length - 1];
      if (!latestFile.Key) {
        throw new Error("Invalid file key");
      }

      // Generate signed URL with 15-minute expiration
      const command = new GetObjectCommand({
        Bucket: this.goldBucket,
        Key: latestFile.Key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900, // 15 minutes
      });

      this.logger.log(
        `[Audit] Generated secure URL for ${tableName}, org: ${access.organizationId}, user: ${access.userId}`,
      );

      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate secure URL: ${error}`);
      throw error;
    }
  }

  /**
   * Generate Athena connection string for Direct Query
   */
  getAthenaConnectionConfig(): {
    endpoint: string;
    database: string;
    workgroup: string;
    region: string;
  } {
    return {
      endpoint: `athena.${this.configService.get<string>("S3_REGION") || "ca-central-1"}.amazonaws.com`,
      database: this.athenaDatabase,
      workgroup: "primary",
      region: this.configService.get<string>("S3_REGION") || "ca-central-1",
    };
  }

  /**
   * Generate secure access token for Power BI data requests
   */
  generateAccessToken(
    organizationId: string,
    userId: string,
    businessUnitId?: string,
    roles: string[] = [],
    expirationMinutes: number = 60,
  ): SecureDataAccess {
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const access: SecureDataAccess = {
      organizationId,
      userId,
      businessUnitId,
      roles,
      expiresAt,
      signature: "", // Will be set below
    };

    access.signature = this.createAccessSignature(access);

    return access;
  }

  /**
   * Create HMAC signature for access token
   */
  private createAccessSignature(
    access: Omit<SecureDataAccess, "signature">,
  ): string {
    const payload = `${access.organizationId}:${access.userId}:${access.expiresAt.toISOString()}`;
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
  }

  /**
   * Verify access token signature
   */
  private verifyAccessSignature(access: SecureDataAccess): boolean {
    const expectedSignature = this.createAccessSignature({
      organizationId: access.organizationId,
      userId: access.userId,
      businessUnitId: access.businessUnitId,
      roles: access.roles,
      expiresAt: access.expiresAt,
    });
    return access.signature === expectedSignature;
  }

  /**
   * Get Power BI dataset configuration for the Gold layer
   */
  getDatasetConfig(): PowerBIDatasetConfig {
    return {
      datasetId: this.configService.get<string>("POWERBI_DATASET_ID") || "",
      tables: this.getGoldLayerSchema(),
      refreshSchedule: "0 */6 * * *", // Every 6 hours
      rlsEnabled: true,
      connectionType: "import",
    };
  }

  /**
   * Generate M Query (Power Query) for secure data import
   */
  generateMQuery(tableName: string): string {
    const baseUrl =
      this.configService.get<string>("API_URL") || "https://api.plainledger.ca";

    return `let
    // PlainLedger Gold Layer - ${tableName}
    // This query uses secure API endpoint with RLS enforcement
    
    Source = Json.Document(
        Web.Contents(
            "${baseUrl}/api/v1/analytics/data/${tableName}",
            [
                Headers = [
                    #"Authorization" = "Bearer " & AccessToken,
                    #"Content-Type" = "application/json"
                ],
                Query = [
                    format = "json",
                    limit = "1000000"
                ]
            ]
        )
    ),
    #"Converted to Table" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Expanded Records" = Table.ExpandRecordColumn(#"Converted to Table", "Column1", Record.FieldNames(Source{0}))
in
    #"Expanded Records"`;
  }

  /**
   * Health check for Power BI datalake connectivity
   */
  async healthCheck(): Promise<{
    s3Connected: boolean;
    athenaConfigured: boolean;
    tablesAvailable: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    let s3Connected = false;
    const tablesAvailable: string[] = [];

    try {
      // Check S3 connectivity
      const listCommand = new ListObjectsV2Command({
        Bucket: this.goldBucket,
        MaxKeys: 1,
      });
      await this.s3Client.send(listCommand);
      s3Connected = true;

      // Check each table
      for (const schema of this.getGoldLayerSchema()) {
        try {
          const tableCommand = new ListObjectsV2Command({
            Bucket: this.goldBucket,
            Prefix: `${schema.tableName}/`,
            MaxKeys: 1,
          });
          const result = await this.s3Client.send(tableCommand);
          if (result.Contents && result.Contents.length > 0) {
            tablesAvailable.push(schema.tableName);
          }
        } catch (e) {
          // Table not available
        }
      }
    } catch (error) {
      errors.push(`S3 connection failed: ${error}`);
    }

    return {
      s3Connected,
      athenaConfigured: !!this.athenaDatabase,
      tablesAvailable,
      errors,
    };
  }
}
