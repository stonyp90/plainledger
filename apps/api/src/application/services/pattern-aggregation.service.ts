/**
 * PatternAggregationService
 * 
 * Service for aggregating decisions into industry patterns.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPatternService } from '../ports/outbound/IPatternService';
import { IDecisionRepository } from '../ports/outbound/IDecisionRepository';
import { IndustryPattern } from '../../../../web/src/domain/IndustryPattern';
import { DecisionEvent } from '../../../../web/src/domain/DecisionEvent';
import { Money } from '../../../../web/src/domain/value-objects/Money';
import { IndustryPatternEntity } from '@infrastructure/persistence/postgres/entities/industry-pattern.entity';

@Injectable()
export class PatternAggregationService implements IPatternService {
  private readonly logger = new Logger(PatternAggregationService.name);

  constructor(
    private readonly decisionRepository: IDecisionRepository,
    @InjectRepository(IndustryPatternEntity)
    private readonly patternRepository: Repository<IndustryPatternEntity>,
  ) {}

  /**
   * Aggregate patterns from decisions
   */
  async aggregatePattern(
    industry: string,
    decisions: DecisionEvent[]
  ): Promise<IndustryPattern> {
    if (decisions.length === 0) {
      throw new Error(`No decisions provided for industry ${industry}`);
    }

    this.logger.log(`Aggregating patterns for ${industry} from ${decisions.length} decisions`);

    // Filter decisions with outcomes
    const decisionsWithOutcomes = decisions.filter(d => d.outcome !== undefined);

    // Group by trigger condition
    const triggerCondition = this.extractTriggerCondition(decisions[0]);

    // Calculate common actions
    const commonActions = this.calculateCommonActions(decisions);

    // Calculate success rates
    const successRates = this.calculateSuccessRates(decisionsWithOutcomes);

    // Calculate top performers
    const topPerformers = this.calculateTopPerformers(decisionsWithOutcomes);

    // Calculate statistical significance
    const statisticalSignificance = this.calculateSignificance(decisionsWithOutcomes);

    return IndustryPattern.create({
      industry,
      triggerCondition,
      sampleSize: decisions.length,
      commonActions,
      successRates,
      topPerformers,
      statisticalSignificance,
      lastUpdated: new Date(),
    });
  }

  /**
   * Find patterns matching a condition
   */
  async findPatterns(condition: any): Promise<IndustryPattern[]> {
    // Query decisions matching condition
    const decisions = await this.decisionRepository.findByIndustry(condition.industry);
    
    // Filter by condition
    const filtered = decisions.filter(d => this.matchesCondition(d, condition));
    
    if (filtered.length === 0) {
      return [];
    }

    // Aggregate into pattern
    const pattern = await this.aggregatePattern(condition.industry, filtered);
    return [pattern];
  }

  /**
   * Update pattern statistics
   */
  async updatePattern(pattern: IndustryPattern): Promise<void> {
    // This would typically update the database
    // For now, just log
    this.logger.log(`Updating pattern for ${pattern.industry}`);
  }

  /**
   * Get pattern for a specific trigger condition
   */
  async getPatternForTrigger(
    industry: string,
    trigger: DecisionEvent['trigger']
  ): Promise<IndustryPattern | null> {
    const decisions = await this.decisionRepository.findSimilar(trigger, industry, 100);
    
    if (decisions.length < 10) {
      return null; // Insufficient data
    }

    return await this.aggregatePattern(industry, decisions);
  }

  /**
   * Calculate statistical significance
   */
  async calculateSignificance(decisions: DecisionEvent[]): Promise<number> {
    return this.calculateSignificanceInternal(decisions);
  }

  /**
   * Get pattern freshness (days since last update)
   */
  async getPatternFreshness(industry: string): Promise<number> {
    // Query patterns for this industry from database
    const patterns = await this.patternRepository.find({
      where: { industry },
      order: { lastUpdated: 'DESC' },
      take: 1,
    });
    
    if (patterns.length === 0) {
      return 999; // No patterns = stale
    }

    const mostRecent = patterns[0];

    // Calculate days since last update
    const daysSinceUpdate = Math.floor(
      (Date.now() - mostRecent.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceUpdate;
  }

  /**
   * Extract trigger condition from decision
   */
  private extractTriggerCondition(decision: DecisionEvent): any {
    const gapPercentage = decision.trigger.gapPercentage;
    
    return {
      metric: decision.trigger.metric,
      threshold: {
        operator: gapPercentage < 0 ? 'below' : gapPercentage > 0 ? 'above' : 'between',
        value: Math.abs(gapPercentage),
      },
      industry: decision.industry,
      businessSize: decision.businessSize,
    };
  }

  /**
   * Calculate common actions
   */
  private calculateCommonActions(decisions: DecisionEvent[]): any[] {
    const actionCounts = new Map<string, { count: number; totalImpact: number }>();

    decisions.forEach(decision => {
      const action = decision.decision.actionType;
      const impact = decision.decision.expectedImpact.amount;

      if (!actionCounts.has(action)) {
        actionCounts.set(action, { count: 0, totalImpact: 0 });
      }

      const stats = actionCounts.get(action)!;
      stats.count++;
      stats.totalImpact += impact;
    });

    const total = decisions.length;
    const commonActions = Array.from(actionCounts.entries())
      .map(([action, stats]) => ({
        action: action as any,
        frequency: stats.count,
        percentage: (stats.count / total) * 100,
        avgExpectedImpact: Money.create(stats.totalImpact / stats.count),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5

    return commonActions;
  }

  /**
   * Calculate success rates
   */
  private calculateSuccessRates(decisions: DecisionEvent[]): any {
    const actionSuccess = new Map<string, { success: number; total: number }>();

    decisions.forEach(decision => {
      const action = decision.decision.actionType;
      const success = decision.outcome?.success;

      if (success === undefined) return;

      if (!actionSuccess.has(action)) {
        actionSuccess.set(action, { success: 0, total: 0 });
      }

      const stats = actionSuccess.get(action)!;
      stats.total++;
      if (success) {
        stats.success++;
      }
    });

    const byAction: Record<string, number> = {};
    let overallSuccess = 0;
    let overallTotal = 0;

    actionSuccess.forEach((stats, action) => {
      const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
      byAction[action] = rate;
      overallSuccess += stats.success;
      overallTotal += stats.total;
    });

    const overallSuccessRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;

    return {
      overallSuccessRate,
      byAction,
    };
  }

  /**
   * Calculate top performers
   */
  private calculateTopPerformers(decisions: DecisionEvent[]): any {
    const actionStats = new Map<string, { impacts: number[]; successes: number; total: number }>();

    decisions.forEach(decision => {
      const action = decision.decision.actionType;
      const impact = decision.outcome?.actualImpact?.amount;
      const success = decision.outcome?.success;

      if (!actionStats.has(action)) {
        actionStats.set(action, { impacts: [], successes: 0, total: 0 });
      }

      const stats = actionStats.get(action)!;
      if (impact !== undefined && impact > 0) {
        stats.impacts.push(impact);
      }
      if (success !== undefined) {
        stats.total++;
        if (success) {
          stats.successes++;
        }
      }
    });

    // Find top action by average impact
    let topAction: string | null = null;
    let topAvgImpact = 0;
    let topSuccessRate = 0;
    let topSampleSize = 0;

    actionStats.forEach((stats, action) => {
      if (stats.impacts.length > 0) {
        const avgImpact = stats.impacts.reduce((a, b) => a + b, 0) / stats.impacts.length;
        const successRate = stats.total > 0 ? (stats.successes / stats.total) * 100 : 0;

        if (avgImpact > topAvgImpact) {
          topAction = action;
          topAvgImpact = avgImpact;
          topSuccessRate = successRate;
          topSampleSize = stats.impacts.length;
        }
      }
    });

    return {
      topActions: topAction ? [topAction as any] : [],
      avgImpact: Money.create(topAvgImpact),
      successRate: topSuccessRate,
      sampleSize: topSampleSize,
    };
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateSignificanceInternal(decisions: DecisionEvent[]): number {
    const sampleSize = decisions.length;

    if (sampleSize < 10) return 0.5;
    if (sampleSize < 20) return 0.7;
    if (sampleSize < 50) return 0.85;
    return 0.95;
  }

  /**
   * Check if decision matches condition
   */
  private matchesCondition(decision: DecisionEvent, condition: any): boolean {
    if (decision.industry !== condition.industry) {
      return false;
    }

    if (condition.businessSize && decision.businessSize !== condition.businessSize) {
      return false;
    }

    if (condition.metric && decision.trigger.metric !== condition.metric) {
      return false;
    }

    // Check threshold
    const threshold = condition.threshold;
    if (threshold) {
      const gap = decision.trigger.gapPercentage;
      const operator = threshold.operator;
      const value = threshold.value;

      if (operator === 'above' && gap <= value) return false;
      if (operator === 'below' && gap >= value) return false;
      if (operator === 'between' && Array.isArray(value)) {
        if (gap < value[0] || gap > value[1]) return false;
      }
    }

    return true;
  }
}
