import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import { IAnalyticsReportRepository } from "@application/ports/outbound/IAnalyticsReportRepository";
import { IOrganizationFeaturesRepository } from "@application/ports/outbound/IOrganizationFeaturesRepository";

export interface ListAnalyticsReportsRequest {
  organizationId: string;
  businessUnitId?: string;
  userRoles: string[];
}

export interface ListAnalyticsReportsResponse {
  reports: Array<{
    id: string;
    reportId: string;
    reportName: string;
    workspaceId: string;
    datasetId?: string;
    organizationId?: string;
    businessUnitId?: string;
  }>;
}

/**
 * Use Case: List Available Analytics Reports
 *
 * Returns list of Power BI reports available to the user based on
 * organization features and user roles.
 */
@Injectable()
export class ListAnalyticsReportsUseCase {
  constructor(
    @Inject("IAnalyticsReportRepository")
    private readonly reportRepository: IAnalyticsReportRepository,
    @Inject("IOrganizationFeaturesRepository")
    private readonly featuresRepository: IOrganizationFeaturesRepository,
  ) {}

  async execute(
    request: ListAnalyticsReportsRequest,
  ): Promise<ListAnalyticsReportsResponse> {
    // Check if Power BI analytics is enabled
    const features = await this.featuresRepository.findByOrganizationId(
      request.organizationId,
    );

    if (!features || !features.isAnalyticsEnabled("powerbi")) {
      return { reports: [] };
    }

    // Check user access
    if (!features.canUserAccessAnalytics("powerbi", request.userRoles)) {
      throw new UnauthorizedException(
        "User does not have access to Power BI analytics",
      );
    }

    // Get reports for organization
    let reports = await this.reportRepository.findByOrganizationId(
      request.organizationId,
    );

    // Filter by business unit if specified
    if (request.businessUnitId) {
      reports = reports.filter(
        (r) => !r.businessUnitId || r.businessUnitId === request.businessUnitId,
      );
    }

    // Filter active reports only
    reports = reports.filter((r) => r.isActive);

    return {
      reports: reports.map((report) => ({
        id: report.id,
        reportId: report.reportId,
        reportName: report.reportName,
        workspaceId: report.workspaceId,
        datasetId: report.datasetId,
        organizationId: report.organizationId,
        businessUnitId: report.businessUnitId,
      })),
    };
  }
}
