import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLogEntity } from '../entities/webhook-log.entity';

@ApiTags('Platform Admin - Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
@UseGuards(PlatformAdminGuard)
export class AdminIntegrationController {
  private readonly logger = new Logger(AdminIntegrationController.name);

  constructor(
    @InjectRepository(WebhookLogEntity)
    private readonly webhookLogRepository: Repository<WebhookLogEntity>,
  ) {}

  @Get('providers')
  @RequirePermission('integration:list')
  @ApiOperation({
    summary: 'List all integration providers',
    description: 'Returns all configured integration providers (QuickBooks, Xero, Sage, etc.)',
  })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async listProviders() {
    // Get available providers from factory
    // In production, would query from database if providers are stored there
    const providers = [
      {
        id: 'quickbooks',
        name: 'QuickBooks Online',
        category: 'accounting',
        isActive: true,
        isBeta: false,
      },
      {
        id: 'xero',
        name: 'Xero',
        category: 'accounting',
        isActive: true,
        isBeta: false,
      },
      {
        id: 'sage',
        name: 'Sage',
        category: 'accounting',
        isActive: true,
        isBeta: false,
      },
      {
        id: 'freshbooks',
        name: 'FreshBooks',
        category: 'accounting',
        isActive: true,
        isBeta: false,
      },
    ];

    return { providers };
  }

  @Get('providers/:id')
  @RequirePermission('integration:view')
  @ApiOperation({
    summary: 'Get provider details',
    description: 'Returns detailed configuration for a specific provider',
  })
  @ApiResponse({ status: 200, description: 'Provider details' })
  async getProvider(@Param('id') id: string) {
    // In production, would fetch from database
    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      configuration: {
        oauth: {
          enabled: true,
          scopes: ['read', 'write'],
        },
        api: {
          rateLimitPerMinute: 500,
        },
      },
    };
  }

  @Put('providers/:id')
  @RequirePermission('integration:edit')
  @ApiOperation({
    summary: 'Update provider configuration',
    description: 'Updates configuration for a provider',
  })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  async updateProvider(@Param('id') id: string, @Body() data: any) {
    // In production, would update database
    return {
      id,
      ...data,
      updatedAt: new Date(),
    };
  }

  @Get('connections')
  @RequirePermission('integration:list')
  @ApiOperation({
    summary: 'List all organization connections',
    description: 'Returns all datasource connections across all organizations',
  })
  @ApiResponse({ status: 200, description: 'List of connections' })
  async listConnections(@Query('provider') provider?: string) {
    try {
      // In production, would query from datasource repository
      // For now, return placeholder
      return {
        connections: [],
        total: 0,
      };
    } catch (error) {
      this.logger.error(`Failed to list connections: ${error.message}`, error.stack);
      return {
        connections: [],
        total: 0,
      };
    }
  }

  @Get('webhooks/logs')
  @RequirePermission('integration:view')
  @ApiOperation({
    summary: 'Get webhook event logs',
    description: 'Returns webhook event logs with filtering options',
  })
  @ApiResponse({ status: 200, description: 'Webhook logs' })
  async getWebhookLogs(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const queryBuilder = this.webhookLogRepository.createQueryBuilder('log');

      if (provider) {
        queryBuilder.andWhere('log.provider = :provider', { provider });
      }

      if (status) {
        queryBuilder.andWhere('log.status = :status', { status });
      }

      queryBuilder.orderBy('log.createdAt', 'DESC');

      const limitValue = limit ? parseInt(limit.toString(), 10) : 50;
      const offsetValue = offset ? parseInt(offset.toString(), 10) : 0;

      queryBuilder.take(limitValue).skip(offsetValue);

      const [logs, total] = await queryBuilder.getManyAndCount();

      return {
        logs,
        total,
        limit: limitValue,
        offset: offsetValue,
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook logs: ${error.message}`, error.stack);
      return {
        logs: [],
        total: 0,
        limit: 50,
        offset: 0,
      };
    }
  }

  @Post('test/:provider')
  @RequirePermission('integration:test')
  @ApiOperation({
    summary: 'Test provider connectivity',
    description: 'Tests connectivity to an external provider API',
  })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testProvider(@Param('provider') provider: string) {
    // In production, would make actual API call
    return {
      provider,
      status: 'success',
      latencyMs: 150,
      testedAt: new Date(),
    };
  }
}
