import {
  Injectable, CanActivate, ExecutionContext, Logger, Inject, SetMetadata,
  HttpException, HttpStatus, OnModuleDestroy,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { KEYCLOAK_INSTANCE } from "nest-keycloak-connect";
import * as KeycloakConnect from "keycloak-connect";
import { assertSelectedOrganization, extractBearerToken, isDevelopmentAuthBypass, verifyKeycloakAccessToken } from "./keycloak-token";

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(KEYCLOAK_INSTANCE) private readonly keycloak: KeycloakConnect.Keycloak,
  ) {
    this.cleanupTimer = setInterval(() => {
      for (const [key, entry] of this.rateLimits) {
        if (entry.resetAt <= Date.now()) this.rateLimits.delete(key);
      }
    }, 60000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>("isPublic", [context.getHandler(), context.getClass()])) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    if (isDevelopmentAuthBypass(this.configService)) {
      request.user = {
        sub: "dev-user-123", userId: "dev-user-123", email: "dev@plainledger.ca",
        emailVerified: false, roles: ["user", "admin"], name: "Development User",
        organizationId: this.configService.get<string>("MOCK_ORG_ID") || "demo-org",
      };
      return true;
    }

    const token = extractBearerToken(request?.headers?.authorization);
    const user = await verifyKeycloakAccessToken(token, this.keycloak, this.configService);
    assertSelectedOrganization(request.headers["x-organization-id"], user.organizationId);
    const now = Date.now();
    let entry = this.rateLimits.get(user.sub);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + 60000 };
      this.rateLimits.set(user.sub, entry);
    }
    if (++entry.count > 100) {
      throw new HttpException("Rate limit exceeded. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    request.user = user;
    this.logger.debug(`[Audit] ${request.method} - User: ${user.sub}, Org: ${user.organizationId}`);
    return true;
  }
}

export const Public = () => SetMetadata("isPublic", true);
