/**
 * Power BI Data Controller
 *
 * Secure API endpoints for Power BI to fetch data from the Gold layer.
 * Implements:
 * - Row-Level Security (RLS) enforcement
 * - Rate limiting
 * - Audit logging
 * - Multiple output formats (JSON, CSV)
 *
 * Security:
 * - All endpoints require authentication
 * - Organization ID extracted from JWT for RLS
 * - IP whitelisting for Power BI gateway
 * - Request signing for additional security
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Public, Roles } from "nest-keycloak-connect";
import { SecureDataAccess } from "@infrastructure/services/powerbi-datalake.service";
import {
  DimAccount,
  DimContact,
  FactTransaction,
} from "@infrastructure/services/datalake-data.service";
import { IPowerBIDatalakeService } from "@application/ports/outbound/IPowerBIDatalakeService";
import { IDatalakeDataService } from "@application/ports/outbound/IDatalakeDataService";
import { Inject } from "@nestjs/common";

// Response DTOs
interface DataResponse<T> {
  data: T[];
  metadata: {
    tableName: string;
    rowCount: number;
    organizationId: string;
    generatedAt: string;
    format: string;
  };
}

interface SchemaResponse {
  tables: {
    name: string;
    columns: { name: string; type: string }[];
    rlsEnabled: boolean;
  }[];
}

interface AccessTokenResponse {
  token: SecureDataAccess;
  expiresAt: string;
  tables: string[];
}

@ApiTags("Power BI Data")
@ApiBearerAuth()
@Controller("api/v1/analytics/data")
export class PowerBIDataController {
  private readonly logger = new Logger(PowerBIDataController.name);
  private readonly allowedIPs: string[];

  constructor(
    @Inject("IPowerBIDatalakeService")
    private readonly powerBIDatalakeService: IPowerBIDatalakeService,
    @Inject("IDatalakeDataService")
    private readonly datalakeService: IDatalakeDataService,
    private readonly configService: ConfigService,
  ) {
    // Load allowed IPs for Power BI gateway (optional additional security)
    const ipList = this.configService.get<string>("POWERBI_ALLOWED_IPS") || "";
    this.allowedIPs = ipList.split(",").filter((ip) => ip.trim().length > 0);
  }

  /**
   * Get Gold layer schema for Power BI dataset configuration
   */
  @Get("schema")
  @ApiOperation({
    summary: "Get data schema for Power BI dataset configuration",
  })
  @ApiResponse({ status: 200, description: "Schema retrieved successfully" })
  async getSchema(): Promise<SchemaResponse> {
    const schemas = this.powerBIDatalakeService.getGoldLayerSchema();

    return {
      tables: schemas.map((schema) => ({
        name: schema.tableName,
        columns: schema.columns.map((col) => ({
          name: col.name,
          type: col.type,
        })),
        rlsEnabled: !!schema.rlsColumn,
      })),
    };
  }

  /**
   * Generate access token for Power BI data requests
   */
  @Post("token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate secure access token for data requests" })
  @ApiResponse({ status: 200, description: "Token generated successfully" })
  async generateAccessToken(
    @Req()
    req: {
      user: { sub: string; organizationId: string; roles?: string[] };
    },
  ): Promise<AccessTokenResponse> {
    const { sub: userId, organizationId, roles = [] } = req.user;

    if (!organizationId) {
      throw new ForbiddenException("Organization ID required");
    }

    this.logger.log(
      `[Audit] Access token generated - User: ${userId}, Org: ${organizationId}`,
    );

    const token = this.powerBIDatalakeService.generateAccessToken(
      organizationId,
      userId,
      undefined, // businessUnitId
      roles,
      60, // 60 minutes expiration
    );

    const schemas = this.powerBIDatalakeService.getGoldLayerSchema();

    return {
      token,
      expiresAt: token.expiresAt.toISOString(),
      tables: schemas.map((s) => s.tableName),
    };
  }

  /**
   * Get data from a specific table with RLS enforcement
   */
  @Get(":tableName")
  @ApiOperation({ summary: "Get data from Gold layer table with RLS" })
  @ApiParam({ name: "tableName", description: "Name of the table to query" })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv"] })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Data retrieved successfully" })
  async getTableData(
    @Param("tableName") tableName: string,
    @Req() req: { user: { sub: string; organizationId: string }; ip: string },
    @Query("format") format: "json" | "csv" = "json",
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
    @Headers("x-powerbi-gateway") gatewayId?: string,
  ): Promise<DataResponse<unknown> | string> {
    const { sub: userId, organizationId } = req.user;

    // Validate IP if gateway header is present (Power BI gateway requests)
    if (gatewayId && this.allowedIPs.length > 0) {
      if (!this.allowedIPs.includes(req.ip)) {
        this.logger.warn(
          `[Security] Blocked request from non-whitelisted IP: ${req.ip}`,
        );
        throw new ForbiddenException("IP not allowed");
      }
    }

    if (!organizationId) {
      throw new ForbiddenException("Organization ID required for RLS");
    }

    // Validate table name
    const validTables = this.powerBIDatalakeService
      .getGoldLayerSchema()
      .map((s) => s.tableName);
    if (!validTables.includes(tableName)) {
      throw new ForbiddenException(`Invalid table name: ${tableName}`);
    }

    this.logger.log(
      `[Audit] Data access - Table: ${tableName}, User: ${userId}, Org: ${organizationId}, Format: ${format}`,
    );

    try {
      // Fetch data with RLS (organization scoping)
      const dashboardData =
        await this.datalakeService.getDashboardData(organizationId);

      let data: unknown[];
      switch (tableName) {
        case "dim_account":
          data = dashboardData.accounts;
          break;
        case "dim_contact":
          data = dashboardData.contacts;
          break;
        case "fact_transaction":
          data = dashboardData.transactions;
          break;
        case "fact_account_balance":
          data = dashboardData.balances;
          break;
        default:
          data = [];
      }

      // Apply pagination
      const effectiveLimit = Math.min(limit || 10000, 100000);
      const effectiveOffset = offset || 0;
      const paginatedData = data.slice(
        effectiveOffset,
        effectiveOffset + effectiveLimit,
      );

      // Format response
      if (format === "csv") {
        return this.convertToCSV(paginatedData);
      }

      return {
        data: paginatedData,
        metadata: {
          tableName,
          rowCount: paginatedData.length,
          organizationId,
          generatedAt: new Date().toISOString(),
          format,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch data: ${error}`);
      throw error;
    }
  }

  /**
   * Get signed URL for direct S3 access (for large datasets)
   */
  @Get(":tableName/url")
  @ApiOperation({ summary: "Get signed URL for direct data access" })
  @ApiParam({ name: "tableName", description: "Name of the table" })
  @ApiResponse({ status: 200, description: "Signed URL generated" })
  async getSignedUrl(
    @Param("tableName") tableName: string,
    @Req()
    req: { user: { sub: string; organizationId: string; roles?: string[] } },
  ): Promise<{ url: string; expiresAt: string }> {
    const { sub: userId, organizationId, roles = [] } = req.user;

    if (!organizationId) {
      throw new ForbiddenException("Organization ID required");
    }

    // Create secure access token
    const access = this.powerBIDatalakeService.generateAccessToken(
      organizationId,
      userId,
      undefined,
      roles,
      15, // 15 minutes for signed URL
    );

    const url = await this.powerBIDatalakeService.generateSecureDataUrl(
      access,
      tableName,
    );

    this.logger.log(
      `[Audit] Signed URL generated - Table: ${tableName}, User: ${userId}, Org: ${organizationId}`,
    );

    return {
      url,
      expiresAt: access.expiresAt.toISOString(),
    };
  }

  /**
   * Get RLS DAX expressions for Power BI dataset
   */
  @Get("rls/expressions")
  @ApiOperation({ summary: "Get RLS DAX expressions for all tables" })
  @ApiResponse({ status: 200, description: "RLS expressions retrieved" })
  async getRLSExpressions(): Promise<{ [tableName: string]: string }> {
    const schemas = this.powerBIDatalakeService.getGoldLayerSchema();
    const expressions: { [tableName: string]: string } = {};

    for (const schema of schemas) {
      expressions[schema.tableName] =
        this.powerBIDatalakeService.generateRLSExpression(schema.tableName);
    }

    return expressions;
  }

  /**
   * Get Power Query M code for data import
   */
  @Get(":tableName/mquery")
  @ApiOperation({ summary: "Get Power Query M code for table import" })
  @ApiParam({ name: "tableName", description: "Name of the table" })
  @ApiResponse({ status: 200, description: "M Query code generated" })
  async getMQuery(
    @Param("tableName") tableName: string,
  ): Promise<{ mQuery: string }> {
    const validTables = this.powerBIDatalakeService
      .getGoldLayerSchema()
      .map((s) => s.tableName);

    if (!validTables.includes(tableName)) {
      throw new ForbiddenException(`Invalid table name: ${tableName}`);
    }

    return {
      mQuery: this.powerBIDatalakeService.generateMQuery(tableName),
    };
  }

  /**
   * Health check for Power BI connectivity
   * Note: Using _health path to avoid conflict with :tableName parameter route
   */
  @Get("_health")
  @Public()
  @ApiOperation({ summary: "Check Power BI data connectivity health" })
  @ApiResponse({ status: 200, description: "Health status" })
  async healthCheck(): Promise<{
    status: string;
    s3Connected: boolean;
    athenaConfigured: boolean;
    tablesAvailable: string[];
    errors: string[];
  }> {
    const health = await this.powerBIDatalakeService.healthCheck();

    return {
      status:
        health.s3Connected && health.tablesAvailable.length > 0
          ? "healthy"
          : "degraded",
      ...health,
    };
  }

  /**
   * Convert data array to CSV format
   */
  private convertToCSV(data: unknown[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((row) => {
      const record = row as Record<string, unknown>;
      return headers
        .map((header) => {
          const value = record[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or newline
          if (
            stringValue.includes(",") ||
            stringValue.includes("\n") ||
            stringValue.includes('"')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}
