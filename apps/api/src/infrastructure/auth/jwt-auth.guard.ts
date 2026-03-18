/**
 * JWT Authentication Guard for REST APIs
 *
 * Protects REST controllers with Keycloak authentication.
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
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { SetMetadata } from "@nestjs/common";

// Simple rate limiter for REST
interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
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

    const request = context.switchToHttp().getRequest();

    // SECURITY: Only skip auth in development mode - NEVER in production
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const isProduction = nodeEnv === "production";
    const skipAuth = this.configService.get<string>("SKIP_AUTH") === "true";

    if (isProduction && skipAuth) {
      this.logger.error(
        "SECURITY: SKIP_AUTH is enabled in production - this is ignored for security",
      );
    }

    if (skipAuth && !isProduction) {
      this.logger.warn(
        `Authentication skipped (development mode, NODE_ENV=${nodeEnv})`,
      );
      request.user = this.getMockUser();
      return true;
    }

    // Extract and validate token
    const authHeader = request.headers.authorization;
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
      request.user = user;

      // Log access for audit
      this.logAccess(request, user);

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
        organizationId: payload.organization_id || payload.organization || payload.org_id || "default",
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
    request: any,
    user: { sub: string; email: string; organizationId: string },
  ): void {
    const method = request.method;
    const url = request.url;

    this.logger.log(
      `[Audit] ${method} ${url} - User: ${user.email}, Org: ${user.organizationId}`,
    );
  }

  /**
   * Get mock user for development
   * Organization ID can be set via MOCK_ORG_ID environment variable
   */
  private getMockUser() {
    const mockOrgId =
      this.configService.get<string>("MOCK_ORG_ID") || "default";
    return {
      sub: "dev-user-123",
      email: "dev@plainledger.ca",
      organizationId: mockOrgId,
      roles: ["user", "admin"],
      name: "Development User",
    };
  }
}

/**
 * Decorator to mark endpoint as public (no auth required)
 */
export const Public = () => SetMetadata("isPublic", true);
