import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger,
  Inject, SetMetadata, HttpException, HttpStatus, OnModuleDestroy,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { KEYCLOAK_INSTANCE } from "nest-keycloak-connect";
import * as KeycloakConnect from "keycloak-connect";
import { assertSelectedOrganization, extractBearerToken, isDevelopmentAuthBypass, verifyKeycloakAccessToken } from "../../auth/keycloak-token";

@Injectable()
export class GqlAuthGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(GqlAuthGuard.name);
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
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext();
    const req = gqlContext?.req?.headers ? gqlContext.req : context.switchToHttp().getRequest();
    if (!req?.headers) throw new UnauthorizedException("Authentication required");

    const user = isDevelopmentAuthBypass(this.configService) ? {
      sub: "dev-user-123", userId: "dev-user-123", email: "dev@plainledger.ca",
      emailVerified: false, roles: ["user", "admin"], name: "Development User",
      organizationId: this.configService.get<string>("MOCK_ORG_ID") ||
        this.configService.get<string>("DEMO_ORG_ID") || "demo-org",
    } : await verifyKeycloakAccessToken(extractBearerToken(req.headers.authorization), this.keycloak, this.configService);
    assertSelectedOrganization(req.headers["x-organization-id"], user.organizationId);

    const now = Date.now();
    let entry = this.rateLimits.get(user.sub);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + 60000 };
      this.rateLimits.set(user.sub, entry);
    }
    if (++entry.count > 100) {
      throw new HttpException("Rate limit exceeded. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    req.user = user;
    if (gqlContext?.req && gqlContext.req !== req) gqlContext.req.user = user;
    const info = ctx.getInfo();
    this.logger.debug(`[Audit] ${info?.fieldName || "operation"} - User: ${user.sub}, Org: ${user.organizationId}`);
    return true;
  }
}

export const GqlPublic = () => SetMetadata("isPublic", true);
