/**
 * Custom ThrottlerGuard for GraphQL
 *
 * Extends NestJS ThrottlerGuard to handle GraphQL execution context
 * where req.ip might not be available. Falls back to default IP
 * when running with SKIP_AUTH in local development.
 */
import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { GqlExecutionContext } from "@nestjs/graphql";

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  /**
   * Get the request from execution context
   * Handles both HTTP and GraphQL contexts
   */
  getRequestResponse(context: ExecutionContext) {
    // Check if this is a GraphQL context
    if (context.getType<string>() === "graphql") {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();

      // For GraphQL, return the request from context
      return {
        req: ctx.req,
        res: ctx.res,
      };
    }

    // For HTTP requests, use the default behavior
    return super.getRequestResponse(context);
  }

  /**
   * Get the tracker (client identifier) for rate limiting
   * Falls back to a default IP if not available (e.g., in GraphQL context)
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // In local dev with SKIP_AUTH, req might be undefined or missing ip
    const skipAuth = process.env.SKIP_AUTH === "true";

    if (!req) {
      // No request object - use default tracker
      return skipAuth ? "local-dev-default" : "unknown";
    }

    // Try to get IP from various sources
    const ip =
      req.ip ||
      req.ips?.[0] ||
      req.connection?.remoteAddress ||
      req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers?.["x-real-ip"] ||
      (skipAuth ? "127.0.0.1" : "unknown");

    return ip;
  }

  /**
   * Optionally skip throttling in development mode
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // In local dev with SKIP_AUTH, optionally bypass throttling entirely
    // to make development easier
    const skipAuth = process.env.SKIP_AUTH === "true";
    const skipThrottleInDev =
      process.env.SKIP_THROTTLE_IN_DEV === "true" || skipAuth;

    if (skipThrottleInDev && process.env.NODE_ENV !== "production") {
      return true;
    }

    return super.canActivate(context);
  }
}
