/**
 * Port (Interface) for Power BI Datalake Service
 * Defines the contract for Power BI datalake connectivity
 */

import {
  DatasetSchema,
  SecureDataAccess,
} from "@infrastructure/services/powerbi-datalake.service";

export interface IPowerBIDatalakeService {
  /**
   * Get Gold layer schema for Power BI
   */
  getGoldLayerSchema(): DatasetSchema[];

  /**
   * Generate secure data URL for Power BI gateway or custom connectors
   */
  generateSecureDataUrl(
    access: SecureDataAccess,
    tableName: string,
    format?: "parquet" | "json",
  ): Promise<string>;

  /**
   * Generate RLS DAX expression for a table
   */
  generateRLSExpression(tableName: string): string;

  /**
   * Generate Power Query M code for table import
   */
  generateMQuery(tableName: string): string;

  /**
   * Generate access token for Power BI data requests
   */
  generateAccessToken(
    organizationId: string,
    userId: string,
    businessUnitId?: string,
    roles?: string[],
    expirationMinutes?: number,
  ): SecureDataAccess;

  /**
   * Health check for Power BI connectivity
   */
  healthCheck(): Promise<{
    s3Connected: boolean;
    athenaConfigured: boolean;
    tablesAvailable: string[];
    errors: string[];
  }>;
}
