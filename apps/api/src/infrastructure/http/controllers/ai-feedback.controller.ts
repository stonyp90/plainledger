import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { AICacheService } from "../../ai/ai-cache.service";
import { Logger } from "@nestjs/common";

/**
 * AI Feedback Controller
 *
 * Handles user feedback on AI responses for:
 * - Cache invalidation (negative feedback)
 * - Fine-tuning data collection
 * - A/B test analysis
 */
@ApiTags("AI")
@Controller("ai")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIFeedbackController {
  private readonly logger = new Logger(AIFeedbackController.name);

  constructor(private readonly aiCacheService: AICacheService) {}

  @Post("feedback")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Record user feedback on AI response",
    description:
      "Records positive or negative feedback on an AI response. " +
      "Negative feedback triggers cache invalidation and is used for model improvement.",
  })
  @ApiResponse({
    status: 204,
    description: "Feedback recorded successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async recordFeedback(
    @Body() dto: AIFeedbackDto,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.sub || req.user?.id;
    const tenantId = req.user?.organizationId;

    this.logger.log(
      `Recording ${dto.positive ? "positive" : "negative"} feedback for message ${dto.messageId} from user ${userId} (tenant: ${tenantId})`,
    );

    // Handle negative feedback: invalidate cache
    if (!dto.positive && dto.queryHash) {
      try {
        await this.aiCacheService.invalidate(dto.queryHash);
        this.logger.debug(`Invalidated cache for query hash: ${dto.queryHash}`);
      } catch (error) {
        this.logger.error(`Failed to invalidate cache: ${error.message}`);
      }
    }

    // TODO: Store feedback in database for:
    // 1. Fine-tuning data collection
    // 2. A/B test analysis
    // 3. Model performance tracking
    //
    // Example schema:
    // - messageId: string
    // - userId: string
    // - tenantId: string
    // - queryHash: string
    // - queryIntent?: string
    // - modelTier?: string
    // - positive: boolean
    // - timestamp: Date
    // - context?: object (query, response, etc.)

    this.logger.debug(
      `Feedback recorded: messageId=${dto.messageId}, positive=${dto.positive}, ` +
        `intent=${dto.context?.queryIntent}, tier=${dto.context?.modelTier}`,
    );
  }
}

/**
 * DTO for AI feedback
 */
export class AIFeedbackDto {
  /**
   * Unique message ID from the chat response
   */
  messageId: string;

  /**
   * Hash of the query/prompt (for cache invalidation)
   */
  queryHash?: string;

  /**
   * Whether feedback is positive (true) or negative (false)
   */
  positive: boolean;

  /**
   * Timestamp when feedback was given
   */
  timestamp?: number;

  /**
   * Additional context about the query/response
   */
  context?: {
    queryIntent?: string;
    modelTier?: string;
    query?: string;
    response?: string;
  };
}
