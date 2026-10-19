import { applyDecorators, SetMetadata } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

/**
 * Rate Limit Decorator
 * Allows custom rate limits per endpoint
 *
 * Usage:
 * @RateLimit({ ttl: 60, limit: 10 }) // 10 requests per minute
 */
export const RATE_LIMIT_KEY = "rate_limit";

export interface RateLimitOptions {
  ttl?: number; // Time window in seconds
  limit?: number; // Max requests per window
}

export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
    Throttle({
      default: {
        ttl: (options.ttl ?? 60) * 1000,
        limit: options.limit ?? 100,
      },
    }),
  );
}
