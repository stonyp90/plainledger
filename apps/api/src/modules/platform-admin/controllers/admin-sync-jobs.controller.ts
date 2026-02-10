import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';

@ApiTags('Platform Admin - Sync Jobs')
@ApiBearerAuth()
@Controller('admin/sync-jobs')
@UseGuards(PlatformAdminGuard)
export class AdminSyncJobsController {
  private readonly logger = new Logger(AdminSyncJobsController.name);

  constructor(
    @InjectRepository(DataSourceConnectionEntity)
    private readonly connectionRepository: Repository<DataSourceConnectionEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  @Get()
  @RequirePermission('org:view')
  @ApiOperation({ summary: 'List recent sync jobs', description: 'Returns recent data sync jobs across all organizations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of sync jobs' })
  async listSyncJobs(
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    try {
      // Get connections with recent sync activity
      const queryBuilder = this.connectionRepository
        .createQueryBuilder('conn')
        .leftJoinAndSelect('conn.organization', 'org')
        .orderBy('conn.lastSyncAt', 'DESC', 'NULLS LAST')
        .take(limit || 50);

      if (status && status !== 'all') {
        queryBuilder.andWhere('conn.lastSyncStatus = :status', { status });
      }

      const connections = await queryBuilder.getMany();

      // Transform to sync job format
      const jobs = connections
        .filter(conn => conn.lastSyncAt)
        .map(conn => ({
          id: `sync-${conn.id}`,
          organizationId: conn.organizationId,
          organizationName: conn.organization?.name || 'Unknown',
          provider: conn.provider,
          status: this.mapSyncStatus(conn.lastSyncStatus),
          startedAt: conn.lastSyncAt?.toISOString(),
          completedAt: conn.lastSyncAt?.toISOString(),
          recordsProcessed: conn.lastSyncRecordsCount || 0,
          errorMessage: conn.lastSyncStatus === 'failed' ? conn.lastSyncError || 'Sync failed' : undefined,
          createdAt: conn.createdAt?.toISOString(),
        }));

      // Calculate stats
      const stats = {
        total24h: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        running: jobs.filter(j => j.status === 'running').length,
      };

      return {
        jobs,
        stats,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch sync jobs: ${error.message}`);
      // Return empty data instead of throwing - table may not exist yet
      return {
        jobs: [],
        stats: {
          total24h: 0,
          completed: 0,
          failed: 0,
          running: 0,
        },
      };
    }
  }

  private mapSyncStatus(status: string | null | undefined): 'pending' | 'running' | 'completed' | 'failed' {
    switch (status) {
      case 'success':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'partial':
        return 'completed';
      default:
        return 'pending';
    }
  }
}
