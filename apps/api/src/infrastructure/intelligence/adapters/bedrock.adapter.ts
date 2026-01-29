/**
 * BedrockIntelligenceAdapter
 *
 * AWS Bedrock adapter for intelligence generation using Knowledge Base RAG.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IIntelligenceEngine,
  IntelligenceRequest,
  DecisionContext,
} from "@application/ports/outbound/IIntelligenceEngine";
import { IntelligenceRecommendation } from "@domain/IntelligenceRecommendation";
import { IndustryPattern } from "@domain/IndustryPattern";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";

// AWS SDK v3 imports
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

@Injectable()
export class BedrockIntelligenceAdapter implements IIntelligenceEngine {
  private readonly logger = new Logger(BedrockIntelligenceAdapter.name);
  private readonly client: BedrockAgentRuntimeClient;
  private readonly knowledgeBaseId: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get("AWS_REGION") || "ca-central-1";
    this.knowledgeBaseId =
      this.configService.get("BEDROCK_KNOWLEDGE_BASE_ID") || "";

    this.client = new BedrockAgentRuntimeClient({
      region: this.region,
    });

    if (!this.knowledgeBaseId) {
      this.logger.warn("Bedrock Knowledge Base ID not configured");
    }
  }

  /**
   * Generate insight using Bedrock Knowledge Base RAG
   */
  async generateInsight(
    request: IntelligenceRequest,
  ): Promise<IntelligenceRecommendation> {
    if (!this.knowledgeBaseId) {
      throw new Error("Bedrock Knowledge Base not configured");
    }

    try {
      // 1. Query Knowledge Base for similar patterns
      const patterns = await this.queryPatterns(request.context);

      if (patterns.length === 0) {
        throw new Error("No patterns found in knowledge base");
      }

      // 2. Retrieve similar decisions from knowledge base
      const similarDecisions = await this.findSimilarDecisions(
        request.context,
        5,
      );

      // 3. Build context for recommendation
      const topPattern = patterns[0];
      const contextDescription = this.buildContextDescription(
        request.context,
        topPattern,
      );

      // 4. Generate recommendation using top pattern
      const recommendation = this.generateRecommendationFromPattern(
        topPattern,
        request.context,
      );

      // 5. Calculate metrics
      const successProbability = this.calculateSuccessProbability(
        patterns,
        similarDecisions,
      );
      const expectedOutcome = this.calculateExpectedOutcome(
        topPattern,
        similarDecisions,
      );
      const confidence = this.determineConfidence(topPattern, patterns.length);

      return IntelligenceRecommendation.create({
        context: contextDescription,
        recommendation,
        supportingPatterns: patterns,
        similarDecisions,
        confidence,
        sampleSize: topPattern.sampleSize,
        successProbability,
        expectedOutcome,
        timeToResult: this.estimateTimeToResult(topPattern),
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate insight: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Query patterns from Knowledge Base
   */
  async queryPatterns(context: DecisionContext): Promise<IndustryPattern[]> {
    if (!this.knowledgeBaseId) {
      throw new Error("Bedrock Knowledge Base not configured");
    }

    try {
      // Build query for knowledge base
      const query = this.buildPatternQuery(context);

      const input: RetrieveCommandInput = {
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 5,
            overrideSearchType: "HYBRID",
          },
        },
      };

      const command = new RetrieveCommand(input);
      const response = await this.client.send(command);

      // Parse retrieval results into IndustryPattern objects
      const patterns: IndustryPattern[] = [];

      if (response.retrievalResults) {
        for (const result of response.retrievalResults) {
          try {
            // Parse the retrieved content
            const content = result.content?.text || "";
            const pattern = this.parsePatternFromContent(
              content,
              result.score || 0,
            );
            if (pattern) {
              patterns.push(pattern);
            }
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse pattern from retrieval result: ${parseError.message}`,
            );
          }
        }
      }

      return patterns;
    } catch (error) {
      this.logger.error(
        `Failed to query patterns: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find similar decisions
   */
  async findSimilarDecisions(
    context: DecisionContext,
    limit: number = 10,
  ): Promise<DecisionEvent[]> {
    // For now, return empty array - this would query the database
    // In full implementation, this would query PostgreSQL decision_events table
    return [];
  }

  /**
   * Build query string for pattern retrieval
   */
  private buildPatternQuery(context: DecisionContext): string {
    return `Industry: ${context.industry}, Metric: ${context.trigger.metric}, Gap: ${context.trigger.gapPercentage}%, Business Size: ${context.businessSize}`;
  }

  /**
   * Parse pattern from retrieved content
   */
  private parsePatternFromContent(
    content: string,
    score: number,
  ): IndustryPattern | null {
    try {
      // Parse JSON content from knowledge base
      const data = JSON.parse(content);

      return IndustryPattern.fromJSON(data);
    } catch (error) {
      this.logger.warn(`Failed to parse pattern content: ${error.message}`);
      return null;
    }
  }

  /**
   * Build context description
   */
  private buildContextDescription(
    context: DecisionContext,
    pattern: IndustryPattern,
  ): string {
    return `A ${context.businessSize} ${context.industry} business is seeing ${context.trigger.metric} at ${context.trigger.currentValue.amount}, which is ${context.trigger.gapPercentage}% ${context.trigger.gapPercentage < 0 ? "below" : "above"} the industry benchmark of ${context.trigger.benchmarkValue.amount}.`;
  }

  /**
   * Generate recommendation from pattern
   */
  private generateRecommendationFromPattern(
    pattern: IndustryPattern,
    context: DecisionContext,
  ): string {
    const mostSuccessfulAction = pattern.getMostSuccessfulAction();

    if (!mostSuccessfulAction) {
      return `Based on ${pattern.sampleSize} similar businesses, consider reviewing your ${context.trigger.metric} strategy.`;
    }

    const actionDescriptions: Record<string, string> = {
      reduce_costs: "reduce operating costs",
      increase_prices: "adjust pricing strategy",
      optimize_inventory: "optimize inventory levels",
      improve_margins: "improve profit margins",
      expand_capacity: "expand operational capacity",
      reduce_headcount: "optimize staffing levels",
      increase_marketing: "increase marketing investment",
      renegotiate_contracts: "renegotiate supplier contracts",
      other: "take strategic action",
    };

    const actionDesc =
      actionDescriptions[mostSuccessfulAction] || "take strategic action";
    const successRate =
      pattern.successRates.byAction[mostSuccessfulAction] ||
      pattern.successRates.overallSuccessRate;

    return `Based on ${pattern.sampleSize} similar ${context.industry} businesses, ${actionDesc}. This action has a ${successRate}% success rate in similar situations.`;
  }

  /**
   * Calculate success probability
   */
  private calculateSuccessProbability(
    patterns: IndustryPattern[],
    decisions: DecisionEvent[],
  ): number {
    if (patterns.length === 0) {
      return 70; // Default
    }

    const topPattern = patterns[0];
    const patternSuccessRate = topPattern.successRates.overallSuccessRate;

    if (decisions.length > 0) {
      const decisionSuccessRate =
        (decisions.filter((d) => d.isSuccessful() === true).length /
          decisions.length) *
        100;
      // Weighted average: 70% pattern, 30% actual decisions
      return Math.round(patternSuccessRate * 0.7 + decisionSuccessRate * 0.3);
    }

    return patternSuccessRate;
  }

  /**
   * Calculate expected outcome
   */
  private calculateExpectedOutcome(
    pattern: IndustryPattern,
    decisions: DecisionEvent[],
  ): Money {
    if (decisions.length > 0) {
      const avgImpact =
        decisions
          .filter((d) => d.outcome)
          .reduce((sum, d) => sum + (d.outcome!.actualImpact.amount || 0), 0) /
        decisions.length;

      if (avgImpact > 0) {
        return Money.create(avgImpact);
      }
    }

    // Use pattern's top performer average impact
    if (pattern.topPerformers?.avgImpact) {
      return pattern.topPerformers.avgImpact;
    }

    return Money.create(0);
  }

  /**
   * Determine confidence level
   */
  private determineConfidence(
    pattern: IndustryPattern,
    patternCount: number,
  ): "low" | "medium" | "high" {
    if (pattern.hasSufficientData(50) && patternCount >= 3) {
      return "high";
    }
    if (pattern.hasSufficientData(20) && patternCount >= 2) {
      return "medium";
    }
    return "low";
  }

  /**
   * Estimate time to result
   */
  private estimateTimeToResult(pattern: IndustryPattern): string {
    // Simple heuristic based on action type
    const avgImpact = pattern.topPerformers?.avgImpact?.amount || 0;

    if (avgImpact > 10000) {
      return "1-3 months";
    }
    if (avgImpact > 5000) {
      return "2-4 weeks";
    }
    return "1-2 weeks";
  }
}
