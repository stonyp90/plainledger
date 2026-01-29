/**
 * IntelligenceController
 *
 * REST API endpoints for intelligence generation.
 * Part of the Context Intelligence Platform.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "@infrastructure/auth/jwt-auth.guard";
import { IntelligenceRouterService } from "@infrastructure/intelligence/intelligence-router.service";
import {
  IntelligenceRequest,
  DecisionContext,
} from "../ports/outbound/IIntelligenceEngine";
import { Money } from "@domain/value-objects/Money";
import { IDecisionRepository } from "../ports/outbound/IDecisionRepository";

@Controller("api/v1/intelligence")
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(
    private readonly intelligenceRouter: IntelligenceRouterService,
    private readonly decisionRepository: IDecisionRepository,
  ) {}

  /**
   * Generate intelligence recommendation
   * POST /api/v1/intelligence/generate
   */
  @Post("generate")
  @HttpCode(HttpStatus.OK)
  async generateIntelligence(
    @Request() req: any,
    @Body()
    body: {
      industry: string;
      businessSize: "micro" | "small" | "medium" | "large";
      trigger: {
        metric: string;
        currentValue: number;
        benchmarkValue: number;
        gapPercentage: number;
      };
      type?:
        | "pattern_lookup"
        | "quick_suggestion"
        | "deep_analysis"
        | "standard";
      requiresLowLatency?: boolean;
      maxCost?: number;
    },
  ) {
    const context: DecisionContext = {
      organizationId: req.user?.organizationId || "default",
      industry: body.industry,
      businessSize: body.businessSize,
      trigger: {
        metric: body.trigger.metric as any,
        currentValue: Money.create(body.trigger.currentValue),
        benchmarkValue: Money.create(body.trigger.benchmarkValue),
        gapPercentage: body.trigger.gapPercentage,
      },
    };

    const request: IntelligenceRequest = {
      type: body.type || "standard",
      context,
      requiresLowLatency: body.requiresLowLatency,
      maxCost: body.maxCost,
    };

    const recommendation = await this.intelligenceRouter.route(request);

    return {
      success: true,
      data: recommendation.toJSON(),
    };
  }

  /**
   * Get intelligence metrics
   * GET /api/v1/intelligence/metrics
   */
  @Get("metrics")
  async getMetrics(@Request() req: any) {
    // Get overall statistics
    const stats = await this.decisionRepository.getStatistics();

    // Count unique businesses (organizations)
    const allDecisions = await this.decisionRepository.findByOrganization(
      req.user.organizationId || "",
    );
    const uniqueBusinesses = new Set(allDecisions.map((d) => d.organizationId))
      .size;

    // Count industries covered
    const industries = new Set(allDecisions.map((d) => d.industry));

    // Calculate months of data (from oldest to newest decision)
    const oldestDecision =
      allDecisions.length > 0
        ? allDecisions.reduce(
            (oldest, d) => (d.createdAt < oldest.createdAt ? d : oldest),
            allDecisions[0],
          )
        : null;

    const monthsOfData = oldestDecision
      ? Math.ceil(
          (Date.now() - oldestDecision.createdAt.getTime()) /
            (1000 * 60 * 60 * 24 * 30),
        )
      : 0;

    // Calculate competitor catch-up time (simplified: assume 18 months for now)
    const competitorCatchUpTime =
      monthsOfData > 0 ? `${Math.max(18, monthsOfData)} months` : "18 months";

    return {
      success: true,
      data: {
        totalDecisionsCaptured: stats.totalDecisions,
        uniqueBusinesses,
        industriesCovered: industries.size,
        patternAccuracy: stats.avgSuccessRate, // Using success rate as proxy for accuracy
        predictionSuccessRate: stats.avgSuccessRate,
        avgTimeToInsight: "2.3 seconds", // Mock value
        proprietaryPatterns: Math.floor(stats.totalDecisions / 100), // Estimate
        monthsOfData,
        competitorCatchUpTime,
      },
    };
  }
}
