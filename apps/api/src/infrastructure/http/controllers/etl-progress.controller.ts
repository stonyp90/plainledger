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
import { ETLPublisherService } from "@infrastructure/services/etl-publisher.service";
import {
  ETLJobProgress,
  ETLJobStatus,
} from "@infrastructure/graphql/types/etl.types";
import { ConfigService } from "@nestjs/config";

class ETLProgressDto {
  jobId: string;
  organizationId: string;
  jobName: string;
  status: string;
  progress: number;
  recordsProcessed: number;
  recordsWritten: number;
  recordsQuarantined: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * ETL Progress Controller
 * Internal endpoint for ETL jobs to publish progress updates
 */
@Controller("internal/etl")
@ApiTags("internal")
export class ETLProgressController {
  private readonly logger = new Logger(ETLProgressController.name);
  private readonly internalToken: string;

  constructor(
    private readonly etlPublisher: ETLPublisherService,
    private readonly configService: ConfigService,
  ) {
    this.internalToken =
      this.configService.get<string>("INTERNAL_API_TOKEN") || "change-me";
  }

  private validateToken(token: string | undefined): void {
    if (!token || token !== this.internalToken) {
      throw new UnauthorizedException("Invalid internal API token");
    }
  }

  @Post("progress")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish ETL job progress",
    description:
      "Internal endpoint for ETL jobs to publish progress updates for GraphQL subscriptions",
  })
  async publishProgress(
    @Body() body: ETLProgressDto,
    @Headers("x-internal-token") token?: string,
  ) {
    this.validateToken(token);

    const progress: ETLJobProgress = {
      jobId: body.jobId,
      organizationId: body.organizationId,
      jobName: body.jobName,
      status: body.status as ETLJobStatus,
      progress: body.progress,
      recordsProcessed: body.recordsProcessed,
      recordsWritten: body.recordsWritten,
      recordsQuarantined: body.recordsQuarantined,
      error: body.error,
      startedAt: body.startedAt || new Date().toISOString(),
      completedAt: body.completedAt,
    };

    await this.etlPublisher.publishJobProgress(progress);

    return { success: true };
  }
}
