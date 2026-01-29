/**
 * APIIntelligenceAdapter
 *
 * Adapter for commercial AI providers (OpenAI, Anthropic, Google, etc.)
 * Implements IIntelligenceEngine using existing AIService.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  IIntelligenceEngine,
  IntelligenceRequest,
  DecisionContext,
} from "@application/ports/outbound/IIntelligenceEngine";
import { IntelligenceRecommendation } from "@domain/IntelligenceRecommendation";
import { IndustryPattern } from "@domain/IndustryPattern";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";
import { AIService, AIResponse } from "../../ai/ai.service";

@Injectable()
export class APIIntelligenceAdapter implements IIntelligenceEngine {
  private readonly logger = new Logger(APIIntelligenceAdapter.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * Generate insight using commercial AI providers
   */
  async generateInsight(
    request: IntelligenceRequest,
  ): Promise<IntelligenceRecommendation> {
    try {
      // Determine model tier based on request type
      const tier = request.type === "deep_analysis" ? "full" : "lite";

      // Build prompt for AI service
      const prompt = this.buildPrompt(request.context, request.type);

      // Call AI service
      const aiResponse = await this.aiService.generateResponse(prompt, {
        modelTier: tier,
        temperature: 0.7,
        maxTokens: 1000,
      } as any);

      // Parse AI response into recommendation
      return this.parseAIResponse(aiResponse, request.context);
    } catch (error) {
      this.logger.error(
        `Failed to generate insight: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Query patterns (not applicable for API adapter - use Bedrock)
   */
  async queryPatterns(context: DecisionContext): Promise<IndustryPattern[]> {
    throw new Error(
      "API adapter does not support pattern queries. Use Bedrock adapter.",
    );
  }

  /**
   * Find similar decisions (not applicable for API adapter)
   */
  async findSimilarDecisions(
    context: DecisionContext,
    limit?: number,
  ): Promise<DecisionEvent[]> {
    throw new Error(
      "API adapter does not support decision queries. Use repository.",
    );
  }

  /**
   * Build prompt for AI service
   */
  private buildPrompt(context: DecisionContext, requestType: string): string {
    const basePrompt = `You are an AI financial advisor specializing in ${context.industry} businesses.

Context:
- Industry: ${context.industry}
- Business Size: ${context.businessSize}
- Current ${context.trigger.metric}: $${context.trigger.currentValue.amount.toLocaleString()}
- Industry Benchmark: $${context.trigger.benchmarkValue.amount.toLocaleString()}
- Gap: ${context.trigger.gapPercentage.toFixed(1)}% ${context.trigger.gapPercentage < 0 ? "below" : "above"} benchmark

`;

    switch (requestType) {
      case "deep_analysis":
        return (
          basePrompt +
          `Provide a comprehensive strategic analysis with:
1. Root cause analysis of the gap
2. Multiple action options with pros/cons
3. Expected impact and timeline for each option
4. Risk assessment
5. Recommended action with detailed reasoning

Format your response as a structured recommendation.`
        );

      case "quick_suggestion":
        return (
          basePrompt +
          `Provide a concise recommendation (2-3 sentences) for what action to take.`
        );

      default:
        return (
          basePrompt +
          `What specific action should this business take to address the gap? Provide a recommendation with expected impact.`
        );
    }
  }

  /**
   * Parse AI response into IntelligenceRecommendation
   */
  private parseAIResponse(
    aiResponse: AIResponse,
    context: DecisionContext,
  ): IntelligenceRecommendation {
    // Extract recommendation from AI response
    const recommendation = this.extractRecommendation(aiResponse.message);

    return IntelligenceRecommendation.create({
      context: `Industry: ${context.industry}, Metric: ${context.trigger.metric}`,
      recommendation,
      supportingPatterns: [], // API adapter doesn't return patterns
      similarDecisions: [],
      confidence: this.determineConfidence(aiResponse),
      sampleSize: 0, // API adapter doesn't have sample size
      successProbability: 75, // Default
      expectedOutcome: Money.create(0), // Would need to extract from response
      timeToResult: "2-4 weeks",
    });
  }

  /**
   * Extract recommendation text from AI response
   */
  private extractRecommendation(message: string): string {
    // Try to extract structured recommendation
    const recommendationMatch = message.match(
      /recommendation[:\s]+(.+?)(?:\n\n|$)/i,
    );
    if (recommendationMatch) {
      return recommendationMatch[1].trim();
    }

    // Fallback: use first paragraph
    const paragraphs = message.split("\n\n");
    return paragraphs[0] || message.substring(0, 200);
  }

  /**
   * Determine confidence from AI response
   */
  private determineConfidence(
    aiResponse: AIResponse,
  ): "low" | "medium" | "high" {
    // Use model tier as proxy for confidence
    // Full tier models (GPT-4, Claude Opus) = high confidence
    // Lite tier models (GPT-3.5, Claude Haiku) = medium confidence

    const model = aiResponse.model || "";
    if (
      model.includes("gpt-4") ||
      model.includes("opus") ||
      model.includes("pro")
    ) {
      return "high";
    }
    if (
      model.includes("gpt-3.5") ||
      model.includes("haiku") ||
      model.includes("flash")
    ) {
      return "medium";
    }
    return "medium"; // Default
  }
}
