import { Controller, Get, Put, Post, Param, Body, Query, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Unprotected } from 'nest-keycloak-connect';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLogEntity } from '../entities/webhook-log.entity';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';

/**
 * In-memory provider config. There is no ProviderConfigEntity yet, so updates
 * persist only for the lifetime of the current server process.
 *
 * TODO: To persist provider configuration across restarts, create a
 * `ProviderConfigEntity` (or store in a `platform_settings` JSONB table)
 * and replace the in-memory map below with database reads/writes.
 */
interface ProviderConfig {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  isBeta: boolean;
  configuration?: Record<string, unknown>;
}

const DEFAULT_PROVIDERS: ProviderConfig[] = [
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

// In-memory store keyed by provider id
const providerStore = new Map<string, ProviderConfig>(
  DEFAULT_PROVIDERS.map((p) => [p.id, { ...p }]),
);

@ApiTags('Platform Admin - Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
@Unprotected()
@UseGuards(PlatformAdminGuard)
export class AdminIntegrationController {
  private readonly logger = new Logger(AdminIntegrationController.name);

  constructor(
    @InjectRepository(WebhookLogEntity)
    private readonly webhookLogRepository: Repository<WebhookLogEntity>,
    @InjectRepository(DataSourceConnectionEntity)
    private readonly connectionRepository: Repository<DataSourceConnectionEntity>,
  ) {}

  @Get('providers')
  @RequirePermission('integration:list')
  @ApiOperation({
    summary: 'List all integration providers',
    description: 'Returns all configured integration providers (QuickBooks, Xero, Sage, etc.)',
  })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async listProviders() {
    const providers = Array.from(providerStore.values());
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
    const provider = providerStore.get(id);
    if (!provider) {
      throw new NotFoundException(`Provider '${id}' not found`);
    }
    return {
      ...provider,
      configuration: provider.configuration ?? {
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
    description: 'Updates configuration for a provider (in-memory only — see TODO for persistence)',
  })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  async updateProvider(@Param('id') id: string, @Body() data: any) {
    const existing = providerStore.get(id);
    if (!existing) {
      throw new NotFoundException(`Provider '${id}' not found`);
    }

    // Merge provided fields into the existing provider config.
    // NOTE: This update is in-memory only and will be lost on server restart.
    // TODO: Persist to a ProviderConfigEntity or platform_settings table.
    const updated: ProviderConfig = {
      ...existing,
      ...data,
      id, // id is immutable
    };
    providerStore.set(id, updated);

    this.logger.log(`Provider '${id}' config updated (in-memory)`);

    return {
      ...updated,
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
      const queryBuilder = this.connectionRepository
        .createQueryBuilder('conn')
        .leftJoinAndSelect('conn.organization', 'org');

      if (provider) {
        queryBuilder.andWhere('conn.provider = :provider', { provider });
      }

      queryBuilder.orderBy('conn.createdAt', 'DESC');

      const [entities, total] = await queryBuilder.getManyAndCount();

      // Map to the shape the admin frontend expects:
      //   { id, organizationId, organizationName, provider, status, lastSyncAt }
      // Sensitive fields (tokens) are deliberately excluded.
      const connections = entities.map((conn) => ({
        id: conn.id,
        organizationId: conn.organizationId,
        organizationName: conn.organization?.name ?? null,
        provider: conn.provider,
        status: conn.status,
        providerAccountName: conn.providerAccountName ?? null,
        lastSyncAt: conn.lastSyncAt ?? null,
        lastSyncStatus: conn.lastSyncStatus ?? null,
        totalSyncs: conn.totalSyncs,
        successfulSyncs: conn.successfulSyncs,
        failedSyncs: conn.failedSyncs,
        connectedByEmail: conn.connectedByEmail ?? null,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      return { connections, total };
    } catch (error) {
      this.logger.error(`Failed to list connections: ${error.message}`, error.stack);
      return { connections: [], total: 0 };
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
    description: 'Tests connectivity by checking whether active connections exist for the provider',
  })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testProvider(@Param('provider') provider: string) {
    const startTime = Date.now();

    // Verify the provider is known
    if (!providerStore.has(provider)) {
      return {
        provider,
        status: 'error',
        message: `Unknown provider '${provider}'`,
        latencyMs: Date.now() - startTime,
        testedAt: new Date(),
      };
    }

    // Check if the provider is enabled
    const providerConfig = providerStore.get(provider);
    if (!providerConfig?.isActive) {
      return {
        provider,
        status: 'error',
        message: `Provider '${provider}' is currently disabled`,
        latencyMs: Date.now() - startTime,
        testedAt: new Date(),
      };
    }

    try {
      // Query for active connections to determine real connectivity status
      const [connections, totalConnections] = await this.connectionRepository.findAndCount({
        where: { provider: provider as any },
      });

      const activeCount = connections.filter((c) => c.status === 'active').length;
      const errorCount = connections.filter((c) => c.status === 'error').length;
      const latencyMs = Date.now() - startTime;

      if (totalConnections === 0) {
        return {
          provider,
          status: 'warning',
          message: 'No connections configured for this provider',
          activeConnections: 0,
          totalConnections: 0,
          latencyMs,
          testedAt: new Date(),
        };
      }

      if (activeCount === 0) {
        return {
          provider,
          status: 'error',
          message: `All ${totalConnections} connection(s) are inactive or in error state`,
          activeConnections: 0,
          errorConnections: errorCount,
          totalConnections,
          latencyMs,
          testedAt: new Date(),
        };
      }

      return {
        provider,
        status: 'success',
        message: `${activeCount} of ${totalConnections} connection(s) active`,
        activeConnections: activeCount,
        errorConnections: errorCount,
        totalConnections,
        latencyMs,
        testedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Provider test failed for '${provider}': ${error.message}`, error.stack);
      return {
        provider,
        status: 'error',
        message: `Database query failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
        testedAt: new Date(),
      };
    }
  }
}
