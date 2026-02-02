import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerException } from "@nestjs/throttler";

/**
 * Organization-based Rate Limiting Guard
 * Applies rate limits per organization instead of per IP
 *
 * Note: For now, using default ThrottlerGuard with IP-based tracking.
 * Custom organization-based tracking can be added later if needed.
 */
@Injectable()
export class OrganizationRateLimitGuard extends ThrottlerGuard {
  // Custom implementation can be added here if needed
  // For now, using default IP-based rate limiting
}
