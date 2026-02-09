import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminOnboardingService } from '../services/admin-onboarding.service';

@ApiTags('Platform Admin - Onboarding')
@ApiBearerAuth()
@Controller('admin/onboarding')
@UseGuards(PlatformAdminGuard)
export class AdminOnboardingController {
  private readonly logger = new Logger(AdminOnboardingController.name);

  constructor(private readonly onboardingService: AdminOnboardingService) {}

  @Get('funnel')
  @RequirePermission('onboarding:view')
  @ApiOperation({
    summary: 'Get conversion funnel metrics',
    description: 'Returns conversion funnel metrics (signups → connected → sync → report → converted)',
  })
  @ApiResponse({ status: 200, description: 'Funnel metrics' })
  async getFunnel() {
    try {
      return await this.onboardingService.getFunnelMetrics();
    } catch (error) {
      this.logger.error(`Failed to get funnel metrics: ${error.message}`, error.stack);
      return {
        signups: 0,
        connectedDatasource: 0,
        firstSync: 0,
        viewedReport: 0,
        converted: 0,
        conversionRate: 0,
      };
    }
  }

  @Get('trials')
  @RequirePermission('onboarding:view')
  @ApiOperation({
    summary: 'Get active trials',
    description: 'Returns list of organizations currently on trial',
  })
  @ApiResponse({ status: 200, description: 'Active trials' })
  async getTrials() {
    try {
      return {
        trials: await this.onboardingService.getActiveTrials(),
      };
    } catch (error) {
      this.logger.error(`Failed to get active trials: ${error.message}`, error.stack);
      return { trials: [] };
    }
  }

  @Get(':orgId/progress')
  @RequirePermission('onboarding:view')
  @ApiOperation({
    summary: 'Get organization onboarding progress',
    description: 'Returns onboarding progress for a specific organization',
  })
  @ApiResponse({ status: 200, description: 'Onboarding progress' })
  async getOrgProgress(@Param('orgId') orgId: string) {
    return this.onboardingService.getOrgProgress(orgId);
  }

  @Post(':orgId/extend')
  @RequirePermission('onboarding:extend_trial')
  @ApiOperation({
    summary: 'Extend trial period',
    description: 'Extends the trial period for an organization',
  })
  @ApiResponse({ status: 200, description: 'Trial extended' })
  async extendTrial(
    @Param('orgId') orgId: string,
    @Body() body: { days: number },
  ) {
    return this.onboardingService.extendTrial(orgId, body.days);
  }

  @Post(':orgId/convert')
  @RequirePermission('onboarding:convert')
  @ApiOperation({
    summary: 'Mark organization as converted',
    description: 'Marks an organization as converted from trial to active',
  })
  @ApiResponse({ status: 200, description: 'Organization converted' })
  async convertOrg(@Param('orgId') orgId: string) {
    return this.onboardingService.convertOrg(orgId);
  }

  @Get('at-risk')
  @RequirePermission('onboarding:view')
  @ApiOperation({
    summary: 'Get at-risk trials',
    description: 'Returns trials that are expiring soon or have been inactive',
  })
  @ApiResponse({ status: 200, description: 'At-risk trials' })
  async getAtRisk() {
    try {
      return {
        atRisk: await this.onboardingService.getAtRiskTrials(),
      };
    } catch (error) {
      this.logger.error(`Failed to get at-risk trials: ${error.message}`, error.stack);
      return { atRisk: [] };
    }
  }
}
