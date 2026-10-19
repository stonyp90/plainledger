import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import { IAIService } from "@application/ports/outbound/IAIService";
import { IDatalakeDataService } from "@application/ports/outbound/IDatalakeDataService";
import { Inject, Optional } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CacheService } from "@infrastructure/cache/cache.service";

@Controller("health")
@ApiTags("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  
  constructor(
    @Inject("IAIService")
    private readonly aiService: IAIService,
    @Optional()
    @Inject("IDatalakeDataService")
    private readonly datalakeService: IDatalakeDataService | undefined,
    private readonly database: DataSource,
    private readonly cache: CacheService,
  ) {}
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
  @ApiResponse({ status: 503, description: "A required dependency is unavailable" })
  async ready() {
    const checks = { database: "disconnected", cache: "disconnected" };
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const databaseCheck = async () => {
      if (!this.database.isInitialized) return false;
      try {
        await Promise.race([
          this.database.query("SELECT 1"),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Readiness timeout")), 2000);
          }),
        ]);
        return true;
      } catch {
        return false;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };
    const [databaseReady, cacheReady] = await Promise.all([databaseCheck(), this.cache.healthCheck()]);
    if (databaseReady) checks.database = "connected";
    if (cacheReady) checks.cache = "connected";
    const response = {
      status: databaseReady && cacheReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(), checks,
    };
    if (!databaseReady || !cacheReady) throw new ServiceUnavailableException(response);
    return response;
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

  @Get("datalake")
  @Public()
  @ApiOperation({ summary: "Datalake/S3 health check" })
  @ApiResponse({ status: 200, description: "Datalake status" })
  async datalakeHealth() {
    // Check S3/datalake configuration
    const hasS3AccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasS3SecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    const hasS3SessionToken = !!process.env.AWS_SESSION_TOKEN;
    const s3Endpoint = process.env.S3_ENDPOINT || "AWS default";
    const s3Region = process.env.S3_REGION || "ca-central-1";
    const goldBucket = process.env.S3_BUCKET_GOLD || "plainledger-gold";
    
    let connectionStatus: "connected" | "error" | "not_configured" = "not_configured";
    let connectionError: string | undefined;
    
    // Try to check actual S3 connectivity if service is available
    if (this.datalakeService && hasS3AccessKey && hasS3SecretKey) {
      try {
        const healthResult = await this.datalakeService.healthCheck();
        connectionStatus = healthResult.healthy ? "connected" : "error";
        if (!healthResult.healthy) {
          connectionError = healthResult.error;
        }
      } catch (error) {
        connectionStatus = "error";
        connectionError = error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(`Datalake health check failed: ${connectionError}`);
      }
    } else if (!hasS3AccessKey || !hasS3SecretKey) {
      connectionStatus = "not_configured";
      connectionError = "AWS credentials not configured";
    }

    return {
      status: connectionStatus === "connected" ? "healthy" : connectionStatus === "error" ? "unhealthy" : "degraded",
      timestamp: new Date().toISOString(),
      connection: connectionStatus,
      error: connectionError,
      config: {
        endpoint: s3Endpoint,
        region: s3Region,
        goldBucket,
        hasAccessKey: hasS3AccessKey,
        hasSecretKey: hasS3SecretKey,
        hasSessionToken: hasS3SessionToken,
      },
      guidance: connectionStatus !== "connected" ? {
        en: "Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and optionally AWS_SESSION_TOKEN are set correctly. For local development, ensure LocalStack is running.",
        fr: "Assurez-vous que AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et optionnellement AWS_SESSION_TOKEN sont correctement configurés. Pour le développement local, assurez-vous que LocalStack fonctionne.",
      } : undefined,
    };
  }
}
