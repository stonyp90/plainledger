import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "nest-keycloak-connect";
import { GetEmbedConfigUseCase } from "@application/use-cases/get-embed-config.use-case";
import { ListAnalyticsReportsUseCase } from "@application/use-cases/list-analytics-reports.use-case";
import { UpdateOrgFeaturesUseCase } from "@application/use-cases/update-org-features.use-case";
import { PowerBIThemeService } from "@infrastructure/services/powerbi-theme.service";
import { PowerBIService } from "@infrastructure/services/powerbi.service";
import { CPAAdminGuard } from "@infrastructure/http/guards/cpa-admin.guard";
import { IOrganizationFeaturesRepository } from "@application/ports/outbound/IOrganizationFeaturesRepository";

class GetEmbedConfigDto {
  reportId: string;
  businessUnitId?: string;
}

class UpdateOrgFeaturesDto {
  organizationId: string;
  analytics?: {
    plainledger?: {
      enabled?: boolean;
      visibleToRoles?: string[];
    };
    powerbi?: {
      enabled?: boolean;
      visibleToRoles?: string[];
    };
  };
}

@Controller("analytics")
@ApiTags("analytics")
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly getEmbedConfigUseCase: GetEmbedConfigUseCase,
    private readonly listAnalyticsReportsUseCase: ListAnalyticsReportsUseCase,
    private readonly updateOrgFeaturesUseCase: UpdateOrgFeaturesUseCase,
    private readonly powerBIThemeService: PowerBIThemeService,
    private readonly powerBIService: PowerBIService,
    @Inject("IOrganizationFeaturesRepository")
    private readonly featuresRepository: IOrganizationFeaturesRepository,
  ) {}

  @Get("reports")
  @Roles({
    roles: ["plainledger_user", "organization_admin", "business_unit_admin"],
  })
  @ApiOperation({ summary: "List available analytics reports" })
  @ApiQuery({ name: "organizationId", required: true })
  @ApiQuery({ name: "businessUnitId", required: false })
  async listReports(
    @Query("organizationId") organizationId: string,
    @Query("businessUnitId") businessUnitId: string | undefined,
    @Request() req: any,
  ) {
    const userRoles = req.user?.realm_access?.roles || [];

    return this.listAnalyticsReportsUseCase.execute({
      organizationId,
      businessUnitId,
      userRoles,
    });
  }

  @Post("embed")
  @Roles({
    roles: ["plainledger_user", "organization_admin", "business_unit_admin"],
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Power BI embed configuration" })
  @ApiResponse({ status: 200, description: "Embed configuration returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async getEmbedConfig(@Body() dto: GetEmbedConfigDto, @Request() req: any) {
    const organizationId = req.user?.organization_id;
    const businessUnitId = req.user?.business_unit_id || dto.businessUnitId;
    const userRoles = req.user?.realm_access?.roles || [];

    if (!organizationId) {
      throw new UnauthorizedException("Organization ID not found in token");
    }

    return this.getEmbedConfigUseCase.execute({
      reportId: dto.reportId,
      organizationId,
      businessUnitId,
      userRoles,
    });
  }

  @Get("theme")
  @Roles({
    roles: ["plainledger_user", "organization_admin", "business_unit_admin"],
  })
  @ApiOperation({ summary: "Get Power BI theme for organization" })
  @ApiQuery({ name: "organizationId", required: true })
  async getTheme(
    @Query("organizationId") organizationId: string,
    @Request() req: any,
  ) {
    // Get organization branding colors (from organization entity)
    // For now, return default theme
    const tenantName = req.user?.organization_name || "PlainLedger";
    const colors = {
      primary: "#1a1a2e",
      secondary: "#16213e",
      accent: "#0f3460",
    };

    const theme = this.powerBIThemeService.generateMinimalTheme(
      tenantName,
      colors,
    );

    // Return as JSON string (Power BI expects stringified JSON)
    return JSON.stringify(theme);
  }

  @Get("org-features")
  @Roles({ roles: ["plainledger_cpa_admin", "organization_admin"] })
  @ApiOperation({ summary: "Get organization analytics features" })
  @ApiQuery({ name: "organizationId", required: true })
  async getOrgFeatures(@Query("organizationId") organizationId: string) {
    const features =
      await this.featuresRepository.findByOrganizationId(organizationId);
    if (features) {
      return features.toJSON();
    }
    // Return defaults if not found
    return {
      id: "",
      organizationId,
      analytics: {
        plainledger: {
          enabled: true,
          visibleToRoles: [
            "plainledger_user",
            "organization_admin",
            "business_unit_admin",
          ],
        },
        powerbi: {
          enabled: false,
          visibleToRoles: ["organization_admin", "business_unit_admin"],
        },
      },
      updatedBy: "",
      updatedAt: new Date().toISOString(),
    };
  }

  @Put("org-features")
  @UseGuards(CPAAdminGuard)
  @Roles({ roles: ["plainledger_cpa_admin"] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update organization analytics features (CPA Admin only)",
  })
  @ApiResponse({ status: 200, description: "Features updated" })
  @ApiResponse({ status: 403, description: "Forbidden - CPA Admin only" })
  async updateOrgFeatures(
    @Body() dto: UpdateOrgFeaturesDto,
    @Request() req: any,
  ) {
    return this.updateOrgFeaturesUseCase.execute({
      organizationId: dto.organizationId,
      analytics: dto.analytics,
      updatedBy: req.user?.sub || "system",
    });
  }

  @Post("refresh/:datasetId")
  @Roles({ roles: ["organization_admin"] })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger Power BI dataset refresh" })
  @ApiQuery({ name: "workspaceId", required: true })
  async refreshDataset(
    @Param("datasetId") datasetId: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    await this.powerBIService.refreshDataset(workspaceId, datasetId);
    return { message: "Dataset refresh triggered" };
  }
}
