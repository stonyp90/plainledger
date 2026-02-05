import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { EntitlementEntity } from '@infrastructure/persistence/postgres/entities/entitlement.entity';
import { PlanEntitlementEntity } from '@infrastructure/persistence/postgres/entities/plan-entitlement.entity';

@ApiTags('Platform Admin - Subscription Plans')
@ApiBearerAuth()
@Controller('admin/subscription-plans')
@UseGuards(PlatformAdminGuard)
export class AdminSubscriptionPlansController {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly planRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(EntitlementEntity)
    private readonly entitlementRepository: Repository<EntitlementEntity>,
    @InjectRepository(PlanEntitlementEntity)
    private readonly planEntitlementRepository: Repository<PlanEntitlementEntity>,
  ) {}

  @Get()
  @RequirePermission('billing:view')
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async listPlans() {
    const plans = await this.planRepository.find({
      relations: ['planEntitlements', 'planEntitlements.entitlement'],
      order: { displayOrder: 'ASC' },
    });
    // Transform to include entitlements array for backwards compatibility
    return plans.map((plan) => ({
      ...plan,
      entitlements: plan.planEntitlements?.map((pe) => pe.entitlement) || [],
    }));
  }

  @Get(':id')
  @RequirePermission('billing:view')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['planEntitlements', 'planEntitlements.entitlement'],
    });
    if (!plan) {
      throw new Error(`Plan ${id} not found`);
    }
    // Transform to include entitlements array for backwards compatibility
    return {
      ...plan,
      entitlements: plan.planEntitlements?.map((pe) => pe.entitlement) || [],
    };
  }

  @Post()
  @RequirePermission('billing:edit')
  @ApiOperation({ summary: 'Create new subscription plan' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        stripeProductId: { type: 'string' },
        stripePriceId: { type: 'string' },
        stripePriceIdAnnual: { type: 'string' },
        limits: { type: 'object' },
        isActive: { type: 'boolean' },
        displayOrder: { type: 'number' },
        entitlementIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() data: any) {
    const { entitlementIds, ...planData } = data;
    const plan = this.planRepository.create(planData);
    const savedPlan = (await this.planRepository.save(plan)) as unknown as SubscriptionPlanEntity;

    if (entitlementIds && entitlementIds.length > 0) {
      // Create plan entitlement associations
      const planEntitlements = entitlementIds.map((entitlementId: string) =>
        this.planEntitlementRepository.create({
          planId: savedPlan.id,
          entitlementId,
          config: {},
        }),
      );
      await this.planEntitlementRepository.save(planEntitlements);
    }

    return this.getPlan(savedPlan.id);
  }

  @Put(':id')
  @RequirePermission('billing:edit')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(@Param('id') id: string, @Body() data: any) {
    const { entitlementIds, ...planData } = data;
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new Error(`Plan ${id} not found`);
    }

    Object.assign(plan, planData);
    await this.planRepository.save(plan);

    if (entitlementIds !== undefined) {
      // Delete existing associations
      await this.planEntitlementRepository.delete({ planId: id });
      // Create new associations
      if (entitlementIds.length > 0) {
        const planEntitlements = entitlementIds.map((entitlementId: string) =>
          this.planEntitlementRepository.create({
            planId: id,
            entitlementId,
            config: {},
          }),
        );
        await this.planEntitlementRepository.save(planEntitlements);
      }
    }

    return this.getPlan(id);
  }

  @Delete(':id')
  @RequirePermission('billing:edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 204, description: 'Plan deleted successfully' })
  async deletePlan(@Param('id') id: string) {
    await this.planRepository.delete(id);
  }
}
