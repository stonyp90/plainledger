import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import { ConfigService } from "@nestjs/config";

/**
 * DataSource Sync Controller
 * Internal endpoint for syncing datasource (QuickBooks, Xero, etc.) data to S3 Gold layer
 */
@Controller("internal/etl")
@ApiTags("internal")
export class DataSourceSyncController {
  private readonly logger = new Logger(DataSourceSyncController.name);
  private readonly internalToken: string;

  constructor(private readonly configService: ConfigService) {
    this.internalToken =
      this.configService.get<string>("INTERNAL_API_TOKEN") || "change-me";
  }

  private validateToken(token: string | undefined): void {
    if (!token || token !== this.internalToken) {
      throw new UnauthorizedException("Invalid internal API token");
    }
  }

  @Post("sync-quickbooks")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sync QuickBooks sandbox to S3 Gold layer",
    description:
      "Internal endpoint that triggers sync from QuickBooks sandbox to S3 Gold layer",
  })
  async syncQuickBooks(
    @Body()
    body: {
      organizationId: string;
      realmId: string;
      refreshToken: string;
    },
    @Headers("x-internal-token") token?: string,
  ) {
    this.validateToken(token);

    this.logger.log(
      `Starting QuickBooks sync for org ${body.organizationId}, realm ${body.realmId}`,
    );

    // Trigger the sync script
    // In production, this would be an ECS task or Lambda
    // For local dev, we can call the script directly
    try {
      const { execSync } = require("child_process");
      const result = execSync(
        `QUICKBOOKS_REFRESH_TOKEN=${body.refreshToken} QUICKBOOKS_REALM_ID=${body.realmId} npx tsx scripts/providers/quickbooks/sync-to-gold.ts`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            QUICKBOOKS_REFRESH_TOKEN: body.refreshToken,
            QUICKBOOKS_REALM_ID: body.realmId,
            S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:4566",
          },
          encoding: "utf-8",
        },
      );

      this.logger.log(`QuickBooks sync completed: ${result}`);

      return {
        success: true,
        message: "Sync completed successfully",
        recordsSynced: 0, // Would be parsed from script output
      };
    } catch (error) {
      this.logger.error(`QuickBooks sync failed: ${error.message}`);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }
}
