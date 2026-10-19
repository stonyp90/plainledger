import {
  Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus, Inject,
  BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { CaptureDecisionUseCase, CaptureDecisionInput } from '../use-cases/capture-decision.use-case';
import { OutcomeTrackingService, RecordOutcomeInput } from '../services/outcome-tracking.service';
import { IDecisionRepository, DECISION_REPOSITORY_TOKEN } from '../ports/outbound/IDecisionRepository';

interface DecisionRequest { user?: { sub?: string; organizationId?: string } }
const MAX_AMOUNT = 9_999_999_999_999.99; // DECIMAL(15,2)
function validAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT;
}
const industryNames = new Set(['restaurant', 'retail', 'construction', 'professional_services', 'real_estate', 'saas', 'healthcare', 'manufacturing', 'other']);
const actionNames = new Set(['price_change', 'cost_cut', 'hire', 'invest', 'defer', 'renegotiate', 'expand', 'reduce', 'optimize', 'custom', 'reduce_costs', 'increase_prices', 'optimize_inventory', 'improve_margins', 'expand_capacity', 'reduce_headcount', 'increase_marketing', 'renegotiate_contracts', 'other']);
const nonempty = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

@Controller('v1/decisions')
@UseGuards(JwtAuthGuard)
export class DecisionsController {
  constructor(
    private readonly captureDecisionUseCase: CaptureDecisionUseCase,
    private readonly outcomeTrackingService: OutcomeTrackingService,
    @Inject(DECISION_REPOSITORY_TOKEN) private readonly decisionRepository: IDecisionRepository,
    private readonly dataSource: DataSource,
  ) {}

  /** Signed tenant slugs resolve to the current membership's database organization ID. */
  private async organizationId(request: DecisionRequest, write = false): Promise<string> {
    const actor = request.user;
    if (!nonempty(actor?.sub, 100) || !nonempty(actor?.organizationId, 255)) throw new UnauthorizedException('A verified organization session is required');
    const profile = await this.dataSource.getRepository(UserProfileEntity).findOne({
      where: { id: actor.sub, isActive: true }, relations: ['organization'],
    });
    if (!profile?.isActive || !profile.organizationId || !profile.organization || profile.organization.deletedAt ||
      profile.organization.id !== profile.organizationId || profile.organization.tenantId !== actor.organizationId ||
      !['owner', 'admin', 'organization_admin', 'member', 'accountant', 'viewer'].includes(profile.role || '') ||
      (write && profile.role === 'viewer')) throw new ForbiddenException('Your current membership does not permit this action');
    return profile.organizationId;
  }

  private async ownedDecision(id: string, organizationId: string) {
    if (!nonempty(id, 255)) throw new BadRequestException('Invalid decision identifier');
    const decision = await this.decisionRepository.findById(id);
    if (!decision || decision.organizationId !== organizationId) throw new NotFoundException('Decision not found');
    return decision;
  }

  @Post()
  @Roles({ roles: ['member', 'accountant', 'admin', 'owner'] })
  @HttpCode(HttpStatus.CREATED)
  async captureDecision(@Body() body: CaptureDecisionInput, @Request() request: DecisionRequest) {
    const organizationId = await this.organizationId(request, true);
    if (body?.organizationId !== undefined && body.organizationId !== organizationId && body.organizationId !== request.user?.organizationId) throw new ForbiddenException('The selected organization is outside this session');
    if (!body || !industryNames.has(body.industry) || !['micro', 'small', 'medium', 'large'].includes(body.businessSize) ||
      !body.trigger || !nonempty(body.trigger.metric, 50) || !validAmount(body.trigger.currentValue) || !validAmount(body.trigger.benchmarkValue) ||
      (body.trigger.chartContext !== undefined && !nonempty(body.trigger.chartContext, 255)) ||
      !body.decision || !actionNames.has(body.decision.actionType) || !nonempty(body.decision.description, 4000) ||
      !validAmount(body.decision.expectedImpact) || !['low', 'medium', 'high'].includes(body.decision.confidence) ||
      (body.decision.reasoning !== undefined && !nonempty(body.decision.reasoning, 4000)) ||
      (body.source !== undefined && !['user', 'ai_suggested', 'imported'].includes(body.source))) throw new BadRequestException('Invalid decision data');
    // A percentage against zero is undefined; never substitute a fabricated percentage.
    if (body.trigger.benchmarkValue === 0) throw new BadRequestException('A nonzero reference value is required to calculate the decision gap');
    const gap = (body.trigger.currentValue - body.trigger.benchmarkValue) / Math.abs(body.trigger.benchmarkValue) * 100;
    if (!Number.isFinite(gap) || Math.abs(gap) > 999.99) throw new BadRequestException('The decision gap exceeds the supported percentage range');
    const decision = await this.captureDecisionUseCase.execute({
      organizationId, industry: body.industry, businessSize: body.businessSize,
      trigger: { metric: body.trigger.metric, currentValue: body.trigger.currentValue, benchmarkValue: body.trigger.benchmarkValue, gapPercentage: gap, chartContext: body.trigger.chartContext },
      decision: { actionType: body.decision.actionType, description: body.decision.description.trim(), reasoning: body.decision.reasoning?.trim(), expectedImpact: body.decision.expectedImpact, confidence: body.decision.confidence },
      source: body.source || 'user',
    });
    return { success: true, data: { id: decision.id, organizationId: decision.organizationId, industry: decision.industry, createdAt: decision.createdAt, reminderScheduled: false } };
  }

  // Static routes precede the identifier route.
  @Get('statistics')
  @Roles({ roles: ['user'] })
  async getStatistics(@Request() request: DecisionRequest) {
    const organizationId = await this.organizationId(request);
    return { success: true, data: await this.outcomeTrackingService.getOutcomeStatistics(organizationId) };
  }

  @Get()
  @Roles({ roles: ['user'] })
  async getDecisions(@Request() request: DecisionRequest) {
    const organizationId = await this.organizationId(request);
    const decisions = await this.decisionRepository.findByOrganization(organizationId);
    return { success: true, data: decisions.map(decision => decision.toJSON()) };
  }

  @Post(':id/outcome')
  @Roles({ roles: ['member', 'accountant', 'admin', 'owner'] })
  @HttpCode(HttpStatus.OK)
  async recordOutcome(@Param('id') id: string, @Body() body: { actualImpact: number; success: boolean; measuredAt?: string; learnings?: string }, @Request() request: DecisionRequest) {
    const organizationId = await this.organizationId(request, true);
    await this.ownedDecision(id, organizationId);
    if (!body || !validAmount(body.actualImpact) || typeof body.success !== 'boolean' ||
      (body.learnings !== undefined && !nonempty(body.learnings, 4000))) throw new BadRequestException('Invalid outcome data');
    const measuredAt = body.measuredAt === undefined ? undefined : new Date(body.measuredAt);
    if (measuredAt && (!Number.isFinite(measuredAt.getTime()) || measuredAt.getTime() > Date.now())) throw new BadRequestException('Choose a valid measurement date that is not in the future');
    const input: RecordOutcomeInput = { decisionId: id, organizationId, actualImpact: body.actualImpact, success: body.success, measuredAt, learnings: body.learnings?.trim() };
    const decision = await this.outcomeTrackingService.recordOutcome(input);
    return { success: true, data: { id: decision.id, outcome: { success: decision.outcome?.success, variance: decision.outcome?.variance, roi: decision.getROI() } } };
  }

  @Get(':id')
  @Roles({ roles: ['user'] })
  async getDecision(@Param('id') id: string, @Request() request: DecisionRequest) {
    const organizationId = await this.organizationId(request);
    const decision = await this.ownedDecision(id, organizationId);
    return { success: true, data: decision.toJSON() };
  }
}
