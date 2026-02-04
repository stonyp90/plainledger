import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminCommunicationService } from '../services/admin-communication.service';

@ApiTags('Platform Admin - Communications')
@ApiBearerAuth()
@Controller('admin/communications')
@UseGuards(PlatformAdminGuard)
export class AdminCommunicationController {
  constructor(
    private readonly communicationService: AdminCommunicationService,
  ) {}

  @Get('templates')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'List all email templates',
    description: 'Returns list of all available email templates',
  })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async listTemplates() {
    return {
      templates: await this.communicationService.listTemplates(),
    };
  }

  @Get('templates/:name')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'Get template content',
    description: 'Returns the content of a specific email template',
  })
  @ApiResponse({ status: 200, description: 'Template content' })
  async getTemplate(@Param('name') name: string) {
    return {
      name,
      content: await this.communicationService.getTemplate(name),
    };
  }

  @Put('templates/:name')
  @RequirePermission('communication:edit_templates')
  @ApiOperation({
    summary: 'Update template',
    description: 'Updates an email template',
  })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('name') name: string,
    @Body() body: { content: string },
  ) {
    await this.communicationService.updateTemplate(name, body.content);
    return {
      name,
      updated: true,
    };
  }

  @Post('templates/preview')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'Preview template with test data',
    description: 'Renders a template with test data for preview',
  })
  @ApiResponse({ status: 200, description: 'Rendered template' })
  async previewTemplate(
    @Body() body: { name: string; testData?: Record<string, unknown> },
  ) {
    return {
      preview: await this.communicationService.previewTemplate(
        body.name,
        body.testData,
      ),
    };
  }

  @Post('send')
  @RequirePermission('communication:send')
  @ApiOperation({
    summary: 'Send bulk communication',
    description: 'Sends emails to multiple recipients using a template',
  })
  @ApiResponse({ status: 200, description: 'Communication queued' })
  async sendBulk(@Body() body: {
    templateName: string;
    recipientIds: string[];
    subject: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.communicationService.sendBulkCommunication(body);
  }

  @Get('campaigns')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'List communication campaigns',
    description: 'Returns list of all communication campaigns',
  })
  @ApiResponse({ status: 200, description: 'List of campaigns' })
  async listCampaigns() {
    return {
      campaigns: await this.communicationService.listCampaigns(),
    };
  }

  @Get('campaigns/:id')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'Get campaign details',
    description: 'Returns details and statistics for a campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async getCampaign(@Param('id') id: string) {
    const campaigns = await this.communicationService.listCampaigns();
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) {
      throw new Error(`Campaign ${id} not found`);
    }
    return campaign;
  }

  @Get('logs')
  @RequirePermission('communication:view')
  @ApiOperation({
    summary: 'Get communication logs',
    description: 'Returns sent communication logs with filtering',
  })
  @ApiResponse({ status: 200, description: 'Communication logs' })
  async getLogs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('templateName') templateName?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.communicationService.getCommunicationLogs({
      type,
      status,
      templateName,
      limit,
      offset,
    });
  }
}
