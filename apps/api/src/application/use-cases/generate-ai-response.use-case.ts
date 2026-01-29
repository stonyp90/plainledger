/**
 * Use Case: Generate AI Response
 *
 * Handles AI chat requests with:
 * - Rate limiting
 * - Input validation
 * - Authentication checks
 * - Error handling
 * - Response formatting
 */

import { Injectable, Inject, Logger } from "@nestjs/common";
import { IAIService } from "@application/ports/outbound/IAIService";
import { AIResponse } from "@infrastructure/ai/ai.service";

export interface GenerateAIResponseRequest {
  prompt: string;
  tenantId: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  modelTier?: "lite" | "full";
}

export interface GenerateAIResponseResponse {
  response: AIResponse;
  requestId: string;
  latency: number;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

@Injectable()
export class GenerateAIResponseUseCase {
  private readonly logger = new Logger(GenerateAIResponseUseCase.name);
  private readonly requestCounts: Map<
    string,
    { count: number; resetAt: number }
  > = new Map();

  // Rate limit: 100 requests per hour per tenant
  private readonly rateLimit: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  };

  constructor(
    @Inject("IAIService")
    private readonly aiService: IAIService,
  ) {}

  async execute(
    request: GenerateAIResponseRequest,
  ): Promise<GenerateAIResponseResponse> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Validate tenant ID
    if (!request.tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Check rate limit
    if (!this.checkRateLimit(request.tenantId)) {
      this.logger.warn(`Rate limit exceeded for tenant: ${request.tenantId}`);
      throw new Error("Too many requests. Please try again later.");
    }

    this.logger.log(
      `AI chat request [${requestId}] from tenant: ${request.tenantId}, prompt length: ${request.prompt.length}`,
    );

    try {
      // Generate response
      const response = await this.aiService.generateResponse(request.prompt, {
        stream: request.stream || false,
        tenantId: request.tenantId,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        retries: request.retries,
        modelTier: request.modelTier || "full",
      });

      const latency = Date.now() - startTime;

      this.logger.log(
        `AI response generated [${requestId}] in ${latency}ms, tokens: ${response.tokensUsed?.total || "unknown"}`,
      );

      return {
        response,
        requestId,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        `AI request failed [${requestId}] after ${latency}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check if tenant has exceeded rate limit
   */
  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(tenantId);

    if (!record || now > record.resetAt) {
      // Reset or initialize
      this.requestCounts.set(tenantId, {
        count: 1,
        resetAt: now + this.rateLimit.windowMs,
      });
      return true;
    }

    if (record.count >= this.rateLimit.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}
