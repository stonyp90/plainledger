/**
 * DecisionRepository (PostgreSQL Implementation)
 * 
 * PostgreSQL implementation of IDecisionRepository.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IDecisionRepository } from '@application/ports/outbound/IDecisionRepository';
import { DecisionEvent } from '../../../../web/src/domain/DecisionEvent';
import { IndustryPattern } from '../../../../web/src/domain/IndustryPattern';
import { Money } from '../../../../web/src/domain/value-objects/Money';
import { DecisionEventEntity } from './postgres/entities/decision-event.entity';
import { IndustryPatternEntity } from './postgres/entities/industry-pattern.entity';

@Injectable()
export class DecisionRepository implements IDecisionRepository {
  private readonly logger = new Logger(DecisionRepository.name);

  constructor(
    @InjectRepository(DecisionEventEntity)
    private readonly decisionEventRepo: Repository<DecisionEventEntity>,
    @InjectRepository(IndustryPatternEntity)
    private readonly industryPatternRepo: Repository<IndustryPatternEntity>,
  ) {}

  /**
   * Save a decision event
   */
  async save(decision: DecisionEvent): Promise<void> {
    this.logger.log(`Saving decision ${decision.id}`);

    const entity = this.domainToEntity(decision);
    await this.decisionEventRepo.save(entity);
    
    this.logger.log(`Decision ${decision.id} saved successfully`);
  }

  /**
   * Find a decision by ID
   */
  async findById(id: string): Promise<DecisionEvent | null> {
    const entity = await this.decisionEventRepo.findOne({ where: { id } });
    return entity ? this.entityToDomain(entity) : null;
  }

  /**
   * Find decisions by organization
   */
  async findByOrganization(organizationId: string): Promise<DecisionEvent[]> {
    const entities = await this.decisionEventRepo.find({ 
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.entityToDomain(e));
  }

  /**
   * Find decisions by industry
   */
  async findByIndustry(industry: string, limit: number = 100): Promise<DecisionEvent[]> {
    const entities = await this.decisionEventRepo.find({ 
      where: { industry },
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.entityToDomain(e));
  }

  /**
   * Find decisions with outcomes (for training data)
   */
  async findWithOutcomes(industry?: string, limit: number = 1000): Promise<DecisionEvent[]> {
    const queryBuilder = this.decisionEventRepo.createQueryBuilder('decision')
      .where('decision.outcomeSuccess IS NOT NULL');
    
    if (industry) {
      queryBuilder.andWhere('decision.industry = :industry', { industry });
    }
    
    const entities = await queryBuilder
      .take(limit)
      .orderBy('decision.createdAt', 'DESC')
      .getMany();
    
    return entities.map(e => this.entityToDomain(e));
  }

  /**
   * Aggregate patterns from decisions
   */
  async aggregatePatterns(industry: string, condition?: any): Promise<IndustryPattern[]> {
    const queryBuilder = this.industryPatternRepo.createQueryBuilder('pattern')
      .where('pattern.industry = :industry', { industry });
    
    if (condition?.triggerMetric) {
      queryBuilder.andWhere('pattern.triggerMetric = :metric', { metric: condition.triggerMetric });
    }
    
    const entities = await queryBuilder
      .orderBy('pattern.lastUpdated', 'DESC')
      .getMany();
    
    return entities.map(e => this.patternEntityToDomain(e));
  }

  /**
   * Find similar decisions based on trigger conditions
   */
  async findSimilar(
    trigger: DecisionEvent['trigger'],
    industry: string,
    limit: number = 10
  ): Promise<DecisionEvent[]> {
    const entities = await this.decisionEventRepo.find({
      where: {
        industry,
        triggerMetric: trigger.metric,
      },
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.entityToDomain(e));
  }

  /**
   * Count decisions by industry
   */
  async countByIndustry(industry: string): Promise<number> {
    return await this.decisionEventRepo.count({ where: { industry } });
  }

  /**
   * Get decision statistics
   */
  async getStatistics(organizationId?: string, industry?: string): Promise<{
    totalDecisions: number;
    decisionsWithOutcomes: number;
    avgSuccessRate: number;
    avgVariance: number;
  }> {
    const queryBuilder = this.decisionEventRepo.createQueryBuilder('decision');
    
    if (organizationId) {
      queryBuilder.where('decision.organizationId = :organizationId', { organizationId });
    }
    
    if (industry) {
      queryBuilder.andWhere('decision.industry = :industry', { industry });
    }
    
    const totalDecisions = await queryBuilder.getCount();
    
    const withOutcomesQuery = queryBuilder.clone()
      .andWhere('decision.outcomeSuccess IS NOT NULL');
    
    const decisionsWithOutcomes = await withOutcomesQuery.getCount();
    
    // Calculate average success rate
    const successResults = await withOutcomesQuery
      .select('AVG(CASE WHEN decision.outcomeSuccess = true THEN 1 ELSE 0 END)', 'avgSuccessRate')
      .addSelect('AVG(decision.outcomeVariance)', 'avgVariance')
      .getRawOne();
    
    return {
      totalDecisions,
      decisionsWithOutcomes,
      avgSuccessRate: successResults?.avgSuccessRate ? parseFloat(successResults.avgSuccessRate) * 100 : 0,
      avgVariance: successResults?.avgVariance ? parseFloat(successResults.avgVariance) : 0,
    };
  }

  /**
   * Convert domain entity to database entity
   */
  private domainToEntity(decision: DecisionEvent): DecisionEventEntity {
    const entity = new DecisionEventEntity();
    entity.id = decision.id;
    entity.organizationId = decision.organizationId;
    entity.industry = decision.industry;
    entity.businessSize = decision.businessSize;
    entity.triggerMetric = decision.trigger.metric;
    entity.triggerCurrentValue = decision.trigger.currentValue.amount;
    entity.triggerBenchmarkValue = decision.trigger.benchmarkValue.amount;
    entity.triggerGapPercentage = decision.trigger.gapPercentage;
    entity.triggerChartContext = decision.trigger.chartContext;
    entity.decisionActionType = decision.decision.actionType;
    entity.decisionDescription = decision.decision.description;
    entity.decisionReasoning = decision.decision.reasoning;
    entity.decisionExpectedImpact = decision.decision.expectedImpact.amount;
    entity.decisionExpectedImpactCurrency = decision.decision.expectedImpact.currency || 'CAD';
    entity.decisionConfidence = decision.decision.confidence;
    
    if (decision.outcome) {
      entity.outcomeActualImpact = decision.outcome.actualImpact.amount;
      entity.outcomeActualImpactCurrency = decision.outcome.actualImpact.currency || 'CAD';
      entity.outcomeMeasuredAt = decision.outcome.measuredAt;
      entity.outcomeSuccess = decision.outcome.success;
      entity.outcomeVariance = decision.outcome.variance;
      entity.outcomeLearnings = decision.outcome.learnings;
    }
    
    entity.source = decision.source;
    entity.createdAt = decision.createdAt;
    entity.updatedAt = new Date();
    
    return entity;
  }

  /**
   * Convert database entity to domain entity
   */
  private entityToDomain(entity: DecisionEventEntity): DecisionEvent {
    return DecisionEvent.create({
      id: entity.id,
      organizationId: entity.organizationId,
      industry: entity.industry as any,
      businessSize: entity.businessSize as any,
      trigger: {
        metric: entity.triggerMetric as any,
        currentValue: Money.create(entity.triggerCurrentValue, entity.decisionExpectedImpactCurrency || 'CAD'),
        benchmarkValue: Money.create(entity.triggerBenchmarkValue, entity.decisionExpectedImpactCurrency || 'CAD'),
        gapPercentage: Number(entity.triggerGapPercentage),
        chartContext: entity.triggerChartContext,
      },
      decision: {
        actionType: entity.decisionActionType as any,
        description: entity.decisionDescription,
        reasoning: entity.decisionReasoning,
        expectedImpact: Money.create(entity.decisionExpectedImpact, entity.decisionExpectedImpactCurrency || 'CAD'),
        confidence: entity.decisionConfidence as any,
      },
      outcome: entity.outcomeActualImpact !== null && entity.outcomeActualImpact !== undefined ? {
        actualImpact: Money.create(entity.outcomeActualImpact, entity.outcomeActualImpactCurrency || 'CAD'),
        measuredAt: entity.outcomeMeasuredAt!,
        success: entity.outcomeSuccess!,
        variance: Number(entity.outcomeVariance || 0),
        learnings: entity.outcomeLearnings,
      } : undefined,
      createdAt: entity.createdAt,
      source: entity.source as any,
    });
  }

  /**
   * Convert pattern entity to domain entity
   */
  private patternEntityToDomain(entity: IndustryPatternEntity): IndustryPattern {
    return IndustryPattern.create({
      industry: entity.industry,
      triggerCondition: {
        metric: entity.triggerMetric as any,
        threshold: {
          operator: entity.triggerOperator as 'above' | 'below' | 'between',
          value: entity.triggerValue as number | [number, number],
        },
        industry: entity.industry,
        businessSize: entity.businessSize,
      },
      sampleSize: entity.sampleSize,
      commonActions: entity.commonActions.map(action => ({
        action: action.action as any,
        frequency: action.frequency,
        percentage: action.percentage,
        avgExpectedImpact: Money.create(action.avgExpectedImpact.amount, action.avgExpectedImpact.currency),
        avgActualImpact: action.avgActualImpact ? Money.create(action.avgActualImpact.amount, action.avgActualImpact.currency) : undefined,
      })),
      successRates: entity.successRates,
      topPerformers: {
        ...entity.topPerformers,
        topActions: entity.topPerformers.topActions as any[],
        avgImpact: Money.create(entity.topPerformers.avgImpact.amount, entity.topPerformers.avgImpact.currency),
      },
      statisticalSignificance: Number(entity.statisticalSignificance),
      lastUpdated: entity.lastUpdated,
    });
  }
}
