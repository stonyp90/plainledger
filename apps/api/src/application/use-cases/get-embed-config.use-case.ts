import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { RLSIdentity } from "@domain/value-objects/RLSIdentity";
import { IAnalyticsReportRepository } from "@application/ports/outbound/IAnalyticsReportRepository";
import { IOrganizationFeaturesRepository } from "@application/ports/outbound/IOrganizationFeaturesRepository";
import { IPowerBIAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi.adapter";

export interface GetEmbedConfigRequest {
  reportId: string;
  organizationId: string;
  businessUnitId?: string;
  userRoles: string[];
}

export interface GetEmbedConfigResponse {
  embedUrl: string;
  accessToken: string;
  tokenType: string;
  reportId: string;
  datasetId?: string;
  expiration: string;
}

/**
 * Use Case: Get Power BI Embed Configuration
 *
 * Validates user access, checks organization features, and generates
 * embed token with RLS identity for secure data filtering.
 */
@Injectable()
export class GetEmbedConfigUseCase {
  constructor(
    @Inject("IAnalyticsReportRepository")
    private readonly reportRepository: IAnalyticsReportRepository,
    @Inject("IOrganizationFeaturesRepository")
    private readonly featuresRepository: IOrganizationFeaturesRepository,
    @Inject("IPowerBIAdapter")
    private readonly powerBIService: IPowerBIAdapter,
  ) {}

  async execute(
    request: GetEmbedConfigRequest,
  ): Promise<GetEmbedConfigResponse> {
    // 1. Check if Power BI analytics is enabled for this organization
    const features = await this.featuresRepository.findByOrganizationId(
      request.organizationId,
    );

    if (!features) {
      throw new NotFoundException("Organization features not found");
    }

    if (!features.isAnalyticsEnabled("powerbi")) {
      throw new UnauthorizedException(
        "Power BI analytics is not enabled for this organization",
      );
    }

    // 2. Check if user has access to Power BI analytics
    if (!features.canUserAccessAnalytics("powerbi", request.userRoles)) {
      throw new UnauthorizedException(
        "User does not have access to Power BI analytics",
      );
    }

    // 3. Get report details
    const report = await this.reportRepository.findById(request.reportId);

    if (!report) {
      throw new NotFoundException(
        `Report with ID ${request.reportId} not found`,
      );
    }

    if (!report.isActive) {
      throw new NotFoundException("Report is not active");
    }

    // 4. Build RLS identity from request
    const rlsIdentity = RLSIdentity.fromJWT(
      request.organizationId,
      request.businessUnitId,
      request.userRoles,
    );

    // 5. Generate embed token with RLS
    const embedConfig = await this.powerBIService.generateEmbedToken(
      report.workspaceId,
      report.reportId,
      report.datasetId,
      rlsIdentity,
    );

    return {
      embedUrl: embedConfig.embedUrl,
      accessToken: embedConfig.accessToken,
      tokenType: embedConfig.tokenType,
      reportId: embedConfig.reportId,
      datasetId: embedConfig.datasetId,
      expiration: embedConfig.expiration.toISOString(),
    };
  }
}
