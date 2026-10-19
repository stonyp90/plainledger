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
  ForbiddenException,
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
import { PowerBIThemeAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi-theme.adapter";
import { PowerBIAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi.adapter";
import { CPAAdminGuard } from "@infrastructure/http/guards/cpa-admin.guard";
import { IOrganizationFeaturesRepository } from "@application/ports/outbound/IOrganizationFeaturesRepository";
import { OrganizationFeaturePolicyService } from '@application/services/organization-feature-policy.service';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GetEmbedConfigDto {
  @IsString() @MaxLength(100)
  reportId: string;
  @IsOptional() @IsString() @MaxLength(100)
  businessUnitId?: string;
}

class AnalyticsSectionDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(100, { each: true }) visibleToRoles?: string[];
}
class AnalyticsVisibilityDto {
  @IsOptional() @ValidateNested() @Type(() => AnalyticsSectionDto) plainledger?: AnalyticsSectionDto;
  @IsOptional() @ValidateNested() @Type(() => AnalyticsSectionDto) powerbi?: AnalyticsSectionDto;
}
class UpdateOrgFeaturesDto {
  @IsUUID()
  organizationId: string;
  @IsOptional() @ValidateNested() @Type(() => AnalyticsVisibilityDto)
  analytics?: AnalyticsVisibilityDto;
}

@Controller("analytics")
@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly getEmbedConfigUseCase: GetEmbedConfigUseCase,
    private readonly listAnalyticsReportsUseCase: ListAnalyticsReportsUseCase,
    private readonly updateOrgFeaturesUseCase: UpdateOrgFeaturesUseCase,
    private readonly powerBIThemeService: PowerBIThemeAdapter,
    private readonly powerBIService: PowerBIAdapter,
    @Inject("IOrganizationFeaturesRepository")
    private readonly featuresRepository: IOrganizationFeaturesRepository,
    private readonly policy: OrganizationFeaturePolicyService,
  ) {}

  @Get("reports")
  @Roles({
    roles: ["user"],
  })
  @ApiOperation({ summary: "List available analytics reports" })
  @ApiQuery({ name: "organizationId", required: true })
  @ApiQuery({ name: "businessUnitId", required: false })
  async listReports(
    @Query("organizationId") organizationId: string,
    @Query("businessUnitId") businessUnitId: string | undefined,
    @Request() req: any,
  ) {
    const { profile, policy } = await this.policy.readForActor(req.user, organizationId);
    const userRoles = [profile.role, 'user'].filter((role): role is string => !!role);

    return this.listAnalyticsReportsUseCase.execute({
      organizationId: policy.organization.id,
      businessUnitId,
      userRoles,
    });
  }

  @Post("embed")
  @Roles({
    roles: ["user"],
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Power BI embed configuration" })
  @ApiResponse({ status: 200, description: "Embed configuration returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async getEmbedConfig(@Body() dto: GetEmbedConfigDto, @Request() req: any) {
    const { profile, policy } = await this.policy.readForActor(req.user);
    if (!this.policy.analytics(policy).analytics.powerbi.enabled) throw new ForbiddenException('Power BI is not enabled in the organization feature policy and subscription');
    const organizationId = profile.organizationId;
    const businessUnitId = req.user?.business_unit_id || dto.businessUnitId;
    const userRoles = [profile.role, 'user'].filter((role): role is string => !!role);

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
    roles: ["user"],
  })
  @ApiOperation({ summary: "Get Power BI theme for organization" })
  @ApiQuery({ name: "organizationId", required: true })
  async getTheme(
    @Query("organizationId") organizationId: string,
    @Request() req: any,
  ) {
    // Get organization branding colors (from organization entity)
    // For now, return default theme
    const tenantName = (await this.policy.authorize(req.user, organizationId)).organization.name;
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
  @Roles({ roles: ["user"] })
  @ApiOperation({ summary: "Get organization analytics features" })
  @ApiQuery({ name: "organizationId", required: true })
  async getOrgFeatures(@Query("organizationId") organizationId: string, @Request() req: { user: AuthenticatedUser }) {
    return this.policy.analytics((await this.policy.readForActor(req.user, organizationId)).policy);
  }

  @Put("org-features")
  @Roles({ roles: ["realm:platform_admin", "realm:super_admin"] })
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
    return this.policy.analytics(await this.policy.update(req.user, dto.organizationId, dto.analytics));
  }

  @Post("refresh/:datasetId")
  @Roles({ roles: ["realm:platform_admin", "realm:super_admin"] })
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
