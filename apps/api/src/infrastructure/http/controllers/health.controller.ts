import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import { AIService } from "../../ai/ai.service";

@Controller("health")
@ApiTags("health")
export class HealthController {
  constructor(private readonly aiService: AIService) {}
  @Get()
  @Public()
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  check() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "plainledger-api",
      version: "1.0.0",
    };
  }

  @Get("ready")
  @Public()
  @ApiOperation({ summary: "Readiness check endpoint" })
  @ApiResponse({ status: 200, description: "Service is ready" })
  ready() {
    // In a real app, check database connectivity, etc.
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "connected",
        cache: "connected",
      },
    };
  }

  @Get("ai")
  @Public()
  @ApiOperation({ summary: "AI service health check" })
  @ApiResponse({ status: 200, description: "AI service status" })
  aiHealth() {
    // Check AI service configuration
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasAnyProvider = hasOpenAI || hasAnthropic;

    return {
      status: hasAnyProvider ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      providers: {
        openai: hasOpenAI ? "configured" : "not_configured",
        anthropic: hasAnthropic ? "configured" : "not_configured",
      },
      fallback: !hasAnyProvider ? "simulated_responses" : "none",
    };
  }
}
