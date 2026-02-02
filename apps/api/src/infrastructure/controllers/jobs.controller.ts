/**
 * Jobs Controller
 *
 * API endpoints for super admin job management.
 * Allows viewing, configuring, and manually triggering scheduled jobs.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AuthGuard, RoleGuard, Roles } from "nest-keycloak-connect";
import {
  JobConfigurationService,
  JobConfiguration,
  JobExecution,
  UpdateJobConfigDto,
} from "@application/services/job-configuration.service";
import { TaxCreditSyncJob } from "@infrastructure/jobs/tax-credit-sync.job";
import { DataRetentionJob } from "@infrastructure/jobs/data-retention.job";
import { CurrentUser } from "@infrastructure/auth/current-user.decorator";

interface UpdateJobRequest {
  isEnabled?: boolean;
  cronExpression?: string;
  timezone?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  alertOnFailure?: boolean;
  alertOnSuccess?: boolean;
  alertOnChangesDetected?: boolean;
  alertEmails?: string[];
  alertSlackWebhook?: string;
}

@ApiTags("Admin - Jobs")
@ApiBearerAuth()
@Controller("admin/jobs")
@UseGuards(AuthGuard, RoleGuard)
@Roles({ roles: ["realm:admin", "realm:super_admin"] })
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobConfigService: JobConfigurationService,
    private readonly taxCreditSyncJob: TaxCreditSyncJob,
    private readonly dataRetentionJob: DataRetentionJob,
  ) {}

  /**
   * Get all job configurations
   */
  @Get()
  @ApiOperation({ summary: "Get all scheduled jobs" })
  @ApiResponse({
    status: 200,
    description: "List of all job configurations",
  })
  async getAllJobs(): Promise<JobConfiguration[]> {
    try {
      return await this.jobConfigService.getAllJobs();
    } catch (error) {
      this.logger.error(`Failed to get jobs: ${error}`);
      throw new HttpException(
        "Failed to retrieve jobs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific job configuration
   */
  @Get(":jobId")
  @ApiOperation({ summary: "Get a specific job configuration" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiResponse({
    status: 200,
    description: "Job configuration details",
  })
  @ApiResponse({ status: 404, description: "Job not found" })
  async getJob(@Param("jobId") jobId: string): Promise<JobConfiguration> {
    const job = await this.jobConfigService.getJob(jobId);
    if (!job) {
      throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
    }
    return job;
  }

  /**
   * Update job configuration
   */
  @Patch(":jobId")
  @ApiOperation({ summary: "Update job configuration" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiBody({
    description: "Job configuration updates",
    schema: {
      type: "object",
      properties: {
        isEnabled: { type: "boolean" },
        cronExpression: { type: "string", example: "0 4 * * *" },
        timezone: { type: "string", example: "America/Toronto" },
        timeoutSeconds: { type: "number", example: 1800 },
        maxRetries: { type: "number", example: 3 },
        alertOnFailure: { type: "boolean" },
        alertOnSuccess: { type: "boolean" },
        alertOnChangesDetected: { type: "boolean" },
        alertEmails: { type: "array", items: { type: "string" } },
        alertSlackWebhook: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Updated job configuration",
  })
  async updateJob(
    @Param("jobId") jobId: string,
    @Body() updates: UpdateJobRequest,
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<JobConfiguration> {
    try {
      const result = await this.jobConfigService.updateJob(
        jobId,
        updates as UpdateJobConfigDto,
        user.sub,
      );

      this.logger.log(`Job ${jobId} updated by ${user.email || user.sub}`);
      return result;
    } catch (error) {
      if ((error as Error).message?.includes("not found")) {
        throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        "Failed to update job",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get job execution history
   */
  @Get(":jobId/executions")
  @ApiOperation({ summary: "Get job execution history" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Job execution history",
  })
  async getJobExecutions(
    @Param("jobId") jobId: string,
    @Query("limit") limit?: number,
  ): Promise<JobExecution[]> {
    return this.jobConfigService.getJobExecutions(jobId, limit || 20);
  }

  /**
   * Manually trigger a job
   */
  @Post(":jobId/run")
  @ApiOperation({ summary: "Manually trigger a job" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiResponse({
    status: 200,
    description: "Job triggered successfully",
  })
  async triggerJob(
    @Param("jobId") jobId: string,
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<{ message: string; runId: string }> {
    this.logger.log(`Manual job trigger: ${jobId} by ${user.email || user.sub}`);

    let result: { runId: string };

    switch (jobId) {
      case "tax_credit_sync":
        const syncResult = await this.taxCreditSyncJob.runManually();
        result = { runId: syncResult.runId };
        break;

      case "data_retention":
        const retentionResult = await this.dataRetentionJob.runManually(true); // Dry run for safety
        result = { runId: retentionResult.runId };
        break;

      default:
        throw new HttpException(
          `Manual trigger not supported for job: ${jobId}`,
          HttpStatus.BAD_REQUEST,
        );
    }

    return {
      message: `Job ${jobId} triggered successfully`,
      runId: result.runId,
    };
  }

  /**
   * Toggle job enabled/disabled
   */
  @Post(":jobId/toggle")
  @ApiOperation({ summary: "Toggle job enabled/disabled" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiResponse({
    status: 200,
    description: "Job toggled successfully",
  })
  async toggleJob(
    @Param("jobId") jobId: string,
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<JobConfiguration> {
    const job = await this.jobConfigService.getJob(jobId);
    if (!job) {
      throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
    }

    return this.jobConfigService.updateJob(
      jobId,
      { isEnabled: !job.isEnabled },
      user.sub,
    );
  }
}
