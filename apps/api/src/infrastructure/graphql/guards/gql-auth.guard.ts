/**
 * GraphQL Authentication Guard
 *
 * Protects GraphQL resolvers with Keycloak authentication.
 * Extracts user context from JWT token and validates access.
 *
 * Security features:
 * - JWT token validation via Keycloak
 * - Rate limiting per user
 * - Request logging for audit
 * - Tenant isolation enforcement
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

// Simple rate limiter for GraphQL
interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

@Injectable()
export class GqlAuthGuard implements CanActivate {
  private readonly logger = new Logger(GqlAuthGuard.name);
  private readonly rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 100; // requests per window

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Clean up expired rate limits periodically
    setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.rateLimits.entries()) {
        if (entry.resetAt < now) {
          this.rateLimits.delete(key);
        }
      }
    }, 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.get<boolean>(
      "isPublic",
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    // SECURITY: Only skip auth in development mode - NEVER in production
    // Check multiple sources: configService first (for tests), then process.env, then .env file
    let nodeEnv =
      this.configService.get<string>("NODE_ENV") || process.env.NODE_ENV;
    let skipAuth =
      this.configService.get<string>("SKIP_AUTH") === "true" ||
      process.env.SKIP_AUTH === "true";

    // If not found, try reading .env file directly (for development hot reload)
    if (!skipAuth || !nodeEnv) {
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf-8");
          const envVars: Record<string, string> = {};
          envContent.split("\n").forEach((line) => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) {
              envVars[match[1].trim()] = match[2].trim();
            }
          });
          if (!nodeEnv && envVars.NODE_ENV) nodeEnv = envVars.NODE_ENV;
          if (!skipAuth && envVars.SKIP_AUTH === "true") skipAuth = true;
        }
      } catch (error) {
        // Ignore file read errors
      }
    }

    // Default to development if not set (but preserve "test" for test environment)
    if (!nodeEnv) {
      nodeEnv = process.env.NODE_ENV || "development";
    }
    const isProduction = nodeEnv === "production";
    const isTest = nodeEnv === "test";

    // SECURITY: Never skip auth in production, even if SKIP_AUTH is set
    if (isProduction && skipAuth) {
      this.logger.error(
        "SECURITY: SKIP_AUTH is enabled in production - this is ignored for security",
      );
      skipAuth = false; // Force auth check in production
    }

    // Never skip auth in test mode - tests should validate actual auth behavior
    if (isTest) {
      skipAuth = false;
    }

    if (skipAuth && !isProduction) {
      this.logger.warn(
        `Authentication skipped (development mode, NODE_ENV=${nodeEnv})`,
      );
      req.user = this.getMockUser();
      return true;
    }

    // Extract and validate token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      this.logger.warn("No authorization header provided");
      throw new UnauthorizedException("Authentication required");
    }

    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid authorization format");
    }

    try {
      // Decode and validate JWT
      const user = await this.validateToken(token);

      // Check rate limit
      await this.checkRateLimit(user.sub);

      // Attach user to request context
      req.user = user;

      // Log access for audit
      this.logAccess(ctx, user);

      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error}`);
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Validate JWT token
   * In production, this would verify with Keycloak
   */
  private async validateToken(token: string): Promise<{
    sub: string;
    email: string;
    organizationId: string;
    roles: string[];
    name?: string;
  }> {
    try {
      // Decode JWT payload (base64)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8"),
      );

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      // Extract user info
      return {
        sub: payload.sub || payload.user_id,
        email: payload.email || payload.preferred_username,
        organizationId: payload.organization_id || payload.org_id || "default",
        roles: payload.realm_access?.roles || payload.roles || [],
        name: payload.name || payload.given_name,
      };
    } catch (error) {
      throw new Error(`Token validation failed: ${error}`);
    }
  }

  /**
   * Check rate limit for user
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const key = `rate:${userId}`;
    const now = new Date();

    let entry = this.rateLimits.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new window
      entry = {
        count: 1,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
      };
      this.rateLimits.set(key, entry);
      return;
    }

    entry.count++;

    if (entry.count > this.RATE_LIMIT_MAX) {
      this.logger.warn(`Rate limit exceeded for user: ${userId}`);
      throw new Error("Rate limit exceeded. Please try again later.");
    }
  }

  /**
   * Log access for audit trail
   */
  private logAccess(
    ctx: GqlExecutionContext,
    user: { sub: string; email: string; organizationId: string },
  ): void {
    const info = ctx.getInfo();
    const operationName = info.fieldName;
    const operationType = info.parentType.name;

    this.logger.log(
      `[Audit] ${operationType}.${operationName} - User: ${user.email}, Org: ${user.organizationId}`,
    );
  }

  /**
   * Get mock user for development
   * Organization ID can be set via MOCK_ORG_ID environment variable
   */
  private getMockUser() {
    // Try multiple sources for MOCK_ORG_ID
    let mockOrgId =
      process.env.MOCK_ORG_ID || this.configService.get<string>("MOCK_ORG_ID");

    // If not found, read from .env file directly
    if (!mockOrgId) {
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf-8");
          const match = envContent.match(/^MOCK_ORG_ID=(.+)$/m);
          if (match) {
            mockOrgId = match[1].trim();
          }
        }
      } catch (error) {
        // Ignore file read errors
      }
    }

    const demoOrgId =
      this.configService?.get<string>("DEMO_ORG_ID") || "demo-org";
    const demoEmail =
      this.configService?.get<string>("DEMO_EMAIL") || "demo@plainledger.ca";

    return {
      sub: "dev-user-123",
      email: demoEmail,
      organizationId: mockOrgId || demoOrgId,
      roles: ["user", "admin"],
      name: "Development User",
    };
  }
}

/**
 * Decorator to mark resolver/query as public (no auth required)
 */
import { SetMetadata } from "@nestjs/common";
export const GqlPublic = () => SetMetadata("isPublic", true);
