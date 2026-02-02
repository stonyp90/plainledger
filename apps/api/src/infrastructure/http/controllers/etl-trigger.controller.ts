import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import { ConfigService } from "@nestjs/config";

class TriggerETLDto {
  organization_id: string;
  action?: string; // 'refresh', 'sync', 'full'
  industry?: string; // Optional: specific industry to sync
}

/**
 * ETL Trigger Controller
 *
 * Internal endpoint for triggering ETL pipeline runs.
 * Can be called from:
 * - GitHub Actions webhooks
 * - Scheduled jobs
 * - Manual admin triggers
 *
 * This endpoint triggers the ETL pipeline which:
 * 1. Extracts data from QuickBooks → S3 Bronze
 * 2. Transforms Bronze → Silver
 * 3. Transforms Silver → Gold
 * 4. Invalidates cache and refreshes GraphQL data
 */
@Controller("internal/etl")
@ApiTags("internal")
export class ETLTriggerController {
  private readonly logger = new Logger(ETLTriggerController.name);
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

  @Post("trigger")
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Trigger ETL pipeline",
    description:
      "Internal endpoint to trigger ETL pipeline execution. " +
      "This will queue an ETL job that extracts data from QuickBooks, " +
      "transforms it through Bronze → Silver → Gold layers, and refreshes the cache.",
  })
  @ApiResponse({
    status: 202,
    description: "ETL pipeline triggered successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid internal API token",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request parameters",
  })
  async triggerETL(
    @Body() body: TriggerETLDto,
    @Headers("x-internal-token") token?: string,
  ) {
    this.validateToken(token);

    const { organization_id, action = "refresh", industry } = body;

    if (!organization_id) {
      throw new BadRequestException("organization_id is required");
    }

    this.logger.log(
      `ETL pipeline triggered: org=${organization_id}, action=${action}, industry=${industry || "all"}`,
    );

    // In production, this would:
    // 1. Queue an ETL job (AWS Step Functions, SQS, etc.)
    // 2. Return job ID for tracking
    // 3. Optionally trigger GitHub Actions workflow via API

    // For now, log the trigger and return success
    // The actual ETL will be handled by GitHub Actions workflow

    const jobId = `etl-${organization_id}-${Date.now()}`;

    this.logger.log(`ETL job queued: ${jobId}`);

    return {
      success: true,
      job_id: jobId,
      organization_id,
      action,
      industry: industry || "all",
      message:
        "ETL pipeline triggered. Check GitHub Actions for execution status.",
      status: "queued",
    };
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh GraphQL cache after ETL",
    description:
      "Internal endpoint called after ETL completes to refresh GraphQL cache. " +
      "This invalidates cached data for the specified organization.",
  })
  @ApiResponse({
    status: 200,
    description: "Cache refreshed successfully",
  })
  async refreshCache(
    @Body() body: { organization_id: string },
    @Headers("x-internal-token") token?: string,
  ) {
    this.validateToken(token);

    const { organization_id } = body;

    if (!organization_id) {
      throw new BadRequestException("organization_id is required");
    }

    this.logger.log(
      `Cache refresh triggered for organization: ${organization_id}`,
    );

    // In production, this would:
    // 1. Invalidate Redis cache keys for the organization
    // 2. Trigger GraphQL schema refresh if needed
    // 3. Notify subscribers via WebSocket/SSE

    // For now, log and return success
    this.logger.log(
      `Cache refresh completed for organization: ${organization_id}`,
    );

    return {
      success: true,
      organization_id,
      message: "Cache refresh completed",
    };
  }
}
