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
import { Logger } from "@nestjs/common";

/**
 * AI Analytics Controller
 *
 * Receives analytics events from frontend for:
 * - Cost tracking per feature
 * - Performance monitoring
 * - Usage patterns analysis
 */
@ApiTags("Analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIAnalyticsController {
  private readonly logger = new Logger(AIAnalyticsController.name);

  @Post("ai")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Record AI analytics events",
    description:
      "Receives analytics events from frontend for tracking AI usage, costs, and performance.",
  })
  @ApiResponse({
    status: 204,
    description: "Analytics recorded successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async recordAnalytics(
    @Body() dto: AIAnalyticsDto,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.sub || req.user?.id;
    const tenantId = req.user?.organizationId;

    this.logger.debug(
      `Received ${dto.events.length} analytics events from session ${dto.sessionId} (user: ${userId}, tenant: ${tenantId})`,
    );

    // TODO: Store analytics in database for reporting
    // Example schema:
    // - eventId: string (UUID)
    // - userId: string
    // - tenantId: string
    // - sessionId: string
    // - eventType: string
    // - timestamp: Date
    // - metadata: JSON (tokens, cost, feature, etc.)
    //
    // Aggregation queries:
    // - Total cost per tenant per day
    // - Average latency per feature
    // - Token usage by model tier
    // - Error rates by feature

    // Log summary for now
    const summary = this.aggregateEvents(dto.events);
    this.logger.log(
      `AI Analytics Summary (session: ${dto.sessionId}): ` +
        `messages=${summary.totalMessages}, ` +
        `localQueries=${summary.localQueries}, ` +
        `tokens=${summary.totalTokens}, ` +
        `errors=${summary.totalErrors}`,
    );
  }

  /**
   * Aggregate events for logging/summary
   */
  private aggregateEvents(events: AnalyticsEvent[]): {
    totalMessages: number;
    localQueries: number;
    totalTokens: number;
    totalErrors: number;
    totalCost: number;
  } {
    const messages = events.filter((e) => e.type === "message_sent");
    const localQueries = events.filter((e) => e.type === "local_query");
    const errors = events.filter((e) => e.type === "error");

    const totalTokens = events.reduce(
      (sum, e) => sum + (e.metadata?.tokensUsed || 0),
      0,
    );

    const totalCost = events.reduce(
      (sum, e) => sum + (e.metadata?.costSaved || 0),
      0,
    );

    return {
      totalMessages: messages.length,
      localQueries: localQueries.length,
      totalTokens,
      totalErrors: errors.length,
      totalCost,
    };
  }
}

/**
 * DTO for AI analytics events
 */
export class AIAnalyticsDto {
  /**
   * Session ID for grouping events
   */
  sessionId: string;

  /**
   * Array of analytics events
   */
  events: AnalyticsEvent[];

  /**
   * Timestamp when events were sent
   */
  timestamp: number;
}

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  type:
    | "message_sent"
    | "initiative_generated"
    | "okr_generated"
    | "error"
    | "rate_limit"
    | "local_query"
    | "feedback";
  timestamp: number;
  metadata?: {
    messageLength?: number;
    responseTime?: number;
    tokensUsed?: number;
    errorType?: string;
    messageType?: string;
    handlerType?: string;
    latencyMs?: number;
    costSaved?: number;
    messageId?: string;
    positive?: boolean;
    queryIntent?: string;
    modelTier?: string;
  };
}
