/**
 * AI Controller - Enterprise Grade
 *
 * Handles AI chat requests with:
 * - Input validation
 * - Rate limiting
 * - Authentication checks
 * - Request logging
 * - Error handling
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";

// TooManyRequestsException doesn't exist in NestJS, create custom
class TooManyRequestsException extends HttpException {
  constructor(message = "Too Many Requests") {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { GenerateAIResponseUseCase } from "@application/use-cases/generate-ai-response.use-case";

export class ChatRequestDto {
  @IsString()
  @MaxLength(10000, {
    message: "Prompt exceeds maximum length of 10,000 characters",
  })
  @Transform(({ value }) => {
    // Trim and sanitize
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  })
  prompt: string;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  retries?: number;

  @IsOptional()
  @IsString()
  modelTier?: "lite" | "full";
}

@Controller("ai")
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly generateAIResponseUseCase: GenerateAIResponseUseCase,
  ) {}

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() dto: ChatRequestDto,
    @Headers("x-tenant-id") tenantId?: string,
    @Headers("authorization") authHeader?: string,
  ) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Validate authentication
      if (!authHeader && process.env.NODE_ENV === "production") {
        this.logger.warn(`Unauthorized request attempt: ${requestId}`);
        throw new UnauthorizedException("Authentication required");
      }

      // Validate tenant ID
      if (!tenantId) {
        this.logger.warn(`Request without tenant ID: ${requestId}`);
        throw new BadRequestException("Tenant ID is required");
      }

      // Use the use case to generate response
      const result = await this.generateAIResponseUseCase.execute({
        prompt: dto.prompt,
        tenantId,
        stream: dto.stream,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        retries: dto.retries,
        modelTier: dto.modelTier || "full",
      });

      return {
        success: true,
        message: result.response.message,
        initiatives: result.response.initiatives,
        okrs: result.response.okrs,
        metadata: {
          requestId: result.requestId,
          latency: result.latency,
          tokensUsed: result.response.tokensUsed,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      if (
        error instanceof BadRequestException ||
        error instanceof TooManyRequestsException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        `AI chat request [${requestId}] failed after ${latency}ms: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return user-friendly error without exposing internals
      return {
        success: false,
        message:
          error instanceof Error && error.message.includes("timeout")
            ? "Request timed out. Please try again."
            : (error instanceof Error &&
                  error.message.includes("Rate limit")) ||
                (error instanceof Error &&
                  error.message.includes("Too many requests"))
              ? "Rate limit exceeded. Please try again later."
              : "I apologize, but I encountered an error processing your request. Please try again.",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
        metadata: {
          requestId,
          latency,
        },
      };
    }
  }
}
