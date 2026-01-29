/**
 * IntelligenceRouterService
 *
 * Cost-optimized routing for intelligence requests across multiple AI providers.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IIntelligenceEngine,
  IntelligenceRequest,
  DecisionContext,
} from "@application/ports/outbound/IIntelligenceEngine";
import { IntelligenceRecommendation } from "@domain/IntelligenceRecommendation";
import { APIIntelligenceAdapter } from "./adapters/api.adapter";
import { BedrockIntelligenceAdapter } from "./adapters/bedrock.adapter";
import { SageMakerIntelligenceAdapter } from "./adapters/sagemaker.adapter";

export type RouteType =
  | "pattern_only" // Pure data lookup, no LLM
  | "bedrock_rag" // Bedrock Knowledge Base RAG (cheapest)
  | "sagemaker" // Fine-tuned model (fastest, most accurate)
  | "api_full" // Claude Opus / GPT-4 (complex analysis)
  | "api_lite" // Claude Haiku / GPT-3.5 (simple queries)
  | "ollama"; // Local development

@Injectable()
export class IntelligenceRouterService {
  private readonly logger = new Logger(IntelligenceRouterService.name);
  private sagemakerHealthy: boolean = false;
  private sagemakerLastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly apiAdapter?: APIIntelligenceAdapter,
    @Optional() private readonly bedrockAdapter?: BedrockIntelligenceAdapter,
    @Optional()
    private readonly sagemakerAdapter?: SageMakerIntelligenceAdapter,
  ) {}

  /**
   * Route intelligence request to optimal provider
   */
  async route(
    request: IntelligenceRequest,
  ): Promise<IntelligenceRecommendation> {
    const route = this.selectRoute(request);
    this.logger.debug(`Routing request type ${request.type} to ${route}`);

    try {
      switch (route) {
        case "pattern_only": {
          // Pure data lookup - query patterns without LLM
          if (!this.bedrockAdapter) {
            throw new Error("Bedrock adapter not available for pattern lookup");
          }
          const patterns = await this.bedrockAdapter.queryPatterns(
            request.context,
          );
          // Convert patterns to recommendation format
          return this.patternsToRecommendation(patterns, request.context);
        }

        case "bedrock_rag":
          // Industry pattern + Bedrock RAG (cheapest)
          if (!this.bedrockAdapter) {
            throw new Error("Bedrock adapter not available");
          }
          return await this.bedrockAdapter.generateInsight(request);

        case "sagemaker":
          // Fine-tuned model (fastest, most accurate)
          if (!this.sagemakerAdapter) {
            this.logger.warn(
              "SageMaker adapter not available, falling back to Bedrock",
            );
            return await this.bedrockAdapter!.generateInsight(request);
          }
          return await this.sagemakerAdapter.generateInsight(request);

        case "api_full":
          // Claude Opus / GPT-4 (complex analysis)
          if (!this.apiAdapter) {
            throw new Error("API adapter not available");
          }
          return await this.apiAdapter.generateInsight(request);

        case "api_lite":
          // Claude Haiku / GPT-3.5 (simple queries)
          if (!this.apiAdapter) {
            throw new Error("API adapter not available");
          }
          return await this.apiAdapter.generateInsight(request);

        default:
          throw new Error(`Unknown route type: ${route}`);
      }
    } catch (error) {
      this.logger.error(`Route ${route} failed: ${error.message}`, error.stack);
      // Fallback logic
      return this.fallbackRoute(request, route, error);
    }
  }

  /**
   * Select optimal route based on request characteristics
   */
  private selectRoute(request: IntelligenceRequest): RouteType {
    // Simple pattern lookup - no LLM needed
    if (request.type === "pattern_lookup") {
      return "pattern_only";
    }

    // Quick decision suggestions - use Bedrock RAG (cheapest)
    if (request.type === "quick_suggestion") {
      return "bedrock_rag";
    }

    // High-volume, latency-sensitive - use SageMaker if healthy
    if (request.requiresLowLatency && this.isSagemakerHealthy()) {
      return "sagemaker";
    }

    // Complex strategic analysis - use full tier API
    if (request.type === "deep_analysis") {
      return "api_full";
    }

    // Cost-constrained requests - prefer Bedrock
    if (request.maxCost && request.maxCost < 0.01) {
      return "bedrock_rag";
    }

    // Default to Bedrock RAG (best cost/performance balance)
    return "bedrock_rag";
  }

  /**
   * Fallback routing when primary route fails
   */
  private async fallbackRoute(
    request: IntelligenceRequest,
    failedRoute: RouteType,
    error: Error,
  ): Promise<IntelligenceRecommendation> {
    this.logger.warn(`Fallback routing after ${failedRoute} failure`);

    // Fallback chain: sagemaker -> bedrock -> api_lite -> api_full
    const fallbackChain: RouteType[] = ["bedrock_rag", "api_lite", "api_full"];

    for (const route of fallbackChain) {
      if (route === failedRoute) continue;

      try {
        switch (route) {
          case "bedrock_rag":
            if (this.bedrockAdapter) {
              return await this.bedrockAdapter.generateInsight(request);
            }
            break;

          case "api_lite":
          case "api_full":
            if (this.apiAdapter) {
              return await this.apiAdapter.generateInsight(request);
            }
            break;
        }
      } catch (fallbackError) {
        this.logger.warn(
          `Fallback route ${route} also failed: ${fallbackError.message}`,
        );
        continue;
      }
    }

    throw new Error(`All routes failed. Last error: ${error.message}`);
  }

  /**
   * Check if SageMaker endpoint is healthy
   */
  private isSagemakerHealthy(): boolean {
    const now = Date.now();

    // Use cached health status if recent
    if (now - this.sagemakerLastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this.sagemakerHealthy;
    }

    // Health check: verify adapter exists and endpoint is configured
    if (!this.sagemakerAdapter) {
      this.sagemakerHealthy = false;
      this.sagemakerLastHealthCheck = now;
      return false;
    }

    // In production, we could ping the endpoint with a lightweight request
    // For now, assume healthy if adapter exists and endpoint name is configured
    const endpointName = this.configService.get("SAGEMAKER_ENDPOINT_NAME");
    this.sagemakerHealthy = !!endpointName && endpointName.length > 0;
    this.sagemakerLastHealthCheck = now;

    return this.sagemakerHealthy;
  }

  /**
   * Convert patterns to recommendation format
   */
  private patternsToRecommendation(
    patterns: any[],
    context: DecisionContext,
  ): IntelligenceRecommendation {
    if (patterns.length === 0) {
      throw new Error("No patterns found for context");
    }

    const topPattern = patterns[0];
    const mostSuccessfulAction =
      topPattern.getMostSuccessfulAction?.() || "reduce_costs";

    return IntelligenceRecommendation.create({
      context: `Industry: ${context.industry}, Metric: ${context.trigger.metric}`,
      recommendation: `Based on ${topPattern.sampleSize} similar businesses, consider ${mostSuccessfulAction}`,
      supportingPatterns: patterns,
      similarDecisions: [],
      confidence: topPattern.getConfidenceLevel?.() || "medium",
      sampleSize: topPattern.sampleSize,
      successProbability: topPattern.successRates?.overallSuccessRate || 70,
      expectedOutcome:
        topPattern.topPerformers?.avgImpact ||
        ({ amount: 0, currency: "CAD" } as any),
      timeToResult: "2-4 weeks",
    });
  }

  /**
   * Update SageMaker health status
   */
  setSagemakerHealth(healthy: boolean): void {
    this.sagemakerHealthy = healthy;
    this.sagemakerLastHealthCheck = Date.now();
  }
}
