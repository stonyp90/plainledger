/**
 * DecisionsController
 *
 * REST API endpoints for decision capture and outcome tracking.
 * Part of the Context Intelligence Platform.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "@infrastructure/auth/jwt-auth.guard";
import {
  CaptureDecisionUseCase,
  CaptureDecisionInput,
} from "../use-cases/capture-decision.use-case";
import {
  OutcomeTrackingService,
  RecordOutcomeInput,
} from "../services/outcome-tracking.service";
import { IDecisionRepository } from "../ports/outbound/IDecisionRepository";

@Controller("api/v1/decisions")
@UseGuards(JwtAuthGuard)
export class DecisionsController {
  constructor(
    private readonly captureDecisionUseCase: CaptureDecisionUseCase,
    private readonly outcomeTrackingService: OutcomeTrackingService,
    private readonly decisionRepository: IDecisionRepository,
  ) {}

  /**
   * Capture a new decision
   * POST /api/v1/decisions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async captureDecision(
    @Body() body: CaptureDecisionInput,
    @Request() req: any,
  ) {
    // Use organization ID from authenticated user
    const input: CaptureDecisionInput = {
      ...body,
      organizationId: req.user.organizationId || body.organizationId,
    };

    const decision = await this.captureDecisionUseCase.execute(input);

    return {
      success: true,
      data: {
        id: decision.id,
        industry: decision.industry,
        createdAt: decision.createdAt,
      },
    };
  }

  /**
   * Record outcome for a decision
   * POST /api/v1/decisions/:id/outcome
   */
  @Post(":id/outcome")
  @HttpCode(HttpStatus.OK)
  async recordOutcome(
    @Param("id") decisionId: string,
    @Body() body: Omit<RecordOutcomeInput, "decisionId">,
  ) {
    const input: RecordOutcomeInput = {
      ...body,
      decisionId,
    };

    const decision = await this.outcomeTrackingService.recordOutcome(input);

    return {
      success: true,
      data: {
        id: decision.id,
        outcome: {
          success: decision.outcome?.success,
          variance: decision.outcome?.variance,
          roi: decision.getROI(),
        },
      },
    };
  }

  /**
   * Get decision by ID
   * GET /api/v1/decisions/:id
   */
  @Get(":id")
  async getDecision(@Param("id") id: string) {
    const decision = await this.decisionRepository.findById(id);

    if (!decision) {
      return {
        success: false,
        error: "Decision not found",
      };
    }

    return {
      success: true,
      data: decision.toJSON(),
    };
  }

  /**
   * Get decisions for organization
   * GET /api/v1/decisions
   */
  @Get()
  async getDecisions(@Request() req: any) {
    const organizationId = req.user.organizationId;
    const decisions =
      await this.decisionRepository.findByOrganization(organizationId);

    return {
      success: true,
      data: decisions.map((d) => d.toJSON()),
    };
  }

  /**
   * Get outcome statistics
   * GET /api/v1/decisions/statistics
   */
  @Get("statistics")
  async getStatistics(@Request() req: any) {
    const organizationId = req.user.organizationId;
    const stats =
      await this.outcomeTrackingService.getOutcomeStatistics(organizationId);

    return {
      success: true,
      data: stats,
    };
  }
}
