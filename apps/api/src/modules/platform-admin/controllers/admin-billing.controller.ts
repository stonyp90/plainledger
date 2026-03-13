import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Unprotected } from 'nest-keycloak-connect';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';

@ApiTags('Platform Admin - Billing')
@ApiBearerAuth()
@Controller('admin/billing')
@Unprotected()
@UseGuards(PlatformAdminGuard)
export class AdminBillingController {
  private readonly logger = new Logger(AdminBillingController.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
  ) {}

  @Get('stats')
  @RequirePermission('billing:view')
  @ApiOperation({
    summary: 'Get billing statistics',
    description: 'Returns billing metrics including MRR, ARR, and subscription counts.',
  })
  @ApiResponse({ status: 200, description: 'Billing statistics' })
  async getBillingStats() {
    try {
      // Get organization counts by subscription plan
      const orgCounts = await this.orgRepository
        .createQueryBuilder('org')
        .select('org.subscriptionPlanId', 'planId')
        .addSelect('COUNT(*)', 'count')
        .where('org.deletedAt IS NULL')
        .groupBy('org.subscriptionPlanId')
        .getRawMany();

      // Calculate revenue based on typical pricing (mock prices for now)
      const planPrices: Record<string, number> = {
        free: 0,
        starter: 29,
        professional: 99,
        enterprise: 299,
      };

      let mrr = 0;
      let activeSubscriptions = 0;
      const planDistribution: Record<string, number> = {};

      for (const row of orgCounts) {
        const planId = row.planId?.toLowerCase() || 'free';
        const count = parseInt(row.count, 10) || 0;
        planDistribution[planId] = count;

        if (planId !== 'free') {
          mrr += (planPrices[planId] || 0) * count;
          activeSubscriptions += count;
        }
      }

      return {
        mrr,
        arr: mrr * 12,
        activeSubscriptions,
        churnRate: 2.3, // Placeholder - would calculate from historical data
        planDistribution,
        growthRate: 15.2, // Placeholder
      };
    } catch (error) {
      this.logger.error(`Failed to get billing stats: ${error.message}`, error.stack);
      return {
        mrr: 0,
        arr: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        planDistribution: {},
        growthRate: 0,
      };
    }
  }

  @Get('transactions')
  @RequirePermission('billing:view')
  @ApiOperation({
    summary: 'Get billing transactions',
    description: 'Returns list of billing transactions with pagination.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Billing transactions' })
  async getTransactions(
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
    @Query('status') status?: string,
  ) {
    try {
      // Get recent organizations as "transactions" for now
      // In a real implementation, this would query a transactions table
      const query = this.orgRepository
        .createQueryBuilder('org')
        .select(['org.id', 'org.name', 'org.subscriptionPlanId', 'org.createdAt'])
        .where('org.deletedAt IS NULL')
        .andWhere("org.subscriptionPlanId != 'free'")
        .orderBy('org.createdAt', 'DESC')
        .take(limit)
        .skip(offset);

      const [orgs, total] = await query.getManyAndCount();

      // Transform to transaction format
      const transactions = orgs.map((org) => ({
        id: `txn_${org.id.slice(0, 8)}`,
        organizationId: org.id,
        organizationName: org.name,
        amount: this.getPlanPrice(org.subscriptionPlanId),
        status: 'paid',
        date: org.createdAt,
        type: 'subscription',
        plan: org.subscriptionPlanId,
      }));

      return { transactions, total };
    } catch (error) {
      this.logger.error(`Failed to get transactions: ${error.message}`, error.stack);
      return { transactions: [], total: 0 };
    }
  }

  @Get('plan-distribution')
  @RequirePermission('billing:view')
  @ApiOperation({
    summary: 'Get subscription plan distribution',
    description: 'Returns count of organizations per subscription plan.',
  })
  @ApiResponse({ status: 200, description: 'Plan distribution' })
  async getPlanDistribution() {
    try {
      const distribution = await this.orgRepository
        .createQueryBuilder('org')
        .select('org.subscriptionPlanId', 'planId')
        .addSelect('COUNT(*)', 'count')
        .where('org.deletedAt IS NULL')
        .groupBy('org.subscriptionPlanId')
        .getRawMany();

      const total = distribution.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

      const plans = distribution.map((row) => ({
        name: this.formatPlanName(row.planId),
        count: parseInt(row.count, 10),
        percentage: total > 0 ? Math.round((parseInt(row.count, 10) / total) * 100) : 0,
        revenue: this.getPlanPrice(row.planId) * parseInt(row.count, 10),
      }));

      return { plans };
    } catch (error) {
      this.logger.error(`Failed to get plan distribution: ${error.message}`, error.stack);
      return { plans: [] };
    }
  }

  @Get('revenue-trend')
  @RequirePermission('billing:view')
  @ApiOperation({
    summary: 'Get revenue trend data',
    description: 'Returns revenue trend over time.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: 'daily, weekly, monthly',
  })
  @ApiResponse({ status: 200, description: 'Revenue trend' })
  async getRevenueTrend(@Query('period') period = 'monthly') {
    try {
      // Generate mock trend data based on current org count
      const orgCount = await this.orgRepository.count({
        where: { deletedAt: IsNull() },
      });

      const baseRevenue = orgCount * 50; // Average revenue per org
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const currentMonth = new Date().getMonth();

      const trend = months.slice(0, currentMonth + 1).map((month, index) => ({
        period: month,
        revenue: Math.round(baseRevenue * (0.7 + index * 0.05 + Math.random() * 0.1)),
        subscriptions: Math.round(orgCount * (0.7 + index * 0.05)),
      }));

      return { trend };
    } catch (error) {
      this.logger.error(`Failed to get revenue trend: ${error.message}`, error.stack);
      return { trend: [] };
    }
  }

  private getPlanPrice(planId: string): number {
    const prices: Record<string, number> = {
      free: 0,
      starter: 29,
      professional: 99,
      enterprise: 299,
    };
    return prices[planId?.toLowerCase()] || 0;
  }

  private formatPlanName(planId: string): string {
    if (!planId) return 'Free';
    return planId.charAt(0).toUpperCase() + planId.slice(1).toLowerCase();
  }
}
